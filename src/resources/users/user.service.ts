import User, { IUser } from './user.model';

const allowedFields = ['username', 'email', 'firstName', 'lastName'];
const MAX_FIELDS = 5;

export async function getAllUsers(): Promise<IUser[]> {
  return User.find();
}

export async function getUser(id: string, fields?: string): Promise<IUser | null> {
  const fieldsArray = fields ? fields.split(',') : [];

  if (fieldsArray.length > MAX_FIELDS) {
    throw new Error(`You can request a maximum of ${MAX_FIELDS} fields.`);
  }

  const selectFields = fieldsArray
    .filter(field => allowedFields.includes(field))
    .join(' ');

  return User.findById(id).select(selectFields);
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


export async function searchUsers(username: string): Promise<IUser[] | null> {
  return User.find({ username: { $regex: username, $options: 'i' } })
    .select('id username firstName lastName')
    .limit(10);
}


export async function isUsernameTaken(username: string): Promise<boolean> {
  const normalizedUsername = username.toLowerCase();
  const user = await User.findOne({ username: normalizedUsername }, { _id: 1 }).lean();
  return !!user;
}
