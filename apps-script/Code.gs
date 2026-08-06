/**
 * ระบบทำเนียบพระสงฆ์ อำเภอคำม่วง
 * พัฒนาโดย พระมหาธงชัย วิลาสินี
 */

const APP = Object.freeze({
  NAME: 'ระบบทำเนียบพระสงฆ์ อำเภอคำม่วง',
  ORGANIZATION: 'สำนักงานเจ้าคณะอำเภอคำม่วง จังหวัดกาฬสินธุ์',
  TIME_ZONE: 'Asia/Bangkok',
  VERSION: '1.1.0',
  SHEETS: Object.freeze({
    MONKS: 'ข้อมูลพระสงฆ์',
    TEMPLES: 'ข้อมูลวัด',
    OPTIONS: 'ตัวเลือก',
    SETTINGS: 'การตั้งค่า',
    ADMINS: 'ผู้ดูแล',
    LOGS: 'บันทึกกิจกรรม',
    BACKUPS: 'ประวัติสำรอง',
    SUMMARY: 'สรุป'
  }),
  HEADER_ROW: 4,
  DATA_START_ROW: 5,
  SESSION_SECONDS: 21600,
  MAX_PUBLIC_RESULTS: 200,
  DEFAULT_ADMIN_USERNAME: 'admin',
  DEFAULT_ADMIN_PIN: '',
  BRAND: Object.freeze({
    LOGO_FILE_ID: '1AU2FAJZVITR3qcuNuTKWSLf_1ww1mdeQ',
    LOGO_URL: 'https://drive.google.com/thumbnail?id=1AU2FAJZVITR3qcuNuTKWSLf_1ww1mdeQ&sz=w1000',
    FAVICON_URL: 'https://drive.google.com/thumbnail?id=1AU2FAJZVITR3qcuNuTKWSLf_1ww1mdeQ&sz=w128',
    THEME_COLOR: '#8F1D54'
  })
});

const EXISTING_RESOURCES = Object.freeze({
  SPREADSHEET_ID: '',
  ROOT_FOLDER_ID: '',
  DATABASE_FOLDER_ID: '',
  PHOTO_FOLDER_ID: '',
  EXPORT_FOLDER_ID: '',
  BACKUP_FOLDER_ID: '',
  SOURCE_FOLDER_ID: ''
});

