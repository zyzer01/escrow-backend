// src/controllers/fileUploadController.ts

import { Request, Response } from 'express';
import { FileUploadService } from './file-upload.service';

const fileUploadService = new FileUploadService();

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded or invalid file type' });
    }

    const result = await fileUploadService.uploadFile(req.file);
    return res.status(200).json({ message: 'File uploaded successfully', result });
  } catch (error) {
    return res.status(500).json({ message: 'Error uploading file', error });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
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
