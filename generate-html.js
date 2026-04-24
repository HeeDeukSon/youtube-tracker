'use strict';
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('results.json', 'utf-8'));
const today = new Date().toISOString().slice(0, 10);

const CHANNEL_META = {
  // AI — Korean
  'todaycode':         { category: 'AI', tags: ['Claude', 'Korean', 'Dev Tools'] },
  '평범한 사업가':       { category: 'AI', tags: ['Claude', 'Korean', 'Business', 'Podcast'] },
  '오후5시':            { category: 'AI', tags: ['Claude', 'Korean', 'AI News'] },
  '코드깎는 노인':       { category: 'AI', tags: ['Claude', 'Korean', 'Coding'] },
  '오빠두엑셀':          { category: 'AI', tags: ['Korean', 'Productivity', 'Excel'] },
  '@Oppadu':           { category: 'AI', tags: ['Korean', 'Productivity', 'Excel'] },
  '노정석':             { category: 'AI', tags: ['Korean', 'Business', 'Podcast'] },
  '@chester_roh':      { category: 'AI', tags: ['Korean', 'Business', 'Podcast'] },
  '실밸개발자':          { category: 'AI', tags: ['Korean', 'Dev Career'] },
  '윤자동':             { category: 'AI', tags: ['Claude', 'Korean', 'Automation', 'Business'] },
  // AI — English
  'jeff su':           { category: 'AI', tags: ['Claude', 'English', 'Productivity'] },
  'Greg Isenberg':     { category: 'AI', tags: ['English', 'Business', 'Startup'] },
  'Ali Abdaal':        { category: 'AI', tags: ['English', 'Productivity'] },
  "Lenny's Podcast":   { category: 'AI', tags: ['English', 'Product', 'Podcast'] },
  'Nate B Jones':      { category: 'AI', tags: ['English', 'AI News', 'Dev Career'] },
  'Julian Goldie':     { category: 'AI', tags: ['English', 'AI News'] },
  'Nick Saraev':       { category: 'AI', tags: ['Claude', 'English', 'Automation'] },
  'Fireship':          { category: 'AI', tags: ['English', 'Dev Tools', 'Coding'] },
  'Andrej Karpathy':   { category: 'AI', tags: ['English', 'ML Research'] },
  't3dotgg':           { category: 'AI', tags: ['English', 'Dev Tools', 'Web Dev'] },
  'Matt Wolfe':        { category: 'AI', tags: ['English', 'AI News'] },
  'Dan Koe':           { category: 'AI', tags: ['English', 'Business', 'Solopreneur'] },
  // Language
  '@engvidadam':              { category: 'LANGUAGE', tags: ['engVid', 'Grammar'] },
  '@engvidalex':              { category: 'LANGUAGE', tags: ['engVid', 'Grammar'] },
  '@engvidronnie':            { category: 'LANGUAGE', tags: ['engVid', 'Grammar'] },
  '@engvidrebecca':           { category: 'LANGUAGE', tags: ['engVid', 'Grammar'] },
  '@engvidemma':              { category: 'LANGUAGE', tags: ['engVid', 'Grammar'] },
  '@engvidjames':             { category: 'LANGUAGE', tags: ['engVid', 'Grammar'] },
  '@engvidjade':              { category: 'LANGUAGE', tags: ['engVid', 'Grammar'] },
  '@engvidgill':              { category: 'LANGUAGE', tags: ['engVid', 'Grammar'] },
  '@engvidbenjamin':          { category: 'LANGUAGE', tags: ['engVid', 'Business English'] },
  '@bbclearningenglish':      { category: 'LANGUAGE', tags: ['BBC', 'Listening'] },
  '@rachelsenglish':          { category: 'LANGUAGE', tags: ['Pronunciation'] },
  '@speakenglishwithvanessa': { category: 'LANGUAGE', tags: ['Speaking'] },
  '@englishclass101':         { category: 'LANGUAGE', tags: ['General'] },
  '@englishwithlucy':         { category: 'LANGUAGE', tags: ['General'] },
  '@mmmenglish_emma':         { category: 'LANGUAGE', tags: ['General'] },
  '@voalearningenglish':      { category: 'LANGUAGE', tags: ['BBC', 'Listening', 'News'] },
  // Training
  'Thomas Frank':             { category: 'TRAINING', tags: ['Productivity', 'Study Skills', 'Notion'] },
  '@freecodecamp':            { category: 'TRAINING', tags: ['Coding', 'Web Dev', 'Programming'] },
  '@cs50':                    { category: 'TRAINING', tags: ['Computer Science', 'Programming', 'Harvard'] },
  '@crashcourse':             { category: 'TRAINING', tags: ['General Learning', 'Science'] },
  '@learnskillsdaily':        { category: 'TRAINING', tags: ['Skills', 'Daily Learning'] },
  // Negotiation
  '@GettingMore':             { category: 'NEGOTIATION', tags: ['Stuart Diamond', 'Negotiation'] },
  '@ChrisVoss':               { category: 'NEGOTIATION', tags: ['Negotiation', 'FBI', 'Tactics'] },
  '@NegotiateAnything':       { category: 'NEGOTIATION', tags: ['Negotiation', 'Podcast'] },
  '@charismaoncommand':       { category: 'NEGOTIATION', tags: ['Persuasion', 'Body Language'] },
  '@ThinkFastTalkSmart':      { category: 'NEGOTIATION', tags: ['Communication', 'Public Speaking'] },
};

