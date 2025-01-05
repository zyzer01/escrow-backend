import { BadRequestException, NotFoundException } from "../common/errors";
import { StringConstants } from "../common/strings";
import { IFileUploadProvider } from "../lib/utils/interface";
import User from "../resources/users/user.model";
import { CloudinaryUploadProvider } from "./file-upload.provider";

export class FileUploadService {
  private uploadProvider: IFileUploadProvider;

  constructor(uploadProvider: IFileUploadProvider = new CloudinaryUploadProvider()) {
    this.uploadProvider = uploadProvider;
  }
  async uploadFile(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("No file provided for upload");
    }
  
    const uploadResponse = await this.uploadProvider.uploadFile(file);

    const uploadedFileUrl = uploadResponse.secure_url;
  
    const user = await User.findByIdAndUpdate(
      userId,
      { image: uploadedFileUrl  },
      { new: true }
    );
  
    return uploadedFileUrl;
  }
  

  async deleteFile(publicId: string) {
    return this.uploadProvider.deleteFile(publicId);
  }
}


export const fileUploadService = new FileUploadService();
