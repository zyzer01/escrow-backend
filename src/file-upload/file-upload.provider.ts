import { IFileUploadProvider } from '../lib/utils/interface';
import cloudinary from '../config/cloudinary.config';

export class CloudinaryUploadProvider implements IFileUploadProvider {
  async uploadFile(file: Express.Multer.File): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: 'auto' }, (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }).end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }
}
