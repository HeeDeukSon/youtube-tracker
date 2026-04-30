(function () {
  'use strict';

  var State = window.LuminaState;

  var CATEGORY_COLORS = {
    'AI':          '#5ba3ff',
    'Language':    '#6bcb6b',
    'Training':    '#ab7ff0',
    'Negotiation': '#ff8b4d'
  };

  // ══════════════════════════════════
  // Helpers
  // ══════════════════════════════════

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatNum(n) {
    return parseInt(n || 0, 10).toLocaleString();
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate();
  }

  function monthLabel(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var months = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getFullYear();
  }

  // ══════════════════════════════════
  // Compute stats from results.json
  // ══════════════════════════════════

  function computeStats(data) {
    var totalVideos  = 0;
    var allVideos    = [];
    var rankingMap   = {};
    var categoryMap  = {};

    data.forEach(function (ch) {
      var videos = ch.videos || [];
      var count  = videos.length;
      totalVideos += count;

      rankingMap[ch.channel] = {
        channel:  ch.channel,
        category: ch.category,
        count:    count
      };

      if (!categoryMap[ch.category]) {
        categoryMap[ch.category] = { channels: 0, videos: 0 };
      }
      categoryMap[ch.category].channels += 1;
      categoryMap[ch.category].videos   += count;

      videos.forEach(function (v) {
        allVideos.push({
          title:       v.title,
          channel:     ch.channel,
          category:    ch.category,
          publishedAt: v.publishedAt,
          thumbnail:   v.thumbnail,
          viewCount:   v.viewCount,
          url:         v.url
        });
      });
    });

    allVideos.sort(function (a, b) {
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    var ranking = Object.keys(rankingMap).map(function (k) {
      return rankingMap[k];
    }).sort(function (a, b) {
      return b.count - a.count;
    });

    var dates   = allVideos.map(function (v) { return new Date(v.publishedAt); });
    var minDate = dates.length ? new Date(Math.min.apply(null, dates)) : new Date();
    var maxDate = dates.length ? new Date(Math.max.apply(null, dates)) : new Date();

    return {
      totalChannels: data.length,
      totalVideos:   totalVideos,
      monthLabel:    monthLabel(maxDate.toISOString()),
      period:        formatDate(minDate.toISOString()) + ' – ' + formatDate(maxDate.toISOString()),
      ranking:       ranking,
      recentVideos:  allVideos.slice(0, 15),
      categories:    categoryMap
    };
  }

  // ══════════════════════════════════
  // Render sections
  // ══════════════════════════════════

  function renderSummary(stats) {
    var html = '';
    html += '<h1 style="color:var(--ls-text);font-size:var(--fs-xl);font-weight:700;margin-bottom:4px;">Monthly Report</h1>';
    html += '<p style="color:var(--ls-muted);font-size:var(--fs-sm);margin-bottom:24px;">'
          + escapeHtml(stats.monthLabel) + '&nbsp;&nbsp;·&nbsp;&nbsp;' + escapeHtml(stats.period) + '</p>';

    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:32px;">';
    [
      { label: 'Channels',   value: stats.totalChannels },
      { label: 'Videos',     value: stats.totalVideos },
      { label: 'Categories', value: Object.keys(stats.categories).length }
    ].forEach(function (item) {
      html += '<div style="background:var(--ls-surface);border-radius:var(--radius-md);padding:14px;text-align:center;">';
      html += '<div style="color:var(--ls-accent);font-size:26px;font-weight:700;line-height:1;">' + item.value + '</div>';
      html += '<div style="color:var(--ls-muted);font-size:var(--fs-xs);margin-top:4px;">' + item.label + '</div>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderCategories(stats) {
    var html = '';
    html += '<h2 style="color:var(--ls-text);font-size:var(--fs-md);font-weight:600;margin-bottom:12px;">By Category</h2>';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:32px;">';

    Object.keys(stats.categories).forEach(function (cat) {
      var info  = stats.categories[cat];
      var color = CATEGORY_COLORS[cat] || 'var(--ls-accent)';
      html += '<div style="background:var(--ls-surface);border-radius:var(--radius-md);padding:14px;border-left:3px solid ' + color + ';">';
      html += '<div style="color:' + color + ';font-size:var(--fs-sm);font-weight:600;margin-bottom:6px;">' + escapeHtml(cat) + '</div>';
      html += '<div style="color:var(--ls-text);font-size:22px;font-weight:700;line-height:1;">' + info.videos + '</div>';
      html += '<div style="color:var(--ls-muted);font-size:var(--fs-xs);margin-top:3px;">videos &nbsp;·&nbsp; ' + info.channels + ' channels</div>';
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  function renderRecentVideos(stats) {
    var html = '';
    html += '<h2 style="color:var(--ls-text);font-size:var(--fs-md);font-weight:600;margin-bottom:12px;">Latest Videos</h2>';
    html += '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:32px;">';

    stats.recentVideos.forEach(function (v) {
      var color = CATEGORY_COLORS[v.category] || 'var(--ls-accent)';
      var vidMatch = (v.url || '').match(/[?&]v=([^&]+)/);
      var studyHref = vidMatch ? 'study.html?v=' + vidMatch[1] : escapeHtml(v.url);
      html += '<a href="' + studyHref + '"'
            + ' style="display:flex;gap:10px;background:var(--ls-surface);border-radius:var(--radius-md);padding:10px;text-decoration:none;">';
      html += '<img src="' + escapeHtml(v.thumbnail) + '" alt="" loading="lazy"'
            + ' style="width:88px;height:50px;object-fit:cover;border-radius:var(--radius-sm);flex-shrink:0;">';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="color:var(--ls-text);font-size:var(--fs-sm);line-height:1.4;margin-bottom:5px;'
            + 'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">'
            + escapeHtml(v.title) + '</div>';
      html += '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">';
      html += '<span style="color:' + color + ';font-size:var(--fs-xs);">' + escapeHtml(v.channel) + '</span>';
      html += '<span style="color:var(--ls-dim);">·</span>';
      html += '<span style="color:var(--ls-muted);font-size:var(--fs-xs);">' + escapeHtml(formatDate(v.publishedAt)) + '</span>';
      html += '<span style="color:var(--ls-dim);">·</span>';
      html += '<span style="color:var(--ls-muted);font-size:var(--fs-xs);">' + formatNum(v.viewCount) + ' views</span>';
      html += '</div>';
      html += '</div>';
      html += '</a>';
    });

    html += '</div>';
    return html;
  }

  function renderRanking(stats) {
    var maxCount = stats.ranking.length && stats.ranking[0].count > 0 ? stats.ranking[0].count : 1;
    var html = '';
    html += '<h2 style="color:var(--ls-text);font-size:var(--fs-md);font-weight:600;margin-bottom:12px;">Upload Ranking</h2>';
    html += '<div style="background:var(--ls-surface);border-radius:var(--radius-md);padding:14px;margin-bottom:32px;">';

    stats.ranking.forEach(function (item, i) {
      var pct     = item.count > 0 ? (item.count / maxCount * 100).toFixed(1) : 0;
      var color   = CATEGORY_COLORS[item.category] || 'var(--ls-accent)';
      var isEmpty = item.count === 0;

      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:' + (i < stats.ranking.length - 1 ? '10' : '0') + 'px;">';
      html += '<span style="color:var(--ls-hint);font-size:var(--fs-xs);min-width:18px;text-align:right;">' + (i + 1) + '</span>';
      html += '<div style="flex:1;min-width:0;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px;">';
      html += '<span style="color:' + (isEmpty ? 'var(--ls-hint)' : 'var(--ls-text)') + ';font-size:var(--fs-sm);'
            + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">'
            + escapeHtml(item.channel) + '</span>';
      html += '<span style="color:' + (isEmpty ? 'var(--ls-hint)' : color) + ';font-size:var(--fs-xs);margin-left:8px;flex-shrink:0;">'
            + (isEmpty ? '—' : item.count) + '</span>';
      html += '</div>';
      if (!isEmpty) {
        html += '<div style="height:3px;background:var(--ls-border);border-radius:2px;">';
        html += '<div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:2px;"></div>';
        html += '</div>';
      }
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  // ══════════════════════════════════
  // Init
  // ══════════════════════════════════

  function init() {
    LuminaNav.init('news');

    fetch('../results.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var stats = computeStats(data);
        var main  = document.getElementById('news-main');
        if (!main) return;
        main.innerHTML = renderSummary(stats)
                       + renderCategories(stats)
                       + renderRecentVideos(stats)
                       + renderRanking(stats);
      })
      .catch(function () {
        var main = document.getElementById('news-main');
        if (main) {
          main.innerHTML = '<p style="color:var(--ls-muted);text-align:center;padding:60px 0;">Could not load report data.</p>';
        }
      });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
