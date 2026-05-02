'use strict';

// Resamples an audio Blob to a mono Float32Array at 16 kHz, as required by Whisper.
async function resampleTo16k(blob) {
  var arrayBuf = await blob.arrayBuffer();
  var audioCtx = new AudioContext();
  var decoded;
  try {
    decoded = await audioCtx.decodeAudioData(arrayBuf);
  } finally {
    audioCtx.close();
  }
  var src = decoded.getChannelData(0); // use first channel (mono)
  var srcRate = decoded.sampleRate;
  if (srcRate === 16000) return new Float32Array(src); // already correct rate

  var targetLen = Math.round(src.length * 16000 / srcRate);
  var offCtx = new OfflineAudioContext(1, targetLen, 16000);
  var buf = offCtx.createBuffer(1, src.length, srcRate);
  buf.getChannelData(0).set(src);
  var srcNode = offCtx.createBufferSource();
  srcNode.buffer = buf;
  srcNode.connect(offCtx.destination);
  srcNode.start(0);
  var rendered = await offCtx.startRendering();
  return new Float32Array(rendered.getChannelData(0));
}

class SpeechTracker {
  constructor({ onTranscript, onStateChange }) {
    this._onTranscript   = onTranscript;
    this._onStateChange  = onStateChange;
    this._isRecording    = false;
    this._startTime      = null;
    this._pendingChunks  = 0;
    this._mediaRecorder  = null;
    this._stream         = null;

    // Visualizer state — separate AudioContext from the resampling one
    this._vizCtx    = null;
    this._analyser  = null;
    this._vizRaf    = null;

    // Worker path is relative to this script file (both live in js/)
    this._worker = new Worker('../js/whisper-worker.js', { type: 'module' });
    this._worker.onmessage = this._handleWorkerMessage.bind(this);
    this._worker.onerror = function(e) {
      console.error('[SpeechTracker] Worker error:', e);
    };
  }

  _handleWorkerMessage(e) {
    var msg = e.data;
    if (msg.type === 'loading') {
      this._onStateChange('loading', null);
    } else if (msg.type === 'progress') {
      this._onStateChange('progress', { loaded: msg.loaded, total: msg.total });
    } else if (msg.type === 'ready') {
      this._onStateChange('ready', null);
    } else if (msg.type === 'result') {
      this._pendingChunks = Math.max(0, this._pendingChunks - 1);
      if (msg.text && msg.text.trim()) {
        this._onTranscript(msg.text.trim());
      } else if (this._isRecording) {
        // Silent chunk during active recording — clear "Processing…" even with no text
        this._onStateChange('recording', null);
      }
      if (this._pendingChunks === 0 && !this._isRecording) {
        this._onStateChange('idle', null);
      }
    } else if (msg.type === 'error') {
      console.error('[SpeechTracker] Worker reported error:', msg.message);
      this._onStateChange('idle', null);
    }
  }

  async start() {
    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true }
    });

    this._startTime     = Date.now();
    this._isRecording   = true;  // must be true before _startViz() so the RAF loop runs
    this._pendingChunks = 0;

    this._startViz();

    this._mediaRecorder = new MediaRecorder(this._stream);

    this._mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this._pendingChunks++;
        // Signal a mid-session chunk only while user is still recording
        if (this._isRecording) {
          this._onStateChange('chunk-sent', null);
        }
        this._processChunk(e.data);
      }
    };

    this._mediaRecorder.onstop = () => {
      if (this._stream) {
        this._stream.getTracks().forEach(function(t) { t.stop(); });
        this._stream = null;
      }
      if (this._pendingChunks === 0) {
        this._onStateChange('idle', null);
      } else {
        this._onStateChange('transcribing', null);
      }
    };

    this._mediaRecorder.start(6000); // ondataavailable fires every 6 s
    this._onStateChange('recording', null);
  }

  stop() {
    if (!this._isRecording) return;
    this._isRecording = false;
    this._stopViz();

    var elapsed = Math.round((Date.now() - this._startTime) / 1000);
    console.log('[SpeechTracker] Time on task: ' + elapsed + 's');

    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      this._mediaRecorder.stop(); // triggers onstop after final ondataavailable
    } else {
      if (this._stream) {
        this._stream.getTracks().forEach(function(t) { t.stop(); });
        this._stream = null;
      }
      this._onStateChange('idle', null);
    }
  }

  destroy() {
    this._isRecording = false;
    this._stopViz();
    if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
      try { this._mediaRecorder.stop(); } catch (_) {}
    }
    if (this._stream) {
      this._stream.getTracks().forEach(function(t) { t.stop(); });
      this._stream = null;
    }
    if (this._worker) {
      this._worker.terminate();
      this._worker = null;
    }
  }

  async _processChunk(blob) {
    try {
      var float32 = await resampleTo16k(blob);
      if (this._worker) {
        // Transfer the buffer to avoid copying 16kHz PCM data across threads
        this._worker.postMessage({ type: 'transcribe', audio: float32 }, [float32.buffer]);
      }
    } catch (err) {
      console.error('[SpeechTracker] chunk processing error:', err);
      this._pendingChunks = Math.max(0, this._pendingChunks - 1);
      if (this._pendingChunks === 0 && !this._isRecording) {
        this._onStateChange('idle', null);
      }
    }
  }

  // ── Visualizer ──────────────────────────────────────────────────────────────

  _startViz() {
    var canvas = document.getElementById('audio-visualizer');
    if (!canvas || !this._stream) return;

    canvas.style.display = 'block';

    // Tap the stream with an AnalyserNode — separate from the resampling AudioContext
    this._vizCtx   = new AudioContext();
    var source     = this._vizCtx.createMediaStreamSource(this._stream);
    this._analyser = this._vizCtx.createAnalyser();
    this._analyser.fftSize                = 256; // 128 time-domain samples
    this._analyser.smoothingTimeConstant  = 0.4;
    source.connect(this._analyser);
    // intentionally NOT connected to destination — visualise only, no playback

    var dataArray = new Uint8Array(this._analyser.frequencyBinCount);
    var ctx2d     = canvas.getContext('2d');
    var w         = canvas.width;
    var h         = canvas.height;

    var draw = () => {
      if (!this._isRecording) return; // loop ends when recording stops
      this._vizRaf = requestAnimationFrame(draw);

      this._analyser.getByteTimeDomainData(dataArray);

      ctx2d.clearRect(0, 0, w, h);
      ctx2d.lineWidth   = 1.5;
      ctx2d.strokeStyle = '#dc2626'; // matches .is-recording indicator
      ctx2d.beginPath();

      var step = w / dataArray.length;
      var x    = 0;
      for (var i = 0; i < dataArray.length; i++) {
        // 128 = silence → centre; oscillates above/below on speech
        var y = (dataArray[i] / 128.0) * (h / 2);
        i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
        x += step;
      }
      ctx2d.lineTo(w, h / 2);
      ctx2d.stroke();
    };

    draw();
  }

  _stopViz() {
    if (this._vizRaf) {
      cancelAnimationFrame(this._vizRaf);
      this._vizRaf = null;
    }
    var canvas = document.getElementById('audio-visualizer');
    if (canvas) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
    }
    if (this._vizCtx) {
      this._vizCtx.close();
      this._vizCtx = null;
    }
    this._analyser = null;
  }
}
