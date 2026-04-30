(function () {
  'use strict';

  function init() {
    LuminaNav.init('info');
    window.LuminaState.set('currentPage', 'info');

    if (typeof trackEvent === 'function') {
      trackEvent('page_view', {
        Input_Mode:       '',
        Duration_Seconds: window.LuminaState.get('timerSeconds') || 0,
        Content_Id:       '',
        Content_Title:    '',
        Content_Source:   '',
        User_Stage:       window.LuminaState.get('currentStage'),
        Page_Name:        'info',
        Action_Type:      'view',
        Timestamp:        Date.now(),
        Session_Context:  ''
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
