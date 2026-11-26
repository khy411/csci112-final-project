// src/queries/patients.js - patients collection (AP-06, AP-16)
const { getDb } = require('../db');
const patients = () => getDb().collection('patients');

// AP-06: find account by email so the app can verify password + MFA
async function findPatientForLogin(email) {
  // pending: return only the fields login needs (patient_id, password_hash, mfa_secret)
  return patients().findOne(
    { email },
    { projection: { patient_id: 1, password_hash: 1, mfa_secret: 1, notification_method: 1 } }
  );
}

// AP-16: change preferred notification channel ("email" | "sms")
async function updateNotificationMethod(patientId, method) {
  // pending: validate method is "email" or "sms" before writing
  return patients().updateOne(
    { patient_id: patientId },
    { $set: { notification_method: method } }
  );
}

module.exports = { findPatientForLogin, updateNotificationMethod };
