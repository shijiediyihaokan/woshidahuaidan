/**
 * admin-dashboard.js — Dashboard initialization, navigation, error handling
 * Depends on: AdminUtils, AdminAuth
 */
(function() {
  'use strict';
  var U, Auth;
  var initDone = false;

  /* === Global error capture === */
  window.addEventListener('error', function(event) {
    console.error('Global JS Error:', event.error || event.message);
    if (U) {
      U.hideLoading();
      U.showAdminApp();
      U.showErrorBanner('Script error: ' + (event.error ? event.error.message : event.message));
    }
    var abs = document.getElementById('absLoading');
    if (abs) abs.classList.remove('resolved');
  });

  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    if (U) {
      U.hideLoading();
      U.showAdminApp();
      U.showErrorBanner('Async load failed: ' + (event.reason ? event.reason.message : 'Unknown'));
    }
  });

  /* === Loading timeout: 8 seconds max === */
  setTimeout(function() {
    if (!initDone) {
      console.error('TIMEOUT: Dashboard init did not complete in 8s');
      if (U) {
        U.hideLoading();
        U.showAdminApp();
        U.showErrorBanner('Dashboard load timed out. Check Console for errors.');
      }
      var abs = document.getElementById('absLoading');
      if (abs && !abs.classList.contains('resolved')) {
        abs.classList.remove('resolved');
        var msg = document.getElementById('absErrMsg');
        if (msg) msg.textContent = 'Dashboard initialization timed out after 8 seconds.';
        var spinner = document.getElementById('absSpinner');
        if (spinner) spinner.style.display = 'none';
        var box = document.getElementById('absErrorBox');
        if (box) box.style.display = 'block';
        document.getElementById('absStatus').textContent = '加载超时';
      }
    }
  }, 8000);

  /* === initDashboard === */
  async function initDashboard() {
    try {
      U = window.AdminUtils;
      Auth = window.AdminAuth;

      console.log('initDashboard: checking auth...');
      await Auth.checkAuth();
      console.log('initDashboard: auth OK');

      /* Show user info */
      try {
        var user = await Auth.getUserInfo();
        var nameEl = document.getElementById('userName');
        var avatarEl = document.getElementById('userAvatar');
        if (nameEl) nameEl.textContent = user.login || 'Admin';
        if (avatarEl) avatarEl.textContent = (user.login || 'A')[0].toUpperCase();
      } catch(e) {
        console.warn('Could not fetch user info:', e.message);
      }

      /* Show dashboard */
      U.hideLoading();
      U.showAdminApp();
      console.log('initDashboard: dashboard visible');

      /* Init nav */
      initNavigation();

      /* Load modules safely */
      await U.safeInitModule('Products', function() {
        if (window.AdminProducts) return window.AdminProducts.init();
      });
      await U.safeInitModule('Editor', function() {
        if (window.AdminEditor) return window.AdminEditor.init();
      });
      await U.safeInitModule('Media', function() {
        if (window.AdminMedia) return window.AdminMedia.init();
      });

      initDone = true;
      console.log('Admin dashboard loaded: image-block-v1');
  console.log('✅ Dashboard fully initialized');
    } catch (e) {
      console.error('Dashboard init failed:', e);
      U.hideLoading();
      U.showAdminApp();
      U.showErrorBanner('Dashboard failed: ' + e.message);
      U.showABSError(e.message);
    }
  }

  /* === Navigation === */
  function initNavigation() {
    /* Sidebar nav */
    document.querySelectorAll('.sidebar nav a[data-page]').forEach(function(a) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.sidebar nav a').forEach(function(x) { x.classList.remove('active'); });
        this.classList.add('active');
        document.querySelectorAll('.tab-content[id^="page-"]').forEach(function(x) { x.classList.remove('active'); });
        var page = document.getElementById('page-' + this.dataset.page);
        if (page) page.classList.add('active');
      });
    });

    /* Tab navigation */
    document.querySelectorAll('.tab-btn[data-panel]').forEach(function(b) {
      b.addEventListener('click', function() {
        var container = this.closest('.tab-content');
        if (!container) return;
        container.querySelectorAll('.tab-btn').forEach(function(x) { x.classList.remove('active'); });
        this.classList.add('active');
        container.querySelectorAll('.tab-content').forEach(function(x) { x.classList.remove('active'); });
        var panel = document.getElementById('panel-' + this.dataset.panel);
        if (panel) panel.classList.add('active');
      });
    });

    /* Quick action buttons */
    document.querySelectorAll('[data-page]').forEach(function(el) {
      if (el.tagName !== 'A') {
        el.addEventListener('click', function() {
          document.querySelectorAll('.sidebar nav a[data-page]').forEach(function(x) { x.classList.remove('active'); });
          var navLink = document.querySelector('.sidebar nav a[data-page="' + this.dataset.page + '"]');
          if (navLink) { navLink.classList.add('active'); navLink.click(); }
        });
      }
    });
  }

  /* Start on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }
})();
