// src/routes/auth.js - Patient Authentication and Session Start (AP-06)
const express = require('express');
const bcrypt = require('bcrypt');
const { authenticator } = require('otplib');
const { findPatientForLogin } = require('../queries/patients');

const router = express.Router();

router.get('/login', (req, res) => res.render('login', { error: null }));

router.post('/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const mfaCode = String(req.body.mfaCode || '').trim();

  // one generic message so attackers can't tell which factor was wrong
  const reject = () =>
    res.status(401).render('login', { error: 'Invalid email, password, or MFA code' });

  try {
    // AP-06: find the account
    const patient = await findPatientForLogin(email);
    if (!patient) return reject();

    // check password
    if (!(await bcrypt.compare(password, patient.password_hash))) return reject();

    // check MFA (DEMO_MFA_CODE is an optional fixed code for demo day)
    const demoOk = process.env.DEMO_MFA_CODE && mfaCode === process.env.DEMO_MFA_CODE;
    const totpOk = patient.mfa_secret && authenticator.check(mfaCode, patient.mfa_secret);
    if (!demoOk && !totpOk) return reject();

    // verified: start a fresh session
    req.session.regenerate((err) => {
      if (err) return reject();
      req.session.patientId = patient.patient_id;
      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('login', { error: 'Something went wrong. Please try again.' });
  }
});

router.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

module.exports = router;
