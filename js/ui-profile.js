(function () {
  'use strict';

  var State = window.LuminaState;

  function initBottomNav() {
    var items = document.querySelectorAll('[data-nav]');
    items.forEach(function (item) {
      item.addEventListener('click', function () {
        var page = this.dataset.nav;
        State.set('currentPage', page);

        // analytics.js 연동 (if loaded)
        if (typeof trackEvent === 'function') {
          trackEvent('nav_tap', {
            Input_Mode:      'tap',
            Duration_Seconds: State.get('timerSeconds') || 0,
            Content_Id:      '',
            Content_Title:   '',
            Content_Source:  '',
            User_Stage:      State.get('currentStage'),
            Page_Name:       'profile',
            Action_Type:     'navigate',
            Timestamp:       Date.now(),
            Session_Context: ''
          });
        }

        // Navigation Routing
        if (page === 'study') {
          window.location.href = '../index.html';
        } else if (page === 'status') {
          window.location.href = 'status.html';
        } else if (page === 'news') {
          // Placeholder for future news page
          console.log('Navigate to News');
        } else if (page === 'info') {
          // Placeholder for future info page
          console.log('Navigate to Info');
        } else if (page === 'profile') {
          // Already here
        }
      });
    });
  }

  function syncBottomNavUI(currentPage) {
    var items = document.querySelectorAll('[data-nav]');
    items.forEach(function (item) {
      if (item.dataset.nav === currentPage) {
        item.classList.add('is-active');
      } else {
        item.classList.remove('is-active');
      }
    });
  }

  function initLinkButtons() {
    var linkBtns = document.querySelectorAll('.link-button');
    linkBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = this.dataset.target;
        
        if (typeof trackEvent === 'function') {
          trackEvent('profile_link_click', {
            Page_Name: 'profile',
            Action_Type: 'click_link',
            Target: target
          });
        }
        
        console.log('Navigating to:', target);
        // window.location.href = target; // Uncomment when targets are valid
      });
    });
  }

  function init() {
    initBottomNav();
    initLinkButtons();

    State.subscribe('currentPage', syncBottomNavUI);

    State.set('currentPage', 'profile');

    if (typeof trackEvent === 'function') {
      trackEvent('page_view', {
        Input_Mode:      '',
        Duration_Seconds: State.get('timerSeconds') || 0,
        Content_Id:      '',
        Content_Title:   '',
        Content_Source:  '',
        User_Stage:      State.get('currentStage'),
        Page_Name:       'profile',
        Action_Type:     'view',
        Timestamp:       Date.now(),
        Session_Context: ''
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
