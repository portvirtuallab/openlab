/* ==========================================================================
   OPEN LAB — Trivia Challenge
   Almacenamiento local (sustituye por completo a Google Apps Script)

   Las preguntas se leen de data/questions.json, un archivo del repositorio.
   Las puntuaciones se guardan en localStorage, en el navegador del alumno.

   Consecuencia importante y deliberada: el ranking es LOCAL. Cada navegador
   ve solo sus propias partidas. No hay clasificacion compartida entre
   alumnos ni control de duplicados, porque una web estatica no tiene donde
   escribir datos comunes.
   ========================================================================== */

(function (global) {
  'use strict';

  const CONFIG = global.OPENLAB_CONFIG || {};
  const QUESTIONS_URL = CONFIG.QUESTIONS_URL || 'data/questions.json';
  const STORAGE_KEY = CONFIG.STORAGE_KEY || 'openlab.trivia.scores.v1';
  const MAX_ENTRIES = 200;

  /**
   * localStorage puede lanzar excepciones: modo incognito, cookies
   * bloqueadas o cuota llena. Nunca debe tumbar el juego, asi que todo
   * acceso pasa por estas dos funciones.
   */
  function readStore() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeStore(entries) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (err) {
      return false;
    }
  }

  /** Indica si el navegador permite guardar. La UI avisa si no. */
  function isPersistent() {
    try {
      const probe = '__openlab_probe__';
      global.localStorage.setItem(probe, '1');
      global.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Carga y valida las preguntas del JSON del repositorio.
   * @returns {Promise<Array>}
   */
  async function getQuestions() {
    let response;
    try {
      response = await fetch(QUESTIONS_URL, { cache: 'no-cache' });
    } catch (err) {
      throw new Error('Could not load questions. Check your connection.');
    }

    if (!response.ok) {
      throw new Error('Could not load questions (HTTP ' + response.status + ').');
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new Error('data/questions.json is not valid JSON.');
    }

    if (!Array.isArray(data)) {
      throw new Error('data/questions.json must contain a list of questions.');
    }

    const valid = data.filter(function (q) {
      return q &&
        typeof q.question === 'string' && q.question.trim() &&
        Array.isArray(q.options) && q.options.length >= 2 &&
        typeof q.correct === 'string' &&
        // La respuesta correcta tiene que estar entre las opciones, si no
        // la pregunta seria imposible de acertar.
        q.options.indexOf(q.correct) !== -1;
    });

    if (!valid.length) {
      throw new Error('No valid questions found in data/questions.json.');
    }

    return valid;
  }

  /**
   * Guarda una partida en este navegador.
   * @returns {{saved: boolean, persistent: boolean}}
   */
  function saveScore(entry) {
    const record = {
      name: entry && entry.name ? String(entry.name).trim() : 'Anonymous',
      institute: entry && entry.institute ? String(entry.institute).trim() : '',
      score: Number(entry && entry.score) || 0,
      totalQuestions: Number(entry && entry.totalQuestions) || 0,
      timeTaken: Number(entry && entry.timeTaken) || 0,
      date: new Date().toISOString()
    };

    const entries = readStore();
    entries.push(record);

    // Mejor puntuacion primero; a igual puntuacion, gana el mas rapido.
    entries.sort(function (a, b) {
      return b.score - a.score || a.timeTaken - b.timeTaken;
    });

    const saved = writeStore(entries.slice(0, MAX_ENTRIES));
    return { saved: saved, persistent: saved };
  }

  /** Devuelve las partidas guardadas, ya ordenadas. */
  function getLeaderboard() {
    return readStore().slice().sort(function (a, b) {
      return b.score - a.score || a.timeTaken - b.timeTaken;
    });
  }

  /** Borra las partidas de ESTE navegador. No pide contrasena: no protegeria nada. */
  function clearLeaderboard() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
      return { cleared: true };
    } catch (err) {
      return { cleared: false };
    }
  }

  global.OpenLabStore = {
    isPersistent: isPersistent,
    getQuestions: getQuestions,
    getLeaderboard: getLeaderboard,
    saveScore: saveScore,
    clearLeaderboard: clearLeaderboard
  };
})(window);
