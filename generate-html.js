'use strict';
const fs = require('fs');

const MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || '';

let ga4Stats = null;
try { ga4Stats = JSON.parse(fs.readFileSync('ga4-stats.json', 'utf-8')); } catch (_) {}

const TRENDING_PERCENTILE = 0.15;
const DEFAULT_CATEGORY = 'AI'; // keep in sync with tracker.js

const data = JSON.parse(fs.readFileSync('results.json', 'utf-8'));
const today = new Date().toISOString().slice(0, 10);

// Flatten all videos
const allVideos = [];
data.forEach(ch => {
  const meta = { category: ch.category || DEFAULT_CATEGORY, tags: ch.tags || [] };
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
      embeddable: v.embeddable ?? true,
      description: v.description || '',
      comments: v.comments || [],
    });
  });
});

// Mark trending: top 15% by view count
allVideos.sort((a, b) => Number(b.viewCount) - Number(a.viewCount));
const trendCut = Math.floor(allVideos.length * TRENDING_PERCENTILE);
allVideos.slice(0, trendCut).forEach(v => { v.trending = true; });

// Default sort: newest first
allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

// Split heavy fields into a separate file to keep report.html small
const videoDetails = {};
allVideos.forEach(v => {
  videoDetails[v.url] = { description: v.description, comments: v.comments };
  delete v.description;
  delete v.comments;
});
// Removed fs.writeFileSync for video-details.json as we are inlining it now

