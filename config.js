/* ==========================================================================
   OPEN LAB — Trivia Challenge
   Configuración del cliente

   Sustituye API_URL por la URL /exec de tu Web App de Apps Script.
   Se obtiene en: Apps Script → Implementar → Nueva implementación →
   Aplicación web → Ejecutar como "Yo" → Acceso "Cualquier usuario".

   No pongas aquí contraseñas ni el ID de la hoja de cálculo:
   este archivo es público en GitHub Pages.
   ========================================================================== */

window.OPENLAB_CONFIG = {
  // URL del Web App desplegado (termina en /exec)
  API_URL: 'https://script.google.com/macros/s/PEGA_AQUI_TU_ID_DE_DESPLIEGUE/exec',

  // Segundos por pregunta
  QUESTION_TIME: 30,

  // Número de preguntas por partida. 0 = usar todas las de la hoja.
  QUESTIONS_PER_ROUND: 10,

  // Milisegundos de espera antes de abandonar una petición
  REQUEST_TIMEOUT: 20000
};
