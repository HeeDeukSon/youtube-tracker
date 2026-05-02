import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2';

env.allowLocalModels = false;
env.backends.onnx.wasm.proxy = false; // already in a worker; no nested proxy needed

let transcriber = null;

(async () => {
  self.postMessage({ type: 'loading' });
  try {
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      progress_callback(p) {
        if (p.status === 'progress') {
          self.postMessage({ type: 'progress', loaded: p.loaded, total: p.total });
        }
      }
    });
    self.postMessage({ type: 'ready' });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
})();

self.addEventListener('message', async ({ data }) => {
  if (data.type !== 'transcribe' || !transcriber) return;
  try {
    const out = await transcriber(data.audio, { sampling_rate: 16000 });
    self.postMessage({ type: 'result', text: out.text });
  } catch (err) {
    self.postMessage({ type: 'result', text: '' });
  }
});
