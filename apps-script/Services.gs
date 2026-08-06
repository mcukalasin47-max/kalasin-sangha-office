/**
 * Data, authentication, export and backup services.
 */

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || EXISTING_RESOURCES.SPREADSHEET_ID;
  if (!id) throw new Error('ยังไม่ได้ตั้งค่า SPREADSHEET_ID กรุณารัน installExistingSystem()');
  return SpreadsheetApp.openById(id);
}

function getSheet_(name) {
  const sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('ไม่พบชีต: ' + name);
  return sheet;
}

function getHeaders_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return [];
  return sheet.getRange(APP.HEADER_ROW, 1, 1, lastColumn).getDisplayValues()[0]
    .map(function (h) { return String(h || '').trim(); });
}

function readSheetObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (!headers.length || lastRow < APP.DATA_START_ROW) return [];

  const values = sheet.getRange(APP.DATA_START_ROW, 1, lastRow - APP.DATA_START_ROW + 1, headers.length).getValues();
  return values
    .filter(function (row) { return row.some(function (v) { return v !== '' && v !== null; }); })
    .map(function (row, index) {
      const obj = { _sheetRow: APP.DATA_START_ROW + index };
      headers.forEach(function (header, columnIndex) {
        if (header) obj[header] = row[columnIndex];
      });
      return obj;
    });
}

function appendObjectRow_(sheetName, object) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  if (!headers.length) throw new Error('ชีต ' + sheetName + ' ไม่มีหัวตาราง');
  const row = headers.map(function (header) {
    return Object.prototype.hasOwnProperty.call(object, header) ? object[header] : '';
  });

  const scanRows = Math.max(sheet.getMaxRows() - APP.DATA_START_ROW + 1, 1);
  const keys = sheet.getRange(APP.DATA_START_ROW, 1, scanRows, 1).getDisplayValues();
  let offset = keys.findIndex(function (item) { return !String(item[0] || '').trim(); });
  if (offset < 0) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    offset = scanRows;
  }
  const targetRow = APP.DATA_START_ROW + offset;
  sheet.getRange(targetRow, 1, 1, headers.length).setValues([row]);
  return targetRow;
}

function updateObjectRow_(sheetName, sheetRow, patch) {
  const sheet = getSheet_(sheetName);
  const headers = getHeaders_(sheet);
  const range = sheet.getRange(sheetRow, 1, 1, headers.length);
  const current = range.getValues()[0];
  const updated = headers.map(function (header, index) {
    return Object.prototype.hasOwnProperty.call(patch, header) ? patch[header] : current[index];
  });
  range.setValues([updated]);
}

function getOptionsGrouped_() {
  const rows = readSheetObjects_(APP.SHEETS.OPTIONS)
    .filter(function (r) { return stringToBoolean_(r.active); })
    .sort(function (a, b) {
      const cat = String(a.category).localeCompare(String(b.category));
      return cat || Number(a.sort_order || 0) - Number(b.sort_order || 0);
    });
  return rows.reduce(function (acc, item) {
    const key = String(item.category || 'other');
    if (!acc[key]) acc[key] = [];
    acc[key].push(String(item.value || ''));
    return acc;
  }, {});
}

function getTempleChoices_() {
  return readSheetObjects_(APP.SHEETS.TEMPLES)
    .filter(function (r) { return !r.status || String(r.status) === 'ใช้งาน'; })
    .map(function (r) {
      return {
        temple: r.temple_name || '', village: r.village || '', moo: r.moo || '',
        subdistrict: r.subdistrict || '', district: r.district || 'คำม่วง',
        province: r.province || 'กาฬสินธุ์', postal_code: r.postal_code || ''
      };
    });
}

function getSetting_(key, fallback) {
  const rows = readSheetObjects_(APP.SHEETS.SETTINGS);
  const match = rows.find(function (r) { return String(r.key || '') === key; });
  return match ? match.value : fallback;
}

function normalizePayload_(payload) {
  const listFields = ['education_secular', 'education_dhamma', 'education_pali', 'positions'];
  const result = {};
  Object.keys(payload || {}).forEach(function (key) {
    if (key === 'photo') return;
    if (listFields.indexOf(key) !== -1) {
      const value = payload[key];
      result[key] = Array.isArray(value) ? value.map(cleanString_).filter(Boolean).join(', ') : cleanString_(value);
    } else if (key === 'consent') {
      result[key] = stringToBoolean_(payload[key]);
    } else {
      result[key] = cleanString_(payload[key]);
    }
  });
  listFields.forEach(function (key) { if (!result[key]) result[key] = ''; });
  return result;
}

