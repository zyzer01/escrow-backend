import User from "../user.model";


export class profileService {
  public async getProfile(userId: string) {
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      throw error;
    }
  }

  public async updateProfile(userId: string, profile: Profile) {
    try {
      const updatedProfile = await User.findByIdAndUpdate(userId, profile, { new: true });
      return updatedProfile;
    } catch (error) {
      throw error;
    }
  }

  public async deleteProfile(userId: string) {
    try {
      const deletedProfile = await User.findByIdAndDelete(userId);
      return deletedProfile;
    } catch (error) {
      throw error;
    }
  }
}
