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

  function rebind() {
    bindEvents();
  }

  function bindEvents() {
    /* Save product — remove old listener first to prevent double-binding */
    var saveBtn = document.querySelector('[data-action="save-product"]');
    console.log('BIND: saveBtn found=', !!saveBtn);
    console.trace('BIND: called from');
    if (saveBtn) {
      saveBtn.removeEventListener('click', saveProduct);
      saveBtn.addEventListener('click', saveProduct);
      console.log('BIND: saveProduct listener attached (old removed)');
    } else {
      console.warn('BIND: save-btn NOT FOUND in DOM');
    }

    /* Reset form */
    var resetBtn = document.querySelector('[data-action="reset-form"]');
    if (resetBtn) {
      resetBtn.removeEventListener('click', resetForm);
      resetBtn.addEventListener('click', resetForm);
    }

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
          var el = document.getElementById('productListContent') || document.getElementById('overviewCats');
          if (el) el.innerHTML = '<p style="color:var(--g)">暂无产品或需要登录</p>';
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
        var el = document.getElementById('productListContent') || document.getElementById('overviewCats');
        if (el) el.innerHTML = '<p style="color:#ce1132">⚠ 加载失败，请检查 GitHub Token</p>';
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

    /* vizData: JSON array for detail page module restore */
    var vizMatch = fm.match(/vizData:\s*(\[[\s\S]*?\])\s*\n/);
    if (vizMatch) {
      prod.vizData = vizMatch[1].trim();
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

    document.getElementById('productListContent').innerHTML = html;
    /* Also update overview stats */
    var ovCats = document.getElementById('overviewCats');
    if (ovCats) {
      var ovHtml = '<span>总计: <b>' + products.length + '</b> 个产品</span><br><br>';
      all.forEach(function(c) {
        var n = cats[c] || 0;
        ovHtml += '<div style="margin:2px 0"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:' + (n ? '#27ae60' : '#e0e0e0') + ';margin-right:4px"></span><b>' + c + '</b>: ' + (n || '无') + '</div>';
      });
      ovCats.innerHTML = ovHtml;
    }
  }

  /* === Edit Product === */
  function editProduct(idx) {
    var p = products[idx];
    if (!p) return;
    console.log('Editing product:', p.title || p.slug);

    /* Inject form template into list page if not already there */
    var formContainer = document.getElementById('productListForm');
    console.log('editProduct: formContainer found=', !!formContainer, 'children=', formContainer ? formContainer.children.length : -1);
    if (formContainer && !formContainer.children.length) {
      var tpl = document.getElementById('tplProductForm');
      console.log('editProduct: tpl found=', !!tpl, 'content childCount=', tpl ? tpl.content.childNodes.length : -1);
      if (tpl) {
        var clone = document.importNode(tpl.content, true);
        console.log('editProduct: clone childCount=', clone.childNodes.length);
        formContainer.appendChild(clone);
        console.log('editProduct: after append, formContainer children=', formContainer.children.length);
        /* Verify key elements exist */
        console.log('editProduct: vizPreview=', !!document.getElementById('vizPreview'));
        console.log('editProduct: pTitle=', !!document.getElementById('pTitle'));
      }
      /* Clear the new-product form to avoid duplicate IDs in DOM */
      var newForm = document.getElementById('productNewForm');
      if (newForm) newForm.innerHTML = '';
      rebind();
    }

    /* Populate Basic Info */
    console.log('POPULATE: p.title=', p.title, 'p.slug=', p.slug);
    document.getElementById('pTitle').value = p.title || '';
    console.log('POPULATE: after set, pTitle.value=', document.getElementById('pTitle').value);
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

    /* Restore detail page modules from vizData */
    if (typeof __vizData !== 'undefined') {
      __vizData.length = 0;
      if (p.vizData) {
        try {
          var vizParsed = JSON.parse(p.vizData);
          if (Array.isArray(vizParsed)) {
            vizParsed.forEach(function(m) { __vizData.push(m); });
          }
        } catch(e) { console.warn('vizData parse error:', e); }
      }
      if (window.AdminEditor && window.AdminEditor.renderAll) {
        window.AdminEditor.renderAll();
      }
    }

    /* Set edit state */
    editingSlug = p.slug || p.filename.replace('.md', '');
    editingSha = p.sha;

    /* Update save button */
    var saveBtn = document.querySelector('[data-action="save-product"]');
    if (saveBtn) saveBtn.textContent = '💾 更新并发布';

    /* Show form on the current list page — stay, don't navigate away */
    var listCard = document.getElementById('productListCard');
    var listTitle = document.getElementById('productListTitle');
    if (listCard) listCard.style.display = 'none';
    if (listTitle) listTitle.textContent = '📋 已发布产品 — 正在编辑：' + (p.title || p.slug);
    if (formContainer) {
      formContainer.style.display = 'block';
      /* Add back button if not present */
      if (!document.getElementById('productListBackBtn')) {
        var backBtn = document.createElement('button');
        backBtn.id = 'productListBackBtn';
        backBtn.className = 'btn btn-secondary';
        backBtn.style.cssText = 'margin-bottom:14px';
        backBtn.textContent = '← 返回产品列表';
        backBtn.addEventListener('click', showProductListTable);
        formContainer.insertBefore(backBtn, formContainer.firstChild);
      }
    }

    /* Scroll to the form */
    if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    U.toast('已加载：' + (p.title || p.slug), 'success');
  }

  /* === Return to product list from edit mode === */
  function showProductListTable() {
    var listCard = document.getElementById('productListCard');
    var listTitle = document.getElementById('productListTitle');
    var formContainer = document.getElementById('productListForm');
    var backBtn = document.getElementById('productListBackBtn');
    if (listCard) listCard.style.display = '';
    if (listTitle) listTitle.textContent = '📋 已发布产品';
    if (formContainer) formContainer.style.display = 'none';
    if (formContainer) formContainer.innerHTML = '';
    if (backBtn) backBtn.remove();
    editingSlug = null;
    editingSha = null;
    var saveBtn = document.querySelector('[data-action="save-product"]');
    if (saveBtn) saveBtn.textContent = '💾 保存并发布';
    /* Clear viz data */
    if (typeof __vizData !== 'undefined') { __vizData.length = 0; }
    if (window.AdminEditor && window.AdminEditor.renderAll) window.AdminEditor.renderAll();
    /* Clear new-product form container so it will re-inject from template on next visit */
    var newForm = document.getElementById('productNewForm');
    if (newForm) newForm.innerHTML = '';
  }

  /* === Save Product === */
  function saveProduct() {
    console.log('SAVE: saveProduct called');
    var tEl = document.getElementById('pTitle');
    console.log('SAVE: pTitle el=', !!tEl, 'value=', tEl ? tEl.value : 'N/A');
    if (!tEl) { U.toast('表单未加载，请刷新页面', 'error'); return; }
    var t = tEl.value.trim();
    var s = document.getElementById('pSlug').value.trim();
    var c = document.getElementById('pCat').value;
    var ex = document.getElementById('pExcerpt').value.trim();

    if (!t) { U.toast('请填写产品名称', 'error'); return; }
    if (!s) { U.toast('请填写 URL 别名', 'error'); return; }
    if (!c) { U.toast('请选择产品分类', 'error'); return; }
    if (!ex) { U.toast('请填写简短描述', 'error'); return; }

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
    fm += 'order: ' + o + '\n';

    /* Store vizData modules as JSON for edit restore */
    if (typeof __vizData !== 'undefined' && __vizData.length) {
      fm += 'vizData: ' + JSON.stringify(__vizData) + '\n';
    }

    fm += 'published: true\n---\n';

    /* Append Detail Page editor content as Markdown body */
    var bodyHTML = buildDetailHTML();
    if (bodyHTML) fm += '\n' + bodyHTML + '\n';

    return fm;
  }

  /* === Build clean HTML from Detail Page editor modules === */
  function buildDetailHTML() {
    if (typeof __vizData === 'undefined' || !__vizData.length) return '';
    var html = '';
    for (var i = 0; i < __vizData.length; i++) {
      var m = __vizData[i];
      var d = m.data || {};
      switch (m.type) {
        case 'text':
          html += '<div class="detail-text">' + (d.text || '') + '</div>\n';
          break;
        case 'h2':
          html += '<h2 class="detail-h2">' + (d.text || '') + '</h2>\n';
          break;
        case 'h3':
          html += '<h3 class="detail-h3">' + (d.text || '') + '</h3>\n';
          break;
        case 'image':
          if (d.url) {
            var w = d.widthPercent || 60;
            html += '<figure class="detail-image" style="text-align:' + (d.alignment || 'center') + '">' +
              '<img src="' + d.url + '" alt="' + (d.alt || '') + '" style="width:' + w + '%;height:auto;display:inline-block" loading="lazy">' +
              '</figure>\n';
          }
          break;
        case 'features':
          if (d.items && d.items.length) {
            html += '<ul class="detail-features">\n';
            for (var fi = 0; fi < d.items.length; fi++) {
              var fItem = d.items[fi] || {};
              if (fItem.name) html += '<li>' + fItem.name + '</li>\n';
            }
            html += '</ul>\n';
          }
          break;
        case 'specs':
          if (d.rows && d.rows.length) {
            html += '<table class="detail-specs"><tbody>\n';
            for (var si = 0; si < d.rows.length; si++) {
              var sRow = d.rows[si] || {};
              html += '<tr><td>' + (sRow.name || '') + '</td><td>' + (sRow.value || '') + '</td></tr>\n';
            }
            html += '</tbody></table>\n';
          }
          break;
        case 'faq':
          if (d.items && d.items.length) {
            for (var qi = 0; qi < d.items.length; qi++) {
              var qItem = d.items[qi] || {};
              html += '<details class="detail-faq"><summary>' + (qItem.q || '') + '</summary><p>' + (qItem.a || '') + '</p></details>\n';
            }
          }
          break;
        case 'table':
          if (d.rows && d.rows.length && d.cols) {
            html += '<table class="detail-table"><tbody>\n';
            for (var ti = 0; ti < d.rows.length; ti++) {
              html += '<tr>';
              for (var tj = 0; tj < (d.cols || 2); tj++) {
                html += '<td>' + ((d.rows[ti] || [])[tj] || '') + '</td>';
              }
              html += '</tr>\n';
            }
            html += '</tbody></table>\n';
          }
          break;
        case 'cta':
          html += '<div class="detail-cta">';
          if (d.title) html += '<h4>' + d.title + '</h4>';
          if (d.text) html += '<p>' + d.text + '</p>';
          if (d.email) html += '<p>Email: ' + d.email + '</p>';
          if (d.phone) html += '<p>Phone: ' + d.phone + '</p>';
          html += '</div>\n';
          break;
        case '2imgs': case '3imgs': case '4imgs': case '6imgs':
          if (d.imgs && d.imgs.length) {
            var gn = parseInt(m.type);
            html += '<div class="detail-img-grid" style="display:grid;grid-template-columns:repeat(' + gn + ',1fr);gap:8px">\n';
            for (var gi = 0; gi < d.imgs.length; gi++) {
              var item = d.imgs[gi] || {};
              if (item.url) {
                html += '<figure><img src="' + item.url + '" alt="' + (item.alt || '') + '" style="width:100%" loading="lazy">';
                if (item.text) html += '<figcaption>' + item.text + '</figcaption>';
                html += '</figure>\n';
              }
            }
            html += '</div>\n';
          }
          break;
      }
    }
    return html;
  }

  function saveToGithub(slug, content, title) {
    var repo = Auth.getRepo();
    var A = Auth.getApi();
    var K = Auth.getToken();
    var path = 'src/content/products/' + slug + '.md';
    var b64 = btoa(unescape(encodeURIComponent(content)));

    console.log('SAVE2GITHUB: editingSha=', editingSha, 'slug=', slug);

    var body = { message: (editingSha ? 'Update: ' : 'Add: ') + title, content: b64, branch: 'main' };
    if (editingSha) body.sha = editingSha;

    console.log('SAVE2GITHUB: body has sha=', !!body.sha, 'message=', body.message);

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
          U.toast('已保存！正在部署...', 'success');
          /* If editing from the list page, return to list view after save */
          var listFm = document.getElementById('productListForm');
          if (listFm && listFm.style.display !== 'none') {
            setTimeout(function() { showProductListTable(); }, 1500);
          }
        }
        else { U.toast(d.message || '保存失败', 'error'); }
      })
      .catch(function() { U.toast('保存失败 — 网络错误', 'error'); });
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
    if (saveBtn) saveBtn.textContent = '💾 保存并发布';
    var slugEl = document.getElementById('pSlug');
    if (slugEl) delete slugEl.dataset.manual;
    U.toast('表单已重置', 'success');
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
      U.toast('❌ ' + f.name + ' 文件过大！' + (f.size / 1024).toFixed(0) + 'KB > 5MB', 'error');
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
          var url = '/images/products/' + safeName;
          if (d.content) addToGallery(f, e.target.result, url, safeName);
          else if (d.message && (d.message.indexOf('already exists') >= 0 || d.message.indexOf('sha') >= 0))
            addToGallery(f, e.target.result, url, safeName);
          else { addToGallery(f, e.target.result, url, safeName); U.toast('上传失败：' + d.message, 'error'); }
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
    U.toast('图片已移除', 'success');
  }

  function setMainImage(i) {
    var img = galleryImages.splice(i, 1)[0];
    galleryImages.unshift(img);
    renderGallery();
    U.toast('⭐ 已设置新主图', 'success');
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
    if (!url) { U.toast('请粘贴图片 URL', 'error'); return; }
    /* Basic validation */
    if (!/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i.test(url) && url.indexOf('/images/') < 0) {
      U.toast('不是有效的图片 URL 格式（需要 .jpg/.png/.webp）', 'error');
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
    U.toast('已添加：' + fname, 'success');
  }

  return {
    init: init,
    rebind: rebind,
    loadOverview: loadOverview,
    saveProduct: saveProduct,
    resetForm: resetForm,
    editProduct: editProduct,
    showProductListTable: showProductListTable,
    addGalleryImages: addGalleryImages,
    addGalleryUrl: addGalleryUrl,
    removeGalleryImage: removeGalleryImage,
    setMainImage: setMainImage,
    updateGallery: updateGallery,
    _galleryImages: galleryImages
  };
})();
