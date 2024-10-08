import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ISendMail } from '../lib/utils/interface';
import { generateVerificationCode } from '../lib/utils/auth';

dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 2525;
const SMTP_USERNAME = process.env.SMTP_USERNAME;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME;
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL;

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: {
      user: SMTP_USERNAME,
      pass: SMTP_PASSWORD,
    },
  });

  function loadTemplate(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

export async function sendEmail(options: ISendMail) {
  try {
    const partialsDir = path.join(__dirname, 'templates', 'partials');
    handlebars.registerPartial('header', loadTemplate(path.join(partialsDir, 'header.hbs')));
    handlebars.registerPartial('footer', loadTemplate(path.join(partialsDir, 'footer.hbs')));

    const templatePath = path.join(__dirname, 'templates', `${options.template}.hbs`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateSource);

    const html = compiledTemplate(options.params || {});

    const mailOptions = {
      from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: html,
      attachments: options.attachments || [],
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.response);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
}
