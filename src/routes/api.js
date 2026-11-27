// src/routes/api.js - JSON API for the SPA frontend (src/api.js contract). Mounted at /api.
// The patient always comes from the session cookie; the client never sends a patient_id.
const express = require('express');
const reports = require('../queries/reports');
const notifications = require('../queries/notifications');
const patients = require('../queries/patients');

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// JSON 401 (not a redirect) so fetch() can handle it
router.use((req, res, next) => {
  if (!req.session || !req.session.patientId) return res.status(401).json({ error: 'Please log in' });
  next();
});
const pid = (req) => req.session.patientId;

// ---------- shape the data the way the frontend expects ----------

// Frontend table wants rows of { name, value, unit, ref, flag }.
// Accepts either that array shape or a plain { analyte: value } object in test_result.
function toResultRows(test) {
  const r = test.test_result;
  if (Array.isArray(r)) return r;
  if (r && typeof r === 'object') {
    return Object.entries(r).map(([name, value]) => ({ name, value, unit: '', ref: '', flag: '' }));
  }
  return r != null ? [{ name: 'Result', value: String(r), unit: '', ref: '', flag: '' }] : [];
}

function toReportDTO(r, { withResults = true } = {}) {
  return {
    report_id: r.report_id,
    date_published: r.date_published,
    report_accessed: Boolean(r.report_accessed),
    report_accessed_at: r.report_accessed_at || null,
    tests_performed: (r.tests_performed || []).map((t) => ({
      test_id: t.test_id,
      test_type: t.test_type,
      date_performed: t.date_performed,
      is_abnormal: Boolean(t.is_abnormal),
      ...(withResults ? { performed_by: t.performed_by, results: toResultRows(t) } : {}),
    })),
  };
}

// Frontend treats status === 'viewed' as read; our schema keeps delivery status and is_read apart.
const toNotificationDTO = (n) => ({
  notification_id: n.notification_id,
  report_id: n.report_id,
  message: n.content,
  is_urgent: Boolean(n.is_urgent),
  timestamp: n.timestamp,
  status: n.is_read ? 'viewed' : n.status,
});

const parseDate = (s) => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d; // null = invalid
};

// ---------- AP-07 ----------
router.get('/reports/latest', wrap(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
  const list = await reports.getLatestReports(pid(req), limit);
  res.json(list.map((r) => toReportDTO(r, { withResults: false })));
}));

// ---------- AP-08 / AP-09 / AP-10 combined ----------
router.get('/reports', wrap(async (req, res) => {
  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  if (from === null || to === null) return res.status(400).json({ error: 'Invalid date' });

  const testTypes = String(req.query.testTypes || '').split(',').map((s) => s.trim()).filter(Boolean);
  const abnormal = req.query.abnormal === 'true';

  const list = await reports.searchReports(pid(req), { from, to, testTypes, abnormal });
  res.json(list.map((r) => toReportDTO(r, { withResults: false })));
}));

// ---------- AP-11 / AP-13 (must come after /reports/latest) ----------
router.get('/reports/:reportId', wrap(async (req, res) => {
  const report = await reports.getReportById(pid(req), req.params.reportId);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  await reports.markReportAccessed(pid(req), req.params.reportId);
  res.json({ ...toReportDTO(report), report_accessed: true });
}));

// ---------- AP-12 ----------
router.get('/history', wrap(async (req, res) => {
  const list = await reports.getHistory(pid(req));
  res.json(list.map((r) => toReportDTO(r, { withResults: false })));
}));

// ---------- AP-14 ----------
router.get('/notifications', wrap(async (req, res) => {
  const [items, unread] = await Promise.all([
    notifications.getNotifications(pid(req)),
    notifications.countUnread(pid(req)),
  ]);
  res.json({ items: items.map(toNotificationDTO), unread_count: unread });
}));

// ---------- AP-15 ----------
router.patch('/notifications/:id/read', wrap(async (req, res) => {
  const result = await notifications.markAsRead(pid(req), req.params.id);
  if (result.matchedCount === 0) return res.status(404).json({ error: 'Notification not found' });
  res.status(204).end();
}));

// ---------- AP-16 ----------
router.get('/patient/me', wrap(async (req, res) => {
  const p = await patients.findPatientById(pid(req));
  if (!p) return res.status(404).json({ error: 'Patient not found' });
  res.json({
    patient_id: p.patient_id,
    first_name: p.first_name,
    last_name: p.last_name,
    email: p.email,
    phone_number: p.phone_number,
    notification_method: p.notification_method,
  });
}));

router.patch('/patient/notification-method', wrap(async (req, res) => {
  try {
    await patients.updateNotificationMethod(pid(req), req.body.notification_method);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  res.json({ notification_method: req.body.notification_method });
}));

// ---------- filter dropdown ----------
router.get('/test-types', wrap(async (req, res) => {
  res.json(await reports.getTestTypes(pid(req)));
}));

module.exports = router;
