// src/queries/reports.js - reports collection (AP-01, AP-02, AP-07 to AP-13)
// RULE: every patient-facing query filters on patient_id AND status: "approved".
const { getDb } = require('../db');
const reports = () => getDb().collection('reports');

// ---------- System side ----------

// AP-01 / AP-02: publish ALL tests of one lab order at once (single-document write = atomic)
async function publishReport(reportId) {
  // pending: confirm every test in tests_performed has a result before publishing
  return reports().updateOne(
    { report_id: reportId, status: 'pending' },
    { $set: { status: 'approved', date_published: new Date() } }
  );
}

// ---------- Patient side ----------

// AP-07: latest results for the home page
async function getLatestReports(patientId, limit = 10) {
  return reports()
    .find({ patient_id: patientId, status: 'approved' })
    .sort({ date_published: -1 })
    .limit(limit)
    .toArray();
}

// AP-08: browse all past results, newest first, optional date range, paginated
async function browseReports(patientId, { from, to, page = 1, pageSize = 10 } = {}) {
  const filter = { patient_id: patientId, status: 'approved' };
  // pending: add date_published: { $gte: from, $lt: to } when from/to are provided
  return reports()
    .find(filter)
    .sort({ date_published: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
}

// AP-09: filter by test type(s)
async function filterByTestType(patientId, testTypes) {
  // pending: filter on "tests_performed.test_type": { $in: testTypes }, sort newest first
  throw new Error('TODO: AP-09');
}

// AP-10: abnormal results only (return only the abnormal tests inside each report)
async function getAbnormalResults(patientId) {
  // pending: aggregate: $match -> $project with $filter on tests_performed -> $sort
  throw new Error('TODO: AP-10');
}

// AP-11: one result with full details (patient_id prevents reading others' reports)
async function getReportById(patientId, reportId) {
  return reports().findOne({ report_id: reportId, patient_id: patientId, status: 'approved' });
}

// AP-12: diagnostic history grouped by visit (one report = one visit)
async function getHistory(patientId) {
  // pending: projection of report_id, date_published, report_accessed, and test_type/is_abnormal per test
  throw new Error('TODO: AP-12');
}

// AP-13: full report for view/download (same lookup as AP-11)
async function getReportForDownload(patientId, reportId) {
  return getReportById(patientId, reportId);
}

// Business description: how a single test changed over time (needs its own AP number)
async function getTestTrend(patientId, testType) {
  // pending: aggregate: $match -> $unwind tests_performed -> $match test_type -> $sort date_performed
  throw new Error('TODO: test trend');
}

// Side effect of opening a report; used for report_accessed follow-ups
async function markReportAccessed(patientId, reportId) {
  // pending: $set report_accessed: true
  throw new Error('TODO: markReportAccessed');
}

module.exports = {
  publishReport, getLatestReports, browseReports, filterByTestType,
  getAbnormalResults, getReportById, getHistory, getReportForDownload,
  getTestTrend, markReportAccessed,
};
