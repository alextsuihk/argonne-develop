/**
 * Send Mail Utility
 */

import confirmEmail from './confirm-email';
import jobReport from './job-report';
import resetPassword from './reset-password';
import testEmail from './test-email';
export { EMAIL_TOKEN_PREFIX } from './confirm-email';
export { PASSWORD_TOKEN_PREFIX } from './reset-password';

export default {
  confirmEmail,
  jobReport,
  resetPassword,
  testEmail,
};

// import nodemailer from 'nodemailer';
// import configLoader from '../../config/config-loader';
// import confirmEmailTemplate from './confirm-email';
// import jobReportTemplate from './job-report';
// import resetPasswordTemplate from './reset-password';

// export
// const {
//   host = 'INVALID',
//   port,
//   ssl,
//   user = 'INVALID',
//   pass = 'INVALID',
//   senderName = 'INVALID',
//   senderEmail = 'INVALID',
// } = configLoader.config.smtp;
// const transporter = nodemailer.createTransport({ host, port, secure: ssl, auth: { user, pass } });
// const sender = `"${senderName}" <${senderEmail}>`;

// export default {
//   confirmEmail: confirmEmailTemplate(transporter, sender),
//   jobReport: jobReportTemplate(transporter, sender),
//   resetPassword: resetPasswordTemplate(transporter, sender),
// };
