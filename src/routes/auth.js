// src/routes/auth.js - Patient Authentication and Session Start (AP-06)
const express = require('express');
const bcrypt = require('bcrypt');
const { authenticator } = require('otplib');
const { findPatientForLogin } = require('../queries/patients');

const router = express.Router();

router.get('/login', (req, res) => res.render('login', { error: null }));

router.post('/login', async (req, res) => {
  const { email, password, mfaCode } = req.body;
  // pending 1. patient = await findPatientForLogin(email)
  // pending 2. bcrypt.compare(password, patient.password_hash)
  // pending 3. authenticator.check(mfaCode, patient.mfa_secret)   (or a fixed demo code)
  // pending 4. verified -> req.session.patientId = patient.patient_id; redirect('/')
  //         not verified -> render('login', { error: 'Invalid credentials or MFA code' })
  res.render('login', { error: 'TODO' });
});

router.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

module.exports = router;
