// seed/validators.js - $jsonSchema validators (skeleton; tighten as the schema is finalized)
const patients = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['patient_id', 'last_name', 'first_name', 'email', 'password_hash', 'notification_method'],
    properties: {
      patient_id: { bsonType: 'string' },
      email: { bsonType: 'string' },
      password_hash: { bsonType: 'string' },
      date_of_birth: { bsonType: 'date' },
      notification_method: { enum: ['email', 'sms'] },
      // TODO: sex, height, weight, phone_number, mfa_secret
    },
  },
};

const reports = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['report_id', 'patient_id', 'tests_performed', 'status'],
    properties: {
      report_id: { bsonType: 'string' },
      patient_id: { bsonType: 'string' },
      status: { enum: ['pending', 'approved'] },
      date_published: { bsonType: 'date' },
      report_accessed: { bsonType: 'bool' },
      tests_performed: {
        bsonType: 'array',
        minItems: 1,
        // TODO: items schema: test_id, test_type, performed_by{}, date_performed, test_result, is_abnormal
      },
    },
  },
};

const notifications = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['notification_id', 'report_id', 'patient_id', 'method', 'status', 'timestamp'],
    properties: {
      notification_id: { bsonType: 'string' },
      method: { enum: ['email', 'sms'] },
      status: { enum: ['Pending', 'Sent', 'Failed'] },
      is_read: { bsonType: 'bool' },
      is_urgent: { bsonType: 'bool' },
      timestamp: { bsonType: 'date' },
    },
  },
};

module.exports = { patients, reports, notifications };
