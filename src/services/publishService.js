// src/services/publishService.js - orchestrates Lab Result Publication and Patient Notification
const reports = require('../queries/reports');
const notifications = require('../queries/notifications');
const { sendNotification } = require('./notifier');

async function publishAndNotify(reportId) {
  // pending 1. reports.publishReport(reportId)                      (AP-01/02)
  // pending 2. load report + patient (need patient_id, notification_method)
  // pending 3. notifications.createNotification(...)                (AP-03; is_urgent = any test is_abnormal)
  // pending 4. sendNotification(...) then notifications.setDeliveryStatus(...)  (AP-04)
  throw new Error('TODO: publishAndNotify');
}

module.exports = { publishAndNotify };
