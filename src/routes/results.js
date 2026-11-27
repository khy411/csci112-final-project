// src/routes/results.js - Result, History, and Report Retrieval (AP-07 to AP-13)
const express = require('express');
const PDFDocument = require('pdfkit');
const requireAuth = require('../middleware/requireAuth');
const reports = require('../queries/reports');

const router = express.Router();
router.use(requireAuth);

// Express 4 does not catch rejected promises, so forward errors to next()
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const toDate = (s) => {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

// AP-07 home
router.get('/', wrap(async (req, res) => {
  const latest = await reports.getLatestReports(req.session.patientId);
  res.render('home', { latest });
}));

// AP-08 / AP-09 / AP-10: /results?from=&to=&testType=&abnormal=true&page=
router.get('/results', wrap(async (req, res) => {
  const patientId = req.session.patientId;
  const { from, to, testType, abnormal } = req.query;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

  let list;
  if (abnormal === 'true') list = await reports.getAbnormalResults(patientId);                    // AP-10
  else if (testType) list = await reports.filterByTestType(patientId, testType);                 // AP-09
  else list = await reports.browseReports(patientId, { from: toDate(from), to: toDate(to), page }); // AP-08

  res.render('results', { reports: list, filters: { from, to, testType, abnormal, page } });
}));

// AP-11 one report
router.get('/results/:reportId', wrap(async (req, res) => {
  const report = await reports.getReportById(req.session.patientId, req.params.reportId);
  if (!report) return res.status(404).send('Report not found');
  await reports.markReportAccessed(req.session.patientId, req.params.reportId);
  res.render('report', { report });
}));

// AP-12 history grouped by visit
router.get('/history', wrap(async (req, res) => {
  const history = await reports.getHistory(req.session.patientId);
  res.render('history', { history });
}));

// AP-13 download as PDF
router.get('/results/:reportId/download', wrap(async (req, res) => {
  const report = await reports.getReportForDownload(req.session.patientId, req.params.reportId);
  if (!report) return res.status(404).send('Report not found');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${report.report_id}.pdf"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(20).text('Laboratory Report');
  doc.moveDown(0.5).fontSize(11)
    .text(`Report: ${report.report_id}`)
    .text(`Published: ${new Date(report.date_published).toDateString()}`);

  for (const t of report.tests_performed) {
    doc.moveDown().fontSize(14).text(`${t.test_type}${t.is_abnormal ? '  (ABNORMAL)' : ''}`);
    doc.fontSize(10)
      .text(`Performed: ${new Date(t.date_performed).toDateString()} by ${t.performed_by.first_name} ${t.performed_by.last_name}`);
    const entries = typeof t.test_result === 'object' && t.test_result
      ? Object.entries(t.test_result)
      : [['result', String(t.test_result)]];
    for (const [k, v] of entries) doc.text(`  ${k}: ${v}`);
  }
  doc.end();
}));

// Trend of one test type over time
router.get('/trend/:testType', wrap(async (req, res) => {
  const trend = await reports.getTestTrend(req.session.patientId, req.params.testType);
  res.json(trend); // TODO (UI): render as a chart/table view
}));

module.exports = router;