function validatePublicPayload_(data) {
  const required = { name: 'ชื่อ', surname: 'นามสกุล', temple: 'วัด', subdistrict: 'ตำบล', district: 'อำเภอ', province: 'จังหวัด', phone: 'เบอร์โทรศัพท์' };
  Object.keys(required).forEach(function (key) {
    if (!cleanString_(data[key])) throw new Error('กรุณากรอก' + required[key]);
  });
  if (!/^[0-9+\-\s]{8,20}$/.test(data.phone)) throw new Error('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
  if (data.id_card && !/^\d{13}$/.test(data.id_card)) throw new Error('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก');
  if (data.postal_code && !/^\d{5}$/.test(data.postal_code)) throw new Error('รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก');
  if (stringToBoolean_(getSetting_('REQUIRE_CONSENT', 'TRUE')) && !data.consent) throw new Error('กรุณายืนยันความยินยอมในการจัดเก็บข้อมูล');
}

function findDuplicateRecord_(data) {
  const records = readSheetObjects_(APP.SHEETS.MONKS);
  return records.find(function (r) {
    if (String(r.status || '') === 'จำหน่าย') return false;
    if (data.id_card && String(r.id_card || '').replace(/\D/g, '') === data.id_card.replace(/\D/g, '')) return true;
    return cleanString_(r.name).toLowerCase() === data.name.toLowerCase()
      && cleanString_(r.surname).toLowerCase() === data.surname.toLowerCase()
      && cleanString_(r.temple).toLowerCase() === data.temple.toLowerCase();
  });
}

function createRecordId_() {
  const stamp = Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyyMMdd');
  const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  return 'KM-' + stamp + '-' + suffix;
}

function savePhoto_(recordId, photo) {
  const maxMb = Number(getSetting_('MAX_PHOTO_MB', '5')) || 5;
  const raw = String(photo.data || '').replace(/^data:[^;]+;base64,/, '');
  if (!raw) return { fileId: '', url: '' };
  const bytes = Utilities.base64Decode(raw);
  if (bytes.length > maxMb * 1024 * 1024) throw new Error('รูปภาพมีขนาดเกิน ' + maxMb + ' MB');
  const mimeType = cleanString_(photo.type) || 'image/jpeg';
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) throw new Error('รองรับเฉพาะไฟล์ JPG, PNG และ WEBP');
  const extensionMap = { 'image/png': 'png', 'image/webp': 'webp' };
  const extension = extensionMap[mimeType.toLowerCase()] || 'jpg';
  const fileName = recordId + '_' + Date.now() + '.' + extension;
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const folderId = PropertiesService.getScriptProperties().getProperty('PHOTO_FOLDER_ID') || EXISTING_RESOURCES.PHOTO_FOLDER_ID;
  const file = DriveApp.getFolderById(folderId).createFile(blob);
  if (stringToBoolean_(getSetting_('PUBLIC_DIRECTORY', 'TRUE'))) {
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) {}
  }
  return { fileId: file.getId(), url: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000' };
}

function writeLog_(username, action, recordId, detail) {
  try {
    appendObjectRow_(APP.SHEETS.LOGS, {
      log_id: Utilities.getUuid(), timestamp: new Date(), username: username || '', action: action || '',
      record_id: recordId || '', detail: detail || '', ip_hint: ''
    });
  } catch (err) { console.error('writeLog_ failed', err); }
}

function toClientRecord_(record) {
  const result = {};
  Object.keys(record || {}).forEach(function (key) {
    const value = record[key];
    if (Object.prototype.toString.call(value) === '[object Date]') {
      const pattern = key === 'created_at' || key === 'updated_at' || key === 'last_login' ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
      result[key] = Utilities.formatDate(value, APP.TIME_ZONE, pattern);
    } else result[key] = value;
  });
  return result;
}

function cleanString_(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
}

function stringToBoolean_(value) {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'y', 'ใช่', 'ยินยอม'].indexOf(String(value || '').trim().toLowerCase()) !== -1;
}

function safeExecute_(label, fn) {
  try { return fn(); }
  catch (err) {
    console.error(label, err && err.stack ? err.stack : err);
    return { ok: false, message: err && err.message ? err.message : 'เกิดข้อผิดพลาดของระบบ' };
  }
}

