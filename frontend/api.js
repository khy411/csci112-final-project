/* HTTP client for the patient portal backend (browser + Node.js 18+, uses global fetch).
   Browser: <script src="src/api.js"></script>  -> window.PortalAPI
   Node:    const API = require('./src/api.js');

   The patient is identified by the backend from the logged-in session (cookie),
   so no patient_id is ever sent from the client.

   Endpoint contract (agree on this with the backend developer):
     AP-07  GET   /reports/latest?limit=10
     AP-08/09/10  GET /reports?from=&to=&testTypes=CBC,Urinalysis&abnormal=true
                  (from inclusive, to exclusive, ISO timestamps; filters combine with AND;
                   abnormal=true returns only the abnormal tests inside each report)
     AP-11/13  GET   /reports/:reportId
     AP-12  GET   /history
     AP-14  GET   /notifications          -> { items: [...], unread_count: n }
     AP-15  PATCH /notifications/:id/read
     AP-16  PATCH /patient/notification-method   body: { notification_method: "email" | "sms" }
            GET   /patient/me             -> { notification_method: "email" | "sms", ... }
            GET   /test-types             -> [ "CBC", "Urinalysis", ... ]
   Errors: non-2xx with optional JSON { error: "message" }. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PortalAPI = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  let baseUrl = '/api';

  function configure(opts) {
    if (opts && typeof opts.baseUrl === 'string') baseUrl = opts.baseUrl.replace(/\/$/, '');
  }

  async function request(path, { method = 'GET', query, body } = {}) {
    let qs = '';
    if (query) {
      const p = new URLSearchParams();
      Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v); });
      const s = p.toString();
      if (s) qs = '?' + s;
    }
    const res = await fetch(baseUrl + path + qs, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      let msg = res.statusText || 'Request failed';
      try { const j = await res.json(); msg = j.error || j.message || msg; } catch (_) {}
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  return {
    configure,
    getLatestReports: (limit = 10) => request('/reports/latest', { query: { limit } }),
    getReports: ({ from, to, testTypes, abnormal } = {}) => request('/reports', {
      query: { from, to, testTypes: testTypes && testTypes.length ? testTypes.join(',') : undefined, abnormal: abnormal ? 'true' : undefined }
    }),
    getReportDetail: (reportId) => request('/reports/' + encodeURIComponent(reportId)),
    getDiagnosticHistory: () => request('/history'),
    getNotifications: () => request('/notifications'),
    markNotificationRead: (id) => request('/notifications/' + encodeURIComponent(id) + '/read', { method: 'PATCH' }),
    getPatient: () => request('/patient/me'),
    setNotificationMethod: (method) => request('/patient/notification-method', { method: 'PATCH', body: { notification_method: method } }),
    getTestTypes: () => request('/test-types')
  };
});