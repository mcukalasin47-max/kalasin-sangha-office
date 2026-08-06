export default function handler(request, response) {
  const raw = process.env.APPS_SCRIPT_URL || '';
  const appsScriptUrl = raw.trim().replace(/[?#].*$/, '').replace(/\/$/, '');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.status(200).json({
    appsScriptUrl,
    version: '1.1.0',
    connected: Boolean(appsScriptUrl)
  });
}
