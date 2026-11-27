// src/jobs/retryNotifications.js - retry timer (AP-05 -> same send step as AP-03/04)
const cron = require('node-cron');
const notifications = require('../queries/notifications');
const patientsQ = require('../queries/patients');
const { sendNotification } = require('../services/notifier');

const MAX_ATTEMPTS = 5; // stop retrying a notification after this many total tries
let running = false;    // prevents overlapping runs if a pass takes longer than the interval

async function retryFailed() {
  if (running) return { skipped: true };
  running = true;
  const summary = { checked: 0, sent: 0, stillFailed: 0, gaveUp: 0 };
  try {
    // AP-05: find failed notifications
    const failed = await notifications.findFailedNotifications();
    for (const n of failed) {
      summary.checked++;
      if ((n.attempts || 0) >= MAX_ATTEMPTS) { summary.gaveUp++; continue; }

      const patient = await patientsQ.findPatientById(n.patient_id);
      if (!patient) continue;

      // same send step, then AP-04: record the outcome
      const ok = await sendNotification({ method: n.method, patient, notification: n });
      await notifications.setDeliveryStatus(n.notification_id, ok ? 'Sent' : 'Failed');
      if (ok) summary.sent++; else summary.stillFailed++;
    }
    if (summary.checked > 0) console.log('[retry]', summary);
    return summary;
  } catch (err) {
    console.error('[retry] error', err);
    return summary;
  } finally {
    running = false;
  }
}

function start() {
  cron.schedule(process.env.RETRY_CRON || '*/1 * * * *', retryFailed);
}

module.exports = { start, retryFailed };