function doGet(e) {
  const params = (e && e.parameter) || {};
  const rawPage = String(params.page || params.view || params.p || 'form').trim().toLowerCase();
  const aliases = Object.freeze({
    '': 'form', home: 'form', index: 'form', 'index.html': 'form', form: 'form', register: 'form',
    directory: 'directory', 'directory.html': 'directory', monks: 'directory',
    admin: 'admin', 'admin.html': 'admin', dashboard: 'admin'
  });
  const page = aliases[rawPage] || 'form';
  const routes = Object.freeze({ form: 'Index', directory: 'Directory', admin: 'Admin' });
  const titles = Object.freeze({ form: 'ลงทะเบียนพระสงฆ์', directory: 'ทำเนียบพระสงฆ์', admin: 'ระบบผู้ดูแล' });

  try {
    const fileName = routes[page];
    const template = HtmlService.createTemplateFromFile(fileName);
    const baseUrl = ScriptApp.getService().getUrl() || '';
    const brand = getBrandConfig_();
    template.APP_NAME = APP.NAME;
    template.ORGANIZATION = APP.ORGANIZATION;
    template.APP_VERSION = APP.VERSION;
    template.CURRENT_PAGE = page;
    template.WEB_APP_URL = baseUrl;
    template.FORM_URL = buildPageUrl_(baseUrl, 'form');
    template.DIRECTORY_URL = buildPageUrl_(baseUrl, 'directory');
    template.ADMIN_URL = buildPageUrl_(baseUrl, 'admin');
    template.LOGO_FILE_ID = brand.logoFileId;
    template.LOGO_URL = brand.logoUrl;
    template.FAVICON_URL = brand.faviconUrl;
    template.THEME_COLOR = brand.themeColor;
    return template.evaluate()
      .setTitle(titles[page] + ' | ' + APP.NAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    console.error('doGet route error', error);
    return createRouteErrorPage_(page, routes[page], error);
  }
}

function buildPageUrl_(baseUrl, page) {
  const query = '?page=' + encodeURIComponent(page);
  return baseUrl ? baseUrl.replace(/[?#].*$/, '') + query : query;
}

function getBrandConfig_() {
  const fallback = APP.BRAND;
  const values = {};
  try {
    readSheetObjects_(APP.SHEETS.SETTINGS).forEach(function (row) {
      const key = String(row.key || '').trim();
      if (key) values[key] = String(row.value == null ? '' : row.value).trim();
    });
  } catch (error) {
    console.warn('ใช้ค่าแบรนด์สำรอง เนื่องจากอ่านชีตการตั้งค่าไม่ได้', error);
  }
  const logoFileId = values.LOGO_FILE_ID || fallback.LOGO_FILE_ID;
  return {
    logoFileId: logoFileId,
    logoUrl: values.LOGO_URL || ('https://drive.google.com/thumbnail?id=' + encodeURIComponent(logoFileId) + '&sz=w1000'),
    faviconUrl: values.FAVICON_URL || ('https://drive.google.com/thumbnail?id=' + encodeURIComponent(logoFileId) + '&sz=w128'),
    themeColor: fallback.THEME_COLOR
  };
}

function createRouteErrorPage_(page, fileName, error) {
  const message = error && error.message ? error.message : String(error || 'Unknown error');
  const html = `<!doctype html><html lang="th"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#8F1D54"><link rel="icon" type="image/png" href="${escapeHtml_(getBrandConfig_().faviconUrl)}"><title>ตรวจพบข้อผิดพลาดของระบบ</title><style>body{font-family:Tahoma,sans-serif;background:#fff7fa;color:#4a142a;margin:0;padding:28px}.box{max-width:780px;margin:auto;background:#fff;border:1px solid #edcbd9;border-radius:20px;padding:26px;box-shadow:0 18px 50px rgba(143,29,84,.12)}h1{color:#8f1d54}.code{background:#f8edf2;border-radius:12px;padding:14px;white-space:pre-wrap}.btn{display:inline-block;margin-top:16px;background:#8f1d54;color:#fff;text-decoration:none;padding:11px 16px;border-radius:10px}</style></head><body><div class="box"><h1>ไม่สามารถเปิดหน้าระบบได้</h1><p>เส้นทางที่ร้องขอ: <strong>${escapeHtml_(page)}</strong></p><p>ไฟล์ HTML ที่ระบบต้องการ: <strong>${escapeHtml_(fileName || '-')}</strong></p><div class="code">${escapeHtml_(message)}</div><p>ตรวจว่าใน Apps Script มีไฟล์ Index.html, Directory.html, Admin.html และ Styles.html ครบ แล้วสร้าง Deployment เวอร์ชันใหม่</p><a class="btn" href="${escapeHtml_(buildPageUrl_(ScriptApp.getService().getUrl() || '', 'form'))}">กลับหน้าแบบฟอร์ม</a></div></body></html>`;
  return HtmlService.createHtmlOutput(html)
    .setTitle('ตรวจพบข้อผิดพลาด | ' + APP.NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function escapeHtml_(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
  });
}

function diagnoseWebPages() {
  const names = ['Index', 'Directory', 'Admin', 'Styles'];
  const result = { ok: true, version: APP.VERSION, webAppUrl: ScriptApp.getService().getUrl() || '', brand: getBrandConfig_(), files: {} };
  names.forEach(function (name) {
    try {
      const content = HtmlService.createHtmlOutputFromFile(name).getContent();
      result.files[name] = { ok: true, characters: content.length };
    } catch (error) {
      result.ok = false;
      result.files[name] = { ok: false, message: error.message || String(error) };
    }
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getPublicBootstrap() {
  return safeExecute_('getPublicBootstrap', function () {
    return {
      ok: true,
      app: {
        name: APP.NAME,
        organization: APP.ORGANIZATION,
        district: getSetting_('DISTRICT', 'คำม่วง'),
        province: getSetting_('PROVINCE', 'กาฬสินธุ์'),
        maxPhotoMb: Number(getSetting_('MAX_PHOTO_MB', '5')) || 5,
        requireConsent: stringToBoolean_(getSetting_('REQUIRE_CONSENT', 'TRUE'))
      },
      options: getOptionsGrouped_(),
      temples: getTempleChoices_()
    };
  });
}

function submitMonkForm(payload) {
  return safeExecute_('submitMonkForm', function () {
    const data = normalizePayload_(payload || {});
    validatePublicPayload_(data);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const duplicate = findDuplicateRecord_(data);
      if (duplicate) throw new Error('พบข้อมูลที่อาจซ้ำกับรายการเดิม กรุณาติดต่อผู้ดูแลระบบเพื่อตรวจสอบ');
      const recordId = createRecordId_();
      let photo = { fileId: '', url: '' };
      if (payload && payload.photo && payload.photo.data) photo = savePhoto_(recordId, payload.photo);
      const now = new Date();
      appendObjectRow_(APP.SHEETS.MONKS, {
        record_id: recordId, created_at: now, updated_at: now, status: 'รอตรวจสอบ',
        name: data.name, nickname: data.nickname, surname: data.surname,
        birth_date: data.birth_date, age: data.age, pansa: data.pansa, ordination_date: data.ordination_date,
        samanasak: data.samanasak, preceptor: data.preceptor, id_card: data.id_card,
        education_secular: data.education_secular, education_dhamma: data.education_dhamma, education_pali: data.education_pali,
        degree_bachelor_field: data.degree_bachelor_field, degree_master_field: data.degree_master_field,
        degree_doctoral_field: data.degree_doctoral_field, degree_university: data.degree_university,
        address: data.address, moo: data.moo, temple: data.temple, village: data.village,
        subdistrict: data.subdistrict, district: data.district || 'คำม่วง', province: data.province || 'กาฬสินธุ์',
        postal_code: data.postal_code, phone: data.phone, positions: data.positions, other_position: data.other_position,
        photo_file_id: photo.fileId, photo_url: photo.url, consent: data.consent ? 'ยินยอม' : 'ไม่ยินยอม',
        source: 'PUBLIC_FORM', created_by: 'PUBLIC', updated_by: 'PUBLIC', note: data.note
      });
      writeLog_('PUBLIC', 'CREATE_PUBLIC', recordId, 'ส่งแบบฟอร์มลงทะเบียนจากหน้าเว็บ');
      return { ok: true, recordId: recordId, message: 'บันทึกข้อมูลเรียบร้อยแล้ว รหัสรายการ ' + recordId };
    } finally {
      lock.releaseLock();
    }
  });
}

function getPublicDirectory(query) {
  return safeExecute_('getPublicDirectory', function () {
    if (!stringToBoolean_(getSetting_('PUBLIC_DIRECTORY', 'TRUE'))) return { ok: true, records: [], disabled: true };
    const q = cleanString_(query).toLowerCase();
    const records = readSheetObjects_(APP.SHEETS.MONKS)
      .filter(function (r) { return String(r.status || '') === 'ใช้งาน'; })
      .filter(function (r) {
        if (!q) return true;
        return [r.name, r.nickname, r.surname, r.samanasak, r.temple, r.subdistrict, r.positions].join(' ').toLowerCase().indexOf(q) !== -1;
      })
      .slice(0, APP.MAX_PUBLIC_RESULTS)
      .map(function (r) {
        return {
          record_id: r.record_id, name: r.name, nickname: r.nickname, surname: r.surname, samanasak: r.samanasak,
          age: r.age, pansa: r.pansa, temple: r.temple, village: r.village, subdistrict: r.subdistrict,
          district: r.district, province: r.province, positions: r.positions,
          education_secular: r.education_secular, education_dhamma: r.education_dhamma,
          education_pali: r.education_pali, photo_url: r.photo_url
        };
      });
    return { ok: true, records: records, total: records.length };
  });
}

function systemHealthCheck() {
  return safeExecute_('systemHealthCheck', function () {
    const props = PropertiesService.getScriptProperties().getProperties();
    const ss = getSpreadsheet_();
    return {
      ok: true,
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      configured: Boolean(props.SPREADSHEET_ID && props.PHOTO_FOLDER_ID),
      version: APP.VERSION,
      timeZone: Session.getScriptTimeZone()
    };
  });
}
