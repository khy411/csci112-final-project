// src/services/publishService.js - Lab Result Publication and Patient Notification
const reports = require('../queries/reports');
const patientsQ = require('../queries/patients');
const notifications = require('../queries/notifications');
const { sendNotification } = require('./notifier');

async function publishAndNotify(reportId) {
  const existing = await reports.getReportForSystem(reportId);
  if (!existing) throw new Error(`Report ${reportId} not found`);

  // AP-01 / AP-02: release every test of the order at once
  const result = await reports.publishReport(reportId);
  if (result.modifiedCount === 0) {
    return { published: false, reason: 'Report is not pending or has tests without results' };
  }

  const report = await reports.getReportForSystem(reportId);
  const patient = await patientsQ.findPatientById(report.patient_id);
  if (!patient) throw new Error(`Patient ${report.patient_id} not found`);

  // urgent if any embedded test is abnormal
  const isUrgent = report.tests_performed.some((t) => t.is_abnormal === true);
  const method = patient.notification_method;

  // AP-03: create the notification
  const notification = await notifications.createNotification({
    reportId,
    patientId: patient.patient_id,
    method,
    isUrgent,
  });

  // send, then AP-04: record Sent or Failed
  const ok = await sendNotification({ method, patient, notification });
  const status = ok ? 'Sent' : 'Failed';
  await notifications.setDeliveryStatus(notification.notification_id, status);

  return { published: true, report_id: reportId, notification_id: notification.notification_id, status };
}

module.exports = { publishAndNotify };
