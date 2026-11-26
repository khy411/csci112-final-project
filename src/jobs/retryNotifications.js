// src/jobs/retryNotifications.js - retry timer (AP-05 -> same send step)
const cron = require('node-cron');
const notifications = require('../queries/notifications');
const { sendNotification } = require('../services/notifier');

async function retryFailed() {
  const failed = await notifications.findFailedNotifications();
  for (const n of failed) {
    // pending: load the patient, call sendNotification, then setDeliveryStatus(n.notification_id, ok ? 'Sent' : 'Failed')
  }
}

function start() {
  cron.schedule(process.env.RETRY_CRON || '*/1 * * * *', retryFailed);
}

module.exports = { start, retryFailed };
