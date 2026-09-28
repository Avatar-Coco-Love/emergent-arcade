/**
 * Emergent Arcade backend: a Google Apps Script web app bound to a Google
 * Sheet. Setup: docs/feedback-backend.md. Contract: docs/backend-api.md.
 *
 * Built so it rarely (ideally never) needs redeploying: the gallery can send
 * new fields and new kinds of rows without any change here.
 *
 *   POST (public)  one row:   {"kind"?, "game_id", ...fields}
 *                  or many:   {"batch": [{...}, ...], "defaults"?: {...}}
 *     kind missing/"feedback" -> "feedback" tab
 *     kind "round"/"session"  -> "telemetry" tab
 *     any other kind          -> "events" tab (e.g. "gallery", "survey")
 *     Fields with a column of their own are validated into it. Every other
 *     well-formed field is kept in the row's "extra" cell (compact JSON), and
 *     reads merge it back in, so a new field needs no script change.
 *
 *   GET  ?ping=1              (public) -> {"ok", "version"}: is it live, which version
 *   GET  ?key=READ_KEY[&tab=feedback|telemetry|events][&game=<id>][&version=<n>]
 *            [&kind=<kind>][&since=<ISO time>][&after=<row>][&limit=<n>][&format=json|csv]
 *                             -> stored rows, oldest first, extra fields merged in
 *   GET  ?key=READ_KEY&info=1 -> row/column counts per tab and cells used
 *
 * Script properties (Project Settings -> Script properties), no redeploy needed:
 *   READ_KEY         required for reads; comma-separate several to share or rotate
 *   WRITES_PAUSED    "1" rejects all writes (e.g. during spam)
 *   BLOCKED_CLIENTS  comma-separated client_ids whose writes are silently dropped
 */

const SCRIPT_VERSION = 3;

// Column order is permanent: a new column only ever goes at the very end
// (after "extra"), so older rows stay aligned. Reads go by header name.
const TABS = {
  feedback: ['received_at', 'game_id', 'game_version', 'rating', 'comment', 'client_id', 'submitted_at', 'extra'],
  telemetry: ['received_at', 'kind', 'game_id', 'game_version', 'session_id', 'client_id', 'device',
    'round', 'outcome', 'seconds', 'rounds', 'wins', 'wall_seconds', 'achievements', 'achievements_total', 'submitted_at',
    'level', 'run', 'attempt', 'reason', 'stats', 'extra'],
  events: ['received_at', 'kind', 'game_id', 'game_version', 'session_id', 'client_id', 'device', 'submitted_at', 'extra'],
};

const MAX_BODY = 200000;
const MAX_BATCH = 200;
const MAX_EXTRA = 8000;
const MAX_EXTRA_KEYS = 48;
const MAX_STATS = 16;
const MAX_SECONDS = 24 * 3600;
const MAX_COMMENT = 2000;
const GAME_ID_RE = /^[a-z0-9-]{1,64}$/;
const KIND_RE = /^[a-z][a-z0-9_-]{0,31}$/;
const KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;
// Never stored in extra: envelope keys, and the arcade:result message type.
const SKIP_KEYS = { kind: 1, batch: 1, defaults: 1, key: 1, type: 1, game: 1 };

function Reject(msg) { this.message = msg; }

function doPost(e) {
  try {
    const text = (e && e.postData && e.postData.contents) || '{}';
    if (text.length > MAX_BODY) return json_({ ok: false, error: 'too large' });
    const body = JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return json_({ ok: false, error: 'bad body' });
    const props = PropertiesService.getScriptProperties().getProperties();
    if (props.WRITES_PAUSED === '1') return json_({ ok: false, error: 'paused' });
    const blocked = list_(props.BLOCKED_CLIENTS);

    const isBatch = Array.isArray(body.batch);
    if (isBatch && body.batch.length > MAX_BATCH) return json_({ ok: false, error: 'batch too large' });
    const defaults = isBatch && body.defaults && typeof body.defaults === 'object' ? body.defaults : {};
    const items = isBatch ? body.batch : [body];
    const byTab = {};
    const errors = [];
    let stored = 0;
    items.forEach(function (item, i) {
      try {
        if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Reject('bad item');
        const merged = Object.assign({}, defaults, item);
        const out = build_(merged);
        if (blocked.indexOf(String(merged.client_id || '')) >= 0) return;
        (byTab[out.tab] = byTab[out.tab] || []).push(out.row);
        stored++;
      } catch (err) {
        if (!(err instanceof Reject)) throw err;
        errors.push({ i: i, error: err.message });
      }
    });

    if (stored) {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(20000)) return json_({ ok: false, error: 'busy' });
      try {
        Object.keys(byTab).forEach(function (tab) {
          const rows = byTab[tab];
          const sheet = sheet_(tab);
          sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, TABS[tab].length).setValues(rows);
        });
      } finally {
        lock.releaseLock();
      }
    }
    if (!isBatch) return json_(errors.length ? { ok: false, error: errors[0].error } : { ok: true });
    return json_({ ok: true, stored: stored, errors: errors });
  } catch (err) {
    return json_({ ok: false, error: err instanceof SyntaxError ? 'bad json' : 'server error' });
  }
}

