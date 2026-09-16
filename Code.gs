/**
 * OPEN LAB — Trivia Challenge
 * Backend de Google Apps Script (API JSON para el frontend en GitHub Pages)
 *
 * IMPORTANTE — antes de desplegar:
 *   1. Ejecuta setupProperties() una sola vez desde el editor para guardar
 *      SPREADSHEET_ID y ADMIN_PASSWORD en las propiedades del script.
 *   2. Borra los valores de ejemplo de setupProperties() antes de subir a GitHub.
 *   3. Despliega como Aplicación web:
 *        Ejecutar como: Yo
 *        Quién tiene acceso: Cualquier usuario
 *   4. Copia la URL /exec en js/config.js
 */

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const QUESTIONS_SHEET = 'Questions_OPENLAB';
const LEADERBOARD_SHEET = 'Leaderboard';

/**
 * Ejecuta esta función UNA VEZ desde el editor de Apps Script.
 * Sustituye los valores por los tuyos y bórralos después de ejecutarla.
 */
function setupProperties() {
  PropertiesService.getScriptProperties().setProperties({
    SPREADSHEET_ID: '1kjjJLW86gpwToIwTdUjcsf_i9efIgvOkGRhCPj3bGVs',
    ADMIN_PASSWORD: 'EscolaEuropea2026'
  });
  Logger.log('Propiedades guardadas. Borra los valores de esta función.');
}

function getProperty_(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error('Falta la propiedad "' + key + '". Ejecuta setupProperties() primero.');
  }
  return value;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getProperty_('SPREADSHEET_ID'));
}

// ============================================================================
// RESPUESTAS
// ============================================================================

function jsonResponse_(payload, callback) {
  const body = JSON.stringify(payload);

  if (callback) {
    // JSONP: se sirve como JavaScript para evitar las restricciones CORS
    return ContentService
      .createTextOutput(callback + '(' + body + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

function ok_(data, callback) {
  return jsonResponse_({ success: true, data: data }, callback);
}

function fail_(message, callback) {
  console.error(message);
  return jsonResponse_({ success: false, error: String(message) }, callback);
}

/** Solo permite nombres de callback seguros. */
function sanitizeCallback_(name) {
  return (name && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) ? name : null;
}

// ============================================================================
// PUNTOS DE ENTRADA
// ============================================================================

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = sanitizeCallback_(params.callback);

  try {
    switch (params.action) {
      case 'getQuestions':
        return ok_(getQuestions_(), callback);
      case 'getLeaderboard':
        return ok_(getLeaderboard_(), callback);
      case 'ping':
        return ok_({ status: 'online', time: new Date().toISOString() }, callback);
      default:
        return fail_('Acción no válida. Usa ?action=getQuestions o ?action=getLeaderboard', callback);
    }
  } catch (error) {
    return fail_(error.message, callback);
  }
}

function doPost(e) {
  let data = {};

  try {
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }
  } catch (error) {
    return fail_('JSON no válido en el cuerpo de la petición');
  }

  try {
    switch (data.action) {
      case 'saveScore':
        return ok_(saveScore_(data));
      case 'clearLeaderboard':
        return ok_(clearLeaderboard_(data));
      default:
        return fail_('Acción no válida: ' + data.action);
    }
  } catch (error) {
    return fail_(error.message);
  }
}

// ============================================================================
// LÓGICA
// ============================================================================

function getQuestions_() {
  const sheet = getSpreadsheet_().getSheetByName(QUESTIONS_SHEET);
  if (!sheet) {
    throw new Error('No existe la hoja "' + QUESTIONS_SHEET + '".');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    throw new Error('No hay preguntas en la hoja.');
  }

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  const questions = rows
    .filter(function (row) {
      return row[0] && String(row[0]).trim() && row[5] && String(row[5]).trim();
    })
    .map(function (row) {
      const options = [row[1], row[2], row[3], row[4]]
        .filter(function (opt) { return opt && String(opt).trim(); })
        .map(function (opt) { return String(opt).trim(); });

      const question = String(row[0]).trim();
      const correct = String(row[5]).trim();

      if (options.indexOf(correct) === -1) {
        console.warn('La pregunta "' + question + '" tiene una respuesta correcta que no está entre las opciones.');
        return null;
      }

      return { question: question, options: options, correct: correct };
    })
    .filter(function (q) { return q !== null; });

  if (!questions.length) {
    throw new Error('No se han encontrado preguntas válidas. Revisa el formato de la hoja.');
  }

  return questions;
}

function getLeaderboard_() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(LEADERBOARD_SHEET);
  if (!sheet) sheet = createLeaderboardSheet_(spreadsheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet.getRange(2, 1, lastRow - 1, 7).getValues()
    .filter(function (row) { return row[0] && String(row[0]).trim(); })
    .map(function (row) {
      return {
        name: String(row[0]).trim(),
        // El email no se expone al cliente: es un dato personal.
        institute: row[2] ? String(row[2]).trim() : '',
        score: Number(row[3]) || 0,
        totalQuestions: Number(row[4]) || 0,
        timeTaken: Number(row[5]) || 0,
        date: row[6] instanceof Date ? row[6].toISOString() : new Date().toISOString()
      };
    })
    .sort(function (a, b) {
      return b.score - a.score || a.timeTaken - b.timeTaken;
    });
}

function saveScore_(data) {
  const name = data.name ? String(data.name).trim() : '';
  if (!name) throw new Error('El nombre es obligatorio.');

  const email = data.email ? String(data.email).trim().toLowerCase() : '';
  const score = parseInt(data.score, 10);
  if (isNaN(score) || score < 0) throw new Error('Puntuación no válida.');

  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(LEADERBOARD_SHEET);
  if (!sheet) sheet = createLeaderboardSheet_(spreadsheet);

  // Bloqueo para evitar escrituras simultáneas de varios estudiantes a la vez
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    if (email && emailAlreadyPlayed_(sheet, email)) {
      throw new Error('Este correo ya ha participado. Solo se admite una participación por email.');
    }

    sheet.appendRow([
      name,
      email,
      data.institute ? String(data.institute).trim() : '',
      score,
      parseInt(data.totalQuestions, 10) || 0,
      parseInt(data.timeTaken, 10) || 0,
      new Date()
    ]);

    return { saved: true };
  } finally {
    lock.releaseLock();
  }
}

