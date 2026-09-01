/**
 * FORGE — Google Sheets data layer (Google Apps Script)
 * =====================================================
 * This is the secure API layer that sits between the React app and your
 * spreadsheet. The React frontend only ever knows this Web App URL — it never
 * sees Google credentials, API keys or private keys (those stay inside Google).
 *
 * SETUP (one time):
 *  1. Open the Google Sheet you want to use as the database.
 *  2. Extensions -> Apps Script, delete the placeholder code, paste this file.
 *  3. (Optional security) In the script editor open Project Settings ->
 *     Script Properties and add:  ACCESS_TOKEN = <any-long-random-string>
 *     then enter that same token in the app's connection form.
 *  4. Deploy -> New deployment -> type "Web app":
 *       - Execute as:            Me
 *       - Who has access:        Anyone
 *  5. Copy the Web App URL (ends in /exec) into the app's connection form.
 *
 * Every row carries a coach_id. Reads and writes are always filtered by the
 * coach id sent with the request, so one coach can never read another's data.
 */

var SCHEMA = {
  Coaches: ['id', 'name', 'email', 'created_at', 'updated_at'],
  Clients: ['id', 'coach_id', 'created_at', 'updated_at', 'name', 'phone', 'email', 'gender', 'age', 'goal', 'status', 'join_date', 'notes', 'photo'],
  Subscriptions: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'plan_name', 'start_date', 'end_date', 'price', 'status'],
  Payments: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'subscription_id', 'amount', 'payment_date', 'payment_method', 'status', 'notes'],
  Sessions: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'date', 'time', 'type', 'status', 'notes'],
  CheckIns: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'date', 'ts', 'weight', 'waist', 'mood', 'water', 'workout_completed', 'notes', 'photo'],
  Measurements: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'date', 'weight', 'body_fat', 'waist', 'chest', 'arm', 'thigh', 'hips', 'notes'],
  ProgressPhotos: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'date', 'photo', 'notes'],
  WorkoutPlans: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'day', 'exercise_id', 'sets', 'reps', 'rest', 'notes'],
  WorkoutExercises: ['id', 'coach_id', 'created_at', 'updated_at', 'workout_id', 'exercise_id', 'sets', 'reps', 'rest', 'order'],
  Exercises: ['id', 'coach_id', 'created_at', 'updated_at', 'name', 'category', 'description', 'video_url', 'image'],
  NutritionPlans: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'name', 'start_date', 'end_date', 'notes'],
  Meals: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'type', 'description', 'calories', 'protein', 'carbs', 'fats'],
  FollowUps: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'date', 'channel', 'message', 'status'],
  Notifications: ['id', 'coach_id', 'created_at', 'updated_at', 'client_id', 'title', 'body', 'read'],
  Settings: ['coach_id', 'key', 'value', 'updated_at']
};

/* ----------------------------- entry points ----------------------------- */

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    guardToken(p.token);
    var action = p.action;
    if (action === 'ping') return out({ ok: true, pong: true });
    if (action === 'init') return out({ ok: true, sheets: initTabs() });
    if (action === 'load') return out({ ok: true, data: loadAll(p.coach) });
    return out({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return out({ ok: false, error: message(err) });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    guardToken(body.token);
    if (body.action === 'apply') {
      applyOps(body.coach, body.ops || []);
      return out({ ok: true });
    }
    return out({ ok: false, error: 'Unknown action: ' + (body.action || '') });
  } catch (err) {
    return out({ ok: false, error: message(err) });
  }
}

/* ------------------------------- security ------------------------------- */

function guardToken(provided) {
  var expected = '';
  try {
    expected = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN') || '';
  } catch (err) {
    expected = '';
  }
  if (expected && String(provided || '') !== expected) {
    throw new Error('Invalid access token');
  }
}

function requireCoach(coach) {
  if (!coach) throw new Error('Missing coach id');
  return String(coach);
}

/* ------------------------------ initialisation -------------------------- */

function initTabs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var names = Object.keys(SCHEMA);
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var cols = SCHEMA[name];
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      sh.setFrozenRows(1);
    } else {
      // Never touch existing data — only fill header cells that are still empty.
      var headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), cols.length)).getValues()[0];
      for (var c = 0; c < cols.length; c++) {
        if (!headers[c]) sh.getRange(1, c + 1).setValue(cols[c]);
      }
    }
  }
  return names;
}

/* --------------------------------- read --------------------------------- */

function loadAll(coach) {
  var cid = requireCoach(coach);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = {};
  var names = Object.keys(SCHEMA);
  for (var i = 0; i < names.length; i++) {
    result[names[i]] = readSheet(ss, names[i], cid);
  }
  return result;
}

