const nodemailer = require('nodemailer');
const dayjs = require('dayjs');

let cachedTransporter;
let cachedMeta;

async function resolveTransporter() {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, meta: cachedMeta };
  }

  if (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 587,
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    cachedMeta = { type: 'custom' };
    return { transporter: cachedTransporter, meta: cachedMeta };
  }

  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  cachedMeta = { type: 'ethereal' };
  return { transporter: cachedTransporter, meta: cachedMeta };
}

async function sendSubmissionReceipt(event) {
  if (!event || !event.leader_email) {
    return null;
  }

  const { transporter, meta } = await resolveTransporter();

  const nurtures = event.nurtures && event.nurtures.length > 0 ? event.nurtures.join(', ') : 'N/A';
  const improvements = event.improvement_areas && event.improvement_areas.length > 0 ? event.improvement_areas.join(', ') : 'N/A';

  const formattedDate = event.activity_date ? dayjs(event.activity_date).format('MMMM D, YYYY') : 'N/A';

  const html = `
    <p>Hi ${event.leader_names},</p>
    <p>Thank you for submitting the Narra Nueva Activity Tracker Form. Here is a summary of your activity:</p>
    <ul>
      <li><strong>Title:</strong> ${event.title}</li>
      <li><strong>Date:</strong> ${formattedDate}</li>
      <li><strong>Venue:</strong> ${event.venue}</li>
      <li><strong>Nurtures:</strong> ${nurtures}</li>
      <li><strong>Aims:</strong> ${event.aims}</li>
      <li><strong>Impact Summary:</strong> ${event.impact_summary}</li>
      <li><strong>Primary Beneficiaries:</strong> ${event.primary_beneficiaries}</li>
      <li><strong>Secondary Beneficiaries:</strong> ${event.secondary_beneficiaries} (${event.secondary_beneficiaries_count})</li>
      <li><strong>Areas for Improvement:</strong> ${improvements}</li>
      <li><strong>Improvement Actions:</strong> ${event.improvement_actions}</li>
    </ul>
    <p>You can return to the tracker to review or update this activity at any time.</p>
    <p>Regards,<br/>PEPPI Narra Nueva ATF</p>
  `;

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@peppi.local',
    to: event.leader_email,
    subject: `Copy of your Narra Nueva ATF submission: ${event.title}`,
    html,
  });

  if (meta.type === 'ethereal') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.info(`Email preview available at: ${previewUrl}`);
    }
  }

  return info;
}

module.exports = {
  sendSubmissionReceipt,
};
