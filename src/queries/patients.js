// src/queries/patients.js - patients collection (AP-06, AP-16)
const { getDb } = require('../db');
const patients = () => getDb().collection('patients');

// AP-06: find account by email so the app can verify password + MFA
async function findPatientForLogin(email) {
  return patients().findOne(
    { email },
    { projection: { patient_id: 1, password_hash: 1, mfa_secret: 1, notification_method: 1 } }
  );
}

// Lookup by id for the publish service, retry job and settings page.
// Never returns the password hash or MFA secret.
async function findPatientById(patientId) {
  return patients().findOne(
    { patient_id: patientId },
    { projection: { password_hash: 0, mfa_secret: 0 } }
  );
}

// AP-16: change preferred notification channel ("email" | "sms")
async function updateNotificationMethod(patientId, method) {
  if (!['email', 'sms'].includes(method)) {
    throw new Error('Notification method must be "email" or "sms"');
  }
  return patients().updateOne(
    { patient_id: patientId },
    { $set: { notification_method: method } }
  );
}

module.exports = { findPatientForLogin, findPatientById, updateNotificationMethod };