function getMeta(name) {
  if (CHANNEL_META[name]) return CHANNEL_META[name];
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(CHANNEL_META)) {
    if (k.toLowerCase() === lower) return v;
  }
  return { category: 'AI', tags: [] };
}

// Flatten all videos
const allVideos = [];
data.forEach(ch => {
  const meta = getMeta(ch.channel);
  ch.videos.forEach(v => {
    allVideos.push({
      title: v.title,
      publishedAt: v.publishedAt,
      thumbnail: v.thumbnail,
      viewCount: v.viewCount,
      likeCount: v.likeCount,
      url: v.url,
      channelName: ch.channel,
      category: meta.category,
      tags: meta.tags,
      trending: false,
    });
  });
});

// Mark trending: top 15% by view count
allVideos.sort((a, b) => Number(b.viewCount) - Number(a.viewCount));
const trendCut = Math.floor(allVideos.length * 0.15);
allVideos.slice(0, trendCut).forEach(v => { v.trending = true; });

// Default sort: newest first
allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

const totalVideos = allVideos.length;
const totalChannels = data.length;
const videosJson = JSON.stringify(allVideos);

// Load persisted bookmarks from disk (survives weekly tracker.js regeneration)
let savedVideos = [];
try { savedVideos = JSON.parse(fs.readFileSync('bookmarks.json', 'utf-8')); } catch (_) {}
const savedJson = JSON.stringify(savedVideos);

