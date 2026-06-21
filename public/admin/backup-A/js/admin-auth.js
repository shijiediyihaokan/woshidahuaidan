/**
 * admin-auth.js — Authentication and token management
 * Depends on: AdminUtils
 */
window.AdminAuth = (function() {
  'use strict';
  var U = window.AdminUtils;

  var K = '';
  var R = 'shijiediyihaokan/woshidahuaidan';
  var A = 'https://api.github.com';

  function checkAuth() {
    return new Promise(function(resolve, reject) {
      try {
        K = localStorage.getItem('ggn_token') || '';
        if (!K || K.length < 10) {
          window.location.href = './';
          reject(new Error('No token'));
          return;
        }
        resolve(K);
      } catch (e) {
        reject(new Error('Token read failed: ' + e.message));
      }
    });
  }

  function getToken() { return K; }
  function getRepo() { return R; }
  function getApi() { return A; }

  function logout() {
    try { localStorage.removeItem('ggn_token'); } catch(e) {}
    window.location.href = './';
  }

  function getUserInfo() {
    return U.fetchWithTimeout(A + '/user', {
      headers: { 'Authorization': 'token ' + K }
    }).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  return {
    checkAuth: checkAuth,
    getToken: getToken,
    getRepo: getRepo,
    getApi: getApi,
    logout: logout,
    getUserInfo: getUserInfo
  };
})();
