const axios = require('axios');
const { ga4 } = require('../config');

const MP_ENDPOINT = 'https://www.googletagmanager.com/mp/collect';

// GA4_API_SECRET must be added to .env and config.js (ga4.apiSecret) before use.
// Generate it in GA4 Admin → Data Streams → Measurement Protocol API secrets.
const GA4_API_SECRET = ga4.apiSecret;

async function sendStudyLog(data) {
  const {
    client_id,
    session_id,
    input_mode,
    duration_seconds,
    requirement_type,
    video_id,
    channel_id,
    channel_name,
    video_title,
    category,
  } = data;

  await axios.post(
    MP_ENDPOINT,
    {
      client_id: client_id ?? 'server-default',
      events: [
        {
          name: 'study_log_submit',
          params: {
            session_id,
            input_mode,
            duration_seconds,
            requirement_type,
            video_id,
            channel_id,
            channel_name,
            video_title,
            category,
            engagement_time_msec: (duration_seconds ?? 0) * 1000,
          },
        },
      ],
    },
    {
      params: {
        measurement_id: ga4.measurementId,
        api_secret:     GA4_API_SECRET,
      },
    }
  );
}

module.exports = { sendStudyLog };
