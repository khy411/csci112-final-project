// seed/seed.js - rebuild the database from scratch: npm run seed
require('dotenv').config();
const bcrypt = require('bcrypt');
const { connect, close } = require('../src/db');
const validators = require('./validators');
const { createIndexes } = require('./indexes');

async function run() {
  const db = await connect();

  // 1. drop + recreate collections with validators
  for (const name of ['patients', 'reports', 'notifications']) {
    await db.collection(name).drop().catch(() => {});
    await db.createCollection(name, { validator: validators[name] });
  }

  // 2. indexes
  await createIndexes(db);

  // 3. hand-written demo patient (P-000001) so the demo is predictable
  await db.collection('patients').insertOne({
    patient_id: 'P-000001',
    last_name: 'Rugeria',
    first_name: 'Kiko',
    sex: 'Male',
    date_of_birth: new Date('1996-01-01T00:00:00Z'),
    height: 180,
    weight: 65,
    email: 'kikorugeria@gmail.com',
    phone_number: '0000-000-0000',
    password_hash: await bcrypt.hash('demo-password', 10),
    mfa_secret: 'TODO-base32-secret',
    notification_method: 'email',
  });

  // pending: hand-written reports for P-000001 (normal, abnormal, multi-test, unaccessed, one 'pending' for the live publish demo)
  // pending: hand-written notifications (Sent, Failed, unread, read)
  // pending: bulk filler with @faker-js/faker (15-20 patients, 40+ reports)

  console.log('Seed complete');
  await close();
}

run().catch((e) => { console.error(e); process.exit(1); });
