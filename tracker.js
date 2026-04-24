require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

const fs = require('fs');
const CHANNELS = fs
  .readFileSync('youtube_list.txt', 'utf-8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'));

// Channel ID cache — avoids expensive search.list calls on repeated runs
const ID_CACHE_FILE = 'channel_ids.json';
const idCache = fs.existsSync(ID_CACHE_FILE)
  ? JSON.parse(fs.readFileSync(ID_CACHE_FILE, 'utf-8'))
  : {};

function saveIdCache() {
  fs.writeFileSync(ID_CACHE_FILE, JSON.stringify(idCache, null, 2));
}

async function getChannelId(name) {
  if (idCache[name]) return idCache[name];

  // Try @handle lookup first (works for modern channels, costs 1 unit)
  const handle = name.startsWith('@') ? name : `@${name}`;
  try {
    const res = await axios.get(`${BASE}/channels`, {
      params: { part: 'id', forHandle: handle, key: API_KEY },
    });
    if (res.data.items?.length) {
      idCache[name] = res.data.items[0].id;
      saveIdCache();
      return idCache[name];
    }
  } catch (_) {}

  // Fall back to search (costs 100 units — only runs once per channel ever)
  const res = await axios.get(`${BASE}/search`, {
    params: { part: 'snippet', type: 'channel', q: name, maxResults: 1, key: API_KEY },
  });
  if (!res.data.items?.length) throw new Error(`Channel not found: ${name}`);
  idCache[name] = res.data.items[0].snippet.channelId;
  saveIdCache();
  return idCache[name];
}

async function getUploadsPlaylistId(channelId) {
  const res = await axios.get(`${BASE}/channels`, {
    params: { part: 'contentDetails', id: channelId, key: API_KEY },
  });
  return res.data.items[0].contentDetails.relatedPlaylists.uploads;
}

async function getLatestVideoIds(playlistId, count = 10) {
  const res = await axios.get(`${BASE}/playlistItems`, {
    params: { part: 'contentDetails', playlistId, maxResults: count, key: API_KEY },
  });
  return res.data.items.map((item) => item.contentDetails.videoId);
}

async function getVideoDetails(videoIds) {
  const res = await axios.get(`${BASE}/videos`, {
    params: {
      part: 'snippet,statistics',
      id: videoIds.join(','),
      key: API_KEY,
    },
  });
  return res.data.items.map((v) => ({
    title: v.snippet.title,
    publishedAt: v.snippet.publishedAt,
    thumbnail: v.snippet.thumbnails?.high?.url ?? v.snippet.thumbnails?.default?.url,
    viewCount: v.statistics.viewCount ?? '0',
    likeCount: v.statistics.likeCount ?? 'hidden',
    commentCount: v.statistics.commentCount ?? 'disabled',
    url: `https://www.youtube.com/watch?v=${v.id}`,
  }));
}

async function trackChannel(name) {
  console.log(`\n=== ${name} ===`);
  const channelId = await getChannelId(name);
  const playlistId = await getUploadsPlaylistId(channelId);
  const videoIds = await getLatestVideoIds(playlistId);
  const videos = await getVideoDetails(videoIds);

  videos.forEach((v, i) => {
    console.log(`\n[${i + 1}] ${v.title}`);
    console.log(`    Published : ${new Date(v.publishedAt).toLocaleDateString()}`);
    console.log(`    Views     : ${Number(v.viewCount).toLocaleString()}`);
    console.log(`    Likes     : ${v.likeCount === 'hidden' ? 'hidden' : Number(v.likeCount).toLocaleString()}`);
    console.log(`    Comments  : ${v.commentCount === 'disabled' ? 'disabled' : Number(v.commentCount).toLocaleString()}`);
    console.log(`    Thumbnail : ${v.thumbnail}`);
    console.log(`    URL       : ${v.url}`);
  });

  return { channel: name, videos };
}

async function main() {
  if (!API_KEY) {
    console.error('ERROR: YOUTUBE_API_KEY is not set in your .env file');
    process.exit(1);
  }

  let ok = 0, failed = 0, quotaHit = false;
  const results = [];
  for (const channel of CHANNELS) {
    try {
      results.push(await trackChannel(channel));
      ok++;
    } catch (err) {
      const reason = err.response?.data?.error?.errors?.[0]?.reason || err.message;
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        console.error(`QUOTA EXHAUSTED at "${channel}" — stopping early`);
        quotaHit = true;
        break;
      }
      console.error(`Failed "${channel}": ${reason}`);
      failed++;
    }
  }

  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
  console.log(`\nDone: ${ok} fetched, ${failed} failed${quotaHit ? ', QUOTA EXHAUSTED' : ''}`);

  // Prune stale entries from channel ID cache
  const channelSet = new Set(CHANNELS);
  let pruned = 0;
  for (const key of Object.keys(idCache)) {
    if (!channelSet.has(key)) { delete idCache[key]; pruned++; }
  }
  if (pruned) { saveIdCache(); console.log(`Pruned ${pruned} stale cache entries`); }

  if (quotaHit) process.exit(2);
}

main();
