import User, { IUser } from './user.model';

const allowedFields = ['username', 'email', 'firstName', 'lastName'];
const MAX_FIELDS = 5;


export class UserService {

  public async getAllUsers(): Promise<IUser[]> {
    return User.find();
  }

  public async getUsers(userId: string): Promise<IUser[] | null> {
    return User.findById(userId);
  }

  public async getUser(id: string, fields?: string): Promise<IUser | null> {
    const fieldsArray = fields ? fields.split(',') : [];

    if (fieldsArray.length > MAX_FIELDS) {
      throw new Error(`You can request a maximum of ${MAX_FIELDS} fields.`);
    }

    const selectFields = fieldsArray
      .filter(field => allowedFields.includes(field))
      .join(' ');

    return User.findById(id).select(selectFields);
  }

  public async createUser(userData: IUser): Promise<IUser> {
    const newUser = new User(userData)
    return newUser.save()
  }

  public async updateUser(id: string, userData: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, userData)
  }

  public async deleteUser(id: string): Promise<IUser | null> {
    return User.findByIdAndDelete(id)
  }


  public async searchUsers(email: string): Promise<IUser[] | null> {
    return User.find({ email: { $regex: email, $options: 'i' } })
      .select('id email name')
      .limit(10);
  }


  public async isUsernameTaken(username: string): Promise<boolean> {
    const normalizedUsername = username.toLowerCase();
    const user = await User.findOne({ username: normalizedUsername }, { _id: 1 }).lean();
    return !!user;
  }

}

export const userService = new UserService()