const totalVideos = allVideos.length;
const totalChannels = data.length;
const videosJson = JSON.stringify(allVideos);
const detailsJson = JSON.stringify(videoDetails);

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
  ${MEASUREMENT_ID ? `<!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${MEASUREMENT_ID}');
  </script>` : ''}
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

    html { scroll-behavior: smooth; }
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
      #subtags { display: none !important; }
      #subtag-sel.has-tags { display: block; }
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

    #subtag-sel {
      display: none;
      margin: 8px 16px 0;
      padding: 7px 10px;
      font-size: 13px;
      background: var(--surface); color: var(--text);
      border: 1px solid var(--border); border-radius: 8px;
      outline: none; cursor: pointer;
      width: calc(100% - 32px);
    }

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
    .ext-badge {
      position: absolute; bottom: 6px; left: 6px;
      background: rgba(255,0,0,.82); color: #fff;
      font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
    }

    .info {
      padding: 10px 4px 6px; display: flex; flex-direction: column;
      gap: 4px; position: relative;
    }
    .vid-title {
      font-size: 13px; font-weight: 600; line-height: 1.45; color: var(--text);
      display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical;
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

    /* ── Watch page layout ───────────────────────────── */
    #watch-layout {
      display: none;
      max-width: 1440px;
      margin: 0 auto;
      padding: 12px 14px 48px;
      gap: 24px;
      grid-template-columns: 2fr 1fr;
    }
    #watch-layout.open { display: grid; }

    .watch-player {
      position: relative;
      width: 100%;
      aspect-ratio: 16/9;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
    }
    .watch-player iframe {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      border: none;
    }

    .watch-meta-row {
      margin: 10px 0 4px;
      font-size: 13px;
      color: var(--text3);
    }
    #watch-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text);
      margin: 12px 0 4px;
      line-height: 1.4;
    }
    .watch-yt-link {
      display: inline-block;
      margin: 6px 0 12px;
      font-size: 13px;
      color: #f00;
      font-weight: 600;
      text-decoration: none;
    }
    .watch-yt-link:hover { text-decoration: underline; }

    .watch-section-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      margin: 16px 0 8px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }
    .watch-desc-header {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);
    }
    .watch-desc-header .watch-section-label { margin: 0; padding-top: 0; border-top: none; }
    .watch-desc-dl {
      font-size: 12px; color: var(--text3); text-decoration: none;
      white-space: nowrap; padding: 3px 8px;
      border: 1px solid var(--border); border-radius: 6px;
      transition: color .15s, border-color .15s;
    }
    .watch-desc-dl:hover { color: var(--text); border-color: var(--text2); }
    #watch-desc {
      font-size: 13px;
      color: var(--text2);
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-word;
    }
    #watch-desc a {
      color: var(--accent, #3ea6ff);
      text-decoration: none;
      word-break: break-all;
    }
    #watch-desc a:hover { text-decoration: underline; }
    #watch-desc.collapsed { max-height: 5.1em; overflow: hidden; }
    #watch-desc-toggle {
      background: none;
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text2);
      font-size: 12px;
      cursor: pointer;
      padding: 4px 12px;
      margin-top: 4px;
      display: none;
      transition: color .15s, border-color .15s;
    }
    #watch-desc-toggle.visible { display: inline-block; }
    #watch-desc-toggle:hover { color: var(--text); border-color: var(--text2); }

    .watch-comment {
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }
    .watch-comment:last-child { border-bottom: none; }
    .watch-comment-author {
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
    }
    .watch-comment-meta {
      font-size: 11px;
      color: var(--text3);
      margin-bottom: 4px;
    }
    .watch-comment-text {
      font-size: 13px;
      color: var(--text2);
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    #watch-ask-form { margin-top: 4px; }
    #watch-ask-input-row { display: flex; gap: 8px; }
    #watch-ask-input {
      flex: 1; padding: 9px 11px; font-family: inherit; font-size: 13px;
      background: var(--surface); color: var(--text);
      border: 1px solid var(--border); border-radius: 6px;
      outline: none; transition: border-color .15s;
      scroll-margin-top: 64px;
    }
    #watch-ask-input::placeholder { color: var(--text3); }
    #watch-ask-input:focus { border-color: var(--text2); }
    #watch-ask-submit {
      background: var(--chip-active); color: var(--chip-active-t);
      border: none; border-radius: 6px; padding: 8px 18px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s;
      white-space: nowrap;
    }
    #watch-ask-submit:disabled { opacity: .5; cursor: not-allowed; }
    #watch-ask-status { font-size: 13px; color: var(--text3); margin-top: 6px; }
    #watch-ask-answer {
      display: none; margin-top: 10px; padding: 12px;
      background: var(--bg2); border-radius: 8px;
      font-size: 13px; color: var(--text2); line-height: 1.7;
      white-space: pre-wrap; word-break: break-word;
    }

    #watch-comment-form {
      display: flex; flex-direction: column; gap: 8px; margin-top: 4px;
    }
    #watch-comment-form input,
    #watch-comment-form textarea {
      width: 100%; padding: 9px 11px; font-family: inherit; font-size: 13px;
      background: var(--surface); color: var(--text);
      border: 1px solid var(--border); border-radius: 6px;
      outline: none; transition: border-color .15s;
      scroll-margin-top: 64px;
    }
    #watch-comment-form input::placeholder,
    #watch-comment-form textarea::placeholder { color: var(--text3); }
    #watch-comment-form input:focus,
    #watch-comment-form textarea:focus { border-color: var(--text2); }
    #watch-comment-form textarea { resize: vertical; min-height: 90px; }
    #watch-cf-actions { display: flex; align-items: center; gap: 10px; }
    #watch-cf-submit {
      background: var(--chip-active); color: var(--chip-active-t);
      border: none; border-radius: 6px; padding: 8px 18px;
      font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s;
    }
    #watch-cf-submit:disabled { opacity: .5; cursor: not-allowed; }
    #watch-cf-status { font-size: 13px; color: var(--text3); }
    #watch-cf-copy-row {
      display: none; align-items: center; gap: 7px;
      font-size: 13px; color: var(--text2);
    }
    #watch-cf-copy-row.visible { display: flex; }
    #watch-cf-copy-row input[type="checkbox"] {
      width: auto; cursor: pointer; accent-color: var(--chip-active);
    }
    #watch-cf-copy-row label { cursor: pointer; user-select: none; }
    #watch-cf-requests {
      display: flex; flex-wrap: wrap; gap: 8px 16px;
    }
    #watch-cf-requests label {
      display: flex; align-items: center; gap: 5px;
      font-size: 13px; color: var(--text2); cursor: pointer; user-select: none;
    }
    #watch-cf-requests input[type="checkbox"] {
      width: auto; cursor: pointer; accent-color: var(--chip-active);
    }

    /* ── Watch sidebar ───────────────────────────────── */
    #watch-sidebar {
      overflow-y: auto;
      max-height: calc(100vh - 80px);
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: sticky;
      top: 60px;
    }
    .sidebar-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }
    .sidebar-card {
      display: flex;
      gap: 8px;
      cursor: pointer;
      border-radius: 8px;
      padding: 6px;
      transition: background .15s;
    }
    .sidebar-card:hover { background: var(--surface); }
    .sidebar-thumb {
      width: 120px;
      min-width: 120px;
      aspect-ratio: 16/9;
      border-radius: 4px;
      object-fit: cover;
      background: var(--surface);
    }
    .sidebar-info { flex: 1; overflow: hidden; }
    .sidebar-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sidebar-ch {
      font-size: 11px;
      color: var(--text3);
      margin-top: 3px;
    }

    @media (min-width: 901px) {
      #watch-layout.open {
        position: fixed;
        top: 52px;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 50;
        overflow-y: auto;
        max-width: none;
        margin: 0;
        background: var(--bg);
      }
    }

    @media (max-width: 900px) {
      #watch-layout.open { display: flex; flex-direction: column; }
      #watch-sidebar { max-height: none; position: static; }
      .sidebar-thumb { width: 100px; min-width: 100px; }
      #watch-layout.open .watch-player {
        position: sticky;
        top: 52px;
        z-index: 10;
      }
    }

    /* ── Landscape: auto-hide topbar ─────────────────── */
    #float-back {
      display: none;
      position: fixed;
      bottom: 16px;
      left: 16px;
      z-index: 200;
      background: rgba(0,0,0,0.6);
      color: #fff;
      border: none;
      border-radius: 20px;
      padding: 8px 14px;
      font-size: 14px;
      cursor: pointer;
      align-items: center;
      gap: 6px;
    }
    @media (orientation: landscape) and (max-height: 500px) {
      .topbar {
        transition: transform 0.25s ease;
      }
      .topbar.hidden {
        transform: translateY(-100%);
      }
      body.watch-open .topbar {
        display: none;
      }
      body.watch-open #float-back {
        display: flex;
      }
    }
  </style>