const html = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Your valuable views for the world</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:           #0f0f0f;
      --bg2:          #1a1a1a;
      --surface:      #272727;
      --text:         #f1f1f1;
      --text2:        #aaaaaa;
      --text3:        #717171;
      --border:       #3f3f3f;
      --chip:         #272727;
      --chip-active:  #f1f1f1;
      --chip-active-t:#0f0f0f;
      --tag-bg:       #1a2814;
      --tag-text:     #6bcb6b;
    }
    [data-theme="light"] {
      --bg:           #f9f9f9;
      --bg2:          #efefef;
      --surface:      #ffffff;
      --text:         #0f0f0f;
      --text2:        #606060;
      --text3:        #909090;
      --border:       #dddddd;
      --chip:         #e5e5e5;
      --chip-active:  #0f0f0f;
      --chip-active-t:#f9f9f9;
      --tag-bg:       #e6f4e6;
      --tag-text:     #2a7a2a;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      min-height: 100vh;
      transition: background .2s, color .2s;
    }

    /* ── Sticky topbar ───────────────────────────────── */
    .topbar {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
    }
    .search-wrap {
      flex: 1; max-width: 500px; margin: 0 auto; position: relative;
    }
    .search-wrap svg {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      color: var(--text3); pointer-events: none;
    }
    #search {
      width: 100%; background: var(--surface); border: 1px solid var(--border);
      border-radius: 24px; color: var(--text); font-size: 14px;
      padding: 8px 16px 8px 38px; outline: none; transition: border-color .15s;
    }
    #search:focus { border-color: var(--text2); }
    #search::placeholder { color: var(--text3); }
    .icon-btn {
      background: var(--chip); border: none; color: var(--text);
      border-radius: 8px; padding: 8px 12px; font-size: 13px;
      cursor: pointer; white-space: nowrap; transition: background .15s;
    }
    .icon-btn:hover { background: var(--border); }
    .icon-btn.active { background: var(--chip-active); color: var(--chip-active-t); }
    .icon-btn.bm-active { background: #f59e0b; color: #000; }

    /* ── Page header ─────────────────────────────────── */
    header { padding: 18px 16px 0; text-align: center; }
    header h1 {
      font-size: clamp(16px, 3.5vw, 22px); font-weight: 700; color: var(--text);
    }
    .subtitle { font-size: 12px; color: var(--text3); margin-top: 4px; }

    /* ── Category tabs + sort row ────────────────────── */
    .tabs-row {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px 0; flex-wrap: wrap;
    }
    .tabs { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
    .tab {
      background: var(--chip); color: var(--text); border: none;
      border-radius: 8px; padding: 7px 14px; font-size: 14px; font-weight: 500;
      cursor: pointer; white-space: nowrap; transition: background .15s;
    }
    .tab:hover { background: var(--border); }
    .tab.active { background: var(--chip-active); color: var(--chip-active-t); }

    .controls { display: flex; gap: 6px; align-items: center; }
    select.sort-sel {
      background: var(--chip); color: var(--text); border: 1px solid var(--border);
      border-radius: 8px; padding: 6px 10px; font-size: 13px; cursor: pointer; outline: none;
    }

    /* ── Mobile: scrollable tabs + compact controls ──── */
    @media (max-width: 640px) {
      .tabs-row { flex-direction: column; align-items: stretch; gap: 4px; padding: 8px 12px 0; }
      .tabs { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; -ms-overflow-style: none; padding-bottom: 2px; }
      .tabs::-webkit-scrollbar { display: none; }
      .tab { padding: 5px 11px; font-size: 13px; white-space: nowrap; }
      .controls { justify-content: flex-end; flex-wrap: nowrap; }
      .icon-btn { padding: 5px 9px; font-size: 12px; }
      select.sort-sel { padding: 5px 8px; font-size: 12px; }
    }

    /* ── Sub-tags ────────────────────────────────────── */
    #subtags {
      display: flex; gap: 6px; flex-wrap: wrap;
      padding: 10px 16px 0; min-height: 0;
    }
    .subtag {
      background: var(--bg2); color: var(--text2);
      border: 1px solid var(--border); border-radius: 20px;
      padding: 4px 12px; font-size: 12px; cursor: pointer; transition: all .15s;
    }
    .subtag:hover { border-color: var(--text2); color: var(--text); }
    .subtag.active { background: var(--chip-active); color: var(--chip-active-t); border-color: transparent; }

    /* ── Result count ────────────────────────────────── */
    #result-count { padding: 10px 16px 0; font-size: 12px; color: var(--text3); }

    /* ── Grid ────────────────────────────────────────── */
    #container {
      padding: 12px 14px 48px; max-width: 1440px; margin: 0 auto;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    @media (max-width: 1100px) { .grid { grid-template-columns: repeat(3,1fr); } }
    @media (max-width: 720px)  { .grid { grid-template-columns: repeat(2,1fr); gap: 10px; } }
    @media (max-width: 420px)  { .grid { grid-template-columns: 1fr; } }

    /* ── Channel view ────────────────────────────────── */
    .channel-view { display: flex; flex-direction: column; gap: 28px; }
    .ch-title {
      font-size: 15px; font-weight: 700;
      padding: 0 0 10px; border-bottom: 1px solid var(--border); margin-bottom: 12px;
    }
    .ch-count { font-size: 12px; font-weight: 400; color: var(--text3); margin-left: 8px; }
    .ch-row {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
    }

    /* ── Card ────────────────────────────────────────── */
    .card {
      display: flex; flex-direction: column;
      cursor: pointer; border-radius: 10px; overflow: hidden;
      transition: transform .15s; position: relative;
    }
    .card:hover { transform: translateY(-2px); }

    .thumb {
      position: relative; aspect-ratio: 16/9;
      background: var(--surface); border-radius: 10px; overflow: hidden;
    }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .views-badge {
      position: absolute; bottom: 6px; right: 6px;
      background: rgba(0,0,0,.82); color: #fff;
      font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px;
    }
    .trend-badge {
      position: absolute; top: 6px; left: 6px; font-size: 15px; line-height: 1;
    }
    .new-badge {
      position: absolute; top: 6px; right: 6px;
      background: #22c55e; color: #fff;
      font-size: 10px; font-weight: 700; padding: 2px 6px;
      border-radius: 4px; letter-spacing: .5px;
    }

    .info {
      padding: 10px 4px 6px; display: flex; flex-direction: column;
      gap: 4px; position: relative;
    }
    .vid-title {
      font-size: 13px; font-weight: 600; line-height: 1.45; color: var(--text);
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden; padding-right: 24px;
    }
    .ch-name { font-size: 12px; color: var(--text2); }
    .meta { font-size: 11px; color: var(--text3); display: flex; gap: 4px; flex-wrap: wrap; }
    .tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 2px; }
    .tag {
      background: var(--tag-bg); color: var(--tag-text);
      font-size: 10px; padding: 2px 7px; border-radius: 20px;
    }
    .bm-btn {
      position: absolute; top: 8px; right: 2px;
      background: none; border: none; color: var(--text3);
      font-size: 16px; cursor: pointer; padding: 2px; line-height: 1;
      transition: color .15s, transform .15s;
    }
    .bm-btn:hover { color: #f59e0b; transform: scale(1.2); }
    .bm-btn.active { color: #f59e0b; }

    .empty {
      grid-column: 1/-1; text-align: center;
      padding: 64px; color: var(--text3); font-size: 15px;
    }

    footer {
      text-align: center; padding: 20px;
      color: var(--text3); font-size: 12px;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>

<!-- Sticky top bar -->
<div class="topbar">
  <button class="icon-btn" id="theme-btn" onclick="toggleTheme()">☀️</button>
  <div class="search-wrap">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input id="search" type="search" placeholder="Search videos or channels…" oninput="onSearch(this.value)"/>
  </div>
  <button class="icon-btn active" id="btn-grid" onclick="setView('grid')" title="Grid">⊞</button>
  <button class="icon-btn" id="btn-ch" onclick="setView('channels')" title="By channel">≡</button>
</div>

<!-- Page title -->
<header>
  <h1>Your valuable views for the world</h1>
  <p class="subtitle">Last updated ${today} &nbsp;·&nbsp; ${totalVideos} videos &nbsp;·&nbsp; ${totalChannels} channels</p>
</header>

<!-- Category tabs + sort/bookmark controls -->
<div class="tabs-row">
  <div class="tabs">
    <button class="tab active" data-cat="ALL">All</button>
    <button class="tab" data-cat="AI">AI</button>
    <button class="tab" data-cat="LANGUAGE">Language</button>
    <button class="tab" data-cat="TRAINING">Training</button>
    <button class="tab" data-cat="NEGOTIATION">Negotiation</button>
  </div>
  <div class="controls">
    <select class="sort-sel" onchange="setSort(this.value)">
      <option value="date">Latest</option>
      <option value="views">Most viewed</option>
      <option value="likes">Most liked</option>
    </select>
    <button class="icon-btn" id="bm-filter" onclick="toggleBmFilter()">★ Saved</button>
    <button class="icon-btn" id="bm-export" onclick="exportBookmarks()" title="Download bookmarks.json">💾 Export</button>
  </div>
</div>

<!-- Contextual sub-tags -->
<div id="subtags"></div>

<!-- Result count -->
<div id="result-count"></div>

<!-- Main content -->
<div id="container" class="grid"></div>

<footer>YouTube Tracker &nbsp;·&nbsp; ${today}</footer>

<script>
const VIDEOS = ${videosJson};
const SAVED  = ${savedJson};

// ── State ──────────────────────────────────────────────
var S = { cat: 'ALL', tag: null, q: '', sort: 'date', view: 'grid', bmOnly: false };

// bmData: url → full video object (persists across re-generates via bookmarks.json)
var bmData = JSON.parse(localStorage.getItem('yt-bm-data') || '{}');
var bookmarks = new Set(Object.keys(bmData));

// Merge SAVED (embedded from bookmarks.json) into bmData on every load
SAVED.forEach(function(v) { if (!bmData[v.url]) { bmData[v.url] = v; bookmarks.add(v.url); } });
function saveBmStore() { localStorage.setItem('yt-bm-data', JSON.stringify(bmData)); }
saveBmStore();

// New-since-last-visit threshold
var rawLV = localStorage.getItem('yt-lv');
var lvThreshold = rawLV ? new Date(rawLV) : new Date(Date.now() - 7*24*3600e3);
setTimeout(function(){ localStorage.setItem('yt-lv', new Date().toISOString()); }, 10000);

// Persist theme
var savedTheme = localStorage.getItem('yt-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;

// ── Helpers ────────────────────────────────────────────
function fmtNum(n) {
  var x = Number(n);
  if (isNaN(x)) return String(n);
  if (x >= 1e6) return (x/1e6).toFixed(1).replace(/\\.0$/,'') + 'M';
  if (x >= 1e3) return (x/1e3).toFixed(1).replace(/\\.0$/,'') + 'K';
  return x.toLocaleString();
}
function timeAgo(iso) {
  var d = Math.floor((Date.now() - new Date(iso)) / 86400e3);
  if (d < 1)  return 'today';
  if (d < 7)  return d + 'd ago';
  var w = Math.floor(d / 7);
  if (w < 5)  return w + 'w ago';
  var m = Math.floor(d / 30);
  if (m < 12) return m + 'mo ago';
  return Math.floor(d/365) + 'y ago';
}
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Card builder ───────────────────────────────────────
function cardHtml(v) {
  var isNew = new Date(v.publishedAt) > lvThreshold;
  var isBm  = bookmarks.has(v.url);
  var views = fmtNum(v.viewCount);
  var likes = (v.likeCount !== 'hidden') ? fmtNum(v.likeCount) : null;
  var ago   = timeAgo(v.publishedAt);
  var tagHtml = v.tags.length
    ? '<div class="tags">' + v.tags.map(function(t){ return '<span class="tag">'+t+'</span>'; }).join('') + '</div>'
    : '';
  return (
    '<div class="card" data-url="'+esc(v.url)+'">' +
      '<div class="thumb">' +
        '<img src="'+esc(v.thumbnail)+'" alt="" loading="lazy" onerror="this.hidden=true">' +
        '<span class="views-badge">'+views+' views</span>' +
        (v.trending ? '<span class="trend-badge">&#x1F525;</span>' : '') +
        (isNew      ? '<span class="new-badge">NEW</span>' : '') +
      '</div>' +
      '<div class="info">' +
        '<button class="bm-btn'+(isBm?' active':'')+'" data-url="'+esc(v.url)+'">'+(isBm?'&#9733;':'&#9734;')+'</button>' +
        '<p class="vid-title">'+esc(v.title)+'</p>' +
        '<p class="ch-name">'+esc(v.channelName)+'</p>' +
        '<div class="meta"><span>'+ago+'</span>'+(likes?'<span>&middot; '+likes+' likes</span>':'')+'</div>' +
        tagHtml +
      '</div>' +
    '</div>'
  );
}

// ── Render ─────────────────────────────────────────────
function render() {
  // Saved view uses bmData (survives re-generate); normal view uses VIDEOS
  var pool = S.bmOnly ? Object.values(bmData) : VIDEOS;
  var vids = pool.filter(function(v) {
    if (!S.bmOnly) {
      if (S.cat !== 'ALL' && v.category !== S.cat) return false;
      if (S.tag && v.tags.indexOf(S.tag) === -1) return false;
    }
    if (S.q) {
      var q = S.q.toLowerCase();
      if (v.title.toLowerCase().indexOf(q) === -1 && v.channelName.toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  });

  if (S.sort === 'views') vids.sort(function(a,b){ return Number(b.viewCount)-Number(a.viewCount); });
  else if (S.sort === 'likes') vids.sort(function(a,b){ return (Number(b.likeCount)||0)-(Number(a.likeCount)||0); });
  else vids.sort(function(a,b){ return new Date(b.publishedAt)-new Date(a.publishedAt); });

  document.getElementById('result-count').textContent = vids.length + ' video' + (vids.length!==1?'s':'');

  var el = document.getElementById('container');
  if (!vids.length) {
    el.className = 'grid';
    el.innerHTML = '<p class="empty">No videos found.</p>';
    updateSubTags(); return;
  }

  if (S.view === 'channels') {
    el.className = 'channel-view';
    var groups = {};
    var order = [];
    vids.forEach(function(v) {
      if (!groups[v.channelName]) { groups[v.channelName] = []; order.push(v.channelName); }
      groups[v.channelName].push(v);
    });
    el.innerHTML = order.map(function(ch) {
      var vs = groups[ch];
      return '<div class="ch-group">' +
        '<h3 class="ch-title">'+esc(ch)+'<span class="ch-count">'+vs.length+' video'+(vs.length!==1?'s':'')+'</span></h3>' +
        '<div class="ch-row">'+vs.map(cardHtml).join('')+'</div>' +
      '</div>';
    }).join('');
  } else {
    el.className = 'grid';
    el.innerHTML = vids.map(cardHtml).join('');
  }

  updateSubTags();
}

function updateSubTags() {
  var bar = document.getElementById('subtags');
  if (S.cat === 'ALL') { bar.innerHTML = ''; return; }
  var pool = VIDEOS.filter(function(v){ return v.category === S.cat; });
  var seen = {}, tags = [];
  pool.forEach(function(v){ v.tags.forEach(function(t){ if (!seen[t]) { seen[t]=1; tags.push(t); } }); });
  tags.sort();
  bar.innerHTML = ['All'].concat(tags).map(function(t) {
    var active = (t==='All' && !S.tag) || S.tag===t;
    return '<button class="subtag'+(active?' active':'')+'" data-tag="'+t+'">'+t+'</button>';
  }).join('');
}

// ── Event delegation ────────────────────────────────────
document.addEventListener('click', function(e) {
  // Sub-tag click
  var st = e.target.closest('.subtag');
  if (st) { S.tag = (st.dataset.tag === 'All') ? null : st.dataset.tag; render(); return; }

  // Category tab click
  var tab = e.target.closest('.tab');
  if (tab && tab.dataset.cat) {
    S.cat = tab.dataset.cat; S.tag = null;
    document.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('active', b.dataset.cat===S.cat); });
    render(); return;
  }

  // Bookmark button
  var bm = e.target.closest('.bm-btn');
  if (bm) {
    e.stopPropagation();
    var url = bm.dataset.url;
    if (bookmarks.has(url)) {
      bookmarks.delete(url);
      delete bmData[url];
      bm.innerHTML='&#9734;'; bm.classList.remove('active');
    } else {
      bookmarks.add(url);
      // Save full video object so it survives report.html regeneration
      var v = VIDEOS.find(function(x){ return x.url === url; });
      if (v) bmData[url] = v;
      bm.innerHTML='&#9733;'; bm.classList.add('active');
    }
    saveBmStore();
    if (S.bmOnly) render();
    return;
  }

  // Card click → open video
  var card = e.target.closest('.card');
  if (card && card.dataset.url) window.open(card.dataset.url, '_blank');
});

// ── Action handlers ────────────────────────────────────
function onSearch(v) { S.q = v.trim(); render(); }

function setSort(v) { S.sort = v; render(); }

function setView(v) {
  S.view = v;
  document.getElementById('btn-grid').classList.toggle('active', v==='grid');
  document.getElementById('btn-ch').classList.toggle('active', v==='channels');
  render();
}

function toggleBmFilter() {
  S.bmOnly = !S.bmOnly;
  var btn = document.getElementById('bm-filter');
  btn.classList.toggle('bm-active', S.bmOnly);
  render();
}

function exportBookmarks() {
  var vids = Object.values(bmData);
  var blob = new Blob([JSON.stringify(vids, null, 2)], {type: 'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bookmarks.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function toggleTheme() {
  var html = document.documentElement;
  var next = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = next;
  localStorage.setItem('yt-theme', next);
  document.getElementById('theme-btn').textContent = next === 'dark' ? '☀️' : '🌙';
}

// Init theme icon
(function(){
  var t = document.documentElement.dataset.theme;
  document.getElementById('theme-btn').textContent = t === 'dark' ? '☀️' : '🌙';
})();

render();
</script>
</body>
</html>`;

fs.writeFileSync('report.html', html);
console.log('report.html generated — ' + totalVideos + ' videos · ' + totalChannels + ' channels');
console.log('Open report.html in your browser.');
