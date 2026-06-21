/**
 * admin-products.js — Product list, search, edit entry + Image Gallery
 * Depends on: AdminUtils, AdminAuth
 */
window.AdminProducts = (function() {
  'use strict';
  var U = window.AdminUtils;
  var Auth = window.AdminAuth;
  var products = [];
  var editingSlug = null;
  var editingSha = null;
  var galleryImages = [];

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
                 image:'', imageAlt:'', gallery:'', metaTitle:'', metaDescription:'', keywords:'', order:0 };
    var m = md.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return prod;
    var fm = m[1];

    /* String fields */
    var stringKeys = ['title','category','subcategory','excerpt','slug','image','imageAlt','imageUrl','metaTitle','metaDescription','keywords'];
    stringKeys.forEach(function(key) {
      var re = new RegExp(key + ':\\s*"([^"]*)"');
      var match = fm.match(re);
      if (match) {
        if (key === 'imageUrl') prod.image = match[1];  /* alias: imageUrl → image */
        else prod[key] = match[1];
      }
    });

    /* Numeric fields */
    var orderMatch = fm.match(/order:\s*(\d+)/);
    if (orderMatch) prod.order = parseInt(orderMatch[1]);

    /* Gallery: JSON array on one or more lines */
    var galleryMatch = fm.match(/gallery:\s*(\[[\s\S]*?\n)/);
    if (galleryMatch) {
      prod.gallery = galleryMatch[1].trim();
    }

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

    /* Restore gallery from frontmatter */
    galleryImages = [];
    var galleryField = p.gallery || '';
    if (galleryField) {
      try {
        var parsed = JSON.parse(galleryField);
        if (Array.isArray(parsed)) {
          parsed.forEach(function(img) {
            /* dataUrl not stored in FM — use the URL as src for preview */
            galleryImages.push({
              name: img.name || '',
              url: img.url || '',
              size: img.size || '',
              dims: img.dims || '',
              alt: img.alt || '',
              dataUrl: img.url || ''  /* use URL as preview source */
            });
          });
        }
      } catch(e) {
        console.warn('Gallery parse error:', e);
      }
    }
    renderGallery();
    document.getElementById('pGallery').value = galleryField;

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
    var alt = document.getElementById('pImgAlt').value.trim();
    var mt = document.getElementById('pMetaTitle').value.trim();
    var md = document.getElementById('pMetaDesc').value.trim();
    var kw = document.getElementById('pKeywords').value.trim();
    var o = parseInt(document.getElementById('pOrder').value) || 0;

    var fm = '---\ntitle: "' + t + '"\ncategory: "' + c + '"\n';
    if (sc) fm += 'subcategory: "' + sc + '"\n';
    fm += 'excerpt: "' + ex + '"\n';

    /* Main image: first gallery image URL */
    if (galleryImages.length > 0 && galleryImages[0].url) {
      fm += 'image: "' + galleryImages[0].url + '"\n';
    }
    if (alt) fm += 'imageAlt: "' + alt + '"\n';

    /* Gallery: all images as JSON */
    var galleryJson = JSON.stringify(galleryImages.map(function(img) {
      return { name: img.name, url: img.url, size: img.size, dims: img.dims, alt: img.alt };
    }));
    if (galleryImages.length > 0) {
      fm += 'gallery: ' + galleryJson + '\n';
    }

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
    ['pTitle','pSlug','pCat','pSub','pExcerpt','pImgAlt','pMetaTitle','pMetaDesc','pKeywords'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('pOrder').value = '0';
    /* Clear gallery */
    document.getElementById('pGallery').value = '';
    galleryImages = [];
    renderGallery();
    editingSlug = null;
    editingSha = null;
    var saveBtn = document.querySelector('[data-action="save-product"]');
    if (saveBtn) saveBtn.textContent = '💾 Save & Publish';
    var slugEl = document.getElementById('pSlug');
    if (slugEl) delete slugEl.dataset.manual;
    U.toast('Form reset', 'success');
  }

  /* ================================================================
   *  IMAGE GALLERY
   *  ================================================================ */
  function addGalleryImages() {
    var files = document.getElementById('galleryFile').files;
    for (var i = 0; i < files.length; i++) { uploadGalleryImage(files[i]); }
    document.getElementById('galleryFile').value = '';
  }

  function uploadGalleryImage(f) {
    /* Sanitize filename */
    var ext = f.name.lastIndexOf('.') > 0 ? f.name.substring(f.name.lastIndexOf('.')) : '';
    var base = f.name.substring(0, f.name.lastIndexOf('.') > 0 ? f.name.lastIndexOf('.') : f.name.length);
    base = base.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 60);
    var safeName = base + ext;

    if (f.size > 5 * 1024 * 1024) {
      U.toast('❌ ' + f.name + ' file too large! ' + (f.size / 1024).toFixed(0) + 'KB > 5MB', 'error');
      return;
    }

    var reader = new FileReader();
    reader.onload = function(e) {
      var b64 = e.target.result.split(',')[1];
      var path = 'public/images/products/' + safeName;
      var K = Auth.getToken();
      if (!K) { addToGallery(f, e.target.result, null, safeName); return; }

      var repo = Auth.getRepo();
      var A = Auth.getApi();
      U.fetchWithTimeout(A + '/repos/' + repo + '/contents/' + path, {
        method: 'PUT',
        headers: { 'Authorization': 'token ' + K, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Upload ' + safeName, content: b64, branch: 'main' })
      }).then(function(r) { return r.json(); })
        .then(function(d) {
          var url = '/woshidahuaidan/images/products/' + safeName;
          if (d.content) addToGallery(f, e.target.result, url, safeName);
          else if (d.message && (d.message.indexOf('already exists') >= 0 || d.message.indexOf('sha') >= 0))
            addToGallery(f, e.target.result, url, safeName);
          else { addToGallery(f, e.target.result, url, safeName); U.toast('Upload failed: ' + d.message, 'error'); }
        })
        .catch(function() { addToGallery(f, e.target.result, null, safeName); });
    };
    reader.readAsDataURL(f);
  }

  function buildGalleryAlt(productName, fileName, cat) {
    var angleHints = {
      front: 'front view', side: 'side view', back: 'back view', top: 'top view',
      bottom: 'bottom view', iso: 'isometric view', assembly: 'assembly view',
      detail: 'detail view', main: 'product image', multi: 'multi-angle view'
    };
    var hint = 'product image';
    var fnLower = fileName.toLowerCase();
    for (var k in angleHints) {
      if (fnLower.indexOf(k) >= 0) { hint = angleHints[k]; break; }
    }
    var alt = '';
    if (productName) {
      alt = productName.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    } else if (cat) {
      alt = cat.toLowerCase().replace(/s$/, '');
    } else {
      alt = fnLower.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    alt = alt + ' ' + hint;
    alt = alt.charAt(0).toUpperCase() + alt.slice(1);
    return alt;
  }

  function addToGallery(f, dataUrl, url, safeName) {
    var img = new Image();
    img.onload = function() {
      var dims = img.width + '×' + img.height + 'px';
      var sizeKB = (f.size / 1024).toFixed(0) + 'KB';
      var displayName = safeName || f.name;
      var productName = document.getElementById('pTitle').value || '';
      var defaultAlt = buildGalleryAlt(productName, f.name, document.getElementById('pCat').value);
      galleryImages.push({
        name: displayName, url: url || '', size: sizeKB,
        dims: dims, alt: defaultAlt, dataUrl: dataUrl
      });
      renderGallery();
    };
    img.src = dataUrl;
  }

  function renderGallery() {
    var strip = document.getElementById('galleryStrip');
    if (!strip) return;
    var html = '';
    galleryImages.forEach(function(img, i) {
      html += '<div style="position:relative;width:150px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fafafa;flex-shrink:0">' +
        '<img src="' + img.dataUrl + '" style="width:100%;height:120px;object-fit:cover">' +
        '<button onclick="window.AdminProducts.removeGalleryImage(' + i + ')" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:50%;width:22px;height:22px;font-size:12px;cursor:pointer;line-height:22px;text-align:center">✕</button>' +
        (i === 0
          ? '<span style="position:absolute;top:4px;left:4px;background:var(--r);color:#fff;border-radius:3px;font-size:10px;padding:1px 5px;font-weight:bold">★ MAIN</span>'
          : '<button onclick="window.AdminProducts.setMainImage(' + i + ')" title="Set as main" style="position:absolute;top:4px;left:4px;background:rgba(0,0,0,.5);color:#fff;border:none;border-radius:3px;font-size:10px;padding:1px 5px;cursor:pointer">Set Main</button>') +
        '<div style="padding:6px 8px">' +
        '<input value="' + (img.name || '') + '" onchange="window.AdminProducts._galleryImages[' + i + '].name=this.value;window.AdminProducts.updateGallery()" style="width:100%;border:none;font-size:11px;padding:2px;background:transparent" title="Filename (editable)">' +
        '<div style="font-size:10px;color:var(--g);margin:2px 0">' + (img.size || '') + ' | ' + (img.dims || '') + '</div>' +
        '<input value="' + (img.alt || '') + '" placeholder="ALT text" onchange="window.AdminProducts._galleryImages[' + i + '].alt=this.value;window.AdminProducts.updateGallery()" style="width:100%;border:1px solid #e5e7eb;border-radius:3px;font-size:10px;padding:2px 4px;margin-top:2px">' +
        '</div></div>';
    });
    strip.innerHTML = html;
    updateGallery();
  }

  function removeGalleryImage(i) {
    galleryImages.splice(i, 1);
    renderGallery();
    U.toast('Image removed', 'success');
  }

  function setMainImage(i) {
    var img = galleryImages.splice(i, 1)[0];
    galleryImages.unshift(img);
    renderGallery();
    U.toast('⭐ New main image set', 'success');
  }

  function updateGallery() {
    var pg = document.getElementById('pGallery');
    if (pg) pg.value = JSON.stringify(galleryImages.map(function(img) {
      return { name: img.name, url: img.url, size: img.size, dims: img.dims, alt: img.alt };
    }));
    /* Sync first image to pImgAlt */
    if (galleryImages.length > 0) {
      var altEl = document.getElementById('pImgAlt');
      if (altEl && !altEl.dataset.manualAlt) {
        altEl.value = galleryImages[0].alt || '';
      }
    }
    /* Track manual ALT edits */
    var altEl = document.getElementById('pImgAlt');
    if (altEl && !altEl.dataset.bound) {
      altEl.dataset.bound = '1';
      altEl.addEventListener('input', function() { this.dataset.manualAlt = '1'; });
    }
  }

  function addGalleryUrl() {
    var input = document.getElementById('galleryUrlInput');
    if (!input) return;
    var url = input.value.trim();
    if (!url) { U.toast('Please paste an image URL', 'error'); return; }
    /* Basic validation */
    if (!/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url) && url.indexOf('/images/') < 0) {
      U.toast('Doesn\'t look like an image URL (.jpg/.png/.webp expected)', 'error');
      return;
    }
    var parts = url.split('/');
    var fname = parts[parts.length - 1].split('?')[0];
    galleryImages.push({
      name: fname, url: url, size: '', dims: '',
      alt: buildGalleryAlt(document.getElementById('pTitle').value || '', fname, document.getElementById('pCat').value),
      dataUrl: url
    });
    renderGallery();
    input.value = '';
    U.toast('Added: ' + fname, 'success');
  }

  return {
    init: init,
    loadOverview: loadOverview,
    saveProduct: saveProduct,
    resetForm: resetForm,
    editProduct: editProduct,
    addGalleryImages: addGalleryImages,
    addGalleryUrl: addGalleryUrl,
    removeGalleryImage: removeGalleryImage,
    setMainImage: setMainImage,
    updateGallery: updateGallery,
    _galleryImages: galleryImages
  };
})();
