/**
 * Lumina Study — Gemini AI Proxy
 *
 * Setup steps:
 * 1. Open https://script.google.com → New project → paste this file
 * 2. Project Settings → Script Properties → Add property:
 *      Name: GEMINI_API_KEY   Value: <your key>
 * 3. Deploy → New deployment → Web App
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. Copy the Web App URL into AI_SCRIPT_URL in js/ui-study.js
 *
 * IMPORTANT: Every time you edit this file, create a NEW deployment.
 * Do not reuse an existing deployment — the old version keeps running.
 */

var GEMINI_MODEL = 'gemini-2.5-flash';

function doPost(e) {
  try {
    var body        = JSON.parse(e.postData.contents);
    var prompt      = (body.prompt      || '').trim();
    var videoTitle  = (body.videoTitle  || 'Not provided').trim();
    var channelName = (body.channelName || 'Not provided').trim();
    var description = (body.description || 'Not provided').trim();

    if (!prompt) {
      return jsonResponse({ error: 'prompt is required' }, 400);
    }

    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'API key not configured' }, 500);
    }

    var systemInstruction =
      'You are Lumina AI, an expert English learning coach specializing in four domains:\n' +
      '1. Business Negotiation (Stuart Diamond, Chris Voss frameworks)\n' +
      '2. Artificial Intelligence (tools, trends, applications)\n' +
      '3. Corporate Training & Public Speaking\n' +
      '4. Language Acquisition and English fluency\n\n' +
      'A student is currently watching this YouTube video:\n' +
      'Title: ' + videoTitle + '\n' +
      'Channel: ' + channelName + '\n' +
      'Description: ' + description + '\n\n' +
      'RULES — follow strictly:\n' +
      '- You already know this video. Use your internal training knowledge about this specific title and channel to give an accurate, content-specific answer.\n' +
      '- NEVER ask the student to supply the video content or transcript. Answer directly every time.\n' +
      '- If this is from a well-known channel (Big Think, TED, Think Fast Talk Smart, Andrew Huberman, etc.), draw on your knowledge of their full content library.\n' +
      '- Frame your answer through the lens of English learning and the four domains above.\n' +
      '- Be concise and practical (3-5 sentences max unless a full summary is explicitly requested).\n' +
      '- End with one actionable tip the student can apply immediately.';

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/'
              + GEMINI_MODEL + ':generateContent?key=' + apiKey;

    var payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    };

    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var result = JSON.parse(response.getContentText());

    if (result.error) {
      return jsonResponse({ error: result.error.message }, 502);
    }

    var text = result.candidates[0].content.parts[0].text;
    return jsonResponse({ text: text });

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
