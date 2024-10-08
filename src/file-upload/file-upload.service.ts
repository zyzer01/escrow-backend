import { IFileUploadProvider } from "../lib/utils/interface";
import { CloudinaryUploadProvider } from "./file-upload.provider";

export class FileUploadService {
  private uploadProvider: IFileUploadProvider;

  constructor(uploadProvider: IFileUploadProvider = new CloudinaryUploadProvider()) {
    this.uploadProvider = uploadProvider;
  }

  async uploadFile(file: Express.Multer.File) {
    return this.uploadProvider.uploadFile(file);
  }

  async deleteFile(publicId: string) {
    return this.uploadProvider.deleteFile(publicId);
  }
}
