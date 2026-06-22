/**
 * admin-dashboard.js — Dashboard init, submenu nav, module loading
 */
(function() {
  'use strict';
  var U, Auth;
  var initDone = false;

  window.addEventListener('error', function(event) {
    console.error('Global JS Error:', event.error || event.message);
    if (U) { U.hideLoading(); U.showAdminApp(); U.showErrorBanner('Script error: ' + (event.error ? event.error.message : event.message)); }
  });
  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled Rejection:', event.reason);
    if (U) { U.hideLoading(); U.showAdminApp(); U.showErrorBanner('Async load failed: ' + (event.reason ? event.reason.message : 'Unknown')); }
  });

  setTimeout(function() {
    if (!initDone && U) { U.hideLoading(); U.showAdminApp(); U.showErrorBanner('加载超时'); U.showABSError('Dashboard init timed out'); }
  }, 8000);

  async function initDashboard() {
    try {
      U = window.AdminUtils; Auth = window.AdminAuth;
      await Auth.checkAuth();
      try { var user = await Auth.getUserInfo(); var n = document.getElementById('userName'); if (n) n.textContent = user.login || '管理员'; var a = document.getElementById('userAvatar'); if (a) a.textContent = (user.login || 'A')[0].toUpperCase(); } catch(e) {}
      U.hideLoading(); U.showAdminApp();
      initNavigation();
      await U.safeInitModule('Products', function() { if (window.AdminProducts) return window.AdminProducts.init(); });
      await U.safeInitModule('Editor', function() { if (window.AdminEditor) return window.AdminEditor.init(); });
      await U.safeInitModule('News', function() { if (window.AdminNews) return window.AdminNews.init(); });
      await U.safeInitModule('Media', function() { if (window.AdminMedia) return window.AdminMedia.init(); });
      loadNewsStats();
      initDone = true;
    } catch(e) { console.error('Init failed:', e); U.hideLoading(); U.showAdminApp(); U.showErrorBanner('Dashboard failed: ' + e.message); U.showABSError(e.message); }
  }

  /* === Submenu toggle === */
  document.addEventListener('click', function(e) {
    var parent = e.target.closest('.submenu-parent');
    if (!parent) return;
    e.preventDefault();
    var subName = parent.dataset.submenu;
    /* Toggle submenu */
    var sub = document.querySelector('.submenu[data-sub="' + subName + '"]');
    if (sub) { sub.classList.toggle('open'); parent.classList.toggle('open'); }
  });

  /* === Page navigation === */
  function initNavigation() {
    document.querySelectorAll('.sidebar nav a[data-page]').forEach(function(a) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        /* Deactivate all sidebar links */
        document.querySelectorAll('.sidebar nav a').forEach(function(x) { x.classList.remove('active'); });
        this.classList.add('active');
        /* Also highlight parent submenu */
        var parentSub = this.closest('.submenu');
        if (parentSub) {
          var parentBtn = document.querySelector('.submenu-parent[data-submenu="' + parentSub.dataset.sub + '"]');
          if (parentBtn) parentBtn.classList.add('open');
          parentSub.classList.add('open');
        }
        /* Close other submenus */
        document.querySelectorAll('.submenu-parent').forEach(function(p) {
          if (parentSub && p.dataset.submenu === parentSub.dataset.sub) return;
          p.classList.remove('open');
        });
        document.querySelectorAll('.submenu').forEach(function(s) {
          if (parentSub && s.dataset.sub === parentSub.dataset.sub) return;
          s.classList.remove('open');
        });
        /* Show page */
        showPage(this.dataset.page);
      });
    });
  }

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(function(p) { p.style.display = 'none'; });
    var page = document.getElementById('page-' + pageId);
    if (page) page.style.display = 'block';

    /* Product new page: inject form */
    if (pageId === 'product-new') {
      var container = document.getElementById('productNewForm');
      if (container && !container.children.length) {
        var tpl = document.getElementById('tplProductForm');
        if (tpl) {
          var clone = document.importNode(tpl.content, true);
          container.appendChild(clone);
        }
        /* Re-bind product events */
        if (window.AdminProducts) window.AdminProducts.rebind();
      }
    }

    /* News new page: inject form from template */
    if (pageId === 'news-new') {
      var nContainer = document.getElementById('newsNewForm');
      if (nContainer && !nContainer.children.length) {
        var nTpl = document.getElementById('tplNewsForm');
        if (nTpl) {
          var nClone = document.importNode(nTpl.content, true);
          nContainer.appendChild(nClone);
        }
        /* Re-bind news events */
        if (window.AdminNews) window.AdminNews.rebind();
      }
    }
  }

  /* === News stats for overview === */
  function loadNewsStats() {
    var A = Auth.getApi(), K = Auth.getToken(), repo = Auth.getRepo();
    U.fetchWithTimeout(A + '/repos/' + repo + '/contents/src/content/news', { headers: { 'Authorization': 'token ' + K } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!Array.isArray(data)) { document.getElementById('overviewNews').innerHTML = '<p style="color:var(--g)">暂无数据</p>'; return; }
        var cats = {}, total = 0;
        data.forEach(function(f) {
          if (!f.name.endsWith('.md')) return; total++;
          U.fetchWithTimeout(f.download_url || f.url).then(function(r) { return r.text(); }).then(function(md) {
            var m = md.match(/category:\s*"([^"]+)"/); if (m) cats[m[1]] = (cats[m[1]] || 0) + 1;
            var all = ['Product Knowledge','Selection Guide','Technical Guide','Industry News','Company News'];
            var h = '<span>总计: <b>' + total + '</b> 篇</span><br><br>';
            all.forEach(function(c) { h += '<div style="margin:2px 0"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + (cats[c] ? '#27ae60' : '#e0e0e0') + ';margin-right:4px"></span><b>' + c + '</b>: ' + (cats[c] || '无') + '</div>'; });
            document.getElementById('overviewNews').innerHTML = h;
          }).catch(function(){});
        });
        if (!total) document.getElementById('overviewNews').innerHTML = '<p style="color:var(--g)">暂无文章</p>';
      }).catch(function() { document.getElementById('overviewNews').innerHTML = '<p style="color:var(--g)">加载失败</p>'; });
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initDashboard); }
  else { initDashboard(); }
})();
