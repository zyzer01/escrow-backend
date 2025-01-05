import { profileService } from './profile.service';
import { NextFunction, Request, Response } from "express";

export class ProfileController {
    public async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id
            const profile = await profileService.getProfile(userId);
            console.log(profile);
            return res.status(200).json(profile);
        } catch (error) {
            next(error);
        }
    }

    public async getAllProfiles(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit } = req.query;
            const paginationParams = {
                page: Number(page),
                limit: Number(limit)
            };
            const result = await profileService.getAllProfiles(paginationParams);
            return res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    public async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            const updateData = req.body;
            const profile = await profileService.updateProfile(userId, updateData);
            return res.status(200).json(profile);
        } catch (error) {
            next(error);
        }
    }
}


export const profileController = new ProfileController();
