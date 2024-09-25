import User, { IUser } from './user.model';

export async function getAllUsers(): Promise<IUser[]> {
    return User.find();
}

export async function getUser(id: string): Promise<IUser | null> {
    return User.findById(id);
}

export async function createUser(userData: IUser): Promise<IUser> {
    const newUser = new User(userData)
    return newUser.save()
}

export async function updateUser(id: string, userData: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, userData)
}

export async function deleteUser(id: string): Promise<IUser | null> {
    return User.findByIdAndDelete(id)
}

export async function isUsernameTaken(username: string): Promise<boolean> {
    const user = await User.findOne({ username });
    return !!user;
  }
  