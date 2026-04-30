(function () {
  'use strict';

  var State = window.LuminaState;

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
    LuminaNav.init('profile');
    initLinkButtons();

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
