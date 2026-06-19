/**

 * admin-editor.js — Detail page editor with module builder

 * All event binding via data-action. vizData on global scope.

 */

var __vizData = [];

window.AdminEditor = (function() {

  'use strict';

  var U = window.AdminUtils;

  var V = __vizData;

  function init() {

    console.log('Editor: init');

    bindModuleButtons();

    bindGlobalActions();

    return Promise.resolve();

  }

  /* Bind module add buttons via data-action */

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

        h='<div class="viz-module" id="viz-'+idx+'" style="padding:12px;border:1px dashed #e5e7eb;border-radius:8px;background:#fafafa">'+act+

          '<div class="upload-zone" style="min-height:100px;cursor:pointer" onclick="var f=document.createElement(\'input\');f.type=\'file\';f.accept=\'image/*\';f.onchange=function(){var fn=this.files[0]?this.files[0].name:\'\';var r=new FileReader();r.onload=function(ev){__vizData['+idx+'].data.url=ev.target.result;var alt=AdminEditor.autoAlt(fn);if(!__vizData['+idx+'].data.alt)__vizData['+idx+'].data.alt=alt;AdminEditor.renderAll()};r.readAsDataURL(this.files[0])};f.click()">'+

          (iu?'<img src="'+iu+'" style="max-width:100%;max-height:200px;border-radius:4px">':'<div class="icon">📁</div><p>Click to upload</p>')+

          '</div>'+

          '<div style="margin-top:8px;font-size:11px;color:var(--g);margin-bottom:2px">ALT 文本: <span style="color:#374151;font-weight:600">'+(d.alt||'(auto-generated on upload)')+'</span></div>'+
          '<input value="'+(d.alt||'')+'" placeholder="Edit ALT text..." onchange="__vizData['+idx+'].data.alt=this.value;AdminEditor.renderAll()" style="width:100%;border:1px solid #eee;border-radius:3px;font-size:11px;padding:4px 8px"></div>';

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