</head>
<body>

<button id="float-back" onclick="closeWatch()">← Back</button>

<!-- Sticky top bar -->
<div class="topbar">
  <button class="icon-btn" id="theme-btn" onclick="toggleTheme()">☀️</button>
  <button class="icon-btn" id="back-btn" onclick="closeWatch()" style="display:none">← Back</button>
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
  <p class="subtitle">Last updated ${today} &nbsp;·&nbsp; ${totalVideos} videos &nbsp;·&nbsp; ${totalChannels} channels${ga4Stats ? ` &nbsp;·&nbsp; ${Number(ga4Stats.activeUsers).toLocaleString()} visitors (7d)` : ''}</p>
</header>

<!-- Category tabs + sort/bookmark controls -->
<div class="tabs-row">
  <div class="tabs">
    <button class="tab active" data-cat="ALL">All</button>
    ${Array.from(new Set(allVideos.map(v => v.category))).filter(Boolean).sort().map(cat => `<button class="tab" data-cat="${cat}">${cat}</button>`).join('\n    ')}
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
<select id="subtag-sel" onchange="onSubtagSel(this.value)"></select>

<!-- Result count -->
<div id="result-count"></div>

<!-- Main content -->
<div id="container" class="grid"></div>

<!-- Watch page -->
<div id="watch-layout">
  <div class="watch-main">
    <div class="watch-player">
      <iframe id="watch-iframe" allow="autoplay; encrypted-media" allowfullscreen></iframe>
    </div>
    <p id="watch-title"></p>
    <div class="watch-meta-row" id="watch-meta"></div>
    <a id="watch-yt-link" class="watch-yt-link" href="#" target="_blank" rel="noopener">▶ Open in YouTube</a>
    <div class="watch-desc-header">
      <p class="watch-section-label">Description</p>
      <a id="watch-desc-dl" class="watch-desc-dl" style="display:none" href="#" download>⬇ Download</a>
    </div>
    <div id="watch-desc" class="collapsed"></div>
    <button id="watch-desc-toggle" onclick="toggleDesc()">Show more</button>
    <p class="watch-section-label">Ask AI about this video</p>
    <div id="watch-ask-form">
      <div id="watch-ask-input-row">
        <input id="watch-ask-input" type="text" placeholder="Ask a question about this video…" />
        <button id="watch-ask-submit">Ask</button>
      </div>
      <div id="watch-ask-status"></div>
      <div id="watch-ask-answer"></div>
    </div>
    <p class="watch-section-label">Leave a Comment</p>
    <div id="watch-comment-form">
      <input  id="watch-cf-name"  type="text"  placeholder="Your name *" />
      <input  id="watch-cf-email" type="email" placeholder="Email (optional)" />
      <div id="watch-cf-copy-row">
        <input type="checkbox" id="watch-cf-copy" />
        <label for="watch-cf-copy">Send me a copy of this comment</label>
      </div>
      <textarea id="watch-cf-body" placeholder="Your comment…" rows="4"></textarea>
      <div id="watch-cf-requests">
        <label><input type="checkbox" value="Conversation" /> Conversation</label>
        <label><input type="checkbox" value="Need Help" /> Need Help</label>
        <label><input type="checkbox" value="More Info" /> More Info</label>
        <label><input type="checkbox" value="Need Lecture" /> Need Lecture</label>
      </div>
      <div id="watch-cf-actions">
        <button id="watch-cf-submit">Send comment</button>
        <span   id="watch-cf-status"></span>
      </div>
    </div>
  </div>
  <div id="watch-sidebar"></div>
