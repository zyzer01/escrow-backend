import { prisma } from "../../lib/db";
import { IUser } from "./interfaces/users";

const allowedFields = ['username', 'email', 'firstName', 'lastName'];
const MAX_FIELDS = 5;


export class UserService {

  public async getAllUsers() {
    return prisma.user.findMany();
  }

  public async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  public async getUser(id: string, fields?: string) {
    const MAX_FIELDS = 10; // Set a limit for requested fields
    const allowedFields = ['id', 'username', 'name', 'email', 'image', 'role', 'banned', 'banReason', 'banExpires', 'createdAt'];

    const fieldsArray = fields ? fields.split(',') : [];
    if (fieldsArray.length > MAX_FIELDS) {
      throw new Error(`You can request a maximum of ${MAX_FIELDS} fields.`);
    }

    const selectedFields = fieldsArray
      .filter(field => allowedFields.includes(field))
      .reduce((acc, field) => {
        acc[field] = true;
        return acc;
      }, {} as Record<string, boolean>);

    return prisma.user.findUnique({
      where: { id },
      select: Object.keys(selectedFields).length ? selectedFields : undefined,
    });
  }

  public async createUser(userData: { username?: string; name: string; email: string; image?: string; role?: string }) {
    return prisma.user.create({
      data: {
        username: userData.username,
        name: userData.name,
        email: userData.email,
        image: userData.image,
        role: userData.role as any,
      },
    });
  }

  public async updateUser(id: string, userData: any) {
    return prisma.user.update({
      where: { id },
      data: userData,
    });
  }

  public async deleteUser(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }

  public async searchUsers(email: string): Promise<Partial<IUser>[] | null> {
    return prisma.user.findMany({
      where: { email: { contains: email, mode: 'insensitive' } },
      select: { id: true, email: true, name: true },
      take: 10,
    });
  }

  public async isUsernameTaken(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true }, // Only fetch the ID for efficiency
    });

    return !!user;
  }

}

export const userService = new UserService()