function hashPin_(pin) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(pin), Utilities.Charset.UTF_8);
  return digest.map(function (byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function createSession_(username, role, displayName) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const session = { username: username, role: role, displayName: displayName, createdAt: Date.now() };
  CacheService.getScriptCache().put('session:' + token, JSON.stringify(session), APP.SESSION_SECONDS);
  return { token: token, user: session };
}

function requireSession_(token) {
  const raw = CacheService.getScriptCache().get('session:' + cleanString_(token));
  if (!raw) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  return JSON.parse(raw);
}

function adminLogin(username, pin) {
  return safeExecute_('adminLogin', function () {
    const user = cleanString_(username);
    const hash = hashPin_(cleanString_(pin));
    const admins = readSheetObjects_(APP.SHEETS.ADMINS);
    const admin = admins.find(function (a) {
      return cleanString_(a.username).toLowerCase() === user.toLowerCase() && stringToBoolean_(a.active) && String(a.password_hash || '') === hash;
    });
    if (!admin) {
      writeLog_(user || 'UNKNOWN', 'LOGIN_FAILED', '', 'เข้าสู่ระบบไม่สำเร็จ');
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
    updateObjectRow_(APP.SHEETS.ADMINS, admin._sheetRow, { last_login: new Date() });
    writeLog_(admin.username, 'LOGIN_SUCCESS', '', 'เข้าสู่ระบบผู้ดูแล');
    return Object.assign({ ok: true }, createSession_(admin.username, admin.role || 'ADMIN', admin.display_name || admin.username));
  });
}

function adminLogout(token) {
  return safeExecute_('adminLogout', function () {
    const session = requireSession_(token);
    CacheService.getScriptCache().remove('session:' + cleanString_(token));
    writeLog_(session.username, 'LOGOUT', '', 'ออกจากระบบ');
    return { ok: true };
  });
}

function getAdminDashboard(token) {
  return safeExecute_('getAdminDashboard', function () {
    requireSession_(token);
    const records = readSheetObjects_(APP.SHEETS.MONKS);
    const temples = readSheetObjects_(APP.SHEETS.TEMPLES);
    const counts = { all: records.length, active: 0, pending: 0, suspended: 0, removed: 0, temples: temples.length };
    records.forEach(function (r) {
      if (r.status === 'ใช้งาน') counts.active++;
      else if (r.status === 'รอตรวจสอบ') counts.pending++;
      else if (r.status === 'ระงับ') counts.suspended++;
      else if (r.status === 'จำหน่าย') counts.removed++;
    });
    return { ok: true, counts: counts };
  });
}

function getAdminRecords(token, filters) {
  return safeExecute_('getAdminRecords', function () {
    requireSession_(token);
    filters = filters || {};
    const q = cleanString_(filters.query).toLowerCase();
    const status = cleanString_(filters.status);
    const limit = Math.min(Math.max(Number(filters.limit || 200), 1), 500);
    let records = readSheetObjects_(APP.SHEETS.MONKS);
    if (status) records = records.filter(function (r) { return String(r.status || '') === status; });
    if (q) {
      records = records.filter(function (r) {
        return [r.record_id, r.name, r.nickname, r.surname, r.temple, r.subdistrict, r.phone, r.positions].join(' ').toLowerCase().indexOf(q) !== -1;
      });
    }
    records.sort(function (a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
    return { ok: true, records: records.slice(0, limit).map(toClientRecord_), total: records.length };
  });
}

function saveAdminRecord(token, payload) {
  return safeExecute_('saveAdminRecord', function () {
    const session = requireSession_(token);
    const data = normalizePayload_(payload || {});
    if (!data.name || !data.surname || !data.temple) throw new Error('กรุณากรอกชื่อ นามสกุล และวัด');
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const records = readSheetObjects_(APP.SHEETS.MONKS);
      const existing = records.find(function (r) { return String(r.record_id || '') === String(data.record_id || ''); });
      const now = new Date();
      if (existing) {
        const patch = Object.assign({}, data, { updated_at: now, updated_by: session.username });
        delete patch._sheetRow;
        updateObjectRow_(APP.SHEETS.MONKS, existing._sheetRow, patch);
        writeLog_(session.username, 'UPDATE', existing.record_id, 'แก้ไขข้อมูลผ่านหลังบ้าน');
        return { ok: true, recordId: existing.record_id, message: 'บันทึกการแก้ไขเรียบร้อยแล้ว' };
      }
      const recordId = createRecordId_();
      const object = Object.assign({}, data, {
        record_id: recordId, created_at: now, updated_at: now, status: data.status || 'ใช้งาน',
        source: 'ADMIN', created_by: session.username, updated_by: session.username
      });
      appendObjectRow_(APP.SHEETS.MONKS, object);
      writeLog_(session.username, 'CREATE_ADMIN', recordId, 'เพิ่มข้อมูลผ่านหลังบ้าน');
      return { ok: true, recordId: recordId, message: 'เพิ่มข้อมูลเรียบร้อยแล้ว' };
    } finally { lock.releaseLock(); }
  });
}

function setRecordStatus(token, recordId, status) {
  return safeExecute_('setRecordStatus', function () {
    const session = requireSession_(token);
    const allowed = ['ใช้งาน', 'รอตรวจสอบ', 'ระงับ', 'จำหน่าย'];
    if (allowed.indexOf(status) === -1) throw new Error('สถานะไม่ถูกต้อง');
    const record = readSheetObjects_(APP.SHEETS.MONKS).find(function (r) { return String(r.record_id || '') === String(recordId || ''); });
    if (!record) throw new Error('ไม่พบรายการ');
    updateObjectRow_(APP.SHEETS.MONKS, record._sheetRow, { status: status, updated_at: new Date(), updated_by: session.username });
    writeLog_(session.username, 'STATUS_' + status, recordId, 'เปลี่ยนสถานะเป็น ' + status);
    return { ok: true, message: 'เปลี่ยนสถานะเรียบร้อยแล้ว' };
  });
}

function changeAdminPin(token, oldPin, newPin) {
  return safeExecute_('changeAdminPin', function () {
    const session = requireSession_(token);
    if (!/^\d{6,12}$/.test(String(newPin || ''))) throw new Error('PIN ใหม่ต้องเป็นตัวเลข 6-12 หลัก');
    const admins = readSheetObjects_(APP.SHEETS.ADMINS);
    const admin = admins.find(function (a) { return String(a.username) === String(session.username); });
    if (!admin || String(admin.password_hash || '') !== hashPin_(oldPin)) throw new Error('PIN เดิมไม่ถูกต้อง');
    updateObjectRow_(APP.SHEETS.ADMINS, admin._sheetRow, { password_hash: hashPin_(newPin) });
    writeLog_(session.username, 'CHANGE_PIN', '', 'เปลี่ยน PIN ผู้ดูแล');
    return { ok: true, message: 'เปลี่ยน PIN เรียบร้อยแล้ว' };
  });
}

function exportRecordsCsv(token) {
  return safeExecute_('exportRecordsCsv', function () {
    const session = requireSession_(token);
    const sheet = getSheet_(APP.SHEETS.MONKS);
    const headers = getHeaders_(sheet);
    const records = readSheetObjects_(APP.SHEETS.MONKS);
    const values = [headers].concat(records.map(function (record) {
      return headers.map(function (header) {
        const value = record[header];
        if (Object.prototype.toString.call(value) === '[object Date]') return Utilities.formatDate(value, APP.TIME_ZONE, 'dd/MM/yyyy HH:mm');
        return value === null || value === undefined ? '' : value;
      });
    }));
    const csv = '\uFEFF' + values.map(function (row) {
      return row.map(function (value) { return '"' + String(value || '').replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    const folderId = PropertiesService.getScriptProperties().getProperty('EXPORT_FOLDER_ID') || EXISTING_RESOURCES.EXPORT_FOLDER_ID;
    const fileName = 'ทำเนียบพระสงฆ์_' + Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyyMMdd_HHmmss') + '.csv';
    const file = DriveApp.getFolderById(folderId).createFile(fileName, csv, MimeType.CSV);
    writeLog_(session.username, 'EXPORT_CSV', '', fileName);
    return { ok: true, url: file.getUrl(), name: fileName };
  });
}

function createSystemBackup(token) {
  return safeExecute_('createSystemBackup', function () {
    const session = requireSession_(token);
    const ss = getSpreadsheet_();
    const folderId = PropertiesService.getScriptProperties().getProperty('BACKUP_FOLDER_ID') || EXISTING_RESOURCES.BACKUP_FOLDER_ID;
    const fileName = 'สำรอง_' + ss.getName() + '_' + Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyyMMdd_HHmmss');
    const copy = DriveApp.getFileById(ss.getId()).makeCopy(fileName, DriveApp.getFolderById(folderId));
    appendObjectRow_(APP.SHEETS.BACKUPS, {
      backup_id: Utilities.getUuid(), created_at: new Date(), file_id: copy.getId(), file_url: copy.getUrl(),
      created_by: session.username, note: 'สำรองด้วยระบบหลังบ้าน'
    });
    writeLog_(session.username, 'BACKUP', '', fileName);
    return { ok: true, url: copy.getUrl(), name: fileName };
  });
}
