/**
 * admin-media.js — Media library upload
 * Depends on: AdminUtils, AdminAuth
 */
window.AdminMedia = (function() {
  'use strict';
  var U = window.AdminUtils;
  var Auth = window.AdminAuth;

  function init() {
    console.log('AdminMedia.init');
    return Promise.resolve();
  }

  function upload() {
    var f = document.getElementById('mediaFileInput').files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { U.toast('File too large (>5MB)', 'error'); return; }

    var reader = new FileReader();
    reader.onload = function(e) {
      var b64 = e.target.result.split(',')[1];
      var repo = Auth.getRepo();
      var A = Auth.getApi();
      var K = Auth.getToken();
      var path = 'public/images/products/' + f.name;

      U.fetchWithTimeout(A + '/repos/' + repo + '/contents/' + path, {
        method: 'PUT',
        headers: { 'Authorization': 'token ' + K, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Upload ' + f.name, content: b64, branch: 'main' })
      }).then(function(r) { return r.json(); })
        .then(function(d) {
          var url = '/woshidahuaidan/images/products/' + f.name;
          if (d.content || (d.message && (d.message.indexOf('already exists') >= 0 || d.message.indexOf('sha') >= 0))) {
            addToList(url, f.name);
            U.toast('Uploaded!', 'success');
          } else {
            U.toast(d.message || 'Upload failed', 'error');
          }
        })
        .catch(function() { U.toast('Upload failed — network error', 'error'); });
    };
    reader.readAsDataURL(f);
  }

  function addToList(url, name) {
    var div = document.createElement('div');
    div.style.cssText = 'margin:4px 0;cursor:pointer;padding:4px;border-radius:4px';
    div.innerHTML = '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:11px">' + url + '</code> <span style="font-size:10px;color:var(--g)">(' + name + ')</span>';
    div.addEventListener('click', function() {
      navigator.clipboard.writeText(url).then(function() { U.toast('Copied: ' + url, 'success'); });
    });
    document.getElementById('mediaList').appendChild(div);
  }

  return { init: init, upload: upload };
})();