// Turns one submitted object into { tab, row } or throws Reject.
function build_(b) {
  const kind = b.kind == null || b.kind === '' ? 'feedback' : String(b.kind);
  if (!KIND_RE.test(kind)) throw new Reject('bad kind');
  const tab = kind === 'feedback' ? 'feedback' : kind === 'round' || kind === 'session' ? 'telemetry' : 'events';
  const isRound = kind === 'round';
  const isSession = kind === 'session';
  const used = {};
  const take = function (k) { used[k] = 1; return b[k]; };
  const v = {
    received_at: new Date().toISOString(),
    kind: kind,
    client_id: text_(take('client_id'), 64),
    session_id: text_(take('session_id'), 64),
    submitted_at: text_(take('submitted_at'), 40),
    device: token_(take('device'), /^[a-z]{1,12}$/),
  };

  const gameId = take('game_id');
  const version = take('game_version');
  if (tab === 'events') {
    // Events may be about the gallery rather than a game.
    if (gameId != null && gameId !== '' && !GAME_ID_RE.test(String(gameId))) throw new Reject('bad game_id');
    v.game_id = gameId == null ? '' : String(gameId);
    v.game_version = optCount_(version);
  } else {
    if (!GAME_ID_RE.test(String(gameId || ''))) throw new Reject('bad game_id');
    if (!(Number(version) >= 1) || !Number.isInteger(Number(version))) throw new Reject('bad game_version');
    v.game_id = String(gameId);
    v.game_version = Number(version);
  }

  if (tab === 'feedback') {
    v.comment = safeCell_(text_(take('comment'), MAX_COMMENT));
    const rating = take('rating');
    const r = Number(rating);
    if (rating == null || rating === '') {
      // Comment-only feedback (bug reports, notes) is fine; empty is not.
      if (!v.comment) throw new Reject('bad rating');
      v.rating = '';
    } else if (!Number.isInteger(r) || r < 1 || r > 5) {
      throw new Reject('bad rating');
    } else {
      v.rating = r;
    }
  }

  if (tab === 'telemetry') {
    const seconds = Number(take('seconds'));
    if (!(seconds >= 0 && seconds <= MAX_SECONDS)) throw new Reject('bad seconds');
    v.seconds = Math.round(seconds * 10) / 10;
    if (isRound) {
      v.outcome = token_(take('outcome'), /^[a-z0-9-]{1,16}$/);
      if (!v.outcome) throw new Reject('bad outcome');
      v.round = count_(take('round'));
      v.level = optCount_(take('level'));
      v.run = token_(take('run'), /^[a-z0-9]{1,16}$/);
      v.attempt = optCount_(take('attempt'));
      v.reason = token_(take('reason'), /^[a-z0-9-]{1,24}$/);
      v.stats = stats_(take('stats'));
    }
    if (isSession) {
      v.rounds = count_(take('rounds'));
      v.wins = count_(take('wins'));
      v.wall_seconds = Math.min(count_(take('wall_seconds')), MAX_SECONDS);
      v.achievements = String(take('achievements') || '').replace(/[^a-z0-9 -]/g, '').slice(0, 500);
      v.achievements_total = count_(take('achievements_total'));
    }
  }

  v.extra = extra_(b, used);
  return { tab: tab, row: TABS[tab].map(function (h) { return v[h] == null ? '' : v[h]; }) };
}

// Every field without a column of its own, as compact JSON. Keeps what fits.
function extra_(b, used) {
  const out = {};
  let size = 2;
  let n = 0;
  Object.keys(b).forEach(function (k) {
    if (used[k] || SKIP_KEYS[k] || !KEY_RE.test(k) || n >= MAX_EXTRA_KEYS) return;
    const val = clean_(b[k], 0);
    if (val === undefined) return;
    const piece = JSON.stringify(k).length + JSON.stringify(val).length + 2;
    if (size + piece > MAX_EXTRA) return;
    out[k] = val;
    size += piece;
    n++;
  });
  return n ? JSON.stringify(out) : '';
}

// Numbers, booleans, short strings, and small arrays/objects of those.
function clean_(v, depth) {
  if (typeof v === 'number') return isFinite(v) && Math.abs(v) < 1e12 ? Math.round(v * 1e4) / 1e4 : undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 500);
  if (!v || typeof v !== 'object' || depth >= 2) return undefined;
  if (Array.isArray(v)) {
    return v.slice(0, 32).map(function (x) { return clean_(x, depth + 1); })
      .filter(function (x) { return x !== undefined; });
  }
  const o = {};
  Object.keys(v).slice(0, 32).forEach(function (k) {
    const c = KEY_RE.test(k) ? clean_(v[k], depth + 1) : undefined;
    if (c !== undefined) o[k] = c;
  });
  return o;
}

