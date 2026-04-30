(function () {
  'use strict';

  var State = window.LuminaState;

  const STAGES = ['Ignition', 'Contact', 'Drilling', 'Encoding', 'Deployment', 'Integration'];

  // ── XSS 방지 ──
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function syncDashboardUI() {
    var stage    = State.get('currentStage') || 'Ignition';
    var timer    = State.get('timerSeconds') || 0;
    var comments = State.get('totalComments') || 0;

    // 1. Sync Gauge
    var stageIndex = STAGES.indexOf(stage);
    var stageNum   = stageIndex > -1 ? stageIndex + 1 : 1;
    var percentage = (stageNum / 6) * 100;

    var fill = document.getElementById('status-gauge-fill');
    if (fill) fill.setAttribute('stroke-dasharray', percentage.toFixed(1) + ', 100');

    var stageLabel = document.getElementById('status-stage-label');
    if (stageLabel) stageLabel.textContent = stage;

    var stageNumLabel = document.getElementById('status-stage-number');
    if (stageNumLabel) stageNumLabel.textContent = 'Stage ' + stageNum + ' / 6';

    var colors = ['#6bcb6b', '#5ba3ff', '#ab7ff0', '#ff8b4d', '#ff5b5b', '#ffcc00'];
    var stageColor = colors[stageIndex] || 'var(--ls-accent)';
    if (fill) fill.style.stroke = stageColor;

    // 2. Metrics
    var timeEl = document.getElementById('status-total-time');
    if (timeEl) {
      var m = Math.floor(timer / 60);
      var s = timer % 60;
      timeEl.textContent = m + 'm ' + s + 's';
    }

    var commentsEl = document.getElementById('status-total-comments');
    if (commentsEl) commentsEl.textContent = comments;

    // 3. Coach Insight
    var insightEl = document.getElementById('status-coach-insight');
    if (insightEl) {
      var remaining = 600 - timer;
      if (remaining > 0) {
        var remM = Math.ceil(remaining / 60);
        insightEl.textContent = "현재 '" + stage + "' 단계입니다. 다음 목표(600초)까지 약 " + remM + "분 남았습니다. 조금만 더 힘내세요!";
      } else {
        insightEl.textContent = "현재 '" + stage + "' 단계입니다. 600초 노출을 달성하셨습니다! 훌륭합니다.";
      }
    }

    // 4. Insight Vault — escapeHtml로 XSS 방지
    var vaultContainer = document.getElementById('status-insight-vault');
    if (vaultContainer) {
      var saved = State.get('savedInsights') || [];
      if (saved.length === 0) {
        vaultContainer.innerHTML = '<div style="color: var(--ls-muted); font-size: var(--fs-sm); text-align: center; padding: 20px;">No insights saved yet.</div>';
      } else {
        var reversed = saved.slice().reverse();
        vaultContainer.innerHTML = reversed.map(function (item) {
          return '<div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border-left: 4px solid var(--ls-accent);">' +
                   '<div style="font-size: 11px; color: var(--ls-muted); margin-bottom: 8px; display: flex; flex-wrap: wrap; gap: 8px;">' +
                     '<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">Stage: ' + escapeHtml(item.User_Stage) + '</span>' +
                     '<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;">Source: ' + escapeHtml(item.Content_Title) + '</span>' +
                   '</div>' +
                   '<div style="color: var(--ls-text); font-size: var(--fs-sm); line-height: 1.4;">' + escapeHtml(item.Insight_Text) + '</div>' +
                 '</div>';
        }).join('');
      }
    }

    // Header badge
    var badge = document.getElementById('status-stage-badge');
    if (badge) badge.textContent = stage;
  }

  // ══════════════════════════════════
  // Export — HTML 비즈니스 리포트
  // ══════════════════════════════════

  function buildReportHtml(stage, timer, comments, savedInsights) {
    var stageIndex = STAGES.indexOf(stage);
    var stageNum   = stageIndex > -1 ? stageIndex + 1 : 1;
    var m = Math.floor(timer / 60);
    var s = timer % 60;
    var totalTimeStr = m + 'm ' + s + 's';
    var dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    var stageColors = ['#6bcb6b', '#5ba3ff', '#ab7ff0', '#ff8b4d', '#ff5b5b', '#ffcc00'];
    var stageColor  = stageColors[stageIndex] || '#fbbf24';

    var stageMissions = {
      'Ignition':    'Familiarize with English sounds and patterns',
      'Contact':     'Capture 3 meaningful keywords per session',
      'Drilling':    'Shadow and repeat key patterns aloud',
      'Encoding':    'Understand nuance and construct original sentences',
      'Deployment':  'Apply negotiation framing in real contexts',
      'Integration': 'Operate in global business English naturally'
    };

    var insightsRows = '';
    if (savedInsights.length === 0) {
      insightsRows = '<tr><td colspan="3" style="text-align:center; color:#888; padding:20px;">No insights recorded yet.</td></tr>';
    } else {
      var reversed = savedInsights.slice().reverse();
      reversed.forEach(function (item, idx) {
        var d = new Date(item.Timestamp || Date.now()).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        insightsRows +=
          '<tr>' +
            '<td style="padding:12px 8px; border-bottom:1px solid #eee; font-size:12px; color:#555; white-space:nowrap;">' + escapeHtml(d) + '</td>' +
            '<td style="padding:12px 8px; border-bottom:1px solid #eee; font-size:12px;">' +
              '<span style="display:inline-block; padding:2px 8px; border-radius:4px; background:#f5f5f5; font-size:11px; color:#333;">' + escapeHtml(item.User_Stage || 'Unknown') + '</span>' +
            '</td>' +
            '<td style="padding:12px 8px; border-bottom:1px solid #eee; font-size:13px; line-height:1.5; color:#1a1a1a;">' + escapeHtml(item.Insight_Text) + '</td>' +
          '</tr>';
      });
    }

    return '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
      '<meta charset="UTF-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>Lumina Study — Business Intelligence Report</title>\n' +
      '<style>\n' +
        '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");\n' +
        '* { margin:0; padding:0; box-sizing:border-box; }\n' +
        'body { font-family: "Inter", system-ui, sans-serif; background: #f9f9f9; color: #1a1a1a; }\n' +
        '.report { max-width: 800px; margin: 0 auto; background: #fff; box-shadow: 0 4px 40px rgba(0,0,0,0.08); }\n' +
        '.cover { background: #0a0a0a; padding: 48px 40px 40px; }\n' +
        '.cover__label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 16px; }\n' +
        '.cover__title { font-size: 28px; font-weight: 700; color: #fff; line-height: 1.25; margin-bottom: 8px; }\n' +
        '.cover__subtitle { font-size: 14px; color: #888; margin-bottom: 32px; }\n' +
        '.cover__meta { display: flex; gap: 24px; flex-wrap: wrap; }\n' +
        '.cover__meta-item { }\n' +
        '.cover__meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #555; margin-bottom: 4px; }\n' +
        '.cover__meta-value { font-size: 13px; color: #bbb; }\n' +
        '.section { padding: 32px 40px; border-bottom: 1px solid #f0f0f0; }\n' +
        '.section:last-child { border-bottom: none; }\n' +
        '.section__label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #bbb; margin-bottom: 6px; }\n' +
        '.section__title { font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 20px; }\n' +
        '.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }\n' +
        '.kpi { background: #f9f9f9; border: 1px solid #ececec; border-radius: 10px; padding: 20px; text-align: center; }\n' +
        '.kpi__value { font-size: 28px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }\n' +
        '.kpi__label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; }\n' +
        '.stage-bar { background: #f5f5f5; border-radius: 8px; padding: 20px; }\n' +
        '.stage-bar__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }\n' +
        '.stage-bar__name { font-size: 15px; font-weight: 600; color: #1a1a1a; }\n' +
        '.stage-bar__num { font-size: 12px; color: #999; }\n' +
        '.stage-bar__track { height: 8px; background: #e5e5e5; border-radius: 4px; overflow: hidden; margin-bottom: 12px; }\n' +
        '.stage-bar__fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }\n' +
        '.stage-bar__mission { font-size: 13px; color: #555; }\n' +
        '.insight-table { width: 100%; border-collapse: collapse; }\n' +
        '.insight-table th { padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; border-bottom: 2px solid #ececec; }\n' +
        '.footer { padding: 24px 40px; background: #f9f9f9; display: flex; justify-content: space-between; align-items: center; }\n' +
        '.footer__brand { font-size: 13px; font-weight: 600; color: #333; }\n' +
        '.footer__tagline { font-size: 11px; color: #999; }\n' +
        '.footer__date { font-size: 11px; color: #bbb; }\n' +
        '@media print {\n' +
          'body { background: #fff; }\n' +
          '.report { box-shadow: none; }\n' +
          '.section { page-break-inside: avoid; }\n' +
        '}\n' +
      '</style>\n' +
      '</head>\n<body>\n' +
      '<div class="report">\n' +

        // Cover
        '<div class="cover">\n' +
          '<div class="cover__label">Business Intelligence Report</div>\n' +
          '<div class="cover__title">Lumina Study<br>Learning Progress Report</div>\n' +
          '<div class="cover__subtitle">Translating Vertical Manufacturing Logic to Horizontal Market Psychology</div>\n' +
          '<div class="cover__meta">\n' +
            '<div class="cover__meta-item"><div class="cover__meta-label">Generated</div><div class="cover__meta-value">' + escapeHtml(dateStr) + '</div></div>\n' +
            '<div class="cover__meta-item"><div class="cover__meta-label">Powered by</div><div class="cover__meta-value">Lumina Study · Coach John</div></div>\n' +
          '</div>\n' +
        '</div>\n' +

        // KPIs
        '<div class="section">\n' +
          '<div class="section__label">Performance Overview</div>\n' +
          '<div class="section__title">Activity Metrics</div>\n' +
          '<div class="kpi-grid">\n' +
            '<div class="kpi"><div class="kpi__value">' + escapeHtml(totalTimeStr) + '</div><div class="kpi__label">Total Exposure</div></div>\n' +
            '<div class="kpi"><div class="kpi__value">' + escapeHtml(String(comments)) + '</div><div class="kpi__label">Discussions</div></div>\n' +
            '<div class="kpi"><div class="kpi__value">' + escapeHtml(String(savedInsights.length)) + '</div><div class="kpi__label">Insights Saved</div></div>\n' +
          '</div>\n' +
        '</div>\n' +

        // Stage Progress
        '<div class="section">\n' +
          '<div class="section__label">Maturity Model</div>\n' +
          '<div class="section__title">English Brain Sync-Stage</div>\n' +
          '<div class="stage-bar">\n' +
            '<div class="stage-bar__header">\n' +
              '<div class="stage-bar__name">' + escapeHtml(stage) + '</div>\n' +
              '<div class="stage-bar__num">Stage ' + stageNum + ' of 6</div>\n' +
            '</div>\n' +
            '<div class="stage-bar__track"><div class="stage-bar__fill" style="width:' + ((stageNum / 6) * 100).toFixed(1) + '%; background:' + escapeHtml(stageColor) + ';"></div></div>\n' +
            '<div class="stage-bar__mission">' + escapeHtml(stageMissions[stage] || '') + '</div>\n' +
          '</div>\n' +
        '</div>\n' +

        // Insight Vault
        '<div class="section">\n' +
          '<div class="section__label">Knowledge Asset</div>\n' +
          '<div class="section__title">My Insight Vault (' + savedInsights.length + ' entries)</div>\n' +
          '<table class="insight-table">\n' +
            '<thead><tr><th>Date</th><th>Stage</th><th>Insight</th></tr></thead>\n' +
            '<tbody>' + insightsRows + '</tbody>\n' +
          '</table>\n' +
        '</div>\n' +

        // Footer
        '<div class="footer">\n' +
          '<div>\n' +
            '<div class="footer__brand">Lumina Study</div>\n' +
            '<div class="footer__tagline">Global Business Translation Engine · Coach John</div>\n' +
          '</div>\n' +
          '<div class="footer__date">Exported ' + escapeHtml(dateStr) + '</div>\n' +
        '</div>\n' +

      '</div>\n' +
      '</body>\n</html>';
  }

  function initExportBtn() {
    var exportBtn = document.getElementById('btn-export-md');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', function () {
      var stage    = State.get('currentStage') || 'Ignition';
      var timer    = State.get('timerSeconds') || 0;
      var comments = State.get('totalComments') || 0;
      var saved    = State.get('savedInsights') || [];

      var html = buildReportHtml(stage, timer, comments, saved);
      var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href     = url;
      a.download = 'Lumina_Business_Report_' + new Date().toISOString().slice(0, 10) + '.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      var btn = this;
      btn.textContent = 'Downloaded!';
      setTimeout(function () { btn.textContent = 'Export Report'; }, 2500);
    });
  }

  function init() {
    LuminaNav.init('status');
    initExportBtn();

    State.subscribe('currentStage',   syncDashboardUI);
    State.subscribe('timerSeconds',   syncDashboardUI);
    State.subscribe('totalComments',  syncDashboardUI);
    State.subscribe('savedInsights',  syncDashboardUI);

    syncDashboardUI();
    State.set('currentPage', 'status');

    trackEvent('page_view', {
      Input_Mode:      '',
      Duration_Seconds: State.get('timerSeconds') || 0,
      Content_Id:      '',
      Content_Title:   '',
      Content_Source:  '',
      User_Stage:      State.get('currentStage'),
      Page_Name:       'status',
      Action_Type:     'view',
      Timestamp:       Date.now(),
      Session_Context: ''
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
