// TODO

/**
 * Sendmail: Reset Password
 */

import Mail from 'nodemailer/lib/mailer';

import type { Id, UserDocument } from '../../models/user';

export default (transporter: Mail, sender: string, isJest = false) =>
  async (user: UserDocument & Id, email: string, token: string, expiresBy: Date): Promise<void> => {
    if (isJest) return; // for JEST test, no need to send email

    console.log('TODO: ', token);
    // const { name, locale } = user;

    const title = 'TODO: title';
    const tableContent = 'TODO: table Content';

    const html = `
     <html>
       <head>
         <style>
         table {
           font-family: arial, sans-serif;
           border-collapse: collapse;
           width: 100%;
         }

         td, th {
           border: 1px solid #dddddd;
           text-align: left;
           padding: 8px;
         }

         tr:nth-child(even) {
           background-color: #dddddd;
         }
         </style>
       </head>
       <body><center>
         <h1>Confirm ${title}</h1><br>

         <table>
           <tr>
             <th>domain</th>
             <th>level</th>
             <th>ip</th>
             <th>PM2/React</th>
             <th>userAgent</th>
             <th>message</th>
             <th>timestamp</th>
           </tr>
           ${tableContent}
         </table>

         <h4>This is computer-generated report, do NOT reply to this email address </h4>

       </center></body>
     </html>
   `;

    const message = {
      from: sender,
      to: email,
      subject: `Email Confirmation TODO`,
      html,
      // attachments: 'TODO: attach excel file, considering using npm xlsx'
    };

    await transporter.sendMail(message);
  };
