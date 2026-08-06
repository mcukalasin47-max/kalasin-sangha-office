const state = { baseUrl: '', version: '1.1.0' };

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '');
}

function pageUrl(page) {
  return `${state.baseUrl}?page=${encodeURIComponent(page)}`;
}

function setStatus(type, text) {
  const el = document.getElementById('system-status');
  if (!el) return;
  el.className = `status ${type}`;
  el.querySelector('span:last-child').textContent = text;
}

async function loadConfig() {
  try {
    const response = await fetch('/api/config', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    state.baseUrl = normalizeBaseUrl(config.appsScriptUrl);
    state.version = config.version || state.version;
  } catch (error) {
    console.error('config load failed', error);
  }
}

function applyLandingState() {
  const cards = [...document.querySelectorAll('[data-page]')];
  const setup = document.getElementById('setup-panel');
  if (!state.baseUrl) {
    setStatus('setup', 'Vercel พร้อมแล้ว • รอเชื่อม URL ของ Google Apps Script');
    setup?.classList.remove('hidden');
    cards.forEach(card => {
      card.classList.add('disabled');
      card.addEventListener('click', event => event.preventDefault());
    });
    return;
  }
  setStatus('ready', 'เชื่อมต่อ Google Apps Script แล้ว • ระบบพร้อมใช้งาน');
  cards.forEach(card => { card.href = pageUrl(card.dataset.page); });
}

function showRedirectScreen(page) {
  const names = { form: 'แบบฟอร์มลงทะเบียน', directory: 'ทำเนียบพระสงฆ์', admin: 'ระบบผู้ดูแล' };
  document.body.innerHTML = `<main class="loading-screen"><section class="loading-card"><img src="https://drive.google.com/thumbnail?id=1AU2FAJZVITR3qcuNuTKWSLf_1ww1mdeQ&sz=w1000" alt="ตราอำเภอคำม่วง"><h1>กำลังเปิด${names[page] || 'ระบบ'}</h1><p>เชื่อมต่อระบบสำนักงานเจ้าคณะอำเภอคำม่วง…</p></section></main>`;
}

async function start() {
  const route = location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const target = ['form', 'directory', 'admin'].includes(route) ? route : '';
  await loadConfig();
  if (target) {
    if (state.baseUrl) {
      showRedirectScreen(target);
      location.replace(pageUrl(target));
    } else {
      history.replaceState({}, '', '/');
      applyLandingState();
      document.getElementById('setup-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }
  applyLandingState();
}

document.addEventListener('DOMContentLoaded', start);