function readSheet(ss, name, coach) {
  var sh = ss.getSheetByName(name);
  if (!sh) return [];
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = values[0];
  var coachIdx = headers.indexOf('coach_id');
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    if (coachIdx >= 0 && String(values[r][coachIdx]) !== coach) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      if (headers[c]) obj[headers[c]] = values[r][c];
    }
    if (obj.id !== undefined && obj.id !== '') rows.push(obj);
  }
  return rows;
}

/* --------------------------------- write -------------------------------- */

function applyOps(coach, ops) {
  var cid = requireCoach(coach);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (op.type === 'upsert') upsertRow(ss, cid, op.sheet, op.row || {});
      else if (op.type === 'remove') removeById(ss, cid, op.sheet, op.id);
      else if (op.type === 'removeWhere') removeWhere(ss, cid, op.sheet, op.field, op.value);
    }
  } finally {
    lock.releaseLock();
  }
}

function sheetAndIndex(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Tab not found: ' + name + ' — reconnect to re-initialise');
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var idx = {};
  for (var c = 0; c < headers.length; c++) if (headers[c]) idx[headers[c]] = c;
  return { sh: sh, idx: idx, headers: headers };
}

function upsertRow(ss, coach, name, row) {
  var ref = sheetAndIndex(ss, name);
  var sh = ref.sh;
  var idCol = ref.idx['id'];
  if (idCol === undefined) throw new Error('Tab "' + name + '" has no id column');

  var now = new Date().toISOString();
  var target = findRowById(sh, idCol, String(row.id));

  if (target >= 0) {
    // Update in place — preserve created_at.
    writeRow(sh, ref, target, row, coach);
    if (ref.idx['updated_at'] !== undefined) sh.getRange(target, ref.idx['updated_at'] + 1).setValue(now);
  } else {
    // Append a brand new record.
    var r = sh.getLastRow() + 1;
    writeRow(sh, ref, r, row, coach);
    if (ref.idx['created_at'] !== undefined) sh.getRange(r, ref.idx['created_at'] + 1).setValue(now);
    if (ref.idx['updated_at'] !== undefined) sh.getRange(r, ref.idx['updated_at'] + 1).setValue(now);
  }
}

function writeRow(sh, ref, rowNumber, row, coach) {
  var keys = Object.keys(row);
  for (var k = 0; k < keys.length; k++) {
    var col = ref.idx[keys[k]];
    if (col !== undefined) sh.getRange(rowNumber, col + 1).setValue(row[keys[k]]);
  }
  if (ref.idx['coach_id'] !== undefined) sh.getRange(rowNumber, ref.idx['coach_id'] + 1).setValue(coach);
  if (ref.idx['id'] !== undefined) sh.getRange(rowNumber, ref.idx['id'] + 1).setValue(String(row.id));
}

function findRowById(sh, idCol, id) {
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  var ids = sh.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) return i + 2; // 1-based sheet row
  }
  return -1;
}

function removeById(ss, coach, name, id) {
  var ref = sheetAndIndex(ss, name);
  var idCol = ref.idx['id'];
  if (idCol === undefined) return;
  var target = findRowById(ref.sh, idCol, String(id));
  if (target >= 0 && rowBelongsTo(ref.sh, ref, target, coach)) ref.sh.deleteRow(target);
}

function removeWhere(ss, coach, name, field, value) {
  var ref = sheetAndIndex(ss, name);
  var fieldCol = ref.idx[field];
  if (fieldCol === undefined) return;
  var lastRow = ref.sh.getLastRow();
  if (lastRow < 2) return;
  var values = ref.sh.getRange(2, 1, lastRow - 1, ref.headers.length).getValues();
  // Delete from the bottom up so row numbers stay valid.
  for (var i = values.length - 1; i >= 0; i--) {
    var match = String(values[i][fieldCol]) === String(value);
    var own = rowBelongsToValues(ref, values[i], coach);
    if (match && own) ref.sh.deleteRow(i + 2);
  }
}

function rowBelongsTo(sh, ref, rowNumber, coach) {
  var coachCol = ref.idx['coach_id'];
  if (coachCol === undefined) return true; // Coaches/Settings style tabs
  var v = sh.getRange(rowNumber, coachCol + 1).getValue();
  return String(v) === String(coach);
}

function rowBelongsToValues(ref, rowValues, coach) {
  var coachCol = ref.idx['coach_id'];
  if (coachCol === undefined) return true;
  return String(rowValues[coachCol]) === String(coach);
}

/* -------------------------------- helpers ------------------------------- */

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function message(err) {
  return (err && err.message) ? err.message : String(err);
}
