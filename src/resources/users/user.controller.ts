import { NextFunction, Request, Response } from "express";
import { StringConstants } from "../../common/strings";
import { userService } from "./user.service";


export class UserController {


  public async getAllUsers(req: Request, res: Response, next: NextFunction) {
    const limit = parseInt(req.query.limit as string, 10)
    try {
      const users = await userService.getAllUsers();
      if (!isNaN(limit) && limit > 0) {
        return res.status(200).json(users.slice(0, limit))
      }
      res.status(200).json(users);
    } catch (error) {
      next(error)
    }
  }

  public async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const users = await userService.getUser(userId)
      if (!users) {
        return res.status(404).json(StringConstants.USER_NOT_FOUND)
      }
      res.status(200).json(users)
    } catch (error) {
      next(error)
    }
  }


  public async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const fields = req.query.fields as string | undefined;

      const user = await userService.getUser(userId, fields)
      if (!user) {
        return res.status(404).json(StringConstants.USER_NOT_FOUND)
      }
      res.status(200).json(user)
    } catch (error) {
      next(error)
    }
  }


  public async searchUsers(req: Request, res: Response, next: NextFunction) {
    // const userId = req.user?.id;
    const { username } = req.query as { username: string };

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username' });
    }

    try {
      const users = await userService.searchUsers(username);
      res.status(200).json(users);
    } catch (error) {
      next(error)
    }
  }

  public async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userData = req.body
      const user = await userService.createUser(userData);
      res.status(201).json(user)
    } catch (error) {
      next(error)
    }
  }

  public async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userData = req.body
      const { id } = req.params
      const updatedUser = await userService.updateUser(id, userData)
      if (!updatedUser) {
        return res.status(404).json({ error: StringConstants.USER_NOT_FOUND });
      }
      res.status(200).json(updatedUser)
    } catch (error) {
      next(error)
    }
  }

  public async deleteUser(req: Request, res: Response, next: NextFunction) {

    try {
      const { id } = req.params;
      const deletedUser = await userService.deleteUser(id);

      if (!deletedUser) {
        return res.status(404).json({ error: StringConstants.USER_NOT_FOUND });
      }
      return res.status(204).send();
    } catch (error) {
      next(error)
    }
  }

  public async isUsernameTaken(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = req.body;

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Invalid username provided' });
      }
      const isTaken = await userService.isUsernameTaken(username);
      return res.status(200).json({ available: !isTaken });
    } catch (error) {
      next(error)
    }
  }


}

export const userController = new UserController()
