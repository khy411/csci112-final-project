// seed/indexes.js - indexes backing each access pattern
async function createIndexes(db) {
  // AP-06
  await db.collection('patients').createIndex({ email: 1 }, { unique: true });
  await db.collection('patients').createIndex({ patient_id: 1 }, { unique: true });

  // AP-07, 08, 11, 12, 13
  await db.collection('reports').createIndex({ report_id: 1 }, { unique: true });
  await db.collection('reports').createIndex({ patient_id: 1, status: 1, date_published: -1 });
  // AP-09, 10
  await db.collection('reports').createIndex({ patient_id: 1, 'tests_performed.test_type': 1 });
  // TODO: decide on an index for "tests_performed.is_abnormal"

  // AP-14, 15
  await db.collection('notifications').createIndex({ notification_id: 1 }, { unique: true });
  await db.collection('notifications').createIndex({ patient_id: 1, timestamp: -1 });
  // AP-05
  await db.collection('notifications').createIndex({ status: 1 });
}

module.exports = { createIndexes };
