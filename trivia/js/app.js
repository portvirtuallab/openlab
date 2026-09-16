/* ==========================================================================
   OPEN LAB — Trivia Challenge
   Lógica de la aplicación
   ========================================================================== */

(function () {
  'use strict';

  const CONFIG = window.OPENLAB_CONFIG;
  const STORE = window.OpenLabStore;
  const LABELS = ['A', 'B', 'C', 'D'];

  let questions = [];
  let currentQuestion = 0;
  let score = 0;
  let timerInterval = null;
  let gameStartTime = null;
  let isGameActive = false;
  let userAnswers = [];

  const gameState = {
    currentUser: null,
    isRegistered: false,
    questionsLoaded: false
  };

  // ===== UTILS =====
  function $(id) { return document.getElementById(id); }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function formatTime(seconds) {
    return Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  }

  function formatDate(value) {
    try {
      const d = new Date(value);
      return isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
    } catch (err) {
      return '—';
    }
  }

  // ===== NOTIFICATIONS =====
  function showNotification(message, type) {
    type = type || 'info';
    document.querySelectorAll('.notification').forEach(function (n) { n.remove(); });

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const el = document.createElement('div');
    el.className = 'notification ' + type;
    el.setAttribute('role', 'alert');
    el.innerHTML = '<span>' + (icons[type] || 'ℹ') + '</span> ' + escapeHtml(message);

    document.body.appendChild(el);
    el.addEventListener('click', function () { el.remove(); });
    setTimeout(function () { if (el.parentNode) el.remove(); }, 4000);
  }

  // ===== QUESTIONS =====
  async function fetchQuestions() {
    try {
      const data = await STORE.getQuestions();
      const shuffled = shuffleArray(data);

      const limit = CONFIG.QUESTIONS_PER_ROUND;
      questions = (limit && limit > 0) ? shuffled.slice(0, limit) : shuffled;

      gameState.questionsLoaded = true;
      return true;
    } catch (err) {
      showNotification(err.message || 'Could not load questions.', 'error');
      return false;
    }
  }

  // ===== TIMER =====
  function startTimer(duration) {
    if (timerInterval) clearInterval(timerInterval);

    let remaining = duration;
    const textEl = $('timerText');
    const wrapEl = $('timer');

    function update() {
      textEl.textContent = remaining + 's';
      wrapEl.className = 'timer' + (remaining <= 5 ? ' danger' : remaining <= 10 ? ' warning' : '');
    }

    update();
    timerInterval = setInterval(function () {
      remaining--;
      update();
      if (remaining <= 0) {
        clearInterval(timerInterval);
        handleTimeUp();
      }
    }, 1000);
  }

  function handleTimeUp() {
    showNotification('Time is up!', 'warning');
    userAnswers.push({ question: currentQuestion, selectedAnswer: null, correct: false });
    setTimeout(nextQuestion, 800);
  }

  // ===== GAME FLOW =====
  function displayQuestion() {
    if (currentQuestion >= questions.length) {
      endGame();
      return;
    }

    const q = questions[currentQuestion];

    $('questionNumber').textContent = 'Question ' + (currentQuestion + 1) + ' of ' + questions.length;
    $('questionText').textContent = q.question;
    $('currentScore').textContent = score;
    $('progressFill').style.width = ((currentQuestion / questions.length) * 100) + '%';

    const shuffled = shuffleArray(q.options);
    $('optionsContainer').innerHTML = shuffled.map(function (opt, i) {
      return '<button class="option-btn" type="button" data-option="' + escapeHtml(opt) + '">' +
             '<span class="option-label">' + LABELS[i] + '</span>' +
             '<span>' + escapeHtml(opt) + '</span>' +
             '</button>';
    }).join('');

    document.querySelectorAll('.option-btn').forEach(function (btn) {
      btn.addEventListener('click', handleAnswer);
    });

    startTimer(CONFIG.QUESTION_TIME || 30);
  }

  function handleAnswer(event) {
    if (!isGameActive) return;

    const selected = event.currentTarget.dataset.option;
    const q = questions[currentQuestion];
    const isCorrect = selected === q.correct;

    clearInterval(timerInterval);

    document.querySelectorAll('.option-btn').forEach(function (btn) {
      btn.disabled = true;
      if (btn.dataset.option === q.correct) btn.classList.add('correct');
      else if (btn.dataset.option === selected && !isCorrect) btn.classList.add('incorrect');
    });

    userAnswers.push({
      question: currentQuestion,
      selectedAnswer: selected,
      correctAnswer: q.correct,
      correct: isCorrect
    });

    if (isCorrect) {
      score++;
      showNotification('Correct!', 'success');
    } else {
      showNotification('Answer: ' + q.correct, 'error');
    }

    $('currentScore').textContent = score;
    setTimeout(nextQuestion, 1800);
  }

  function nextQuestion() {
    currentQuestion++;
    displayQuestion();
  }

  function endGame() {
    isGameActive = false;
    clearInterval(timerInterval);

    const timeTaken = Math.round((Date.now() - gameStartTime) / 1000);

    $('finalScoreNumber').textContent = score + ' / ' + questions.length;
    $('finalScoreTime').textContent = 'Time: ' + formatTime(timeTaken);
    $('finalScoreCard').classList.remove('hidden');

    $('tab-results').click();

    if (gameState.isRegistered && gameState.currentUser) {
      const result = STORE.saveScore({
        name: gameState.currentUser.name,
        institute: gameState.currentUser.institute,
        score: score,
        totalQuestions: questions.length,
        timeTaken: timeTaken
      });

      if (result.saved) {
        showNotification('Score saved on this device', 'success');
      } else {
        showNotification('Score could not be saved: storage is blocked in this browser.', 'warning');
      }
      loadLeaderboard();
    }
  }

  async function startTrivia() {
    if (!gameState.questionsLoaded) {
      const ok = await fetchQuestions();
      if (!ok) {
        $('tab-registration').click();
        return;
      }
    }
    currentQuestion = 0;
    score = 0;
    userAnswers = [];
    gameStartTime = Date.now();
    isGameActive = true;
    displayQuestion();
  }

  // ===== LEADERBOARD =====
  function loadLeaderboard() {
    displayLeaderboard(STORE.getLeaderboard());
  }

  function displayLeaderboard(data) {
    const container = $('leaderboard');

    if (!data.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏁</div>' +
        '<div>No scores yet on this device — play a round to start your record.</div></div>';
      return;
    }

    const rows = data.map(function (entry, i) {
      const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
      return '<div class="leaderboard-row ' + (i < 3 ? 'top-' + (i + 1) : '') + '">' +
               '<div><span class="rank-badge ' + rankClass + '">' + medal + '</span></div>' +
               '<div>' +
                 '<div class="lb-name">' + escapeHtml(entry.name || 'Anonymous') + '</div>' +
                 '<div class="lb-date">' + formatDate(entry.date) + ' · ' + formatTime(entry.timeTaken || 0) + '</div>' +
               '</div>' +
               '<div class="lb-institute">' + escapeHtml(entry.institute || '—') + '</div>' +
               '<div class="lb-score">' + entry.score + '/' + (entry.totalQuestions || '?') + '</div>' +
             '</div>';
    }).join('');

    container.innerHTML =
      '<div class="leaderboard-header">' +
        '<div></div><div>Name</div><div class="col-institute">Institute</div>' +
        '<div style="text-align:right">Score</div>' +
      '</div>' +
      '<div class="leaderboard-list">' + rows + '</div>';
  }

  // ===== NAVIGATION =====
  async function handleTab(tab) {
    const section = tab.getAttribute('aria-controls');

    if (section === 'trivia' && !gameState.isRegistered) {
      showNotification('Please register first!', 'warning');
      return;
    }

    document.querySelectorAll('.nav-tab').forEach(function (t) {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    document.querySelectorAll('section[role="tabpanel"]').forEach(function (s) {
      s.classList.add('hidden');
    });
    $(section).classList.remove('hidden');

    if (section === 'trivia') {
      await startTrivia();
    } else if (section === 'results') {
      loadLeaderboard();
    } else {
      clearInterval(timerInterval);
      isGameActive = false;
    }
  }

  // ===== INIT =====
  function init() {
    // Sin localStorage el juego funciona, pero las puntuaciones no sobreviven
    // al cerrar la pestaña. Mejor avisar que fallar en silencio.
    if (!STORE.isPersistent()) {
      const warn = $('configWarning');
      warn.textContent = 'This browser is blocking local storage (private mode or blocked cookies), ' +
                         'so your scores will not be kept after you close the page.';
      warn.classList.remove('hidden');
    }

    document.querySelectorAll('.nav-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { handleTab(tab); });
    });

    $('institute').addEventListener('change', function (e) {
      const wrapper = $('otherInstituteInput');
      const input = $('otherInstitute');
      if (e.target.value === 'Other') {
        wrapper.classList.remove('hidden');
        input.required = true;
      } else {
        wrapper.classList.add('hidden');
        input.required = false;
      }
    });

    $('registrationForm').addEventListener('submit', function (e) {
      e.preventDefault();

      const name = $('name').value.trim();
      const institute = $('institute').value;
      const other = $('otherInstitute').value.trim();

      if (!name) { showNotification('Enter your full name', 'error'); return; }
      if (!institute) { showNotification('Select your institute', 'error'); return; }
      if (institute === 'Other' && !other) { showNotification('Enter your institute name', 'error'); return; }

      gameState.currentUser = {
        name: name,
        institute: institute === 'Other' ? other : institute
      };
      gameState.isRegistered = true;

      showNotification('Welcome, ' + name + '!', 'success');
      $('tab-trivia').click();
    });

    $('clearLeaderboard').addEventListener('click', function () {
      if (!STORE.getLeaderboard().length) {
        showNotification('There is nothing to clear', 'info');
        return;
      }
      if (!confirm('Clear all scores saved on this device? This cannot be undone.')) return;

      STORE.clearLeaderboard();
      showNotification('Scores cleared', 'success');
      loadLeaderboard();
    });

    document.addEventListener('keydown', function (e) {
      if (isGameActive && ['1', '2', '3', '4'].indexOf(e.key) !== -1) {
        const buttons = document.querySelectorAll('.option-btn');
        const target = buttons[Number(e.key) - 1];
        if (target && !target.disabled) target.click();
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.notification').forEach(function (n) { n.remove(); });
      }
    });

    loadLeaderboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
