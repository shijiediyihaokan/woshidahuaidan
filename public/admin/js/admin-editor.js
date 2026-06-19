/**
 * admin-editor.js — Detail page editor with module builder
 * Depends on: AdminUtils
 * All event binding via data-action, no inline onclick
 */
window.AdminEditor = (function() {
  'use strict';
  var U = window.AdminUtils;
  var vizData = [];

  function init() {
    console.log('AdminEditor.init');
    bindModuleButtons();
    bindGlobalActions();
    return Promise.resolve();
  }

  /* === Bind module add buttons via data-action === */
  function bindModuleButtons() {
    document.addEventListener('click', function(event) {
      var btn = event.target.closest('[data-action="add-module"]');
      if (!btn) return;
      event.preventDefault();
      var type = btn.dataset.type;
      if (type) addModule(type);
    });
  }

  function bindGlobalActions() {
    document.addEventListener('click', function(event) {
      var btn = event.target.closest('[data-action="export-viz"]');
      if (!btn) return;
      event.preventDefault();
      exportViz();
    });
  }

  /* === Module operations === */
  function addModule(type) {
    var module = createDefaultModule(type);
    vizData.push(module);
    renderAll();
    scrollToViz(vizData.length - 1);
  }

  function createDefaultModule(type) {
    var data = {};
    switch(type) {
      case 'text': data = { text: '' }; break;
      case 'h2': data = { text: '', style: 'red-left', color: '#ce1132' }; break;
      case 'h3': data = { text: '', style: 'red-left', color: '#ce1132' }; break;
      case 'image': data = { url: '', alt: '' }; break;
      case 'features': data = { items: [{ name: '', desc: '' }] }; break;
      case 'specs': data = { rows: [{ name: '', value: '' }] }; break;
      case 'faq': data = { items: [{ q: '', a: '' }] }; break;
      case 'table': data = { rows: [['', ''], ['', '']], cols: 2, style: 'striped', color: '#ce1132' }; break;
      case 'cta': data = { title: '', text: '', email: '', phone: '' }; break;
      default: data = {};
    }
    return { type: type, data: data };
  }

  function deleteModule(idx) {
    vizData.splice(idx, 1);
    renderAll();
  }

  function moveUp(idx) {
    if (idx > 0) { var t = vizData[idx]; vizData[idx] = vizData[idx - 1]; vizData[idx - 1] = t; renderAll(); }
  }

  function moveDown(idx) {
    if (idx < vizData.length - 1) { var t = vizData[idx]; vizData[idx] = vizData[idx + 1]; vizData[idx + 1] = t; renderAll(); }
  }

  function scrollToViz(idx) {
    setTimeout(function() {
      var el = document.getElementById('viz-' + idx);
      if (el) { el.scrollIntoView({ behavior: 'smooth' }); el.style.background = '#fffde7'; setTimeout(function() { el.style.background = ''; }, 1500); }
    }, 100);
  }

  /* === Render all modules === */
  function renderAll() {
    var preview = document.getElementById('vizPreview');
    if (!preview) return;
    var html = '';
    for (var i = 0; i < vizData.length; i++) {
      html += renderModule(vizData[i], i);
    }
    preview.innerHTML = html;
  }

  function renderModule(m, idx) {
    var h = '';
    var actions = '<div class="viz-actions">' +
      '<button class="btn btn-xs" data-action="viz-delete" data-idx="' + idx + '">✕</button>' +
      '<button class="btn btn-xs" data-action="viz-up" data-idx="' + idx + '">↑</button>' +
      '<button class="btn btn-xs" data-action="viz-down" data-idx="' + idx + '">↓</button>' +
      '</div>';

    switch(m.type) {
      case 'text':
        h = '<div class="viz-module" id="viz-' + idx + '">' + actions +
          '<textarea oninput="vizData[' + idx + '].data.text=this.value" style="width:100%;min-height:80px;padding:12px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;line-height:1.8;resize:vertical;color:#444" placeholder="Enter content...">' + m.data.text + '</textarea></div>';
        break;
      case 'h2':
        h = '<div class="viz-module" id="viz-' + idx + '">' + actions +
          '<div style="display:flex;gap:8px;align-items:center">' +
          '<input value="' + m.data.text + '" placeholder="H2 Title" onchange="vizData[' + idx + '].data.text=this.value" style="flex:1;padding:8px 12px;border-left:4px solid ' + m.data.color + ';font-size:22px;font-weight:bold;background:#fafafa">' +
          '<select onchange="vizData[' + idx + '].data.style=this.value;AdminEditor.renderAll()" style="padding:4px;font-size:11px">' +
          '<option value="red-left"' + (m.data.style === 'red-left' ? ' selected' : '') + '>Red Left</option>' +
          '<option value="red-underline"' + (m.data.style === 'red-underline' ? ' selected' : '') + '>Red Underline</option>' +
          '<option value="dark-left"' + (m.data.style === 'dark-left' ? ' selected' : '') + '>Dark Left</option>' +
          '<option value="red-bg"' + (m.data.style === 'red-bg' ? ' selected' : '') + '>Red BG</option>' +
          '</select>' +
          '<input type="color" value="' + m.data.color + '" onchange="vizData[' + idx + '].data.color=this.value;AdminEditor.renderAll()" style="width:36px;height:28px">' +
          '</div></div>';
        break;
      case 'h3':
        h = '<div class="viz-module" id="viz-' + idx + '">' + actions +
          '<div style="display:flex;gap:8px;align-items:center">' +
          '<input value="' + m.data.text + '" placeholder="H3 Title" onchange="vizData[' + idx + '].data.text=this.value" style="flex:1;padding:6px 10px;border-left:4px solid ' + m.data.color + ';font-size:17px;font-weight:bold;background:#fafafa">' +
          '<select onchange="vizData[' + idx + '].data.style=this.value;AdminEditor.renderAll()" style="padding:4px;font-size:11px">' +
          '<option value="red-left"' + (m.data.style === 'red-left' ? ' selected' : '') + '>Red Left</option>' +
          '<option value="red-underline"' + (m.data.style === 'red-underline' ? ' selected' : '') + '>Red Underline</option>' +
          '</select>' +
          '<input type="color" value="' + m.data.color + '" onchange="vizData[' + idx + '].data.color=this.value;AdminEditor.renderAll()" style="width:36px;height:28px">' +
          '</div></div>';
        break;
      case 'image':
        var iu = m.data.url || '';
        h = '<div class="viz-module" id="viz-' + idx + '" style="padding:12px;border:1px dashed #e5e7eb;border-radius:8px;background:#fafafa">' + actions +
          '<div class="upload-zone" style="min-height:100px;cursor:pointer" onclick="var f=document.createElement(\'input\');f.type=\'file\';f.accept=\'image/*\';f.onchange=function(){var r=new FileReader();r.onload=function(ev){vizData[' + idx + '].data.url=ev.target.result;AdminEditor.renderAll()};r.readAsDataURL(this.files[0])};f.click()">' +
          (iu ? '<img src="' + iu + '" style="max-width:100%;max-height:200px;border-radius:4px">' : '<div class="icon">📁</div><p>Click to upload</p>') +
          '</div>' +
          '<input value="' + iu + '" placeholder="Image URL" onchange="vizData[' + idx + '].data.url=this.value;AdminEditor.renderAll()" style="width:100%;border:1px solid #eee;border-radius:3px;font-size:11px;padding:4px 8px;margin-top:4px">' +
          '<input value="' + (m.data.alt || '') + '" placeholder="ALT text" onchange="vizData[' + idx + '].data.alt=this.value" style="width:100%;border:1px solid #eee;border-radius:3px;font-size:11px;padding:4px 8px;margin-top:2px">' +
          '</div>';
        break;
      default:
        h = '<div class="viz-module" id="viz-' + idx + '" style="padding:8px;border:1px dashed #e5e7eb;border-radius:6px">' + actions +
          '<p style="color:var(--g);font-size:13px">' + m.type + ' module</p></div>';
    }
    return h;
  }

  /* === Delegate viz action clicks === */
  document.addEventListener('click', function(event) {
    var btn = event.target.closest('[data-action]');
    if (!btn) return;
    var idx = parseInt(btn.dataset.idx);
    if (isNaN(idx)) return;

    switch(btn.dataset.action) {
      case 'viz-delete': deleteModule(idx); break;
      case 'viz-up': moveUp(idx); break;
      case 'viz-down': moveDown(idx); break;
    }
  });

  function exportViz() {
    var html = '';
    for (var i = 0; i < vizData.length; i++) {
      html += renderModule(vizData[i], i) + '\n';
    }
    navigator.clipboard.writeText(html).then(function() {
      U.toast('HTML copied!', 'success');
    });
  }

  /* Expose renderAll so inline onchange can call it */
  return {
    init: init,
    renderAll: renderAll,
    vizData: vizData
  };
})();
