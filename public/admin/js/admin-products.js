/**
 * admin-products.js — Product list, search, edit entry
 * Depends on: AdminUtils, AdminAuth
 */
window.AdminProducts = (function() {
  'use strict';
  var U = window.AdminUtils;
  var Auth = window.AdminAuth;
  var products = [];
  var editingSlug = null;
  var editingSha = null;

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

    /* Category → Subcategory cascade */
    var catEl = document.getElementById('pCat');
    var subEl = document.getElementById('pSub');
    if (catEl && subEl) {
      var subcats = {
        'Gearboxes': ['Worm Gearboxes','Helical Gearboxes','Bevel Gearboxes','Right Angle Gearboxes','Industrial Gearboxes','Screw Jacks','Speed Variators'],
        'Gear Motors': ['AC Gear Motors','Worm Gear Motors','Helical Gear Motors','Bevel Gear Motors'],
        'AC Motors': ['Single Phase AC Motors','Three Phase AC Motors'],
        'Gears': ['Spur Gears','Helical Gears','Bevel Gears','Worm Gears','Custom Gears'],
        'Sprockets': ['Roller Chain Sprockets','Double Pitch Sprockets','Idler Sprockets','Custom Sprockets'],
        'Pulleys': ['Timing Pulleys','V-Belt Pulleys','Custom Pulleys'],
        'Transmission Shafts': ['Gear Shafts','Spline Shafts','Linear Shafts','Custom Shafts'],
        'Sheet Metal Fabrication': ['Welding Parts','Stamping Parts','Enclosures','Laser Cutting Parts']
      };
      function populateSub() {
        var cat = catEl.value;
        var opts = subcats[cat] || [];
        var prev = subEl.value;
        subEl.innerHTML = '<option value="">None</option>';
        opts.forEach(function(s) {
          subEl.innerHTML += '<option value="'+s+'"'+(s===prev?' selected':'')+'>'+s+'</option>';
        });
      }
      catEl.addEventListener('change', populateSub);
      /* Fire on page load for pre-selected category (edit mode) */
      if (catEl.value) populateSub();
    }
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
        products = [];
        var processed = 0;
        data.forEach(function(f) {
          if (!f.name.endsWith('.md')) return;
          processed++;
          U.fetchWithTimeout(f.download_url || f.url)
            .then(function(r) { return r.text(); })
            .then(function(md) {
              var prod = parseFrontmatter(md);
              prod.sha = f.sha;
              prod.path = f.path;
              prod.filename = f.name;
              prod.download_url = f.download_url;
              products.push(prod);
            })
            .catch(function() {})
            .finally(function() {
              processed--;
              if (processed <= 0) renderOverview();
            });
        });
        if (processed === 0) renderOverview();
      })
      .catch(function() {
        document.getElementById('overviewCats').innerHTML = '<p style="color:#ce1132">⚠ Failed to load products. Please check GitHub token.</p>';
      });
  }

  function parseFrontmatter(md) {
    var prod = { title:'', category:'', subcategory:'', excerpt:'', slug:'',
                 imageUrl:'', imageAlt:'', metaTitle:'', metaDescription:'', keywords:'', order:0 };
    var m = md.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return prod;
    var fm = m[1];
    var fields = {
      'title': 'title', 'category': 'category', 'subcategory': 'subcategory',
      'excerpt': 'excerpt', 'slug': 'slug', 'imageUrl': 'imageUrl', 'imageAlt': 'imageAlt',
      'metaTitle': 'metaTitle', 'metaDescription': 'metaDescription',
      'keywords': 'keywords', 'order': 'order'
    };
    for (var key in fields) {
      var re = new RegExp(key + ':\\s*"([^"]*)"');
      var match = fm.match(re);
      if (match) prod[fields[key]] = match[1];
    }
    var orderMatch = fm.match(/order:\s*(\d+)/);
    if (orderMatch) prod.order = parseInt(orderMatch[1]);
    return prod;
  }

  function renderOverview() {
    var cats = {};
    products.forEach(function(p) {
      if (p.category) cats[p.category] = (cats[p.category] || 0) + 1;
    });

    var all = ['Gearboxes', 'Gear Motors', 'AC Motors', 'Gears', 'Sprockets', 'Pulleys', 'Transmission Shafts', 'Sheet Metal Fabrication'];
    var html = '<span>Total: <b>' + products.length + '</b> products</span><br><br>';

    /* Category summary */
    all.forEach(function(c) {
      var n = cats[c] || 0;
      html += '<div style="margin:4px 0"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:' + (n ? '#27ae60' : '#e0e0e0') + ';margin-right:6px"></span><b>' + c + '</b>: ' + (n || '❌ None') + '</div>';
    });

    /* Clickable product list */
    if (products.length > 0) {
      html += '<br><h4 style="margin-bottom:8px">📋 Product List (click to edit)</h4>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:12px">';
      html += '<thead><tr style="background:#f9fafb;text-align:left">';
      html += '<th style="padding:6px 8px;border-bottom:2px solid #e5e7eb">Product</th>';
      html += '<th style="padding:6px 8px;border-bottom:2px solid #e5e7eb">Category</th>';
      html += '<th style="padding:6px 8px;border-bottom:2px solid #e5e7eb">Subcategory</th>';
      html += '</tr></thead><tbody>';

      products.sort(function(a, b) { return (a.category || '').localeCompare(b.category || '') || (a.title || '').localeCompare(b.title || ''); });

      products.forEach(function(p, i) {
        html += '<tr data-prod-idx="' + i + '" style="cursor:pointer;border-bottom:1px solid #f0f0f0" onclick="window.AdminProducts.editProduct(' + i + ')" onmouseenter="this.style.background=\'#fef2f2\'" onmouseleave="this.style.background=\'\'">';
        html += '<td style="padding:6px 8px;color:#ce1132;font-weight:500">' + (p.title || p.slug || p.filename) + '</td>';
        html += '<td style="padding:6px 8px;color:#374151">' + (p.category || '—') + '</td>';
        html += '<td style="padding:6px 8px;color:#6b7280">' + (p.subcategory || '—') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    }

    document.getElementById('overviewCats').innerHTML = html;
  }

  /* === Edit Product === */
  function editProduct(idx) {
    var p = products[idx];
    if (!p) return;
    console.log('Editing product:', p.title || p.slug);

    /* Populate Basic Info */
    document.getElementById('pTitle').value = p.title || '';
    document.getElementById('pSlug').value = p.slug || '';
    document.getElementById('pSlug').dataset.manual = '1';
    document.getElementById('pCat').value = p.category || '';
    document.getElementById('pExcerpt').value = p.excerpt || '';
    document.getElementById('pImgAlt').value = p.imageAlt || '';
    document.getElementById('pImgUrl').value = p.imageUrl || '';

    /* Show image preview if URL exists */
    var preview = document.getElementById('basicImgPreview');
    var placeholder = document.getElementById('basicImgPlaceholder');
    var imgUrl = p.imageUrl || '';
    if (imgUrl) {
      preview.src = imgUrl;
      preview.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    } else {
      preview.src = '';
      preview.style.display = 'none';
      if (placeholder) placeholder.style.display = '';
    }

    /* Trigger subcategory cascade */
    var catEl = document.getElementById('pCat');
    if (catEl) catEl.dispatchEvent(new Event('change'));
    /* Set subcategory after population (slight delay for DOM update) */
    setTimeout(function() {
      var subEl = document.getElementById('pSub');
      if (subEl && p.subcategory) subEl.value = p.subcategory;
    }, 50);

    /* Populate SEO */
    document.getElementById('pMetaTitle').value = p.metaTitle || '';
    document.getElementById('pMetaDesc').value = p.metaDescription || '';
    document.getElementById('pKeywords').value = p.keywords || '';
    document.getElementById('pOrder').value = p.order || 0;

    /* Set edit state */
    editingSlug = p.slug || p.filename.replace('.md', '');
    editingSha = p.sha;

    /* Update save button */
    var saveBtn = document.querySelector('[data-action="save-product"]');
    if (saveBtn) saveBtn.textContent = '💾 Update & Publish';

    /* Switch to Products tab */
    var productsLink = document.querySelector('.sidebar nav a[data-page="products"]');
    if (productsLink) productsLink.click();

    /* Switch to Basic Info tab */
    var basicTab = document.querySelector('#page-products .tab-btn[data-panel="basic"]');
    if (basicTab) basicTab.click();

    U.toast('Loaded: ' + (p.title || p.slug), 'success');
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
    var imgUrl = document.getElementById('pImgUrl').value.trim();
    var alt = document.getElementById('pImgAlt').value.trim();
    var mt = document.getElementById('pMetaTitle').value.trim();
    var md = document.getElementById('pMetaDesc').value.trim();
    var kw = document.getElementById('pKeywords').value.trim();
    var o = parseInt(document.getElementById('pOrder').value) || 0;

    var fm = '---\ntitle: "' + t + '"\ncategory: "' + c + '"\n';
    if (sc) fm += 'subcategory: "' + sc + '"\n';
    fm += 'excerpt: "' + ex + '"\n';
    if (imgUrl) fm += 'imageUrl: "' + imgUrl + '"\n';
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

    var body = { message: (editingSha ? 'Update: ' : 'Add: ') + title, content: b64, branch: 'main' };
    if (editingSha) body.sha = editingSha;

    U.fetchWithTimeout(A + '/repos/' + repo + '/contents/' + path, {
      method: 'PUT',
      headers: { 'Authorization': 'token ' + K, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.content) {
          /* Update local SHA for subsequent saves */
          if (d.content.sha) {
            editingSha = d.content.sha;
            /* Also update in products array */
            for (var i = 0; i < products.length; i++) {
              if (products[i].slug === slug || products[i].filename === slug + '.md') {
                products[i].sha = d.content.sha;
                products[i].slug = slug;
                break;
              }
            }
          }
          editingSlug = slug;
          U.toast('Saved! Deploying...', 'success');
        }
        else { U.toast(d.message || 'Save failed', 'error'); }
      })
      .catch(function() { U.toast('Save failed — network error', 'error'); });
  }

  function resetForm() {
    ['pTitle','pSlug','pCat','pSub','pExcerpt','pImgUrl','pImgAlt','pMetaTitle','pMetaDesc','pKeywords'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('pOrder').value = '0';
    /* Reset image preview */
    var preview = document.getElementById('basicImgPreview');
    var placeholder = document.getElementById('basicImgPlaceholder');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }
    if (placeholder) placeholder.style.display = '';
    editingSlug = null;
    editingSha = null;
    var saveBtn = document.querySelector('[data-action="save-product"]');
    if (saveBtn) saveBtn.textContent = '💾 Save & Publish';
    var slugEl = document.getElementById('pSlug');
    if (slugEl) delete slugEl.dataset.manual;
    U.toast('Form reset', 'success');
  }

  /* === Basic Info Image Upload === */
  function uploadBasicImage() {
    var f = document.getElementById('basicImgInput').files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { U.toast('File too large (>5MB)', 'error'); return; }

    var reader = new FileReader();
    reader.onload = function(e) {
      var b64 = e.target.result.split(',')[1];
      var repo = Auth.getRepo();
      var A = Auth.getApi();
      var K = Auth.getToken();
      /* Sanitize filename: keep extension, replace spaces/special chars */
      var ext = f.name.split('.').pop().toLowerCase();
      var base = f.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 60);
      var safeName = base + '.' + ext;
      var path = 'public/images/products/' + safeName;

      U.fetchWithTimeout(A + '/repos/' + repo + '/contents/' + path, {
        method: 'PUT',
        headers: { 'Authorization': 'token ' + K, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Upload ' + safeName, content: b64, branch: 'main' })
      }).then(function(r) { return r.json(); })
        .then(function(d) {
          var url = '/woshidahuaidan/images/products/' + safeName;
          if (d.content || (d.message && (d.message.indexOf('already exists') >= 0 || d.message.indexOf('sha') >= 0))) {
            /* Update hidden field + preview */
            document.getElementById('pImgUrl').value = url;
            var preview = document.getElementById('basicImgPreview');
            var placeholder = document.getElementById('basicImgPlaceholder');
            if (preview) {
              preview.src = e.target.result; /* data URL for instant preview */
              preview.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            /* Auto-generate ALT if empty */
            var altEl = document.getElementById('pImgAlt');
            if (altEl && !altEl.value.trim()) {
              altEl.value = (document.getElementById('pTitle').value || safeName.replace(/\.[^.]+$/, '').replace(/-/g, ' ')) + ' product image';
            }
            U.toast('Image uploaded!', 'success');
          } else {
            U.toast(d.message || 'Upload failed', 'error');
          }
        })
        .catch(function() { U.toast('Upload failed — network error', 'error'); });
    };
    reader.readAsDataURL(f);
  }

  return {
    init: init,
    loadOverview: loadOverview,
    saveProduct: saveProduct,
    resetForm: resetForm,
    editProduct: editProduct,
    uploadBasicImage: uploadBasicImage
  };
})();
