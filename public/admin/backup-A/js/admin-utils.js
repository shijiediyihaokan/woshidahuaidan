/**
 * admin-utils.js — Shared utility functions
 * No dependencies. Must not throw.
 */
window.AdminUtils = (function() {
  'use strict';

  function showLoading() {
    var el = document.getElementById('absLoading');
    if (el) el.classList.remove('resolved');
  }

  function hideLoading() {
    var el = document.getElementById('absLoading');
    if (el) el.classList.add('resolved');
  }

  function showAdminApp() {
    var dash = document.getElementById('dash');
    if (dash) dash.classList.add('on');
  }

  function showErrorBanner(msg) {
    var banner = document.getElementById('adminErrorBanner');
    var text = document.getElementById('adminErrorText');
    if (banner && text) {
      text.textContent = msg;
      banner.style.display = 'block';
    }
  }

  function clearErrorBanner() {
    var banner = document.getElementById('adminErrorBanner');
    if (banner) banner.style.display = 'none';
  }

  function showABSError(msg) {
    hideLoading();
    var errEl = document.getElementById('absErrMsg');
    var box = document.getElementById('absErrorBox');
    if (errEl) errEl.textContent = msg;
    if (box) box.style.display = 'block';
    document.getElementById('absSpinner').style.display = 'none';
    document.getElementById('absStatus').textContent = '初始化失败';
  }

  function fetchWithTimeout(url, options, timeout) {
    options = options || {};
    timeout = timeout || 8000;
    return Promise.race([
      fetch(url, options),
      new Promise(function(_, reject) {
        setTimeout(function() { reject(new Error('Fetch timeout: ' + url)); }, timeout);
      })
    ]);
  }

  function safeInitModule(name, fn) {
    console.log('Init module:', name);
    try {
      return Promise.resolve(fn()).catch(function(e) {
        console.error('Module ' + name + ' failed:', e);
        showErrorBanner(name + ' module failed: ' + e.message);
        return null;
      });
    } catch (e) {
      console.error('Module ' + name + ' crashed:', e);
      showErrorBanner(name + ' module crashed: ' + e.message);
      return Promise.resolve(null);
    }
  }

  function toast(msg, type) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className = 'toast ' + (type || 'success');
    el.style.display = 'block';
    setTimeout(function() { el.style.display = 'none'; }, 3000);
  }

  return {
    showLoading: showLoading,
    hideLoading: hideLoading,
    showAdminApp: showAdminApp,
    showErrorBanner: showErrorBanner,
    clearErrorBanner: clearErrorBanner,
    showABSError: showABSError,
    fetchWithTimeout: fetchWithTimeout,
    safeInitModule: safeInitModule,
    toast: toast
  };
})();
