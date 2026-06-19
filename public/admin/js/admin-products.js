/**
 * admin-products.js — Product list, search, edit entry
 * Depends on: AdminUtils, AdminAuth
 */
window.AdminProducts = (function() {
  'use strict';
  var U = window.AdminUtils;
  var Auth = window.AdminAuth;
  var products = [];

  function init() {
    console.log('AdminProducts.init');
    loadOverview();
    bindEvents();
    return Promise.resolve();
  }

  function bindEvents() {
    /* Save product */
    var saveBtn = document.querySelector('[data-action="save-product"]');
    if (saveBtn) saveBtn.addEventListener('click', saveProduct);

    /* Reset form */
    var resetBtn = document.querySelector('[data-action="reset-form"]');
    if (resetBtn) resetBtn.addEventListener('click', resetForm);

    /* Auto-slug from title */
    var titleEl = document.getElementById('pTitle');
    if (titleEl) titleEl.addEventListener('input', function() {
      var slug = document.getElementById('pSlug');
      if (slug && !slug.dataset.manual) {
        slug.value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
      }
    });

    /* Slug manual override */
    var slugEl = document.getElementById('pSlug');
    if (slugEl) slugEl.addEventListener('input', function() { this.dataset.manual = '1'; });
  }

  /* === Load Overview === */
  function loadOverview() {
    var repo = Auth.getRepo();
    var A = Auth.getApi();
    var K = Auth.getToken();

    var url = A + '/repos/' + repo + '/contents/src/content/products';
    U.fetchWithTimeout(url, { headers: { 'Authorization': 'token ' + K } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!Array.isArray(data)) {
          document.getElementById('overviewCats').innerHTML = '<p style="color:var(--g)">No products found or login required.</p>';
          return;
        }
        var cats = {}, total = 0, processed = 0;
        data.forEach(function(f) {
          if (!f.name.endsWith('.md')) return;
          processed++;
          U.fetchWithTimeout(f.download_url || f.url)
            .then(function(r) { return r.text(); })
            .then(function(md) {
              var m = md.match(/category:\s*"([^"]+)"/);
              if (m) { cats[m[1]] = (cats[m[1]] || 0) + 1; total++; }
            })
            .catch(function() {})
            .finally(function() {
              processed--;
              if (processed <= 0) renderOverview(cats, total);
            });
        });
        if (processed === 0) renderOverview({}, 0);
      })
      .catch(function() {
        document.getElementById('overviewCats').innerHTML = '<p style="color:#ce1132">⚠ Failed to load products. Please check GitHub token.</p>';
      });
  }

  function renderOverview(cats, total) {
    var all = ['Gearboxes', 'Gear Motors', 'AC Motors', 'Gears', 'Sprockets', 'Pulleys', 'Transmission Shafts', 'Sheet Metal Fabrication'];
    var html = '<span>Total: <b>' + total + '</b> products</span><br><br>';
    all.forEach(function(c) {
      var n = cats[c] || 0;
      html += '<div style="margin:4px 0"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:' + (n ? '#27ae60' : '#e0e0e0') + ';margin-right:6px"></span><b>' + c + '</b>: ' + (n || '❌ None') + '</div>';
    });
    document.getElementById('overviewCats').innerHTML = html;
  }

  /* === Save Product === */
  function saveProduct() {
    var t = document.getElementById('pTitle').value.trim();
    var s = document.getElementById('pSlug').value.trim();
    var c = document.getElementById('pCat').value;
    var ex = document.getElementById('pExcerpt').value.trim();

    if (!t) { U.toast('Product Name required', 'error'); return; }
    if (!s) { U.toast('Slug required', 'error'); return; }
    if (!c) { U.toast('Category required', 'error'); return; }
    if (!ex) { U.toast('Short Description required', 'error'); return; }

    var fm = buildFrontmatter(t, s, c, ex);
    saveToGithub(s, fm, t);
  }

  function buildFrontmatter(t, s, c, ex) {
    var sc = document.getElementById('pSub').value;
    var alt = document.getElementById('pImgAlt').value.trim();
    var mt = document.getElementById('pMetaTitle').value.trim();
    var md = document.getElementById('pMetaDesc').value.trim();
    var kw = document.getElementById('pKeywords').value.trim();
    var o = parseInt(document.getElementById('pOrder').value) || 0;

    var fm = '---\ntitle: "' + t + '"\ncategory: "' + c + '"\n';
    if (sc) fm += 'subcategory: "' + sc + '"\n';
    fm += 'excerpt: "' + ex + '"\n';
    if (alt) fm += 'imageAlt: "' + alt + '"\n';
    fm += 'slug: "' + s + '"\n';
    if (mt) fm += 'metaTitle: "' + mt + '"\n';
    if (md) fm += 'metaDescription: "' + md + '"\n';
    if (kw) fm += 'keywords: "' + kw + '"\n';
    fm += 'order: ' + o + '\npublished: true\n---\n';
    return fm;
  }

  function saveToGithub(slug, content, title) {
    var repo = Auth.getRepo();
    var A = Auth.getApi();
    var K = Auth.getToken();
    var path = 'src/content/products/' + slug + '.md';
    var b64 = btoa(unescape(encodeURIComponent(content)));

    U.fetchWithTimeout(A + '/repos/' + repo + '/contents/' + path, {
      method: 'PUT',
      headers: { 'Authorization': 'token ' + K, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Add/Update: ' + title, content: b64, branch: 'main' })
    }).then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.content) { U.toast('Saved! Deploying...', 'success'); }
        else { U.toast(d.message || 'Save failed', 'error'); }
      })
      .catch(function() { U.toast('Save failed — network error', 'error'); });
  }

  function resetForm() {
    ['pTitle','pSlug','pCat','pSub','pExcerpt','pImgAlt','pMetaTitle','pMetaDesc','pKeywords'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('pOrder').value = '0';
    U.toast('Form reset', 'success');
  }

  return {
    init: init,
    loadOverview: loadOverview,
    saveProduct: saveProduct,
    resetForm: resetForm
  };
})();
