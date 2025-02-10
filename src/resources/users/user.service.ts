import { User } from "@prisma/client";
import { prisma } from "../../lib/db";
import { IUser } from "./interfaces/users";
import { UnauthorizedException } from "../../common/errors";
import { StringConstants } from "../../common/strings";

export class UserService {
  public async getAll(userId: string): Promise<User[]> {
    if (!userId) {
      throw new UnauthorizedException(StringConstants.UNAUTHORIZED);
    }
    return prisma.user.findMany();
  }

  public async findUnique(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  public async createUser(userData: User) {
    return prisma.user.create({
      data: {
        username: userData.username,
        name: userData.name,
        email: userData.email,
        image: userData.image,
        role: userData.role ?? "user",
        banned: userData.banned ?? false,
        banReason: userData.banReason,
        banExpires: userData.banExpires,
        dob: userData.dob,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
  
  public async update(id: string, userData: Partial<User>) {
    return prisma.user.update({
      where: { id },
      data: userData,
    });
  }

  public async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }

  public async searchUsers(email: string): Promise<Partial<IUser>[] | null> {
    return prisma.user.findMany({
      where: { email: { contains: email, mode: "insensitive" } },
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

export const userService = new UserService();
