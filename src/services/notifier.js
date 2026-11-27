// src/services/notifier.js - sends an alert via the chosen channel (mocked, no network needed)
// Returns true on success, false on failure so the caller can record Sent/Failed (AP-04).
const nodemailer = require('nodemailer');

// Demo switch: while true, every send fails (toggled by the lab simulator route).
let forceFail = false;
function setForceFail(value) { forceFail = Boolean(value); }
function isForceFail() { return forceFail; }

// jsonTransport builds the email without sending it; set SMTP_HOST to use a real sandbox (e.g. Mailtrap).
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : nodemailer.createTransport({ jsonTransport: true });

async function sendNotification({ method, patient, notification }) {
  try {
    if (forceFail) throw new Error('Simulated delivery failure');

    if (method === 'email') {
      await transporter.sendMail({
        from: 'results@lis-portal.local',
        to: patient.email,
        subject: notification.is_urgent ? 'Urgent: your lab results are ready' : 'Your lab results are ready',
        text: notification.content,
      });
    } else if (method === 'sms') {
      console.log(`[SMS -> ${patient.phone_number}] ${notification.content}`);
    } else {
      throw new Error(`Unknown notification method: ${method}`);
    }

    console.log(`[notifier] ${method} sent to ${patient.patient_id} (${notification.notification_id})`);
    return true;
  } catch (err) {
    console.warn(`[notifier] ${method} FAILED for ${patient.patient_id} (${notification.notification_id}): ${err.message}`);
    return false;
  }
}

module.exports = { sendNotification, setForceFail, isForceFail };
