import { Attachment } from 'nodemailer/lib/mailer';

export interface ISendMail {
  to: string | string[];
  subject: string;
  template: string;
  params?: {
    [key: string]: any;
  };
  attachments?: Attachment[];
}
