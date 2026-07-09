/* SMTP delivery doctor — diagnoses OTP mail without exposing secrets.
   Usage:  node scripts/smtp-doctor.js [recipient@domain]
   Reads backend/.env, masks credentials, tests connectivity + auth,
   then sends ONE test email and prints the raw SMTP transaction. */
require('dotenv').config();
const net = require('net');
const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
const port = Number(SMTP_PORT) || 587;
const recipient = process.argv[2] || SMTP_USER;

function mask(v) {
  if (!v) return '(not set)';
  if (v.length <= 4) return '*'.repeat(v.length);
  return v.slice(0, 2) + '*'.repeat(Math.max(2, v.length - 4)) + v.slice(-2);
}
function fromAddr(v) {
  const m = /<([^>]+)>/.exec(v || '');
  return (m ? m[1] : v || '').trim().toLowerCase();
}

async function main() {
  console.log('\n========== STEP 2: CONFIG ==========');
  console.log('SMTP_HOST :', SMTP_HOST || '(not set)');
  console.log('SMTP_PORT :', SMTP_PORT || '(not set)', '→ secure(TLS-on-connect):', port === 465);
  console.log('SMTP_USER :', mask(SMTP_USER));
  console.log('SMTP_PASS :', SMTP_PASS ? `set, length ${SMTP_PASS.length}` : '(not set)');
  console.log('SMTP_FROM :', SMTP_FROM || '(not set — code will default to no-reply@driveittech.in)');

  if (!SMTP_HOST) {
    console.log('\n❌ SMTP_HOST is empty → the app is in DEV MODE (OTP only printed to console, never emailed).');
    return;
  }

  const isZoho = /zoho\./i.test(SMTP_HOST);
  console.log('\nProvider looks like Zoho:', isZoho, isZoho ? `(${SMTP_HOST})` : '');

  console.log('\n========== STEP 4: FROM vs AUTH MAILBOX ==========');
  const from = fromAddr(SMTP_FROM) || 'no-reply@driveittech.in';
  const user = (SMTP_USER || '').toLowerCase();
  console.log('Envelope FROM :', from);
  console.log('Auth mailbox  :', mask(user));
  if (from !== user) {
    console.log('⚠️  MISMATCH — Zoho will reject/drop mail unless FROM is the authenticated mailbox or a verified alias.');
  } else {
    console.log('✔  FROM matches the authenticated mailbox.');
  }

  console.log('\n========== STEP 6: TCP REACHABILITY ==========');
  await new Promise((resolve) => {
    const sock = net.connect({ host: SMTP_HOST, port, timeout: 8000 });
    let banner = '';
    sock.on('connect', () => console.log(`✔  TCP connected to ${SMTP_HOST}:${port}`));
    sock.on('data', (d) => { banner += d.toString(); if (banner.includes('\n')) { console.log('   banner:', banner.trim().split('\n')[0]); sock.end(); } });
    sock.on('timeout', () => { console.log(`❌ TIMEOUT connecting to ${SMTP_HOST}:${port} — outbound firewall likely blocks this port.`); sock.destroy(); resolve(); });
    sock.on('error', (e) => { console.log(`❌ CONNECT ERROR: ${e.message}`); resolve(); });
    sock.on('close', () => resolve());
  });

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    logger: true,   // raw SMTP conversation → Step 3
    debug: true,
  });

  console.log('\n========== STEP 7: AUTH (verify) ==========');
  try {
    await transporter.verify();
    console.log('✔  AUTH OK — credentials accepted, server ready.');
  } catch (e) {
    console.log('❌ AUTH/CONNECT FAILED');
    console.log('   message      :', e.message);
    console.log('   responseCode :', e.responseCode, '| code:', e.code, '| command:', e.command);
    if (e.responseCode === 535) console.log('   → 535 = bad credentials. With 2FA on, you MUST use a Zoho app-specific password, not the login password.');
    return;
  }

  console.log(`\n========== STEP 3: REAL SEND → ${recipient} ==========`);
  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || `DriveIT Portal <${SMTP_USER}>`,
      to: recipient,
      subject: 'SMTP doctor test — please ignore',
      text: 'If you can read this, OTP delivery works.',
    });
    console.log('✔  SEND ACCEPTED by server');
    console.log('   messageId :', info.messageId);
    console.log('   accepted  :', info.accepted);
    console.log('   rejected  :', info.rejected);
    console.log('   response  :', info.response);
    console.log(`\n➡  Now check the inbox (and Spam/Junk) of ${recipient} in Zoho webmail.`);
  } catch (e) {
    console.log('❌ SEND FAILED');
    console.log('   message      :', e.message);
    console.log('   responseCode :', e.responseCode, '| code:', e.code, '| command:', e.command);
  } finally {
    transporter.close();
  }
}

main().catch((e) => { console.error('doctor crashed:', e); process.exit(1); });
