'use strict';
const fs = require('fs');

// Read channel list
const channels = fs.readFileSync('youtube_list.txt', 'utf-8')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'));

// Extract CHANNEL_META from generate-html.js without executing the whole file
const src = fs.readFileSync('generate-html.js', 'utf-8');
const match = src.match(/const CHANNEL_META = (\{[\s\S]*?\n\};)/);
if (!match) { console.error('Could not parse CHANNEL_META from generate-html.js'); process.exit(1); }
const CHANNEL_META = eval('(' + match[1].replace(/\};$/, '}') + ')');

// Check every channel in the list has a CHANNEL_META entry
const missing = channels.filter(ch => {
  if (CHANNEL_META[ch]) return false;
  const lower = ch.toLowerCase();
  return !Object.keys(CHANNEL_META).some(k => k.toLowerCase() === lower);
});

// Check channel_ids.json has no stale entries
const idCache = JSON.parse(fs.readFileSync('channel_ids.json', 'utf-8'));
const channelSet = new Set(channels);
const stale = Object.keys(idCache).filter(k => !channelSet.has(k));

let ok = true;

if (missing.length) {
  console.error('CHANNEL_META missing for:');
  missing.forEach(ch => console.error('  ' + ch));
  ok = false;
}

if (stale.length) {
  console.warn('Stale channel_ids.json entries (safe to ignore, auto-pruned on next tracker run):');
  stale.forEach(k => console.warn('  ' + k));
}

if (ok) {
  console.log(`OK — all ${channels.length} channels have CHANNEL_META entries`);
} else {
  process.exit(1);
}
