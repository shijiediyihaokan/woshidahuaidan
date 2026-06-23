/**
 * admin-news.js — News article CRUD
 * Depends on: AdminUtils, AdminAuth
 */
window.AdminNews = (function() {
  'use strict';
  var U = window.AdminUtils;
  var Auth = window.AdminAuth;
  var articles = [];
  var editingSlug = null;
  var editingSha = null;

  function init() {
    console.log('AdminNews.init');
    loadArticleList();
    bindEvents();
    return Promise.resolve();
  }

  function rebind() {
    bindEvents();
  }

  function bindEvents() {
    var saveBtn = document.querySelector('[data-action="save-news"]');
    if (saveBtn) saveBtn.addEventListener('click', saveArticle);

    var resetBtn = document.querySelector('[data-action="reset-news"]');
    if (resetBtn) resetBtn.addEventListener('click', resetForm);

    /* Auto-slug from title */
    var titleEl = document.getElementById('nTitle');
    if (titleEl) titleEl.addEventListener('input', function() {
      var slug = document.getElementById('nSlug');
      if (slug && !slug.dataset.manual) {
        slug.value = this.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
      }
    });

    var slugEl = document.getElementById('nSlug');
    if (slugEl) slugEl.addEventListener('input', function() { this.dataset.manual = '1'; });
  }

  /* === Load articles from GitHub === */
  function loadArticleList() {
    var repo = Auth.getRepo();
    var A = Auth.getApi();
    var K = Auth.getToken();

    var url = A + '/repos/' + repo + '/contents/src/content/news';
    U.fetchWithTimeout(url, { headers: { 'Authorization': 'token ' + K } })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!Array.isArray(data)) { renderEmpty(); return; }
        articles = [];
        var processed = 0;
        data.forEach(function(f) {
          if (!f.name.endsWith('.md')) return;
          processed++;
          U.fetchWithTimeout(f.download_url || f.url)
            .then(function(r) { return r.text(); })
            .then(function(md) {
              var article = parseArticleFM(md);
              article.sha = f.sha;
              article.path = f.path;
              article.filename = f.name;
              articles.push(article);
            })
            .catch(function() {})
            .finally(function() {
              processed--;
              if (processed <= 0) renderArticleList();
            });
        });
        if (processed === 0) renderArticleList();
      })
      .catch(function() { renderEmpty(); });
  }

  function parseArticleFM(md) {
    var a = { title:'', date:'', category:'', excerpt:'', slug:'', image:'', published:true };
    var m = md.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return a;
    var fm = m[1];
    var keys = ['title','category','excerpt','slug','image'];
    keys.forEach(function(k) {
      var re = new RegExp(k + ':\\s*"([^"]*)"');
      var match = fm.match(re);
      if (match) a[k] = match[1];
    });
    var dateMatch = fm.match(/date:\s*(\S+)/);
    if (dateMatch) a.date = dateMatch[1];
    return a;
  }

  function renderArticleList() {
    var container = document.getElementById('newsListContent');
    if (!container) return;

    var cats = {};
    articles.forEach(function(a) {
      if (a.category) cats[a.category] = (cats[a.category] || 0) + 1;
    });

    var allCats = ['Product Knowledge','Selection Guide','Technical Guide','Industry News','Company News'];
    var html = '<span>总计: <b>' + articles.length + '</b> 篇文章</span><br><br>';
    allCats.forEach(function(c) {
      var n = cats[c] || 0;
      html += '<span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:' + (n ? '#27ae60' : '#e0e0e0') + ';margin-right:4px"></span><b>' + c + '</b>: ' + (n || '无') + '  ';
    });

    if (articles.length > 0) {
      html += '<br><br><h4 style="margin-bottom:6px">📋 文章列表（点击编辑）</h4>';
      html += '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#f9fafb;text-align:left">';
      html += '<th style="padding:6px 8px;border-bottom:2px solid #e5e7eb">标题</th>';
      html += '<th style="padding:6px 8px;border-bottom:2px solid #e5e7eb">分类</th>';
      html += '<th style="padding:6px 8px;border-bottom:2px solid #e5e7eb">日期</th>';
      html += '</tr></thead><tbody>';
      articles.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });
      articles.forEach(function(a, i) {
        html += '<tr data-idx="' + i + '" style="cursor:pointer;border-bottom:1px solid #f0f0f0" onclick="window.AdminNews.editArticle(' + i + ')" onmouseenter="this.style.background=\'#fef2f2\'" onmouseleave="this.style.background=\'\'">';
        html += '<td style="padding:6px 8px;color:#ce1132;font-weight:500">' + (a.title || a.slug || a.filename) + '</td>';
        html += '<td style="padding:6px 8px;color:#374151">' + (a.category || '—') + '</td>';
        html += '<td style="padding:6px 8px;color:#6b7280">' + (a.date || '—') + '</td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    }

    container.innerHTML = html;
  }

  function renderEmpty() {
    var container = document.getElementById('newsListContent');
    if (container) container.innerHTML = '<p style="color:var(--g)">暂无文章或需要登录</p>';
  }

  /* === Edit article === */
  function editArticle(idx) {
    var a = articles[idx];
    if (!a) return;

    /* Inject form template into list page if not already there */
    var formContainer = document.getElementById('newsListForm');
    if (formContainer && !formContainer.children.length) {
      var tpl = document.getElementById('tplNewsForm');
      if (tpl) {
        var clone = document.importNode(tpl.content, true);
        formContainer.appendChild(clone);
      }
      /* Clear the news-new form to avoid duplicate IDs in DOM */
      var newForm = document.getElementById('newsNewForm');
      if (newForm) newForm.innerHTML = '';
      bindEvents();
    }

    document.getElementById('nTitle').value = a.title || '';
    document.getElementById('nSlug').value = a.slug || '';
    document.getElementById('nSlug').dataset.manual = '1';
    document.getElementById('nDate').value = a.date ? a.date.substring(0, 10) : '';
    document.getElementById('nCat').value = a.category || '';
    document.getElementById('nExcerpt').value = a.excerpt || '';
    document.getElementById('nImg').value = a.image || '';

    editingSlug = a.slug || a.filename.replace('.md', '');
    editingSha = a.sha;

    var saveBtn = document.querySelector('[data-action="save-news"]');
    if (saveBtn) saveBtn.textContent = '💾 更新并发布';

    /* Show form on the current list page — stay, don't navigate away */
    var listCard = document.getElementById('newsListCard');
    var listTitle = document.getElementById('newsListTitle');
    if (listCard) listCard.style.display = 'none';
    if (listTitle) listTitle.textContent = '📋 已发布文章 — 正在编辑：' + (a.title || a.slug);
    if (formContainer) {
      formContainer.style.display = 'block';
      /* Add back button if not present */
      if (!document.getElementById('newsListBackBtn')) {
        var backBtn = document.createElement('button');
        backBtn.id = 'newsListBackBtn';
        backBtn.className = 'btn btn-secondary';
        backBtn.style.cssText = 'margin-bottom:14px';
        backBtn.textContent = '← 返回文章列表';
        backBtn.addEventListener('click', showArticleListTable);
        formContainer.insertBefore(backBtn, formContainer.firstChild);
      }
    }

    if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

    U.toast('已加载：' + (a.title || a.slug), 'success');
  }

  /* === Return to article list from edit mode === */
  function showArticleListTable() {
    var listCard = document.getElementById('newsListCard');
    var listTitle = document.getElementById('newsListTitle');
    var formContainer = document.getElementById('newsListForm');
    var backBtn = document.getElementById('newsListBackBtn');
    if (listCard) listCard.style.display = '';
    if (listTitle) listTitle.textContent = '📋 已发布文章';
    if (formContainer) formContainer.style.display = 'none';
    if (formContainer) formContainer.innerHTML = '';
    if (backBtn) backBtn.remove();
    editingSlug = null;
    editingSha = null;
    var saveBtn = document.querySelector('[data-action="save-news"]');
    if (saveBtn) saveBtn.textContent = '💾 保存并发布';
    /* Clear news-new form container so it will re-inject from template on next visit */
    var newForm = document.getElementById('newsNewForm');
    if (newForm) newForm.innerHTML = '';
  }

  /* === Save article === */
  function saveArticle() {
    var t = document.getElementById('nTitle').value.trim();
    var s = document.getElementById('nSlug').value.trim();
    var d = document.getElementById('nDate').value;
    var c = document.getElementById('nCat').value;
    var ex = document.getElementById('nExcerpt').value.trim();

    if (!t) { U.toast('请填写标题', 'error'); return; }
    if (!s) { U.toast('请填写 URL 别名', 'error'); return; }
    if (!d) { U.toast('请选择日期', 'error'); return; }
    if (!c) { U.toast('请选择分类', 'error'); return; }
    if (!ex) { U.toast('请填写摘要', 'error'); return; }

    var img = document.getElementById('nImg').value.trim();
    var body = document.getElementById('nBody').value.trim();

    var fm = '---\n';
    fm += 'title: "' + t + '"\n';
    fm += 'date: ' + d + '\n';
    fm += 'category: "' + c + '"\n';
    fm += 'excerpt: "' + ex.replace(/"/g, '\\"') + '"\n';
    if (img) fm += 'image: "' + img + '"\n';
    fm += 'slug: "' + s + '"\n';
    fm += 'published: true\n';
    fm += '---\n';
    if (body) fm += '\n' + body + '\n';

    saveToGithub(s, fm, t);
  }

  function saveToGithub(slug, content, title) {
    var repo = Auth.getRepo();
    var A = Auth.getApi();
    var K = Auth.getToken();
    var path = 'src/content/news/' + slug + '.md';
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
          if (d.content.sha) editingSha = d.content.sha;
          editingSlug = slug;
          U.toast('已保存！正在部署...', 'success');
          /* If editing from the list page, return to list view after save */
          var listFm = document.getElementById('newsListForm');
          if (listFm && listFm.style.display !== 'none') {
            setTimeout(function() { showArticleListTable(); }, 1500);
          }
        } else {
          U.toast(d.message || '保存失败', 'error');
        }
      })
      .catch(function() { U.toast('保存失败 — 网络错误', 'error'); });
  }

  function resetForm() {
    ['nTitle','nSlug','nDate','nCat','nExcerpt','nImg','nBody'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('nCat').value = '';
    editingSlug = null;
    editingSha = null;
    var saveBtn = document.querySelector('[data-action="save-news"]');
    if (saveBtn) saveBtn.textContent = '💾 保存并发布';
    var slugEl = document.getElementById('nSlug');
    if (slugEl) delete slugEl.dataset.manual;
    U.toast('表单已重置', 'success');
  }

  return {
    init: init,
    rebind: rebind,
    loadArticleList: loadArticleList,
    saveArticle: saveArticle,
    resetForm: resetForm,
    editArticle: editArticle,
    showArticleListTable: showArticleListTable
  };
})();
