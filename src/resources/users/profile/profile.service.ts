import { BadRequestException, ConflictException, NotFoundException } from "../../../common/errors";
import { PaginatedResponse, PaginationParams } from "../../../lib/types";
import { IProfile, Profile } from "./profile.model";



export class ProfileService {
  public async getProfile(userId: string) {
    try {
      const userProfile = await Profile.findOne({ userId: userId });
      return userProfile;
    } catch (error) {
      throw error;
    }
  }

  public async getAllProfiles(params: PaginationParams = {}): Promise<PaginatedResponse<IProfile>> {
    try {
      const page = Math.max(1, params.page || 1);
      const limit = Math.max(1, params.limit || 10);
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        Profile.find({})
          .skip(skip)
          .limit(limit)
          .exec(),
        Profile.countDocuments({})
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw error;
    }
  }

  public async updateProfile(userId: string, updateData: Partial<IProfile>) {
    try {
      if (!userId || !updateData) {
        throw new BadRequestException('Invalid input parameters');
      }
  
      const updatedProfile = await Profile.findOneAndUpdate(
        { userId },
        { 
          $set: {
            ...updateData,
            userId
          }
        },
        { 
          new: true,
          runValidators: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );
  
      if (!updatedProfile) {
        throw new Error('Failed to update or create profile');
      }
  
      return updatedProfile;
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }
      if (error.code === 11000) {
        throw new ConflictException('Duplicate key error');
      }
      throw error;
    }
  }
}

export const profileService = new ProfileService()
