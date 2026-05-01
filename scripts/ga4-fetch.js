'use strict';
const { google } = require('googleapis');
const fs = require('fs');
const { ga4 } = require('../config');

const PROPERTY_ID = ga4.propertyId;
const KEY_JSON    = ga4.serviceAccountKey;

async function main() {
  if (!PROPERTY_ID || !KEY_JSON) {
    console.log('GA4 env vars not set — skipping');
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(KEY_JSON),
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const client = google.analyticsdata({ version: 'v1beta', auth });
  const res = await client.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'sessions' },
      ],
    },
  });

  const row = res.data.rows?.[0]?.metricValues ?? [];
  const stats = {
    activeUsers: row[0]?.value ?? '0',
    pageViews:   row[1]?.value ?? '0',
    sessions:    row[2]?.value ?? '0',
    fetchedAt:   new Date().toISOString(),
  };

  fs.writeFileSync('ga4-stats.json', JSON.stringify(stats, null, 2));
  console.log('GA4 stats saved:', stats);
}

main().catch(console.error);
