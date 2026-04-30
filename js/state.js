/* ============================================
   Lumina Study — State Manager
   독립 모듈: 기존 로직에 영향 없음
   구독자 패턴으로 UI 동기화
   ============================================ */

window.trackEvent = function(eventName, payload) {
  console.log('%c--- GA4 Data Packet: ' + eventName + ' ---', 'color: #6bcb6b; font-weight: bold;');
  console.table(payload);
};

const LuminaState = (() => {
  'use strict';

  const LS_KEY = 'lumina_state';
  let savedData = {};
  try {
    const savedStr = localStorage.getItem(LS_KEY);
    if (savedStr) savedData = JSON.parse(savedStr);
  } catch(e) {}

  // ── 내부 상태 ──
  const _state = {
    // English Brain Sync-Stage (1~6단계 성숙도: Ignition -> Contact -> Drilling -> Encoding -> Deployment -> Integration)
    currentStage: savedData.currentStage || 'Ignition',

    // 타이머
    timerSeconds: savedData.timerSeconds || 0,
    isTimerRunning: false,

    // Library 페이지
    activeFilter: 'all',
    sortOrder: 'latest',

    // Study 페이지
    activeSection: 'discussions',   // 'description' | 'discussions' | null
    selectedTags: ['conversation'],
    totalComments: savedData.totalComments || 0,
    savedInsights: savedData.savedInsights || [],

    // 비디오 재생
    currentVideoId: null,
    playbackProgress: 0,        // 0~1
    playbackElapsed: 0,         // 초
    playbackDuration: 0,        // 초

    // 현재 페이지
    currentPage: 'study',       // 'study' | 'status' | 'news' | 'info' | 'profile'
  };

  // ── 구독자 저장소 ──
  const _listeners = new Map();

  // ── 내부 메소드 ──
  function _notify(key, value, prev) {
    if (['currentStage', 'timerSeconds', 'totalComments', 'savedInsights'].indexOf(key) !== -1) {
      try {
        const currentStorage = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
        currentStorage[key] = value;
        localStorage.setItem(LS_KEY, JSON.stringify(currentStorage));
      } catch(e) {}
    }

    const callbacks = _listeners.get(key) || [];
    callbacks.forEach(function (cb) {
      try {
        cb(value, prev, key);
      } catch (err) {
        console.error('[LuminaState] Listener error for "' + key + '":', err);
      }
    });

    // 와일드카드 구독자에게도 알림
    const wildcardCallbacks = _listeners.get('*') || [];
    wildcardCallbacks.forEach(function (cb) {
      try {
        cb(value, prev, key);
      } catch (err) {
        console.error('[LuminaState] Wildcard listener error:', err);
      }
    });
  }

  // ── 공개 API ──
  return {
    /**
     * 상태값 읽기
     * @param {string} key
     * @returns {*}
     */
    get: function (key) {
      if (!(key in _state)) {
        console.warn('[LuminaState] Unknown state key: "' + key + '"');
        return undefined;
      }
      return _state[key];
    },

    /**
     * 상태값 변경 → 구독자에게 알림
     * @param {string} key
     * @param {*} value
     */
    set: function (key, value) {
      var prev = _state[key];
      if (prev === value) return; // 변경 없으면 무시
      _state[key] = value;
      _notify(key, value, prev);
    },

    /**
     * 여러 상태를 한번에 변경 (배치)
     * @param {Object} updates  { key: value, ... }
     */
    batchSet: function (updates) {
      var changed = [];
      Object.keys(updates).forEach(function (key) {
        var prev = _state[key];
        if (prev !== updates[key]) {
          _state[key] = updates[key];
          changed.push({ key: key, value: updates[key], prev: prev });
        }
      });
      changed.forEach(function (c) {
        _notify(c.key, c.value, c.prev);
      });
    },

    /**
     * 상태 변경 구독
     * @param {string} key  상태 키 또는 '*' (모든 변경)
     * @param {Function} callback  (newValue, prevValue, key) => void
     * @returns {Function} unsubscribe 함수
     */
    subscribe: function (key, callback) {
      if (!_listeners.has(key)) {
        _listeners.set(key, []);
      }
      _listeners.get(key).push(callback);

      // unsubscribe 함수 반환
      return function () {
        var arr = _listeners.get(key);
        var idx = arr.indexOf(callback);
        if (idx > -1) arr.splice(idx, 1);
      };
    },

    /**
     * 현재 전체 상태 스냅샷 (디버그용, 읽기 전용 복사본)
     * @returns {Object}
     */
    snapshot: function () {
      return JSON.parse(JSON.stringify(_state));
    }
  };
})();

// 모듈 내보내기 (ES Module 환경)
// export default LuminaState;

// 전역 등록 (script 태그 환경)
window.LuminaState = LuminaState;

/* ============================================
   Lumina Study — Shared Bottom Nav
   pages/* context only (library uses its own)
   ============================================ */

window.LuminaNav = (function () {
  'use strict';

  var ROUTES = {
    study:   '../index.html',
    status:  'status.html',
    news:    'news.html',
    profile: 'profile.html',
    info:    null
  };

  function _syncUI(activePage) {
    var items = document.querySelectorAll('[data-nav]');
    items.forEach(function (item) {
      item.classList.toggle('is-active', item.dataset.nav === activePage);
    });
  }

  function _wireClicks(pageName) {
    var State = window.LuminaState;
    var items = document.querySelectorAll('[data-nav]');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var page = this.dataset.nav;
        State.set('currentPage', page);

        trackEvent('nav_tap', {
          Input_Mode:       'tap',
          Duration_Seconds: 0,
          Content_Id:       '',
          Content_Title:    '',
          Content_Source:   '',
          User_Stage:       State.get('currentStage'),
          Page_Name:        pageName,
          Action_Type:      'navigate',
          Timestamp:        Date.now(),
          Session_Context:  ''
        });

        var href = ROUTES[page];
        if (href) { window.location.href = href; }
      });
    });
  }

  return {
    init: function (pageName) {
      _syncUI(pageName);
      _wireClicks(pageName);
      window.LuminaState.subscribe('currentPage', _syncUI);
    }
  };
})();
