const { youtubeApiKey: API_KEY } = require('../config');
const axios = require('axios');

const BASE = 'https://www.googleapis.com/youtube/v3';

const VIDEOS_PER_CHANNEL = 10;
const DESCRIPTION_MAX_CHARS = 2000;
const { DEFAULT_CATEGORY } = require('../constants');

const fs = require('fs');
const CHANNELS = [];
const channelMeta = {};
let _currentCategory = DEFAULT_CATEGORY;
let _currentHandle = null;

const _lines = fs.readFileSync('youtube-tracker.txt', 'utf-8').split('\n');
for (let line of _lines) {
  const trimmed = line.trim();
  
  const secMatch = line.match(/SECTION \d+ — ([^║]+)/);
  if (secMatch) {
    _currentCategory = secMatch[1].trim();
  }
  
  if (trimmed.startsWith('Handle')) {
    _currentHandle = trimmed.split(':')[1].trim();
    CHANNELS.push(_currentHandle);
    channelMeta[_currentHandle] = { category: _currentCategory, tags: [] };
  }
  
  if (trimmed.startsWith('Language') && _currentHandle) {
    const lang = trimmed.split(':')[1].trim();
    if (lang && !channelMeta[_currentHandle].tags.includes(lang)) {
      channelMeta[_currentHandle].tags.push(lang);
    }
  }

  if (trimmed.startsWith('Tags') && _currentHandle) {
    const tagStr = trimmed.split(':')[1].trim();
    if (tagStr) {
      const parsedTags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
      channelMeta[_currentHandle].tags.push(...parsedTags);
    }
  }
}

function getApiErrorReason(err) {
  return err.response?.data?.error?.errors?.[0]?.reason;
}

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

async function getLatestVideoIds(playlistId, count = VIDEOS_PER_CHANNEL) {
  const res = await axios.get(`${BASE}/playlistItems`, {
    params: { part: 'contentDetails', playlistId, maxResults: count, key: API_KEY },
  });
  return res.data.items.map((item) => item.contentDetails.videoId);
}

async function getVideoDetails(videoIds) {
  const res = await axios.get(`${BASE}/videos`, {
    params: {
      part: 'snippet,statistics,status,contentDetails',
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
    description: (v.snippet.description ?? '').slice(0, DESCRIPTION_MAX_CHARS),
    url: `https://www.youtube.com/watch?v=${v.id}`,
    embeddable: v.status?.embeddable ?? true,
    duration: v.contentDetails?.duration ?? '',
    _id: v.id,
  }));
}

async function getVideoComments(videoId) {
  try {
    const res = await axios.get(`${BASE}/commentThreads`, {
      params: { part: 'snippet', videoId, order: 'relevance', maxResults: 10, key: API_KEY },
    });
    return res.data.items.map((item) => {
      const s = item.snippet.topLevelComment.snippet;
      return {
        author: s.authorDisplayName,
        text: s.textOriginal.slice(0, 500),
        likeCount: s.likeCount ?? 0,
        publishedAt: s.publishedAt,
      };
    });
  } catch (err) {
    const reason = getApiErrorReason(err);
    if (['quotaExceeded', 'dailyLimitExceeded'].includes(reason)) throw err;
    if (['commentsDisabled', 'videoNotFound'].includes(reason) ||
        [403, 404].includes(err.response?.status)) return [];
    throw err;
  }
}

async function trackChannel(name) {
  console.log(`\n=== ${name} ===`);
  const channelId = await getChannelId(name);
  const playlistId = await getUploadsPlaylistId(channelId);
  const videoIds = await getLatestVideoIds(playlistId);
  const videos = await getVideoDetails(videoIds);

  for (const v of videos) {
    try {
      v.comments = await getVideoComments(v._id);
    } catch (err) {
      const reason = getApiErrorReason(err);
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') throw err;
      console.warn(`  Comment fetch failed for ${v._id}: ${reason || err.message}`);
      v.comments = [];
    }
    delete v._id;
  }

  videos.forEach((v, i) => {
    console.log(`\n[${i + 1}] ${v.title}`);
    console.log(`    Published : ${new Date(v.publishedAt).toLocaleDateString()}`);
    console.log(`    Views     : ${Number(v.viewCount).toLocaleString()}`);
    console.log(`    Likes     : ${v.likeCount === 'hidden' ? 'hidden' : Number(v.likeCount).toLocaleString()}`);
    console.log(`    Comments  : ${v.commentCount === 'disabled' ? 'disabled' : Number(v.commentCount).toLocaleString()}`);
    console.log(`    Thumbnail : ${v.thumbnail}`);
    console.log(`    URL       : ${v.url}`);
  });

  const meta = channelMeta[name] || { category: DEFAULT_CATEGORY, tags: [] };
  return { channel: name, category: meta.category, tags: meta.tags, videos };
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
      const reason = getApiErrorReason(err) || err.message;
      if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
        console.error(`QUOTA EXHAUSTED at "${channel}" — stopping early`);
        quotaHit = true;
        break;
      }
      console.error(`Failed "${channel}": ${reason}`);
      failed++;
    }
  }

  // Merge with existing results.json — preserve data only for channels still tracked but not fetched this run
  let finalResults = results;
  try {
    const existing = JSON.parse(fs.readFileSync('results.json', 'utf-8'));
    const fetched = new Set(results.map(r => r.channel));
    const channelSet = new Set(CHANNELS);
    const preserved = existing.filter(r => channelSet.has(r.channel) && !fetched.has(r.channel));
    if (preserved.length) {
      finalResults = [...results, ...preserved];
      console.log(`Preserved ${preserved.length} channels from previous results.json`);
    }
  } catch (_) {}
  fs.writeFileSync('results.json', JSON.stringify(finalResults, null, 2));
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