/** Comprueba si un email ya existe en el leaderboard. */
function emailAlreadyPlayed_(sheet, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const emails = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  return emails.some(function (row) {
    return row[0] && String(row[0]).trim().toLowerCase() === email;
  });
}

function clearLeaderboard_(data) {
  const expected = getProperty_('ADMIN_PASSWORD');
  if (!data.adminPassword || String(data.adminPassword) !== expected) {
    throw new Error('Contraseña de administrador incorrecta.');
  }

  const sheet = getSpreadsheet_().getSheetByName(LEADERBOARD_SHEET);
  if (!sheet) throw new Error('No existe la hoja del leaderboard.');

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 7).clearContent();
  }

  console.log('Leaderboard vaciado por un administrador: ' + new Date().toISOString());
  return { cleared: true };
}

// ============================================================================
// UTILIDADES
// ============================================================================

function createLeaderboardSheet_(spreadsheet) {
  const sheet = spreadsheet.insertSheet(LEADERBOARD_SHEET);

  sheet.getRange('A1:G1').setValues([[
    'Name', 'Email', 'Institute', 'Score', 'Total Questions', 'Time Taken (s)', 'Date'
  ]]);

  const header = sheet.getRange('A1:G1');
  header.setFontWeight('bold');
  header.setBackground('#f0f0f0');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 7);

  return sheet;
}

/** Comprueba la configuración desde el editor. */
function testSetup() {
  try {
    const spreadsheet = getSpreadsheet_();
    console.log('Hoja de cálculo: ' + spreadsheet.getName());

    const questionsSheet = spreadsheet.getSheetByName(QUESTIONS_SHEET);
    console.log(questionsSheet
      ? 'Preguntas encontradas: ' + (questionsSheet.getLastRow() - 1)
      : 'Falta la hoja ' + QUESTIONS_SHEET);

    let leaderboard = spreadsheet.getSheetByName(LEADERBOARD_SHEET);
    if (!leaderboard) {
      leaderboard = createLeaderboardSheet_(spreadsheet);
      console.log('Hoja Leaderboard creada.');
    } else {
      console.log('Registros en el leaderboard: ' + Math.max(0, leaderboard.getLastRow() - 1));
    }

    console.log('Configuración correcta.');
  } catch (error) {
    console.error('Error de configuración: ' + error.message);
  }
}

/** Crea la hoja de preguntas con la cabecera correcta si no existe. */
function createQuestionsSheet() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(QUESTIONS_SHEET);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(QUESTIONS_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange('A1:F1').setValues([[
      'Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer'
    ]]);
    const header = sheet.getRange('A1:F1');
    header.setFontWeight('bold');
    header.setBackground('#f0f0f0');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 6);
    console.log('Hoja de preguntas creada. Añade tus preguntas a partir de la fila 2.');
  } else {
    console.log('La hoja de preguntas ya tiene contenido: ' + sheet.getLastRow() + ' filas.');
  }
}
