/**

 * admin-editor.js — Detail page editor with module builder

 * All event binding via data-action. vizData on global scope.

 */

var __vizData = [];

window.AdminEditor = (function() {

  'use strict';

  var U = window.AdminUtils;

  var V = __vizData;

  function ensureIds() {
    for(var i=0;i<V.length;i++){
      if(!V[i].id) V[i].id = 'm_' + Date.now() + '_' + i;
    }
  }

  function init() {
    ensureIds();

    console.log('Editor: init');

    bindModuleButtons();

    bindGlobalActions();

    return Promise.resolve();

  }

  /* Bind module add buttons via data-action */

  /* Insert module click handler */
  document.addEventListener('click', function(event) {
    var btn = event.target.closest('[data-action="insert-module"]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    var afterIdx = parseInt(btn.dataset.after);
    showInsertMenu(afterIdx, btn);
  });

  function bindModuleButtons() {

    var handler = function(event) {

      var btn = event.target.closest('[data-action="add-module"]');

      if (!btn) return;

      console.log('Editor: click add-module, type=' + btn.dataset.type);

      event.preventDefault();

      addModule(btn.dataset.type);

    };

    document.addEventListener('click', handler);

    console.log('Editor: click handler registered');

  }

  function bindGlobalActions() {

    document.addEventListener('click', function(event) {

      var btn = event.target.closest('[data-action="export-viz"]');

      if (!btn) return;

      event.preventDefault();

      exportViz();

    });

  }

  /* Module CRUD */

  function addModule(type) {

    var m = createDefaultModule(type);

    V.push(m);

    renderAll();

    scrollToViz(V.length - 1);

    console.log('Editor: added module ' + type + ', count=' + V.length);

  }

  function createDefaultModule(type) {

    switch(type) {

      case 'text': return { type:'text', data:{text:''} };

      case 'h2': return { type:'h2', data:{text:'',style:'red-left',color:'#ce1132'} };

      case 'h3': return { type:'h3', data:{text:'',style:'red-left',color:'#ce1132'} };

      case 'image': return { type:'image', data:{url:'',alt:'',widthPercent:60,aspectRatio:'auto',fitMode:'contain',alignment:'center'} };

      case 'features': return { type:'features', data:{items:[{name:'',desc:''}]} };

      case 'specs': return { type:'specs', data:{rows:[{name:'',value:''}]} };

      case 'faq': return { type:'faq', data:{items:[{q:'',a:''}]} };

      case 'table': return { type:'table', data:{rows:[['',''],['','']],cols:2,style:'striped',color:'#ce1132'} };

      case 'cta': return { type:'cta', data:{title:'',text:'',email:'',phone:''} };

      case '2imgs': case '3imgs': case '4imgs': case '6imgs':

        var n=parseInt(type);var imgs=[];

        for(var j=0;j<n;j++)imgs.push({url:'',alt:'',text:''});

        return {type:type,data:{imgs:imgs}};

      default: return { type:type, data:{} };

    }

  }

  function deleteModule(idx) { V.splice(idx, 1); renderAll(); }

  function moveUp(idx) { if(idx>0){var t=V[idx];V[idx]=V[idx-1];V[idx-1]=t;renderAll();} }

  function moveDown(idx) { if(idx<V.length-1){var t=V[idx];V[idx]=V[idx+1];V[idx+1]=t;renderAll();} }

  function scrollToViz(idx) {

    setTimeout(function(){

      var el=document.getElementById('viz-'+idx);

      if(el){el.scrollIntoView({behavior:'smooth'});el.style.background='#fffde7';setTimeout(function(){el.style.background='';},1500);}

    },100);

  }

  /* Render */

  function renderAll() {

    var p=document.getElementById('vizPreview');if(!p)return;

    var h='';for(var i=0;i<V.length;i++)h+=renderModule(V[i],i);

    p.innerHTML=h;

  }

  function renderModule(m, idx) {

    var act='<div class="viz-actions">'+

      '<button class="btn btn-xs" data-action="viz-delete" data-idx="'+idx+'">✕</button>'+

      '<button class="btn btn-xs" data-action="viz-up" data-idx="'+idx+'">↑</button>'+

      '<button class="btn btn-xs" data-action="viz-down" data-idx="'+idx+'">↓</button></div>';

    var h='';

    var d=m.data;

    switch(m.type){

      case'text':

        h='<div class="viz-module" id="viz-'+idx+'">'+act+

          '<textarea oninput="__vizData['+idx+'].data.text=this.value" style="width:100%;min-height:80px;padding:12px;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;line-height:1.8;resize:vertical;color:#444" placeholder="Enter content...">'+d.text+'</textarea></div>';

        break;

      case'h2':

        h='<div class="viz-module" id="viz-'+idx+'">'+act+

          '<input value="'+d.text+'" placeholder="H2 Title" onchange="__vizData['+idx+'].data.text=this.value" style="width:100%;padding:8px 12px;border-left:4px solid '+d.color+';font-size:22px;font-weight:bold;background:#fafafa">'+

          '<select onchange="__vizData['+idx+'].data.style=this.value;AdminEditor.renderAll()" style="padding:4px;font-size:11px">'+

          '<option value="red-left"'+(d.style==='red-left'?' selected':'')+'>Red Left</option>'+

          '<option value="red-underline"'+(d.style==='red-underline'?' selected':'')+'>Red Underline</option>'+

          '</select>'+

          '<input type="color" value="'+d.color+'" onchange="__vizData['+idx+'].data.color=this.value;AdminEditor.renderAll()" style="width:36px;height:28px"></div>';

        break;

      case'h3':

        h='<div class="viz-module" id="viz-'+idx+'">'+act+

          '<input value="'+d.text+'" placeholder="H3 Title" onchange="__vizData['+idx+'].data.text=this.value" style="width:100%;padding:6px 10px;border-left:4px solid '+d.color+';font-size:17px;font-weight:bold;background:#fafafa"></div>';

        break;

      case'image':
        var iu=d.url||'';
        var wp=d.widthPercent||60;
        var ar=d.aspectRatio||'auto';
        var fm=d.fitMode||'contain';
        var al=d.alignment||'center';
        var am=(al==='left'?'0 auto 0 0':al==='right'?'0 0 0 auto':'auto');
        h='<div class="viz-module image-block" id="viz-'+idx+'">'+act;
        if(iu){
          h+='<img src="'+iu+'" alt="'+(d.alt||'')+'" style="width:'+wp+'%;height:auto;object-fit:'+fm+';display:block;margin:'+am+';border-radius:4px;'+(ar!=='auto'?'aspect-ratio:'+ar:'')+'">';
        }else{
          h+='<div class="img-placeholder" onclick="var f=document.createElement(\'input\');f.type=\'file\';f.accept=\'image/*\';f.onchange=function(){var fn=this.files[0]?this.files[0].name:\'\';var r=new FileReader();r.onload=function(ev){__vizData['+idx+'].data.url=ev.target.result;if(!__vizData['+idx+'].data.alt)__vizData['+idx+'].data.alt=AdminEditor.autoAlt(fn);AdminEditor.renderAll()};r.readAsDataURL(this.files[0])};f.click()" style="cursor:pointer;min-height:120px;display:flex;align-items:center;justify-content:center;background:#fafafa;border:2px dashed #d1d5db;border-radius:6px;color:var(--g);font-size:13px">📁 点击上传图片</div>';
        }
        h+='<div style="margin-top:6px;font-size:10px;color:var(--g)">ALT 文本: <span style="color:#374151;font-weight:600">'+(d.alt||'(自动生成)')+'</span></div>';
        h+='<input value="'+(d.alt||'')+'" placeholder="编辑 ALT 文本" onchange="__vizData['+idx+'].data.alt=this.value;AdminEditor.renderAll()" style="width:100%;border:1px solid #eee;border-radius:3px;font-size:10px;padding:2px 4px;margin-top:2px">';
        /* 宽度 */
        h+='<div style="display:flex;gap:4px;margin-top:4px;align-items:center;font-size:10px"><span style="color:var(--g);min-width:56px">宽度:</span>';
        [{v:40,l:'小 (40%)'},{v:60,l:'中 (60%)'},{v:80,l:'大 (80%)'},{v:100,l:'全宽'}].forEach(function(s){
          h+='<button class="btn btn-xs" onclick="__vizData['+idx+'].data.widthPercent='+s.v+';AdminEditor.renderAll()" style="'+(wp===s.v?'background:var(--r);color:#fff':'')+'">'+s.l+'</button>';
        });
        h+='</div>';
        /* 图片比例 */
        h+='<div style="display:flex;gap:4px;margin-top:2px;align-items:center;font-size:10px"><span style="color:var(--g);min-width:56px">图片比例:</span>';
        [{v:'auto',l:'自动'},{v:'1:1',l:'正方形 1:1'},{v:'4:3',l:'横图 4:3'},{v:'16:9',l:'宽屏 16:9'}].forEach(function(r){
          h+='<button class="btn btn-xs" onclick="__vizData['+idx+'].data.aspectRatio=\''+r.v+'\';AdminEditor.renderAll()" style="'+(ar===r.v?'background:var(--r);color:#fff':'')+'">'+r.l+'</button>';
        });
        h+='</div>';
        /* 显示方式 */
        h+='<div style="display:flex;gap:4px;margin-top:2px;align-items:center;font-size:10px"><span style="color:var(--g);min-width:56px">显示方式:</span>';
        [{v:'contain',l:'完整显示'},{v:'cover',l:'填充裁切'}].forEach(function(f){
          h+='<button class="btn btn-xs" onclick="__vizData['+idx+'].data.fitMode=\''+f.v+'\';AdminEditor.renderAll()" style="'+(fm===f.v?'background:var(--r);color:#fff':'')+'">'+f.l+'</button>';
        });
        h+='</div>';
        /* 对齐方式 */
        h+='<div style="display:flex;gap:4px;margin-top:2px;align-items:center;font-size:10px"><span style="color:var(--g);min-width:56px">对齐方式:</span>';
        [{v:'left',l:'左对齐'},{v:'center',l:'居中'},{v:'right',l:'右对齐'}].forEach(function(a){
          h+='<button class="btn btn-xs" onclick="__vizData['+idx+'].data.alignment=\''+a.v+'\';AdminEditor.renderAll()" style="'+(al===a.v?'background:var(--r);color:#fff':'')+'">'+a.l+'</button>';
        });
        h+='</div>';
        h+='</div>';
        break;

      case'2imgs':case'3imgs':case'4imgs':case'6imgs':

        var gn=parseInt(m.type),gimgs=d.imgs||[],gh='<div class="viz-module" id="viz-'+idx+'" style="padding:8px;border:1px dashed #e5e7eb;border-radius:8px;background:#fafafa">'+act;

        gh+='<table style="width:100%;margin-top:20px"><tr>';

        for(var gi=0;gi<gn;gi++){var item=gimgs[gi]||{url:'',alt:'',text:''};

          gh+='<td style="width:'+(100/gn).toFixed(0)+'%;padding:4px;vertical-align:top;text-align:center">';

          gh+='<div class="upload-zone" style="padding:12px 6px;cursor:pointer;min-height:80px" onclick="var f=document.createElement(\'input\');f.type=\'file\';f.accept=\'image/*\';f.onchange=function(){var fn=this.files[0]?this.files[0].name:\'\';var r=new FileReader();r.onload=function(ev){var cur=__vizData['+idx+'].data.imgs['+gi+']||{};var a=cur.alt||AdminEditor.autoAlt(fn);__vizData['+idx+'].data.imgs['+gi+']={url:ev.target.result,alt:a,text:cur.text||\'\'};AdminEditor.renderAll()};r.readAsDataURL(this.files[0])};f.click()">';

          gh+=(item.url?'<img src="'+item.url+'" style="max-width:100%;max-height:100px;border-radius:4px">':'<div class="icon">📁</div><p style="font-size:10px">Upload</p>');

          gh+='</div>';

          gh+='<div style="font-size:10px;color:var(--g);text-align:left;margin-top:2px">ALT 文本: <span style="color:#374151">'+(item.alt||'(auto)')+'</span></div>';
          gh+='<input value="'+(item.alt||'')+'" placeholder="编辑 ALT 文本" onchange="__vizData['+idx+'].data.imgs['+gi+'].alt=this.value" style="width:100%;border:1px solid #eee;border-radius:3px;font-size:10px;padding:2px 4px;margin-top:1px">';

          gh+='<input value="'+(item.text||'')+'" placeholder="Caption" onchange="__vizData['+idx+'].data.imgs['+gi+'].text=this.value" style="width:100%;border:1px solid #eee;border-radius:3px;font-size:10px;padding:2px 4px;margin-top:1px">';

          gh+='</td>';

        }

        gh+='</tr></table></div>';h=gh;

        break;

      default:

        h='<div class="viz-module" id="viz-'+idx+'" style="padding:8px;border:1px dashed #e5e7eb;border-radius:6px">'+act+

          '<p style="color:var(--g);font-size:13px">'+m.type+' module</p></div>';

    }

    return h;

  }

  /* Delegate viz actions */

  document.addEventListener('click', function(event) {

    var btn=event.target.closest('[data-action]');

    if(!btn||!btn.dataset.idx)return;

    var idx=parseInt(btn.dataset.idx);

    if(isNaN(idx))return;

    switch(btn.dataset.action){

      case'viz-delete':deleteModule(idx);break;

      case'viz-up':moveUp(idx);break;

      case'viz-down':moveDown(idx);break;

    }

  });

  function renderInsertPoint(afterIdx) {
    return '<div class="insert-point" data-after="'+afterIdx+'" style="text-align:center;padding:4px 0;opacity:0.3;transition:opacity .2s" onmouseenter="this.style.opacity=\'1\'" onmouseleave="this.style.opacity=\'0.3\'">'+
      '<button class="btn btn-xs" data-action="insert-module" data-after="'+afterIdx+'" style="background:#f0f2f5;border:1px dashed #d1d5db;color:#6b7280;font-size:11px;padding:4px 16px;border-radius:20px;cursor:pointer">+ 在此处添加内容</button>'+
      '</div>';
  }

  function insertModule(afterIdx, type) {
    var m = createDefaultModule(type);
    V.splice(afterIdx+1, 0, m);
    renderAll();
    scrollToViz(afterIdx+1);
  }

  function showInsertMenu(afterIdx, btn) {
    var existing = document.querySelector('.insert-menu');
    if(existing) existing.remove();
    var menu = document.createElement('div');
    menu.className = 'insert-menu';
    menu.style.cssText = 'position:absolute;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1);z-index:100;padding:6px 0;min-width:140px';
    var items = [
      {t:'text',l:'正文文字'},{t:'h2',l:'H2 标题'},{t:'h3',l:'H3 标题'},
      {t:'image',l:'图片'},{t:'table',l:'表格'},{t:'features',l:'Features'},
      {t:'specs',l:'Specs'},{t:'faq',l:'FAQ'},{t:'cta',l:'CTA'}
    ];
    items.forEach(function(item){
      var el = document.createElement('div');
      el.textContent = item.l;
      el.style.cssText = 'padding:6px 16px;cursor:pointer;font-size:13px;color:#374151;white-space:nowrap';
      el.onmouseenter = function(){ this.style.background='#f3f4f6'; };
      el.onmouseleave = function(){ this.style.background=''; };
      el.onclick = function(){ insertModule(afterIdx, item.t); menu.remove(); };
      menu.appendChild(el);
    });
    var rect = btn.getBoundingClientRect();
    menu.style.left = rect.left + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
    document.body.appendChild(menu);
    /* Close on outside click */
    setTimeout(function(){
      document.addEventListener('click', function closeMenu(e){
        if(!menu.contains(e.target)){ menu.remove(); document.removeEventListener('click', closeMenu); }
      });
    }, 0);
  }

  function exportViz() {

    var html='';for(var i=0;i<V.length;i++)html+=renderModule(V[i],i)+'\n';

    navigator.clipboard.writeText(html).then(function(){U.toast('HTML copied!','success');});

  }

  /* Auto-generate ALT text from product name + filename hints */

  function autoAlt(fileName) {

    var productName = document.getElementById('pTitle');

    var pn = productName ? productName.value.trim() : '';

    var fn = fileName || '';

    /* Detect angle/view from filename */

    var angleHints = {front:'front view',side:'side view',back:'back view',top:'top view',

      bottom:'bottom view',iso:'isometric view',assembly:'assembly view',

      detail:'detail view',main:'product image',multi:'multi-angle view'};

    var angle = 'product image';

    var fnLower = fn.toLowerCase();

    for(var k in angleHints) {

      if(fnLower.indexOf(k) >= 0) { angle = angleHints[k]; break; }

    }

    var alt = '';

    if(pn) {

      alt = pn.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

    } else if(fn) {

      alt = fnLower.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

    } else {

      alt = 'product';

    }

    /* Remove stop words and clean up */

    var stopWords = ['the','a','an','of','in','on','at','to','for','with','and','or'];

    var words = alt.split(' ').filter(function(w) { return w.length > 1 && stopWords.indexOf(w) < 0; });

    alt = words.join(' ');

    if(!alt || alt.length < 3) alt = 'product';

    alt = alt + ' ' + angle;

    alt = alt.charAt(0).toUpperCase() + alt.slice(1);

    return alt;

  }

  return { init:init, renderAll:renderAll, autoAlt:autoAlt };

})();
