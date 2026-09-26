/**
 * Emergent Arcade feedback backend: a Google Apps Script web app bound to a
 * Google Sheet. Setup steps are in docs/feedback-backend.md.
 *
 *   POST (public)  body: {"game_id","game_version","rating","comment","client_id","submitted_at"}
 *                  -> appends one row to the "feedback" sheet
 *   GET  (keyed)   ?key=READ_KEY[&game=<id>][&format=csv|json]
 *                  -> returns stored feedback for review/export
 *
 * READ_KEY lives in Project Settings -> Script properties, never in the repo.
 */

const SHEET_NAME = 'feedback';
const HEADERS = ['received_at', 'game_id', 'game_version', 'rating', 'comment', 'client_id', 'submitted_at'];
const MAX_COMMENT = 1000;
const GAME_ID_RE = /^[a-z0-9-]{1,64}$/;

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const gameId = String(body.game_id || '');
    const version = Number(body.game_version);
    const rating = Number(body.rating);
    if (!GAME_ID_RE.test(gameId)) return json_({ ok: false, error: 'bad game_id' });
    if (!Number.isInteger(version) || version < 1) return json_({ ok: false, error: 'bad game_version' });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json_({ ok: false, error: 'bad rating' });

    const row = [
      new Date().toISOString(),
      gameId,
      version,
      rating,
      safeCell_(String(body.comment || '').slice(0, MAX_COMMENT)),
      safeCell_(String(body.client_id || '').slice(0, 64)),
      safeCell_(String(body.submitted_at || '').slice(0, 40)),
    ];

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet_().appendRow(row);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server error' });
  }
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const readKey = PropertiesService.getScriptProperties().getProperty('READ_KEY');
  if (!readKey || params.key !== readKey) return json_({ ok: false, error: 'unauthorized' });

  const values = sheet_().getDataRange().getValues();
  const header = values.shift();
  let rows = values.map(function (r) {
    const obj = {};
    header.forEach(function (h, i) { obj[h] = r[i]; });
    return obj;
  });
  if (params.game) rows = rows.filter(function (r) { return r.game_id === params.game; });

  if (params.format === 'csv') {
    const csv = [header].concat(rows.map(function (r) { return header.map(function (h) { return r[h]; }); }))
      .map(function (r) { return r.map(csvCell_).join(','); })
      .join('\n');
    return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
  }
  return json_({ ok: true, count: rows.length, rows: rows });
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Stop user text from being interpreted as a spreadsheet formula.
function safeCell_(s) {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function csvCell_(v) {
  const s = v instanceof Date ? v.toISOString() : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