// Game-specific numbers as one compact cell: "dawn=22 lost=4 rain_s=6.5".
function stats_(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const out = [];
  Object.keys(obj).slice(0, MAX_STATS).forEach(function (k) {
    const v = Number(obj[k]);
    if (/^[a-z][a-z0-9_]{0,15}$/.test(k) && isFinite(v) && Math.abs(v) < 1e7) out.push(k + '=' + Math.round(v * 10) / 10);
  });
  return out.join(' ');
}

function text_(v, max) {
  return v == null ? '' : safeCell_(String(v).slice(0, max));
}

function token_(v, re) {
  return v != null && re.test(String(v)) ? String(v) : '';
}

// Like count_, but blank (not 0) when missing or invalid.
function optCount_(v) {
  const n = Number(v);
  return v != null && v !== '' && Number.isInteger(n) && n > 0 && n < 100000 ? n : '';
}

function count_(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n < 100000 ? n : 0;
}

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.ping) return json_({ ok: true, version: SCRIPT_VERSION });
  const keys = list_(PropertiesService.getScriptProperties().getProperty('READ_KEY'));
  if (!keys.length || keys.indexOf(String(params.key || '')) < 0) return json_({ ok: false, error: 'unauthorized' });

  if (params.info) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tabs = {};
    let cells = 0;
    ss.getSheets().forEach(function (s) {
      tabs[s.getName()] = { rows: Math.max(0, s.getLastRow() - 1), columns: s.getLastColumn() };
      cells += s.getMaxRows() * s.getMaxColumns();
    });
    return json_({ ok: true, version: SCRIPT_VERSION, tabs: tabs, cells: cells, cell_limit: 10000000 });
  }

  const tab = params.tab || 'feedback';
  if (!TABS[tab]) return json_({ ok: false, error: 'bad tab' });
  const sheet = sheet_(tab);
  const last = sheet.getLastRow();
  const width = Math.max(sheet.getLastColumn(), 1);
  const header = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);

  // Rows are appended in time order, so "since" can skip old rows unread.
  let first = Math.max(2, (Number(params.after) || 1) + 1);
  if (params.since && last >= first) {
    const t = new Date(params.since).getTime();
    if (isNaN(t)) return json_({ ok: false, error: 'bad since' });
    const times = sheet.getRange(first, 1, last - first + 1, 1).getValues();
    let i = 0;
    while (i < times.length && new Date(times[i][0]).getTime() < t) i++;
    first += i;
  }
  const values = last >= first ? sheet.getRange(first, 1, last - first + 1, width).getValues() : [];

  const limit = Number(params.limit) > 0 ? Number(params.limit) : Infinity;
  const until = params.until ? new Date(params.until).getTime() : Infinity;
  const extraAt = header.indexOf('extra');
  const rows = [];
  let next = null;
  for (let i = 0; i < values.length; i++) {
    const r = values[i];
    const obj = {};
    header.forEach(function (h, j) { if (h && j !== extraAt) obj[h] = r[j]; });
    if (!(new Date(obj.received_at).getTime() <= until)) continue;
    if (params.game && obj.game_id !== params.game) continue;
    if (params.version && String(obj.game_version) !== String(params.version)) continue;
    if (params.kind && obj.kind !== params.kind) continue;
    if (rows.length >= limit) { next = first + i - 1; break; }
    if (extraAt >= 0 && r[extraAt]) {
      try {
        const x = JSON.parse(r[extraAt]);
        Object.keys(x).forEach(function (k) { if (!(k in obj)) obj[k] = x[k]; });
      } catch (err) { obj.extra = r[extraAt]; }
    }
    rows.push(obj);
  }

  if (params.format === 'csv') {
    const cols = [];
    rows.forEach(function (o) { Object.keys(o).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    header.forEach(function (h, j) { if (h && j !== extraAt && cols.indexOf(h) < 0) cols.push(h); });
    const csv = [cols].concat(rows.map(function (o) { return cols.map(function (h) { return o[h] == null ? '' : o[h]; }); }))
      .map(function (r) { return r.map(csvCell_).join(','); })
      .join('\n');
    return ContentService.createTextOutput(csv).setMimeType(ContentService.MimeType.CSV);
  }
  // "next": pass as &after= to fetch the following page (null when done).
  return json_({ ok: true, version: SCRIPT_VERSION, count: rows.length, rows: rows, next: next });
}

function sheet_(tab) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const headers = TABS[tab];
  let sheet = ss.getSheetByName(tab);
  if (!sheet) {
    sheet = ss.insertSheet(tab);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < headers.length) {
    // A tab made before columns were added: extend its header row.
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}

function list_(s) {
  return String(s || '').split(',').map(function (x) { return x.trim(); }).filter(String);
}

// Stop user text from being interpreted as a spreadsheet formula.
function safeCell_(s) {
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function csvCell_(v) {
  const s = v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
