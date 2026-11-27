// seed/seed.js - rebuild the database from scratch: npm run seed
require('dotenv').config();
const bcrypt = require('bcrypt');
const { faker } = require('@faker-js/faker');
const { connect, close } = require('../src/db');
const validators = require('./validators');
const { createIndexes } = require('./indexes');

faker.seed(2026); // same data every run

const DEMO_PASSWORD = 'demo-password';
const MFA_SECRET = 'JBSWY3DPEHPK3PXP'; // demo only; every seeded patient shares it
const TEST_TYPES = ['CBC', 'Urinalysis', 'Lipid Panel', 'Blood Glucose'];
const EMPLOYEES = [
  { employee_id: 'E-000001', last_name: 'Francisco', first_name: 'Maiko' },
  { employee_id: 'E-000002', last_name: 'Reyes', first_name: 'Ana' },
  { employee_id: 'E-000003', last_name: 'Santos', first_name: 'Luis' },
];

let testCounter = 0;
let reportCounter = 100; // R-000001..R-000099 are reserved for hand-written demo reports
let notifCounter = 4;    // N-000001..N-000004 are hand-written

const pad = (prefix, n) => `${prefix}-${String(n).padStart(6, '0')}`;
const num = (min, max, d = 1) => faker.number.float({ min, max, fractionDigits: d });

const row = (name, value, unit, ref, flag = '') => ({ name, value, unit, ref, flag });

function buildResult(type, abnormal) {
  switch (type) {
    case 'CBC':
      return [
        row('Hemoglobin', abnormal ? num(8.5, 11.0) : num(12.5, 15.8), 'g/dL', '12.0-16.0', abnormal ? 'L' : ''),
        row('WBC', num(4.5, 10.5), '10^9/L', '4.0-11.0'),
        row('Platelets', abnormal ? num(80, 140, 0) : num(160, 400, 0), '10^9/L', '150-400', abnormal ? 'L' : ''),
      ];
    case 'Urinalysis':
      return [
        row('Color', 'Yellow', '', 'Yellow'),
        row('Protein', abnormal ? '2+' : 'Negative', '', 'Negative', abnormal ? 'H' : ''),
        row('pH', num(5.0, 7.5), '', '4.5-8.0'),
      ];
    case 'Lipid Panel':
      return [
        row('Total cholesterol', abnormal ? num(240, 300, 0) : num(150, 195, 0), 'mg/dL', '<200', abnormal ? 'H' : ''),
        row('LDL', abnormal ? num(160, 200, 0) : num(70, 120, 0), 'mg/dL', '<130', abnormal ? 'H' : ''),
        row('HDL', num(45, 70, 0), 'mg/dL', '>40'),
        row('Triglycerides', num(70, 145, 0), 'mg/dL', '<150'),
      ];
    case 'Blood Glucose':
      return [row('Fasting glucose', abnormal ? num(130, 200, 0) : num(75, 98, 0), 'mg/dL', '70-99', abnormal ? 'H' : '')];
    default:
      return [];
  }
}

function buildTest(type, abnormal, date, employee = faker.helpers.arrayElement(EMPLOYEES)) {
  return {
    test_id: pad('T', ++testCounter),
    test_type: type,
    performed_by: employee,
    date_performed: date,
    test_result: buildResult(type, abnormal),
    is_abnormal: abnormal,
  };
}

function buildNotification({ id, report, method, status, isRead }) {
  const urgent = report.tests_performed.some((t) => t.is_abnormal);
  return {
    notification_id: id,
    report_id: report.report_id,
    patient_id: report.patient_id,
    method,
    content: urgent
      ? 'Your test results are ready. Some values are flagged as abnormal, please review them.'
      : 'We would like to inform you that your test results are ready.',
    is_urgent: urgent,
    timestamp: report.date_published,
    status,
    is_read: isRead,
    attempts: status === 'Pending' ? 0 : 1,
  };
}

