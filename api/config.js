export default function handler(request, response) {
  const fallback = 'https://script.google.com/macros/s/AKfycbzFQdFHSQcLlzKdQTPZ51j98achQlx70EHyCnPeqztmxo-hc2N5EGRurnzRxmEpY7S5lA/exec';
  const raw = process.env.APPS_SCRIPT_URL || fallback;
  const appsScriptUrl = raw.trim().replace(/[?#].*$/, '').replace(/\/$/, '');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.status(200).json({
    appsScriptUrl,
    version: '1.1.1',
    connected: Boolean(appsScriptUrl)
  });
}