</div>

<footer>YouTube Tracker &nbsp;·&nbsp; ${today}</footer>

<script>
const VIDEOS = ${videosJson};
const SAVED  = ${savedJson};
const DETAILS = ${detailsJson};
const LANGUAGE_TAGS = ['English', 'Korean']; // keep in sync with patch.js and tracker.js

// Replace with your deployed GAS web app URL:
var GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz7SFGetH10Jfg8jd0pridPpagpia1gN9KW_vb45JzPsoNXj5o6Bk7AXoyG-AK2ohXJ4g/exec';

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
function getVideoId(url) {
  try { return new URL(url).searchParams.get('v') || ''; } catch(_) { return ''; }
}
function renderDesc(el, text) {
  el.textContent = '';
  var URL_RE = /(https?:\\/\\/[^\\s\\])"'<>]+)/g;
  var parts = text.split(URL_RE);
  parts.forEach(function(part) {
    if (URL_RE.test(part)) {
      var a = document.createElement('a');
      a.href = part;
      a.textContent = part;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      el.appendChild(a);
    } else {
      el.appendChild(document.createTextNode(part));
    }
    URL_RE.lastIndex = 0;
  });
}

// ── Watch page ──────────────────────────────────────────
function loadDetails(cb) {
  cb(DETAILS);
}

