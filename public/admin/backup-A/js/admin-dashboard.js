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
      await U.safeInitModule('News', function() {
        if (window.AdminNews) return window.AdminNews.init();
      });
      await U.safeInitModule('Media', function() {
        if (window.AdminMedia) return window.AdminMedia.init();
      });

      /* Load news stats in overview */
      loadNewsStats();

      initDone = true;
      console.log('✅ Dashboard fully initialized');
    } catch (e) {
      console.error('Dashboard init failed:', e);
      U.hideLoading();
      U.showAdminApp();
      U.showErrorBanner('Dashboard failed: ' + e.message);
      U.showABSError(e.message);
    }
  }

  /* === News stats for overview === */
  function loadNewsStats() {
    var repo = Auth.getRepo();
    var A = Auth.getApi();
    var K = Auth.getToken();
    var url = A + '/repos/' + repo + '/contents/src/content/news';
    U.fetchWithTimeout(url, { headers: { 'Authorization': 'token ' + K } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!Array.isArray(data)) { document.getElementById('overviewNews').innerHTML = '<p style="color:var(--g)">暂无数据</p>'; return; }
        var cats = {};
        var total = 0;
        data.forEach(function(f) {
          if (!f.name.endsWith('.md')) return;
          total++;
          U.fetchWithTimeout(f.download_url || f.url)
            .then(function(r) { return r.text(); })
            .then(function(md) {
              var m = md.match(/category:\s*"([^"]+)"/);
              if (m) cats[m[1]] = (cats[m[1]] || 0) + 1;
              renderNewsStats(cats, total);
            })
            .catch(function() {});
        });
        if (total === 0) document.getElementById('overviewNews').innerHTML = '<p style="color:var(--g)">暂无文章</p>';
      })
      .catch(function() { document.getElementById('overviewNews').innerHTML = '<p style="color:var(--g)">加载失败</p>'; });
  }

  function renderNewsStats(cats, total) {
    var all = ['Product Knowledge','Selection Guide','Technical Guide','Industry News','Company News'];
    var html = '<span>总计: <b>' + total + '</b> 篇文章</span><br><br>';
    all.forEach(function(c) {
      var n = cats[c] || 0;
      html += '<div style="margin:3px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + (n ? '#27ae60' : '#e0e0e0') + ';margin-right:5px"></span><b>' + c + '</b>: ' + (n || '无') + '</div>';
    });
    document.getElementById('overviewNews').innerHTML = html;
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
