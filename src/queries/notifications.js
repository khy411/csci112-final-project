// src/queries/notifications.js - notifications collection (AP-03, AP-04, AP-05, AP-14, AP-15)
// Skeleton assumption: `status` = delivery state ("Pending" | "Sent" | "Failed"),
// `is_read` = whether the patient has opened it. Update validators.js if you change this.
const { getDb } = require('../db');
const notifications = () => getDb().collection('notifications');

// AP-03: create a notification when a report is published
async function createNotification({ reportId, patientId, method, isUrgent }) {
  // pending: generate notification_id; set content, timestamp: new Date(), status: "Pending", is_read: false
  throw new Error('TODO: AP-03');
}

// AP-04: record whether sending succeeded or failed
async function setDeliveryStatus(notificationId, status) {
  // pending: only allow "Sent" or "Failed"
  return notifications().updateOne(
    { notification_id: notificationId },
    { $set: { status } }
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
  // pending: countDocuments({ patient_id, is_read: false })
  throw new Error('TODO: AP-14 unread count');
}

// AP-15: mark as read (include patient_id so one patient cannot touch another's)
async function markAsRead(patientId, notificationId) {
  // pending: updateOne({ notification_id, patient_id }, { $set: { is_read: true } })
  throw new Error('TODO: AP-15');
}

module.exports = {
  createNotification, setDeliveryStatus, findFailedNotifications,
  getNotifications, countUnread, markAsRead,
};
