/**
 * Emergent Arcade feedback backend: a Google Apps Script web app bound to a
 * Google Sheet. Setup steps are in docs/feedback-backend.md.
 *
 *   POST (public)  body: {"game_id","game_version","rating","comment","client_id","submitted_at"}
 *                  -> appends one row to the "feedback" sheet
 *   POST (public)  body: {"kind":"round"|"session", "game_id", "game_version", "session_id", ...}
 *                  -> appends one row to the "telemetry" sheet (anonymous play
 *                     stats, see docs/telemetry.md)
 *   GET  (keyed)   ?key=READ_KEY[&tab=telemetry][&game=<id>][&format=csv|json]
 *                  -> returns stored feedback (or telemetry) for review/export
 *
 * READ_KEY lives in Project Settings -> Script properties, never in the repo.
 */

const SHEET_NAME = 'feedback';
const HEADERS = ['received_at', 'game_id', 'game_version', 'rating', 'comment', 'client_id', 'submitted_at'];
const TELEMETRY_SHEET = 'telemetry';
const TELEMETRY_HEADERS = ['received_at', 'kind', 'game_id', 'game_version', 'session_id', 'client_id', 'device',
  'round', 'outcome', 'seconds', 'rounds', 'wins', 'wall_seconds', 'achievements', 'achievements_total', 'submitted_at'];
const MAX_SECONDS = 24 * 3600;
const MAX_COMMENT = 1000;
const GAME_ID_RE = /^[a-z0-9-]{1,64}$/;

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.kind === 'round' || body.kind === 'session') return telemetry_(body);
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

    append_(SHEET_NAME, HEADERS, row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'server error' });
  }
}

// One anonymous play-telemetry row: a round result or a session summary.
function telemetry_(body) {
  const gameId = String(body.game_id || '');
  const version = Number(body.game_version);
  if (!GAME_ID_RE.test(gameId)) return json_({ ok: false, error: 'bad game_id' });
  if (!Number.isInteger(version) || version < 1) return json_({ ok: false, error: 'bad game_version' });
  const seconds = Number(body.seconds);
  if (!(seconds >= 0 && seconds <= MAX_SECONDS)) return json_({ ok: false, error: 'bad seconds' });
  const isRound = body.kind === 'round';
  const outcome = String(body.outcome || '');
  if (isRound && outcome !== 'win' && outcome !== 'loss') return json_({ ok: false, error: 'bad outcome' });

  const row = [
    new Date().toISOString(),
    body.kind,
    gameId,
    version,
    safeCell_(String(body.session_id || '').slice(0, 64)),
    safeCell_(String(body.client_id || '').slice(0, 64)),
    body.device === 'touch' || body.device === 'mouse' ? body.device : '',
    isRound ? count_(body.round) : '',
    isRound ? outcome : '',
    Math.round(seconds * 10) / 10,
    isRound ? '' : count_(body.rounds),
    isRound ? '' : count_(body.wins),
    isRound ? '' : Math.min(count_(body.wall_seconds), MAX_SECONDS),
    isRound ? '' : safeCell_(String(body.achievements || '').replace(/[^a-z0-9 -]/g, '').slice(0, 500)),
    isRound ? '' : count_(body.achievements_total),
    safeCell_(String(body.submitted_at || '').slice(0, 40)),
  ];
  append_(TELEMETRY_SHEET, TELEMETRY_HEADERS, row);
  return json_({ ok: true });
}

function count_(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n < 100000 ? n : 0;
}

// Under the lock, so two first-ever writes can't both create the tab.
function append_(name, headers, row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet_(name, headers).appendRow(row);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  const readKey = PropertiesService.getScriptProperties().getProperty('READ_KEY');
  if (!readKey || params.key !== readKey) return json_({ ok: false, error: 'unauthorized' });

  const sheet = params.tab === 'telemetry' ? sheet_(TELEMETRY_SHEET, TELEMETRY_HEADERS) : sheet_();
  const values = sheet.getDataRange().getValues();
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

function sheet_(name, headers) {
  name = name || SHEET_NAME;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers || HEADERS);
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
