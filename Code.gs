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
 */

var GEMINI_MODEL = 'gemini-2.5-flash';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var prompt = (body.prompt || '').trim();

    if (!prompt) {
      return jsonResponse({ error: 'prompt is required' }, 400);
    }

    var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      return jsonResponse({ error: 'API key not configured' }, 500);
    }

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/'
              + GEMINI_MODEL + ':generateContent?key=' + apiKey;

    var payload = {
      contents: [{ parts: [{ text: prompt }] }]
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

function jsonResponse(obj, statusCode) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