function openWatch(v) {
  var vid = getVideoId(v.url);
  document.getElementById('watch-iframe').src =
    'https://www.youtube.com/embed/' + vid + '?autoplay=1&rel=0';

  document.getElementById('watch-title').textContent = v.title;
  document.getElementById('watch-meta').textContent =
    v.channelName + ' · ' + fmtNum(v.viewCount) + ' views · ' + timeAgo(v.publishedAt);
  document.getElementById('watch-yt-link').href = v.url;

  var descEl   = document.getElementById('watch-desc');
  var descDl   = document.getElementById('watch-desc-dl');
  var descTog  = document.getElementById('watch-desc-toggle');
  descEl.textContent = 'Loading…';
  descEl.classList.add('collapsed');
  descTog.classList.remove('visible');
  descDl.style.display = 'none';
  if (descDl._blobUrl) { URL.revokeObjectURL(descDl._blobUrl); descDl._blobUrl = null; }

  loadDetails(function(details) {
    var d    = details[v.url] || {};
    var desc = (d.description || '').trim();
    if (desc) { renderDesc(descEl, desc); }
    else       { descEl.textContent = 'No description available.'; }
    descEl.classList.add('collapsed');

    if (descEl.scrollHeight > descEl.clientHeight) {
      descTog.textContent = 'Show more';
      descTog.classList.add('visible');
    }

    if (desc) {
      var blob = new Blob([desc], { type: 'text/plain' });
      descDl._blobUrl   = URL.createObjectURL(blob);
      descDl.href       = descDl._blobUrl;
      descDl.download   = v.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') + '_description.txt';
      descDl.style.display = '';
    }
  });

  setupAskAiForm(v);
  setupCommentForm(v);
  loadRelatedVideos(v);

  document.getElementById('watch-layout').classList.add('open');
  document.body.classList.add('watch-open');
  document.getElementById('back-btn').style.display = '';
  if (window.innerWidth <= 900) {
    document.getElementById('container').style.display = 'none';
    document.querySelector('.tabs-row').style.display = 'none';
    document.getElementById('subtags').style.display = 'none';
    document.getElementById('subtag-sel').style.display = 'none';
    document.getElementById('result-count').style.display = 'none';
    document.querySelector('header').style.display = 'none';
    window.scrollTo(0, 0);
  }
}

function scrollFieldIntoView(el) {
  if (window.innerWidth > 900) return;
  var vvh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  var rect = el.getBoundingClientRect();
  var player = document.querySelector('.watch-player');
  var videoBottom = player ? player.getBoundingClientRect().bottom : 52;
  var gap = 8;
  if (rect.top < videoBottom + gap) {
    window.scrollBy({ top: rect.top - (videoBottom + gap), behavior: 'smooth' });
  } else if (rect.bottom > vvh - gap) {
    window.scrollBy({ top: rect.bottom - vvh + gap, behavior: 'smooth' });
  }
}

function setupAskAiForm(v) {
  var askInput  = document.getElementById('watch-ask-input');
  var askSubmit = document.getElementById('watch-ask-submit');
  var askStatus = document.getElementById('watch-ask-status');
  var askAnswer = document.getElementById('watch-ask-answer');

  askInput.value = '';
  askStatus.textContent = '';
  askAnswer.style.display = 'none';
  askAnswer.textContent = '';
  askSubmit.disabled = false;

  askInput.onfocus = function() {
    var self = this;
    setTimeout(function() { scrollFieldIntoView(self); }, 350);
  };

  askSubmit.onclick = function() {
    var question = askInput.value.trim();
    if (!question) { askStatus.textContent = 'Please enter a question.'; return; }

    askSubmit.disabled = true;
    askStatus.textContent = 'Thinking…';
    askAnswer.style.display = 'none';

    loadDetails(function(details) {
      var d = details[v.url] || {};
      var description = (d.description || '').slice(0, 500);

      var params = new URLSearchParams({
        type: 'ask',
        question: question,
        videoTitle: v.title,
        channelName: v.channelName,
        description: description
      });

      fetch(GAS_ENDPOINT + '?' + params.toString())
        .then(function(r) { return r.json(); })
        .then(function(data) {
          askAnswer.textContent = data.answer || 'No answer available.';
          askAnswer.style.display = 'block';
          askStatus.textContent = '';
          askSubmit.disabled = false;
        })
        .catch(function() {
          askStatus.textContent = 'Failed to get answer. Please try again.';
          askSubmit.disabled = false;
        });
    });
  };
}

