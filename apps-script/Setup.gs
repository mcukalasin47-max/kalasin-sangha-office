/**
 * Installation utilities for the public GitHub edition.
 *
 * Before running installExistingSystem(), set these Script Properties:
 * SPREADSHEET_ID, ROOT_FOLDER_ID, DATABASE_FOLDER_ID, PHOTO_FOLDER_ID,
 * EXPORT_FOLDER_ID, BACKUP_FOLDER_ID, SOURCE_FOLDER_ID, INITIAL_ADMIN_PIN
 */
function installExistingSystem() {
  const props = PropertiesService.getScriptProperties();
  const required = [
    'SPREADSHEET_ID', 'ROOT_FOLDER_ID', 'DATABASE_FOLDER_ID',
    'PHOTO_FOLDER_ID', 'EXPORT_FOLDER_ID', 'BACKUP_FOLDER_ID',
    'SOURCE_FOLDER_ID', 'INITIAL_ADMIN_PIN'
  ];
  const missing = required.filter(function (key) { return !String(props.getProperty(key) || '').trim(); });
  if (missing.length) {
    throw new Error('กรุณาตั้งค่า Script Properties ให้ครบก่อนติดตั้ง: ' + missing.join(', '));
  }

  ensureCoreSheets_();
  ensureAdminAccount_();
  getSpreadsheet_().setSpreadsheetTimeZone(APP.TIME_ZONE);
  props.setProperty('APP_VERSION', APP.VERSION);
  props.setProperty('INSTALLED_AT', new Date().toISOString());
  SpreadsheetApp.flush();

  return {
    ok: true,
    message: 'ติดตั้งระบบเรียบร้อยแล้ว',
    spreadsheetUrl: getSpreadsheet_().getUrl(),
    webAppUrl: ScriptApp.getService().getUrl() || '',
    nextStep: 'Deploy > New deployment > Web app > Execute as Me > Anyone'
  };
}

function ensureAdminAccount_() {
  const props = PropertiesService.getScriptProperties();
  const username = String(props.getProperty('ADMIN_USERNAME') || 'admin').trim();
  const initialPin = String(props.getProperty('INITIAL_ADMIN_PIN') || '').trim();
  if (!initialPin) throw new Error('ยังไม่ได้ตั้งค่า INITIAL_ADMIN_PIN');

  const existing = readSheetObjects_(APP.SHEETS.ADMINS)
    .find(function (row) { return String(row.username || '').trim() === username; });
  const values = {
    username: username,
    display_name: props.getProperty('ADMIN_DISPLAY_NAME') || 'ผู้ดูแลระบบ',
    password_hash: hashPin_(initialPin),
    role: 'SUPER_ADMIN',
    active: true,
    last_login: existing ? existing.last_login : '',
    note: 'บัญชีผู้ดูแลที่สร้างจาก Script Properties'
  };
  if (existing) updateObjectRow_(APP.SHEETS.ADMINS, existing._sheetRow, values);
  else appendObjectRow_(APP.SHEETS.ADMINS, values);
}

function ensureCoreSheets_() {
  const ss = getSpreadsheet_();
  Object.keys(APP.SHEETS).forEach(function (key) {
    const name = APP.SHEETS[key];
    if (!ss.getSheetByName(name)) {
      throw new Error('ไม่พบชีตหลัก: ' + name);
    }
  });
}

function installDailyBackupTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(function (trigger) { return trigger.getHandlerFunction() === 'scheduledBackup_'; })
    .forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('scheduledBackup_').timeBased().everyDays(1).atHour(2).create();
  return { ok: true, message: 'ติดตั้ง Trigger สำรองข้อมูลทุกวันเวลา 02.00 น. แล้ว' };
}

function scheduledBackup_() {
  const ss = getSpreadsheet_();
  const folderId = PropertiesService.getScriptProperties().getProperty('BACKUP_FOLDER_ID');
  if (!folderId) throw new Error('ไม่พบ BACKUP_FOLDER_ID');
  const fileName = 'อัตโนมัติ_' + ss.getName() + '_' + Utilities.formatDate(new Date(), APP.TIME_ZONE, 'yyyyMMdd_HHmmss');
  const copy = DriveApp.getFileById(ss.getId()).makeCopy(fileName, DriveApp.getFolderById(folderId));
  appendObjectRow_(APP.SHEETS.BACKUPS, {
    backup_id: Utilities.getUuid(),
    created_at: new Date(),
    file_id: copy.getId(),
    file_url: copy.getUrl(),
    created_by: 'SYSTEM',
    note: 'สำรองอัตโนมัติรายวัน'
  });
  writeLog_('SYSTEM', 'AUTO_BACKUP', '', fileName);
}

function repairResourceLinks() {
  return installExistingSystem();
}
