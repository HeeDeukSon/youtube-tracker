require('dotenv').config();

module.exports = {
  youtubeApiKey: process.env.YOUTUBE_API_KEY,
  ga4: {
    measurementId:    process.env.GA4_MEASUREMENT_ID,
    propertyId:       process.env.GA4_PROPERTY_ID,
    serviceAccountKey: process.env.GA4_SERVICE_ACCOUNT_KEY,
    apiSecret:        process.env.GA4_API_SECRET,
  },
  ai: {
    apiKey:   process.env.AI_API_KEY,
    provider: process.env.AI_PROVIDER,
  },
};
