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

export interface IFileUploadProvider {
  uploadFile(file: Express.Multer.File): Promise<any>;
  deleteFile(publicId: string): Promise<any>;
}
