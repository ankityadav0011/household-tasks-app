const nodemailer = require('nodemailer');

/**
 * Sends OTP emails.
 * - If SMTP_HOST is set: uses that SMTP server (e.g. Mailpit, Gmail SMTP).
 * - Otherwise: creates a free Ethereal test inbox and prints a preview link in the console.
 */
function createMailer(config) {
  let transporterPromise = null;

  function getTransporter() {
    if (!transporterPromise) {
      transporterPromise = (async () => {
        if (config.smtp.host) {
          return nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
          });
        }
        const account = await nodemailer.createTestAccount();
        console.log(`[mail] Using Ethereal test inbox (${account.user})`);
        return nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass },
        });
      })().catch((err) => {
        transporterPromise = null; // allow a retry on the next call
        throw err;
      });
    }
    return transporterPromise;
  }

  async function sendOtpEmail(to, code) {
    const minutes = Math.round(config.otp.ttlMs / 60000);
    if (config.logOtpToConsole) console.log(`[mail] (dev) OTP for ${to}: ${code}`);
    try {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from: config.smtp.from,
        to,
        subject: 'Your PadosiPro verification code',
        text: `Your PadosiPro verification code is ${code}. It expires in ${minutes} minutes. If you did not request this, you can ignore this email.`,
        html: `<p>Your PadosiPro verification code is:</p><p style="font-size:28px;letter-spacing:6px"><b>${code}</b></p><p>It expires in ${minutes} minutes. If you did not request this, you can ignore this email.</p>`,
      });
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log(`[mail] Preview the email here: ${preview}`);
    } catch (err) {
      if (config.logOtpToConsole) {
        console.warn(`[mail] Could not send email (${err.message}). Use the OTP logged above.`);
        return;
      }
      throw err;
    }
  }

  return { sendOtpEmail };
}

module.exports = { createMailer };
