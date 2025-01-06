import { NextFunction, Request, Response } from 'express';
import { fileUploadService } from './file-upload.service';

export class FileUploadController {

  public async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded or invalid file type' });
      }
      console.log(req.file.path)

      const result = await fileUploadService.uploadFile(userId, req.file);
      return res.status(200).json(result);
    } catch (error) {
      next(error)
    }
  };

  public async deleteFile(req: Request, res: Response) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({ message: 'No file ID provided' });
      }

      await fileUploadService.deleteFile(publicId);
      return res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Error deleting file', error });
    }
  };
}

export const fileUploadController = new FileUploadController()
