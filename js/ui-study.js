/* ============================================
   Lumina Study — Study Page UI
   순수 UI 로직만 담당
   데이터는 state.js, analytics.js 경유
   ============================================ */

(function () {
  'use strict';

  var State = window.LuminaState;

  // ══════════════════════════════════
  // 섹션 토글 (Description / Discussions)
  // ══════════════════════════════════

  function initSections() {
    var headers = document.querySelectorAll('.ls-section__header');
    headers.forEach(function (header) {
      header.addEventListener('click', function () {
        var section = this.closest('.ls-section');
        var sectionName = section.dataset.section;
        handleSectionToggle(sectionName);
      });
    });
  }

  function handleSectionToggle(sectionName) {
    var current = State.get('activeSection');
    var next = (current === sectionName) ? null : sectionName;
    State.set('activeSection', next);

    // analytics.js 연동
    trackEvent('section_toggle', {
      Input_Mode:      'tap',
      Duration_Seconds: 0,
      Content_Id:      sectionName,
      Content_Title:   '',
      Content_Source:  '',
      User_Stage:      State.get('currentStage'),
      Page_Name:       'study',
      Action_Type:     next ? 'open' : 'close',
      Timestamp:       Date.now(),
      Session_Context: ''
    });
  }

  // 상태 → UI 동기화 (독립 함수)
  function syncSectionUI(activeSection) {
    var sections = document.querySelectorAll('.ls-section');
    sections.forEach(function (el) {
      var name   = el.dataset.section;
      var isOpen = name === activeSection;
      el.classList.toggle('is-open', isOpen);

      var header = el.querySelector('.ls-section__header');
      if (header) header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  }

  // ══════════════════════════════════
  // 토론 태그 선택
  // ══════════════════════════════════

  function initDiscussionTags() {
    var tags = document.querySelectorAll('[data-discussion-tag]');
    tags.forEach(function (tag) {
      tag.addEventListener('click', function () {
        var tagName = this.dataset.discussionTag;
        var selected = State.get('selectedTags').slice(); // 복사본
        var idx = selected.indexOf(tagName);

        if (idx > -1) {
          selected.splice(idx, 1);
        } else {
          selected.push(tagName);
        }

        State.set('selectedTags', selected);

        // analytics.js 연동
        trackEvent('tag_select', {
          Input_Mode:      'tap',
          Duration_Seconds: 0,
          Content_Id:      State.get('currentVideoId') || '',
          Content_Title:   '',
          Content_Source:  '',
          User_Stage:      State.get('currentStage'),
          Page_Name:       'study',
          Action_Type:     tagName,
          Timestamp:       Date.now(),
          Session_Context: ''
        });
      });
    });
  }

  function syncDiscussionTagsUI(selectedTags) {
    var tags = document.querySelectorAll('[data-discussion-tag]');
    tags.forEach(function (tag) {
      if (selectedTags.indexOf(tag.dataset.discussionTag) > -1) {
        tag.classList.add('is-active');
      } else {
        tag.classList.remove('is-active');
      }
    });
  }

  // ══════════════════════════════════
  // 댓글 작성
  // ══════════════════════════════════

  function initCommentForm() {
    var postBtn = document.querySelector('[data-action="post-comment"]');
    if (!postBtn) return;

    postBtn.addEventListener('click', function () {
      var nameInput = document.querySelector('[data-field="name"]');
      var emailInput = document.querySelector('[data-field="email"]');
      var commentInput = document.querySelector('[data-field="comment"]');

      var name = nameInput ? nameInput.value.trim() : '';
      var email = emailInput ? emailInput.value.trim() : '';
      var comment = commentInput ? commentInput.value.trim() : '';

      // 필수 필드 검증
      if (!name) {
        nameInput.style.borderColor = '#e24b4a';
        nameInput.focus();
        return;
      }

      if (!comment) {
        commentInput.style.borderColor = '#e24b4a';
        commentInput.focus();
        return;
      }

      // 검증 통과 → 댓글 제출
      submitComment({
        name: name,
        email: email,
        comment: comment,
        tags: State.get('selectedTags')
      });

      // analytics.js 연동
      trackEvent('comment_post', {
        Input_Mode:      'tap',
        Duration_Seconds: 0,
        Content_Id:      State.get('currentVideoId') || '',
        Content_Title:   '',
        Content_Source:  '',
        User_Stage:      State.get('currentStage'),
        Page_Name:       'study',
        Action_Type:     'post',
        Timestamp:       Date.now(),
        Session_Context: ''
      });
    });
  }

  var COMMENT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7SFGetH10Jfg8jd0pridPpagpia1gN9KW_vb45JzPsoNXj5o6Bk7AXoyG-AK2ohXJ4g/exec';

  var isNegotiationSimActive = false;

  function submitComment(data) {
    if (isNegotiationSimActive) {
      isNegotiationSimActive = false;
      showAIInsight("AI Analysis: 답변을 분석했습니다. 감정(Emotion)에 호소하기보다, 상대의 목표 달성을 위한 '표준(Standards)'을 어떻게 채워줄 수 있는지 객관적으로 접근한 점이 훌륭합니다!");
      var commentInputSim = document.querySelector('[data-field="comment"]');
      if (commentInputSim) commentInputSim.value = '';
      return;
    }

    var currentComments = State.get('totalComments') || 0;
    State.set('totalComments', currentComments + 1);

    // 폼 즉시 초기화 (UX: 응답 기다리지 않음)
    var commentInput = document.querySelector('[data-field="comment"]');
    if (commentInput) commentInput.value = '';
    showAIInsight("AI Insight: 훌륭한 인사이트입니다! 협상 모델의 '표준(Standards)'을 적용해본다면 이 문장을 어떻게 발전시킬 수 있을까요?");

    // Google Apps Script 웹앱으로 전송
    var titleEl   = document.getElementById('video-title');
    var channelEl = document.getElementById('video-channel');
    var videoTitle = titleEl ? titleEl.textContent.trim() : '';
    var payload = {
      name:           data.name,
      email:          data.email,
      comment:        data.comment,
      tags:           (data.tags || []).join(', '),
      videoTitle:     videoTitle,
      channelName:    channelEl ? channelEl.textContent.trim() : '',
      videoUrl:       'https://www.youtube.com/watch?v=' + (State.get('currentVideoId') || ''),
      userStage:      State.get('currentStage') || '',
      submittedAt:    new Date().toISOString(),
      sendCopyToUser: !!data.email,
      emailSubject:   'Your Lumina Study comment — ' + videoTitle,
      emailBody:      'Hi ' + data.name + ',\n\nThank you for your comment:\n\n"' + data.comment + '"\n\nVideo: https://www.youtube.com/watch?v=' + (State.get('currentVideoId') || '')
    };

    fetch(COMMENT_SCRIPT_URL, {
      method: 'POST',
      mode:   'no-cors',
      body:   JSON.stringify(payload)
    })
    .then(function () {
      console.log('[Comment] 전송 완료');
    })
    .catch(function (err) {
      console.error('[Comment] 전송 실패:', err);
    });
  }

  // ══════════════════════════════════
  // AI 질문
  // ══════════════════════════════════

  function initAskAI() {
    var askBtn = document.querySelector('[data-action="ask-ai"]');
    if (!askBtn) return;

    askBtn.addEventListener('click', function () {
      var input = document.querySelector('[data-field="ai-question"]');
      var question = input ? input.value.trim() : '';

      if (!question) {
        input.focus();
        return;
      }

      console.log('[AI] 질문:', question);
      showAIInsight("AI Insight: '" + question + "'에 대한 분석입니다. 상대의 '감정(Emotion)'을 읽어내는 키워드를 더해보세요.");

      // analytics.js 연동
      trackEvent('ai_question', {
        Input_Mode:      'tap',
        Duration_Seconds: 0,
        Content_Id:      State.get('currentVideoId') || '',
        Content_Title:   question,
        Content_Source:  '',
        User_Stage:      State.get('currentStage'),
        Page_Name:       'study',
        Action_Type:     'ask',
        Timestamp:       Date.now(),
        Session_Context: ''
      });
    });
  }

  // ══════════════════════════════════
  // 비디오 플레이어
  // ══════════════════════════════════

  function initPlayer() {
    var playBtn = document.querySelector('.ls-player__play-btn');
    if (!playBtn) return;

    var progressInterval;
    var isPlaying = false;

    playBtn.addEventListener('click', function () {
      isPlaying = !isPlaying;
      var action = isPlaying ? 'play' : 'pause';

      trackEvent('video_' + action, {
        Input_Mode:      'tap',
        Duration_Seconds: State.get('playbackElapsed') || 0,
        Content_Id:      State.get('currentVideoId') || '',
        Content_Title:   '',
        Content_Source:  '',
        User_Stage:      State.get('currentStage'),
        Page_Name:       'study',
        Action_Type:     action,
        Timestamp:       Date.now(),
        Session_Context: ''
      });

      console.log('[Player] ' + action);
      if (isPlaying) {
        if (!progressInterval) {
          progressInterval = setInterval(function() {
            var elapsed = State.get('timerSeconds') || 0;
            State.set('timerSeconds', elapsed + 1);
            if (elapsed + 1 === 600) {
              console.log('Coach John: Ready for next Sync Stage');
            }
          }, 1000); 
        }
      } else {
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
      }
    });
  }

  // 상태 → 프로그레스바 동기화
  function syncPlayerUI(progress) {
    var fill = document.querySelector('.ls-player__progress-fill');
    if (fill) {
      fill.style.width = (progress * 100) + '%';
    }
  }

  // ══════════════════════════════════
  // 입력 필드 테두리 리셋
  // ══════════════════════════════════

  function initFieldReset() {
    var fields = document.querySelectorAll('.ls-field__input');
    fields.forEach(function (field) {
      field.addEventListener('focus', function () {
        this.style.borderColor = '';
      });
    });
  }

  // ══════════════════════════════════
  // AI Insight & Proactive Agent
  // ══════════════════════════════════

  function showAIInsight(text) {
    var panel = document.getElementById('ai-insights-panel');
    var content = document.getElementById('ai-insights-content');
    if (panel && content) {
      content.textContent = text;
      panel.style.display = 'block';
    }
  }

  function initProactiveAgent() {
    var stage = State.get('currentStage') || 'Ignition';
    var question = "";
    if (stage === 'Ignition' || stage === 'Contact') {
      question = "이 영상에서 귀에 꽂히는 3가지 표현은 무엇인가요?";
    } else {
      question = "이 비즈니스 상황에서 상대방의 '표준(Standards)'은 무엇이라고 생각하시나요?";
    }
    showAIInsight("Proactive Coach: " + question);
  }

  function initAIButtons() {
    var btnTranslate = document.getElementById('btn-business-translate');
    var btnFraming = document.getElementById('btn-negotiation-framing');
    var btnSim = document.getElementById('btn-negotiation-sim');
    var btnSave = document.getElementById('btn-save-insight');

    if (btnTranslate) {
      btnTranslate.addEventListener('click', function() {
        showAIInsight("AI Translation: 제조 논리(Feature) 대신 시장 심리(Benefit)로 프레이밍 해보세요. 예: '우리 시스템은 빠릅니다' → '당신의 소중한 시간을 지켜드립니다.'");
      });
    }

    if (btnFraming) {
      btnFraming.addEventListener('click', function() {
        showAIInsight("AI Framing: Stuart Diamond의 '표준(Standards)'과 '감정(Emotion)'을 활용해 보세요. '우리가 이걸 해야 합니다' → '우리가 합의한 목표(표준)에 도달하기 위해, 이 방식이 서로에게 가장 안정적(감정)일 것입니다.'");
      });
    }

    if (btnSim) {
      btnSim.addEventListener('click', function() {
        isNegotiationSimActive = true;
        showAIInsight("AI Simulation [가격 협상]: 상대가 '우리 예산은 천만 원뿐입니다'라고 강하게 나옵니다. 어떻게 대응하시겠습니까? (댓글 창에 입력해주세요)");
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', function() {
        var contentEl = document.getElementById('ai-insights-content');
        var text = contentEl ? contentEl.textContent : '';
        
        var saved = State.get('savedInsights') || [];
        var newInsight = {
          Content_Title: document.title,
          Insight_Text: text,
          User_Stage: State.get('currentStage'),
          Timestamp: Date.now()
        };
        saved.push(newInsight);
        State.set('savedInsights', saved);

        console.log('[Toolkit] 인사이트 저장됨:', newInsight);
        
        var originalText = this.textContent;
        this.textContent = 'Saved!';
        var btn = this;
        setTimeout(function() { btn.textContent = originalText; }, 2000);
      });
    }
  }

  // ══════════════════════════════════
  // Coach's Voice
  // ══════════════════════════════════

  var COACH_MESSAGES = {
    'Ignition': "엔진을 켤 준비가 되셨나요? 가볍게 시청하며 뇌를 깨워봅시다. (Tip: 상대의 감정(Emotion)을 살피는 것이 첫 걸음입니다.)",
    'Contact': "뇌가 영어 주파수를 잡기 시작했습니다. 조금만 더 노출해 볼까요?",
    'Drilling': "이제 패턴이 보이기 시작할 겁니다. 소리내어 따라해 보세요! (상대의 '표준(Standards)'을 파악해 보세요.)",
    'Encoding': "새로운 표현이 장기 기억으로 넘어가고 있습니다. 불평등한 가치 교환(Unequal Value)의 기회를 엿보세요.",
    'Deployment': "실전에서 쓸 수 있는 무기가 장착되었습니다. 대화의 프레이밍(Framing)을 시도해 보세요.",
    'Integration': "영어가 일상이 되었습니다. 이 감각을 유지하세요."
  };

  function syncCoachVoice(stage) {
    var msgEl = document.getElementById('coach-msg');
    if (msgEl) {
      msgEl.textContent = COACH_MESSAGES[stage] || "";
    }
  }

  // ══════════════════════════════════
  // Modal for Stage Transition
  // ══════════════════════════════════

  function showStageTransitionModal(stage, prevStage) {
    if (!prevStage || stage === prevStage) return;
    
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0'; modal.style.left = '0'; modal.style.width = '100%'; modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
    modal.style.display = 'flex'; modal.style.alignItems = 'center'; modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';

    var missions = {
      'Ignition': '미션: 영어 소리에 익숙해지기',
      'Contact': '미션: 의미 있는 키워드 3개 포착하기',
      'Drilling': '미션: 자주 나오는 패턴 소리내어 따라하기',
      'Encoding': '미션: 뉘앙스 차이 이해하고 내 문장 만들기',
      'Deployment': '미션: 협상과 프레이밍 시도하기',
      'Integration': '미션: 비즈니스 상황 완벽 장악하기'
    };

    var content = document.createElement('div');
    content.style.background = 'var(--ls-bg-card)';
    content.style.padding = '32px';
    content.style.borderRadius = '16px';
    content.style.textAlign = 'center';
    content.style.maxWidth = '300px';
    content.style.border = '2px solid var(--ls-accent)';

    content.innerHTML = '<h2 style="color: var(--ls-accent); font-size: 24px; margin-bottom: 16px;">🎉 Stage Up!</h2>' +
                        '<p style="color: var(--ls-text); font-size: 18px; margin-bottom: 8px;">새로운 단계 <strong>' + stage + '</strong>(으)로 진입했습니다.</p>' +
                        '<p style="color: var(--ls-thumb-blue); font-size: 14px; margin-bottom: 24px;">' + (missions[stage] || '') + '</p>' +
                        '<button id="btn-close-modal" class="ls-btn ls-btn--primary" style="width: 100%;">확인</button>';

    modal.appendChild(content);
    document.body.appendChild(modal);

    document.getElementById('btn-close-modal').addEventListener('click', function() {
      document.body.removeChild(modal);
    });
  }

  // ══════════════════════════════════
  // URL → 실제 영상 로드
  // ══════════════════════════════════

  function getUrlParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function loadVideoFromUrl() {
    var videoId = getUrlParam('v');
    if (!videoId) return;

    State.set('currentVideoId', videoId);

    fetch('../results.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var found = null;
        outer: for (var i = 0; i < data.length; i++) {
          var ch = data[i];
          for (var j = 0; j < ch.videos.length; j++) {
            var v = ch.videos[j];
            var m = (v.url || '').match(/v=([^&]+)/);
            if (m && m[1] === videoId) {
              found = { video: v, channel: ch.channel, category: ch.category };
              break outer;
            }
          }
        }
        if (!found) return;

        var v   = found.video;
        var ch  = found.channel;
        var cat = found.category;

        // 1. YouTube iframe 삽입
        var container = document.getElementById('video-player-container');
        var loading   = document.getElementById('player-loading');
        if (container) {
          var iframe = document.createElement('iframe');
          iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(videoId) + '?rel=0';
          iframe.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:none;';
          iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
          iframe.setAttribute('allowfullscreen', '');
          iframe.setAttribute('title', v.title || '');
          if (loading) container.removeChild(loading);
          container.appendChild(iframe);
        }

        // 2. 제목 & 채널 뱃지
        var titleEl = document.getElementById('video-title');
        if (titleEl) titleEl.textContent = v.title || '';

        var channelEl = document.getElementById('video-channel');
        if (channelEl) channelEl.textContent = ch + ' · ' + cat;

        // 3. 메타 (조회수, 날짜)
        var metaEl = document.getElementById('video-meta');
        if (metaEl) {
          var views = Number(v.viewCount);
          var viewsStr = isNaN(views) ? v.viewCount : (views >= 1000 ? (views / 1000).toFixed(1) + 'K' : views);
          var d = Math.floor((Date.now() - new Date(v.publishedAt)) / 86400e3);
          var timeAgo = d < 1 ? 'today' : (d < 7 ? d + 'd ago' : Math.floor(d / 7) + 'w ago');
          metaEl.textContent = viewsStr + ' views · ' + timeAgo;
        }

        // 4. 설명
        var descEl = document.getElementById('video-description');
        if (descEl) descEl.textContent = v.description || '';

        // 5. 페이지 타이틀
        document.title = (v.title || 'Study') + ' — Lumina Study';
      })
      .catch(function (err) {
        console.error('[Study] 영상 로드 실패:', err);
      });
  }

  // ══════════════════════════════════
  // 토론 집중 모드
  // ══════════════════════════════════

  function initCommentTextareaFocus() {
    var player = document.getElementById('video-player-container');
    if (!player) return;

    var fields = document.querySelectorAll('[data-field="name"], [data-field="email"], [data-field="comment"]');
    fields.forEach(function (field) {
      field.addEventListener('focus', function () {
        var miniH = Math.round(player.offsetWidth * 9 / 16 / 4);
        player.style.height   = miniH + 'px';
        player.style.overflow = 'hidden';
      });
      field.addEventListener('blur', function () {
        player.style.height   = '';
        player.style.overflow = '';
      });
    });
  }

  function initDiscussionFocus() {
    var btn = document.querySelector('.ls-discussion-expand-btn');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation(); // 섹션 토글과 분리
      handleDiscussionFocusToggle();
    });
  }

  function handleDiscussionFocusToggle() {
    var isFocused = State.get('discussionFocused');
    State.set('discussionFocused', !isFocused);
    if (!isFocused) State.set('activeSection', 'discussions');
  }

  function syncDiscussionFocusUI(isFocused) {
    document.body.classList.toggle('discussion-focused', isFocused);
    var btn = document.querySelector('.ls-discussion-expand-btn');
    if (!btn) return;
    btn.querySelector('.icon-expand').style.display  = isFocused ? 'none'  : '';
    btn.querySelector('.icon-collapse').style.display = isFocused ? '' : 'none';
  }

  // ══════════════════════════════════
  // 초기화
  // ══════════════════════════════════

  function init() {
    loadVideoFromUrl();
    initSections();
    initDiscussionTags();
    initCommentForm();
    initAskAI();
    LuminaNav.init('study');
    initFieldReset();
    initAIButtons();
    initProactiveAgent();
    initDiscussionFocus();
    initCommentTextareaFocus();

    // 상태 구독
    State.subscribe('activeSection', syncSectionUI);
    State.subscribe('selectedTags', syncDiscussionTagsUI);
    State.subscribe('discussionFocused', syncDiscussionFocusUI);
    // playbackProgress 구독 제거 — iframe 플레이어로 대체됨
    State.subscribe('currentStage', function(newVal, prevVal) {
      syncCoachVoice(newVal);
      showStageTransitionModal(newVal, prevVal);
    });

    // 초기 상태 반영
    syncSectionUI(State.get('activeSection'));
    syncDiscussionTagsUI(State.get('selectedTags'));
    syncCoachVoice(State.get('currentStage'));
    syncDiscussionFocusUI(State.get('discussionFocused'));

    // 스크롤 시 하단 nav 자동 숨김 (실수 클릭 방지)
    var nav = document.querySelector('.ls-bottom-nav');
    var player = document.querySelector('.ls-sticky-player');
    if (nav && player) {
      window.addEventListener('scroll', function () {
        nav.classList.toggle('ls-bottom-nav--hidden', window.scrollY > player.offsetHeight);
      }, { passive: true });
    }

    // analytics.js 연동 — 페이지 뷰
    trackEvent('page_view', {
      Input_Mode:      '',
      Duration_Seconds: 0,
      Content_Id:      State.get('currentVideoId') || '',
      Content_Title:   '',
      Content_Source:  '',
      User_Stage:      State.get('currentStage'),
      Page_Name:       'study',
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
