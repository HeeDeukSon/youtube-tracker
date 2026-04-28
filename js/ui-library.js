/* ============================================
   Lumina Study — Library Page UI
   순수 UI 로직만 담당
   데이터는 state.js, analytics.js 경유
   ============================================ */

(function () {
  'use strict';

  var State = window.LuminaState;

  var isRoot      = !window.location.pathname.includes('/pages/');
  var RESULTS_URL = isRoot ? './results.json' : '../results.json';

  var _allVideos   = [];
  var _activeSubTag = '';   // 서브카테고리 드롭다운에서 선택된 태그

  // ══════════════════════════════════
  // 필터 칩 토글
  // ══════════════════════════════════

  function initFilterChips() {
    var chips = document.querySelectorAll('[data-filter]');
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var filterName = this.dataset.filter;
        State.set('activeFilter', filterName);

        trackEvent('filter_select', {
          Input_Mode:      'tap',
          Duration_Seconds: 0,
          Content_Id:      '',
          Content_Title:   '',
          Content_Source:  '',
          User_Stage:      State.get('currentStage'),
          Page_Name:       'library',
          Action_Type:     filterName,
          Timestamp:       Date.now(),
          Session_Context: ''
        });
      });
    });
  }

  function syncFilterChipsUI(activeFilter) {
    var chips = document.querySelectorAll('[data-filter]');
    chips.forEach(function (chip) {
      chip.classList.toggle('is-active', chip.dataset.filter === activeFilter);
    });
    updateSubCategoryDropdown(activeFilter);
    applyVisibilityFilters();
  }

  // ══════════════════════════════════
  // 서브카테고리 드롭다운
  // ══════════════════════════════════

  function getTagsForCategory(categoryFilter) {
    var tagSet = {};
    _allVideos.forEach(function (v) {
      if (v.category.toLowerCase() === categoryFilter) {
        v.tags.forEach(function (t) {
          if (t.toLowerCase() !== 'english') tagSet[t] = true;
        });
      }
    });
    return Object.keys(tagSet).sort();
  }

  function updateSubCategoryDropdown(activeFilter) {
    var container = document.getElementById('subcategory-container');
    var select    = document.getElementById('subcategory-select');
    if (!container || !select) return;

    _activeSubTag = '';
    select.value  = '';

    if (activeFilter === 'all') {
      container.style.display = 'none';
      return;
    }

    var tags  = getTagsForCategory(activeFilter);
    var label = activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1);

    select.innerHTML = '<option value="">All ' + label + '</option>';
    tags.forEach(function (tag) {
      var opt       = document.createElement('option');
      opt.value     = tag;
      opt.textContent = tag;
      select.appendChild(opt);
    });

    container.style.display = '';
  }

  function initSubCategoryDropdown() {
    var select = document.getElementById('subcategory-select');
    if (!select) return;
    select.addEventListener('change', function () {
      _activeSubTag = this.value;
      applyVisibilityFilters();
    });
  }

  // ══════════════════════════════════
  // 카드 가시성 필터 (메인 + 서브 동시 적용)
  // ══════════════════════════════════

  function applyVisibilityFilters() {
    var activeFilter = State.get('activeFilter') || 'all';
    var cards        = document.querySelectorAll('[data-video-id]');

    cards.forEach(function (card) {
      var category = (card.dataset.videoCategory || '').toLowerCase();
      var tags     = [];
      try { tags = JSON.parse(card.dataset.videoTags || '[]'); } catch (e) {}

      var passFilter = activeFilter === 'all' || category === activeFilter;
      var passSubTag = !_activeSubTag || tags.indexOf(_activeSubTag) !== -1;

      card.style.display = (passFilter && passSubTag) ? '' : 'none';
    });
  }

  function syncStageUI(stage) {
    var badge = document.getElementById('lib-stage-badge');
    if (badge) badge.textContent = stage;
  }

  // ══════════════════════════════════
  // 비디오 카드 클릭
  // ══════════════════════════════════

  function initVideoCards() {
    var cards = document.querySelectorAll('[data-video-id]');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var videoId = this.dataset.videoId;
        var title   = this.dataset.videoTitle || '';

        State.set('currentVideoId', videoId);

        trackEvent('video_select', {
          Input_Mode:      'tap',
          Duration_Seconds: 0,
          Content_Id:      videoId,
          Content_Title:   title,
          Content_Source:  this.dataset.videoSource || '',
          User_Stage:      State.get('currentStage'),
          Page_Name:       'library',
          Action_Type:     'select',
          Timestamp:       Date.now(),
          Session_Context: ''
        });

        var prefix = isRoot ? 'pages/' : '';
        window.location.href = prefix + 'study.html?v=' + encodeURIComponent(videoId);
      });
    });
  }

  // ══════════════════════════════════
  // 하단 네비게이션
  // ══════════════════════════════════

  function initBottomNav() {
    var items = document.querySelectorAll('[data-nav]');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var page = this.dataset.nav;
        State.set('currentPage', page);

        trackEvent('nav_tap', {
          Input_Mode:      'tap',
          Duration_Seconds: 0,
          Content_Id:      '',
          Content_Title:   '',
          Content_Source:  '',
          User_Stage:      State.get('currentStage'),
          Page_Name:       page,
          Action_Type:     'navigate',
          Timestamp:       Date.now(),
          Session_Context: ''
        });

        var prefix = isRoot ? 'pages/' : '';
        if (page === 'status') {
          window.location.href = prefix + 'status.html';
        } else if (page === 'study') {
          window.location.href = isRoot ? 'index.html' : 'library.html';
        }
      });
    });
  }

  function syncBottomNavUI(currentPage) {
    var items = document.querySelectorAll('[data-nav]');
    items.forEach(function (item) {
      item.classList.toggle('is-active', item.dataset.nav === currentPage);
    });
  }

  // ══════════════════════════════════
  // 데이터 연동 및 렌더링
  // ══════════════════════════════════

  function parseDuration(iso) {
    if (!iso) return '';
    var m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return '';
    var h   = parseInt(m[1] || 0);
    var min = parseInt(m[2] || 0);
    var sec = parseInt(m[3] || 0);
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return h > 0 ? h + ':' + pad(min) + ':' + pad(sec) : min + ':' + pad(sec);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fetchAndRenderVideos() {
    fetch(RESULTS_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var mainEl = document.querySelector('main');
        if (!mainEl) return;
        mainEl.innerHTML = '';

        _allVideos = [];
        data.forEach(function (ch) {
          (ch.videos || []).forEach(function (v) {
            var videoId = '';
            if (v.url) {
              var m = v.url.match(/v=([^&]+)/);
              if (m) videoId = m[1];
            }
            _allVideos.push({
              channel:     ch.channel,
              category:    ch.category || '',
              tags:        ch.tags || [],
              title:       v.title,
              views:       v.viewCount,
              publishedAt: v.publishedAt,
              url:         v.url,
              videoId:     videoId,
              thumbnail:   v.thumbnail || '',
              duration:    v.duration || ''
            });
          });
        });

        // Stage-Based Curation
        var currentStage = State.get('currentStage') || 'Ignition';
        _allVideos.forEach(function (v) {
          v.score = 0;
          var text = (v.title + ' ' + v.tags.join(' ')).toLowerCase();
          if (currentStage === 'Ignition' || currentStage === 'Contact') {
            if (text.indexOf('english') !== -1 || text.indexOf('basic') !== -1 || text.indexOf('business') !== -1) {
              v.score += 10;
            }
          } else if (currentStage === 'Deployment' || currentStage === 'Integration') {
            if (text.indexOf('negotiat') !== -1 || text.indexOf('psychology') !== -1 || text.indexOf('market') !== -1) {
              v.score += 10;
            }
          }
          v.score += new Date(v.publishedAt).getTime() / 1e12;
        });
        _allVideos.sort(function (a, b) { return b.score - a.score; });

        _allVideos.forEach(function (v) {
          var article = document.createElement('article');
          article.className = 'ls-video-card';
          article.dataset.videoId       = v.videoId;
          article.dataset.videoTitle    = v.title;
          article.dataset.videoChannel  = v.channel;
          article.dataset.videoCategory = v.category;
          article.dataset.videoTags     = JSON.stringify(v.tags);   // 멀티워드 태그 지원
          article.dataset.videoSource   = 'youtube';

          var d = Math.floor((Date.now() - new Date(v.publishedAt)) / 86400e3);
          var timeAgo = d < 1 ? 'today' : (d < 7 ? d + 'd ago' : Math.floor(d / 7) + 'w ago');

          var viewsNum = Number(v.views);
          var viewsStr = isNaN(viewsNum) ? v.views : (viewsNum >= 1000 ? (viewsNum / 1000).toFixed(1) + 'K' : viewsNum);

          var durationStr = parseDuration(v.duration);
          if (!durationStr) return; // 시간 정보 없는 영상은 숨김

          var runtimeHtml = durationStr
            ? '<span class="ls-runtime">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="var(--ls-accent)" stroke-width="2.5" width="11" height="11">' +
                  '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' +
                '</svg>' +
                escapeHtml(durationStr) +
              '</span>'
            : '';

          var tagsHtml = v.tags.map(function (t) {
            return '<span class="ls-tag">' + escapeHtml(t) + '</span>';
          }).join('');

          article.innerHTML =
            '<div class="ls-video-card__thumb" style="background:var(--ls-thumb-blue); background-image:url(\'' + escapeHtml(v.thumbnail) + '\'); background-size:cover; background-position:center;">' +
              '<span class="ls-video-card__source">YouTube</span>' +
              runtimeHtml +
            '</div>' +
            '<div class="ls-video-card__info">' +
              '<h3 class="ls-video-card__title">' + escapeHtml(v.title) + '</h3>' +
              '<p class="ls-video-card__meta">' + escapeHtml(v.channel) + ' · ' + escapeHtml(viewsStr + '') + ' views · ' + timeAgo + '</p>' +
              '<div class="ls-video-card__tags">' + tagsHtml + '</div>' +
            '</div>';

          mainEl.appendChild(article);
        });

        initVideoCards();
        // 데이터 로드 후 드롭다운 옵션 갱신 (이미 카테고리 선택된 경우)
        var currentFilter = State.get('activeFilter') || 'all';
        if (currentFilter !== 'all') updateSubCategoryDropdown(currentFilter);
        applyVisibilityFilters();
      })
      .catch(function (err) {
        console.error('[Library] results.json 로드 실패:', err);
        var mainEl = document.querySelector('main');
        if (mainEl) {
          mainEl.innerHTML = '<p style="color:var(--ls-muted);text-align:center;padding:40px 16px;">영상 목록을 불러오는 데 실패했습니다.<br>잠시 후 다시 시도해주세요.</p>';
        }
      });
  }

  // ══════════════════════════════════
  // 초기화
  // ══════════════════════════════════

  function init() {
    initFilterChips();
    initSubCategoryDropdown();
    fetchAndRenderVideos();
    initBottomNav();

    State.subscribe('activeFilter', syncFilterChipsUI);
    State.subscribe('currentPage',  syncBottomNavUI);
    State.subscribe('currentStage', syncStageUI);

    syncFilterChipsUI(State.get('activeFilter'));
    syncBottomNavUI(State.get('currentPage'));
    syncStageUI(State.get('currentStage'));

    trackEvent('page_view', {
      Input_Mode:      '',
      Duration_Seconds: 0,
      Content_Id:      '',
      Content_Title:   '',
      Content_Source:  '',
      User_Stage:      State.get('currentStage'),
      Page_Name:       'library',
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
