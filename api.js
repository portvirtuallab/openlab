/* ==========================================================================
   OPEN LAB — Trivia Challenge
   Capa de comunicación con el backend de Google Apps Script

   Por qué JSONP para las lecturas:
   Apps Script no devuelve cabeceras CORS en las respuestas GET servidas
   desde script.google.com, así que un fetch() normal falla. JSONP evita
   el problema cargando la respuesta como un <script>.

   Por qué fetch() para las escrituras:
   un POST con Content-Type "text/plain" es una "simple request", no dispara
   preflight OPTIONS y Apps Script responde correctamente tras el redirect.
   ========================================================================== */

(function (global) {
  'use strict';

  const CONFIG = global.OPENLAB_CONFIG || {};
  const API_URL = CONFIG.API_URL || '';
  const TIMEOUT = CONFIG.REQUEST_TIMEOUT || 20000;

  let callbackCounter = 0;

  function isConfigured() {
    return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(API_URL);
  }

  function assertConfigured() {
    if (!isConfigured()) {
      throw new Error('API_URL no configurada. Edita js/config.js con la URL /exec de tu Web App.');
    }
  }

  /**
   * Lectura vía JSONP.
   * @param {string} action
   * @param {Object} params
   * @returns {Promise<*>}
   */
  function read(action, params) {
    assertConfigured();

    return new Promise(function (resolve, reject) {
      const callbackName = '__openlabCb' + Date.now() + '_' + (callbackCounter++);
      const script = document.createElement('script');

      const timer = setTimeout(function () {
        cleanup();
        reject(new Error('La petición ha tardado demasiado. Inténtalo de nuevo.'));
      }, TIMEOUT);

      function cleanup() {
        clearTimeout(timer);
        delete global[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      global[callbackName] = function (response) {
        cleanup();
        if (response && response.success === false) {
          reject(new Error(response.error || 'Error del servidor'));
        } else {
          resolve(response && 'data' in response ? response.data : response);
        }
      };

      const query = new URLSearchParams(Object.assign({
        action: action,
        callback: callbackName
      }, params || {}));

      script.src = API_URL + '?' + query.toString();
      script.onerror = function () {
        cleanup();
        reject(new Error('No se ha podido contactar con el servidor.'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Escritura vía POST.
   * @param {string} action
   * @param {Object} payload
   * @returns {Promise<*>}
   */
  async function write(action, payload) {
    assertConfigured();

    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, TIMEOUT);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        // text/plain evita el preflight CORS que Apps Script no sabe responder
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action }, payload || {})),
        redirect: 'follow',
        signal: controller.signal
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Error del servidor');
      }
      return result.data;
    } finally {
      clearTimeout(timer);
    }
  }

  global.OpenLabAPI = {
    isConfigured: isConfigured,
    getQuestions: function () { return read('getQuestions'); },
    getLeaderboard: function () { return read('getLeaderboard'); },
    saveScore: function (entry) { return write('saveScore', entry); },
    clearLeaderboard: function (adminPassword) {
      return write('clearLeaderboard', { adminPassword: adminPassword });
    }
  };
})(window);
