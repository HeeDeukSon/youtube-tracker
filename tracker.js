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

async function getChannelId(name) {
  // Try @handle lookup first (works for modern channels)
  const handle = name.startsWith('@') ? name : `@${name}`;
  try {
    const res = await axios.get(`${BASE}/channels`, {
      params: { part: 'id', forHandle: handle, key: API_KEY },
    });
    if (res.data.items?.length) return res.data.items[0].id;
  } catch (_) {}

  // Fall back to search
  const res = await axios.get(`${BASE}/search`, {
    params: { part: 'snippet', type: 'channel', q: name, maxResults: 1, key: API_KEY },
  });
  if (!res.data.items?.length) throw new Error(`Channel not found: ${name}`);
  return res.data.items[0].snippet.channelId;
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

  const results = [];
  for (const channel of CHANNELS) {
    try {
      results.push(await trackChannel(channel));
    } catch (err) {
      console.error(`Failed to fetch "${channel}": ${err.message}`);
    }
  }

  fs.writeFileSync('results.json', JSON.stringify(results, null, 2));
  console.log('\nResults saved to results.json');
}

main();
