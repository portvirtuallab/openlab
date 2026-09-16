/* ==========================================================================
   OPEN LAB — Trivia Challenge
   Configuracion del cliente

   Ya no hay backend: el juego funciona entero desde GitHub Pages.
   Las preguntas estan en data/questions.json y las puntuaciones se guardan
   en el navegador de cada alumno.
   ========================================================================== */

window.OPENLAB_CONFIG = {
  // Archivo de preguntas, relativo a index.html
  QUESTIONS_URL: 'data/questions.json',

  // Clave de localStorage. Si la cambias, los alumnos empiezan de cero.
  STORAGE_KEY: 'openlab.trivia.scores.v1',

  // Segundos por pregunta
  QUESTION_TIME: 30,

  // Preguntas por partida. 0 = usar todas las del archivo.
  QUESTIONS_PER_ROUND: 0
};
