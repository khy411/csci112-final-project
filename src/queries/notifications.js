// src/queries/notifications.js - notifications collection (AP-03, AP-04, AP-05, AP-14, AP-15)
// `status` = delivery state ("Pending" | "Sent" | "Failed"); `is_read` = patient opened it.
const { getDb } = require('../db');
const notifications = () => getDb().collection('notifications');

// Next id like N-000042. The unique index on notification_id guards against races.
async function nextNotificationId() {
  const [last] = await notifications()
    .find({}, { projection: { notification_id: 1 } })
    .sort({ notification_id: -1 })
    .limit(1)
    .toArray();
  const n = last ? parseInt(last.notification_id.split('-')[1], 10) + 1 : 1;
  return `N-${String(n).padStart(6, '0')}`;
}

// AP-03: create a notification when a report is published. Returns the new document.
async function createNotification({ reportId, patientId, method, isUrgent }) {
  const doc = {
    notification_id: await nextNotificationId(),
    report_id: reportId,
    patient_id: patientId,
    method,
    content: isUrgent
      ? 'Your test results are ready. Some values are flagged as abnormal, please review them.'
      : 'We would like to inform you that your test results are ready.',
    is_urgent: Boolean(isUrgent),
    timestamp: new Date(),
    status: 'Pending',
    is_read: false,
    attempts: 0,
  };
  await notifications().insertOne(doc);
  return doc;
}

// AP-04: record whether sending succeeded or failed (also counts the attempt)
async function setDeliveryStatus(notificationId, status) {
  if (!['Sent', 'Failed'].includes(status)) {
    throw new Error('Delivery status must be "Sent" or "Failed"');
  }
  return notifications().updateOne(
    { notification_id: notificationId },
    { $set: { status }, $inc: { attempts: 1 } }
  );
}

// AP-05: find failed notifications so they can be retried
async function findFailedNotifications() {
  return notifications().find({ status: 'Failed' }).toArray();
}

// AP-14: patient's notifications (newest first) + unread count
async function getNotifications(patientId) {
  return notifications().find({ patient_id: patientId }).sort({ timestamp: -1 }).toArray();
}

async function countUnread(patientId) {
  return notifications().countDocuments({ patient_id: patientId, is_read: false });
}

// AP-15: mark as read (patient_id stops one patient touching another's notification)
async function markAsRead(patientId, notificationId) {
  return notifications().updateOne(
    { notification_id: notificationId, patient_id: patientId },
    { $set: { is_read: true } }
  );
}

module.exports = {
  createNotification, setDeliveryStatus, findFailedNotifications,
  getNotifications, countUnread, markAsRead,
};