function setupCommentForm(v) {
  var cfName    = document.getElementById('watch-cf-name');
  var cfEmail   = document.getElementById('watch-cf-email');
  var cfBody    = document.getElementById('watch-cf-body');
  var cfSubmit  = document.getElementById('watch-cf-submit');
  var cfStatus  = document.getElementById('watch-cf-status');
  var cfCopyRow = document.getElementById('watch-cf-copy-row');
  var cfCopy    = document.getElementById('watch-cf-copy');

  cfName.value = ''; cfEmail.value = ''; cfBody.value = '';
  cfStatus.textContent = ''; cfSubmit.disabled = false;
  cfCopy.checked = false;
  cfCopyRow.classList.remove('visible');
  document.querySelectorAll('#watch-cf-requests input').forEach(function(c) { c.checked = false; });

  [cfName, cfEmail, cfBody].forEach(function(el) {
    el.onfocus = function() {
      var self = this;
      setTimeout(function() { scrollFieldIntoView(self); }, 350);
    };
  });
  document.querySelectorAll('#watch-cf-requests input[type="checkbox"]').forEach(function(cb) {
    cb.onclick = function() { scrollFieldIntoView(this); };
  });

  cfEmail.oninput = function() {
    if (cfEmail.value.trim()) {
      cfCopyRow.classList.add('visible');
      cfCopy.checked = true;
    } else {
      cfCopyRow.classList.remove('visible');
      cfCopy.checked = false;
    }
  };

  cfSubmit.onclick = function() {
    var name    = cfName.value.trim();
    var comment = cfBody.value.trim();
    if (!name)    { cfStatus.textContent = 'Please enter your name.'; return; }
    if (!comment) { cfStatus.textContent = 'Please enter a comment.'; return; }

    cfSubmit.disabled = true;
    cfStatus.textContent = 'Sending…';

    var requests = Array.from(
      document.querySelectorAll('#watch-cf-requests input:checked')
    ).map(function(c) { return c.value; }).join(', ');

    var emailBody =
      "Thank you for sharing your thoughts! Rehearsing what you've learned and expressing it in your own words is highly effective for English mastery. " +
      "I encourage you to keep building on these concepts to spark your own creative ideas and perspectives.\\n\\n" +
      "[Your Thoughts for Today]\\n" +
      comment + "\\n\\n" +
      "Remember, language acquisition is all about building consistent habits.\\n" +
      "Great job today!";

    fetch(GAS_ENDPOINT, {
      method: 'POST',
      mode:   'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        videoTitle:     v.title,
        channelName:    v.channelName,
        videoUrl:       v.url,
        publishedAt:    v.publishedAt,
        name:           name,
        email:          cfEmail.value.trim(),
        comment:        comment,
        emailSubject:   'Your thoughts on: ' + v.title,
        emailBody:      emailBody,
        submittedAt:    new Date().toISOString(),
        requests:       requests,
        sendCopyToUser: !!(cfEmail.value.trim() && cfCopy.checked)
      })
    }).then(function() {
      cfStatus.textContent = 'Comment sent! Thank you.';
      cfName.value = ''; cfEmail.value = ''; cfBody.value = '';
      cfCopy.checked = false;
      cfCopyRow.classList.remove('visible');
      document.querySelectorAll('#watch-cf-requests input').forEach(function(c) { c.checked = false; });
    }).catch(function() {
      cfSubmit.disabled = false;
      cfStatus.textContent = 'Failed to send. Please try again.';
    });
  };
}

function loadRelatedVideos(v) {
  var sidebar = document.getElementById('watch-sidebar');
  var vTags = (v.tags || []).filter(function(t) { return !LANGUAGE_TAGS.includes(t); });
  var related = VIDEOS.filter(function(x) {
    return x.url !== v.url && x.tags && x.tags.some(function(t) { return vTags.includes(t); });
  });
  // Fallback to category if no overlapping tags found
  if (related.length === 0) {
    related = VIDEOS.filter(function(x) { return x.category === v.category && x.url !== v.url; });
  }

  var sidebarTitle = vTags.length ? vTags.join(', ') : v.category;
  sidebar.innerHTML = '<div class="sidebar-label">Related · ' + sidebarTitle + '</div>' +
    related.map(function(r) {
      return '<div class="sidebar-card" data-url="' + esc(r.url) + '">' +
        '<img class="sidebar-thumb" src="' + esc(r.thumbnail) + '" alt="" loading="lazy" onerror="this.hidden=true">' +
        '<div class="sidebar-info">' +
          '<div class="sidebar-title">' + esc(r.title) + '</div>' +
          '<div class="sidebar-ch">' + esc(r.channelName) + ' · ' + fmtNum(r.viewCount) + ' views</div>' +
        '</div>' +
      '</div>';
    }).join('');
}