async function run() {
  const db = await connect();

  // 1. drop + recreate collections with validators
  for (const name of ['patients', 'reports', 'notifications']) {
    await db.collection(name).drop().catch(() => {});
    await db.createCollection(name, { validator: validators[name] });
  }

  // 2. indexes
  await createIndexes(db);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const patients = [];
  const reports = [];
  const notifications = [];

  // 3. demo patient (login: kikorugeria@gmail.com / demo-password)
  patients.push({
    patient_id: 'P-000001',
    last_name: 'Rugeria',
    first_name: 'Kiko',
    sex: 'Male',
    date_of_birth: new Date('1996-01-01T00:00:00Z'),
    height: 180,
    weight: 65,
    email: 'kikorugeria@gmail.com',
    phone_number: '0917-000-0000',
    password_hash: passwordHash,
    mfa_secret: MFA_SECRET,
    notification_method: 'email',
  });

  // 4. hand-written reports for P-000001 (predictable demo)
  const d = (s) => new Date(`${s}T00:00:00Z`);
  const demoReports = [
    { id: 'R-000001', tests: [['CBC', false], ['Urinalysis', false]], performed: '2026-01-14', published: '2026-01-15', accessed: true },   // normal, multi-test
    { id: 'R-000002', tests: [['CBC', true], ['Lipid Panel', true]], performed: '2026-03-09', published: '2026-03-10', accessed: false },   // abnormal + unaccessed (urgent)
    { id: 'R-000003', tests: [['CBC', false]], performed: '2026-06-19', published: '2026-06-20', accessed: true },                          // CBC trend point
    { id: 'R-000004', tests: [['CBC', false], ['Blood Glucose', false]], performed: '2026-09-04', published: '2026-09-05', accessed: false },
  ];
  for (const r of demoReports) {
    reports.push({
      report_id: r.id,
      patient_id: 'P-000001',
      tests_performed: r.tests.map(([type, ab]) => buildTest(type, ab, d(r.performed), EMPLOYEES[0])),
      status: 'approved',
      date_published: d(r.published),
      report_accessed: r.accessed,
    });
  }
  // pending report used for the live "lab approves" step in the demo
  reports.push({
    report_id: 'R-000099',
    patient_id: 'P-000001',
    tests_performed: [buildTest('CBC', false, d('2026-11-20'), EMPLOYEES[0]), buildTest('Urinalysis', false, d('2026-11-20'), EMPLOYEES[0])],
    status: 'pending',
    report_accessed: false,
  });

  // 5. hand-written notifications: Sent+read, Sent+unread+urgent, Failed (retry demo), Sent+unread
  const byId = Object.fromEntries(reports.map((r) => [r.report_id, r]));
  notifications.push(
    buildNotification({ id: 'N-000001', report: byId['R-000001'], method: 'email', status: 'Sent', isRead: true }),
    buildNotification({ id: 'N-000002', report: byId['R-000002'], method: 'email', status: 'Sent', isRead: false }),
    buildNotification({ id: 'N-000003', report: byId['R-000003'], method: 'email', status: 'Failed', isRead: false }),
    buildNotification({ id: 'N-000004', report: byId['R-000004'], method: 'email', status: 'Sent', isRead: false }),
  );

  // 6. bulk filler: P-000002..P-000016
  for (let i = 2; i <= 16; i++) {
    const sex = faker.helpers.arrayElement(['male', 'female']);
    const first = faker.person.firstName(sex);
    const last = faker.person.lastName();
    const patient = {
      patient_id: pad('P', i),
      last_name: last,
      first_name: first,
      sex: sex === 'male' ? 'Male' : 'Female',
      date_of_birth: faker.date.birthdate({ min: 18, max: 85, mode: 'age' }),
      height: faker.number.int({ min: 150, max: 190 }),
      weight: faker.number.int({ min: 45, max: 100 }),
      email: `${first}.${last}${i}@example.com`.toLowerCase().replace(/[^a-z0-9.@]/g, ''),
      phone_number: `09${faker.string.numeric(9)}`,
      password_hash: passwordHash,
      mfa_secret: MFA_SECRET,
      notification_method: faker.helpers.arrayElement(['email', 'sms']),
    };
    patients.push(patient);

    const reportCount = faker.number.int({ min: 2, max: 4 });
    for (let k = 0; k < reportCount; k++) {
      const types = faker.helpers.arrayElements(TEST_TYPES, { min: 1, max: 3 });
      const performed = faker.date.between({ from: '2026-01-01', to: '2026-10-31' });
      const published = new Date(performed.getTime() + 24 * 60 * 60 * 1000);
      const accessed = faker.datatype.boolean({ probability: 0.7 });
      const report = {
        report_id: pad('R', ++reportCounter),
        patient_id: patient.patient_id,
        tests_performed: types.map((t) => buildTest(t, faker.datatype.boolean({ probability: 0.2 }), performed)),
        status: 'approved',
        date_published: published,
        report_accessed: accessed,
      };
      reports.push(report);

      const status = faker.helpers.weightedArrayElement([{ weight: 9, value: 'Sent' }, { weight: 1, value: 'Failed' }]);
      notifications.push(buildNotification({
        id: pad('N', ++notifCounter),
        report,
        method: patient.notification_method,
        status,
        isRead: accessed && status === 'Sent',
      }));
    }
  }

  await db.collection('patients').insertMany(patients);
  await db.collection('reports').insertMany(reports);
  await db.collection('notifications').insertMany(notifications);

  console.log(`Seed complete: ${patients.length} patients, ${reports.length} reports, ${notifications.length} notifications`);
  await close();
}

run().catch((e) => { console.error(e); process.exit(1); });
