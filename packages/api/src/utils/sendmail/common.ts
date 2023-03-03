/**
 * Sendmail: Confirmation Email (Registration or AddEmail)
 */

import chalk from 'chalk';
import nodemailer from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';

import configLoader from '../../config/config-loader';
import { isStagingMode, isTestMode } from '../environment';
import log from '../log';

const { config } = configLoader;

export const sendmail = async (
  to: string | string[],
  subject: string,
  html: string,
  altMessage: string,
  attachments?: Attachment[],
): Promise<boolean> => {
  try {
    const { host, port, secure, authUser, authPass, sender } = config.smtp;
    if (!host || !port || !authUser || !authPass || !sender) throw 'invalid SMTP setting';

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user: authUser, pass: authPass } });

    // for JEST test, no need to send email
    isStagingMode || isTestMode
      ? console.info(`${chalk.blueBright('Sending Email in JEST')} ${chalk.yellow(altMessage)}`) // eslint-disable-line no-console
      : await transporter.sendMail({ from: sender, to, subject, html, attachments });

    return true;
  } catch (error) {
    log('warn', `FAIL to sendmail ${altMessage}`, error);
    return false;
  }
};
