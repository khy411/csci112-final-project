// src/routes/results.js - Result, History, and Report Retrieval (AP-07 to AP-13)
const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const reports = require('../queries/reports');

const router = express.Router();
router.use(requireAuth);

// AP-07 home
router.get('/', async (req, res) => {
  const latest = await reports.getLatestReports(req.session.patientId);
  res.render('home', { latest });
});

// AP-08 / AP-09 / AP-10 combined results page: ?from=&to=&testType=&abnormal=true
router.get('/results', async (req, res) => {
  // pending: if abnormal -> getAbnormalResults; else if testType -> filterByTestType; else browseReports
  res.render('results', { reports: [] });
});

// AP-11 one report
router.get('/results/:reportId', async (req, res) => {
  const report = await reports.getReportById(req.session.patientId, req.params.reportId);
  if (!report) return res.status(404).send('Not found');
  // pending: reports.markReportAccessed(...)
  res.render('report', { report });
});

// AP-12 history
router.get('/history', async (req, res) => {
  // pending: const history = await reports.getHistory(req.session.patientId)
  res.render('history', { history: [] });
});

// AP-13 download
router.get('/results/:reportId/download', async (req, res) => {
  // pending: getReportForDownload -> stream a PDF with pdfkit
  res.status(501).send('TODO: PDF');
});

// Trend for one test type
router.get('/trend/:testType', async (req, res) => {
  // pending: reports.getTestTrend(...)
  res.status(501).send('TODO: trend');
});

module.exports = router;
