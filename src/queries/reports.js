// src/queries/reports.js - reports collection (AP-01, AP-02, AP-07 to AP-13)
// RULE: every patient-facing query filters on patient_id AND status: "approved".
const { getDb } = require('../db');
const reports = () => getDb().collection('reports');

// ---------- System side ----------

// Internal lookup for the publish service (no patient filter: not patient-facing)
async function getReportForSystem(reportId) {
  return reports().findOne({ report_id: reportId });
}

// AP-01 / AP-02: publish ALL tests of one lab order at once.
// One document update = atomic, so every embedded test becomes visible together.
// Only publishes pending reports whose tests all have a result.
async function publishReport(reportId) {
  return reports().updateOne(
    {
      report_id: reportId,
      status: 'pending',
      'tests_performed.0': { $exists: true },
      tests_performed: { $not: { $elemMatch: { test_result: { $exists: false } } } },
    },
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

// AP-08: browse all past results, newest first, optional date range, paginated.
// from / to are Date objects (or undefined); `to` is exclusive.
async function browseReports(patientId, { from, to, page = 1, pageSize = 10 } = {}) {
  const filter = { patient_id: patientId, status: 'approved' };
  if (from || to) {
    filter.date_published = {};
    if (from) filter.date_published.$gte = from;
    if (to) filter.date_published.$lt = to;
  }
  return reports()
    .find(filter)
    .sort({ date_published: -1 })
    .skip((Math.max(page, 1) - 1) * pageSize)
    .limit(pageSize)
    .toArray();
}

// AP-09: filter by test type(s). Accepts a string or an array.
async function filterByTestType(patientId, testTypes) {
  const types = Array.isArray(testTypes) ? testTypes : [testTypes];
  return reports()
    .find({
      patient_id: patientId,
      status: 'approved',
      'tests_performed.test_type': { $in: types },
    })
    .sort({ date_published: -1 })
    .toArray();
}

// AP-10: abnormal results only (each report keeps only its abnormal tests)
async function getAbnormalResults(patientId) {
  return reports()
    .aggregate([
      {
        $match: {
          patient_id: patientId,
          status: 'approved',
          'tests_performed.is_abnormal': true,
        },
      },
      {
        $project: {
          report_id: 1,
          date_published: 1,
          tests_performed: {
            $filter: {
              input: '$tests_performed',
              as: 't',
              cond: { $eq: ['$$t.is_abnormal', true] },
            },
          },
        },
      },
      { $sort: { date_published: -1 } },
    ])
    .toArray();
}

// AP-11: one result with full details (patient_id prevents reading others' reports)
async function getReportById(patientId, reportId) {
  return reports().findOne({ report_id: reportId, patient_id: patientId, status: 'approved' });
}

// AP-12: diagnostic history grouped by visit (one report = one visit)
async function getHistory(patientId) {
  return reports()
    .find(
      { patient_id: patientId, status: 'approved' },
      {
        projection: {
          report_id: 1,
          date_published: 1,
          report_accessed: 1,
          'tests_performed.test_type': 1,
          'tests_performed.date_performed': 1,
          'tests_performed.is_abnormal': 1,
        },
      }
    )
    .sort({ date_published: -1 })
    .toArray();
}

// AP-13: full report for view/download (same lookup as AP-11)
async function getReportForDownload(patientId, reportId) {
  return getReportById(patientId, reportId);
}

// How one test changed over time (oldest first, ready for a chart)
async function getTestTrend(patientId, testType) {
  return reports()
    .aggregate([
      {
        $match: {
          patient_id: patientId,
          status: 'approved',
          'tests_performed.test_type': testType,
        },
      },
      { $unwind: '$tests_performed' },
      { $match: { 'tests_performed.test_type': testType } },
      {
        $project: {
          _id: 0,
          report_id: 1,
          date_performed: '$tests_performed.date_performed',
          test_result: '$tests_performed.test_result',
          is_abnormal: '$tests_performed.is_abnormal',
        },
      },
      { $sort: { date_performed: 1 } },
    ])
    .toArray();
}

// Side effect of opening a report; feeds the report_accessed follow-up logic
async function markReportAccessed(patientId, reportId) {
  return reports().updateOne(
    { report_id: reportId, patient_id: patientId, status: 'approved' },
    { $set: { report_accessed: true } }
  );
}

// AP-08 + AP-09 + AP-10 combined (filters AND together, as the frontend expects).
// from inclusive, to exclusive. When abnormal is true, each report keeps only its abnormal tests
// (and only those of the chosen test types, if any).
async function searchReports(patientId, { from, to, testTypes = [], abnormal = false, limit = 100 } = {}) {
  const match = { patient_id: patientId, status: 'approved' };
  if (from || to) {
    match.date_published = {};
    if (from) match.date_published.$gte = from;
    if (to) match.date_published.$lt = to;
  }

  const testCond = {};
  if (abnormal) testCond.is_abnormal = true;
  if (testTypes.length) testCond.test_type = { $in: testTypes };
  if (Object.keys(testCond).length) match.tests_performed = { $elemMatch: testCond };

  const pipeline = [{ $match: match }];
  if (abnormal) {
    const conds = [{ $eq: ['$$t.is_abnormal', true] }];
    if (testTypes.length) conds.push({ $in: ['$$t.test_type', testTypes] });
    pipeline.push({
      $addFields: {
        tests_performed: { $filter: { input: '$tests_performed', as: 't', cond: { $and: conds } } },
      },
    });
  }
  pipeline.push({ $sort: { date_published: -1 } }, { $limit: limit });
  return reports().aggregate(pipeline).toArray();
}

// Test types this patient actually has (fills the filter dropdown)
async function getTestTypes(patientId) {
  const types = await reports().distinct('tests_performed.test_type', {
    patient_id: patientId,
    status: 'approved',
  });
  return types.sort();
}

module.exports = {
  searchReports, getTestTypes, getReportForSystem, publishReport, getLatestReports, browseReports, filterByTestType,
  getAbnormalResults, getReportById, getHistory, getReportForDownload,
  getTestTrend, markReportAccessed,
};