function closeWatch() {
  document.getElementById('watch-layout').classList.remove('open');
  document.body.classList.remove('watch-open');
  document.getElementById('watch-iframe').src = '';
  document.getElementById('back-btn').style.display = 'none';
  if (window.innerWidth <= 900) {
    document.getElementById('container').style.display = '';
    document.querySelector('.tabs-row').style.display = '';
    document.getElementById('subtags').style.display = '';
    document.getElementById('subtag-sel').style.display = '';
    document.getElementById('result-count').style.display = '';
    document.querySelector('header').style.display = '';
  }
}

function toggleDesc() {
  var el  = document.getElementById('watch-desc');
  var btn = document.getElementById('watch-desc-toggle');
  var collapsed = el.classList.toggle('collapsed');
  btn.textContent = collapsed ? 'Show more' : 'Show less';
}

document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeWatch(); });

(function() {
  var lastY = 0;
  var landscape = window.matchMedia('(orientation: landscape) and (max-height: 500px)');
  window.addEventListener('scroll', function() {
    var topbar = document.querySelector('.topbar');
    if (!landscape.matches) { topbar.classList.remove('hidden'); return; }
    var y = window.scrollY;
    if (y > lastY + 5) topbar.classList.add('hidden');
    else if (y < lastY - 5) topbar.classList.remove('hidden');
    lastY = y;
  }, { passive: true });
})();

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
        (v.embeddable === false ? '<span class="ext-badge">&#x2197; YT</span>' : '') +
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
  var sel = document.getElementById('subtag-sel');
  if (S.cat === 'ALL') {
    bar.innerHTML = '';
    sel.innerHTML = '';
    sel.classList.remove('has-tags');
    return;
  }
  var pool = VIDEOS.filter(function(v){ return v.category === S.cat; });
  var seen = {}, tags = [];
  pool.forEach(function(v){ v.tags.forEach(function(t){ if (!seen[t]) { seen[t]=1; tags.push(t); } }); });
  tags.sort();
  var allTags = ['All'].concat(tags);
  bar.innerHTML = allTags.map(function(t) {
    var active = (t==='All' && !S.tag) || S.tag===t;
    return '<button class="subtag'+(active?' active':'')+'" data-tag="'+t+'">'+t+'</button>';
  }).join('');
  sel.innerHTML = allTags.map(function(t) {
    var selected = (t==='All' && !S.tag) || S.tag===t;
    return '<option value="'+t+'"'+(selected?' selected':'')+'>'+t+'</option>';
  }).join('');
  sel.classList.add('has-tags');
}

function onSubtagSel(val) {
  S.tag = (val === 'All') ? null : val;
  render();
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

  // Sidebar card click → switch player
  var sc = e.target.closest('.sidebar-card');
  if (sc && sc.dataset.url) {
    var sv = VIDEOS.find(function(x){ return x.url === sc.dataset.url; });
    if (sv) openWatch(sv);
    return;
  }

  // Card click → open watch page (or YouTube directly if embedding is disabled)
  var card = e.target.closest('.card');
  if (card && card.dataset.url) {
    var vid = VIDEOS.find(function(x){ return x.url === card.dataset.url; });
    if (!vid) vid = bmData[card.dataset.url];
    if (vid) {
      if (vid.embeddable === false) {
        window.open(vid.url, '_blank', 'noopener');
      } else {
        openWatch(vid);
      }
    }
  }
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
