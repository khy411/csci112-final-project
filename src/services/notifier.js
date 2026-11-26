// src/services/notifier.js - sends an alert via the patient's chosen channel (mocked)
// Returns true on success, false on failure so the caller can record Sent/Failed (AP-04).
async function sendNotification({ method, patient, notification }) {
  // pending email: nodemailer with Ethereal/Mailtrap
  // pending sms: console.log mock; support a FORCE_FAIL flag to demo the retry path
  console.log(`[notifier] ${method} -> ${patient.patient_id}: ${notification.content}`);
  return true;
}

module.exports = { sendNotification };