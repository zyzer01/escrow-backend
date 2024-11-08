import { NextFunction, Request, Response } from "express";
import { createUser, deleteUser, getAllUsers, getUser, isUsernameTaken, updateUser } from './user.service';
import { StringConstants } from "../../common/strings";

export async function getAllUsersHandler(req: Request, res: Response, next: NextFunction) {
  const limit = parseInt(req.query.limit as string, 10)
  try {
    const users = await getAllUsers();
    if (!isNaN(limit) && limit > 0) {
      return res.status(200).json(users.slice(0, limit))
    }
    res.status(200).json(users);
  } catch (error) {
    next(error)
  }
}

export async function getUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const fields = req.query.fields as string | undefined;

    const user = await getUser(userId, fields)
    if (!user) {
      return res.status(404).json(StringConstants.USER_NOT_FOUND)
    }
    res.status(200).json(user)
  } catch (error) {
    next(error)
  }
}

export async function createUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userData = req.body
    const user = await createUser(userData);
    res.status(201).json(user)
  } catch (error) {
    next(error)
  }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userData = req.body
    const { id } = req.params
    const updatedUser = await updateUser(id, userData)
    if (!updatedUser) {
      return res.status(404).json({ error: StringConstants.USER_NOT_FOUND });
    }
    res.status(200).json(updatedUser)
  } catch (error) {
    next(error)
  }
}

export async function deleteUserHandler(req: Request, res: Response, next: NextFunction) {
  
  try {
    const { id } = req.params;
    const deletedUser = await deleteUser(id);

    if (!deletedUser) {
      return res.status(404).json({ error: StringConstants.USER_NOT_FOUND });
    }
    return res.status(204).send();
  } catch (error) {
    next(error)
  }
}

export async function isUsernameTakenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { username } = req.body;
  
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Invalid username provided' });
    }
    const isTaken = await isUsernameTaken(username);
    return res.status(200).json({ available: !isTaken });
  } catch (error) {
    next(error)
  }
}
