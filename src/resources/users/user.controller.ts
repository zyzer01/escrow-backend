import { Request, Response } from "express";
import { createUser, deleteUser, getAllUsers, getUser, isUsernameTaken, updateUser } from './user.service';
import { StringConstants } from "../../common/strings";

export async function getAllUsersHandler(req: Request, res: Response) {
  const limit = parseInt(req.query.limit as string, 10)
  try {
    const users = await getAllUsers();
    if(!isNaN(limit) && limit > 0) {
      return res.status(200).json(users.slice(0, limit))
    }
    res.status(200).json(users);
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: StringConstants.FAILED_USER_FETCH });
  }
}

export async function getUserHandler(req: Request, res: Response) {
  const { id } = req.params
  try {
    const user = await getUser(id)
    if (!user) {
      return res.status(404).json(StringConstants.USER_NOT_FOUND)
    }
    res.status(200).json(user)
  } catch (error) {
    res.status(500).json({ error: StringConstants.FAILED_USER_FETCH })
  }
}

export async function createUserHandler(req: Request, res: Response) {
  const userData = req.body
  try {
    const user = await createUser(userData);
    res.status(201).json(user)
  } catch (error) {
    res.status(500).json({ error: error });
  }
}

export async function updateUserHandler(req: Request, res: Response) {
  const userData = req.body
  const { id } = req.params
  try {
    const updatedUser = await updateUser(id, userData)
    if (!updatedUser) {
      return res.status(404).json({ error: StringConstants.USER_NOT_FOUND });
    }
    res.status(200).json(updatedUser)
  } catch (error) {
    res.status(500).json({ error: StringConstants.FAILED_USER_UPDATE })
  }
}

export async function deleteUserHandler(req: Request, res: Response): Promise<Response> {
  const { id } = req.params;

  try {
    const deletedUser = await deleteUser(id);

    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: StringConstants.FAILED_USER_DELETE });
  }
}

export async function isUsernameTakenHandler(req: Request, res: Response) {
  const {username} = req.body
  try {
    const usernameTaken = await isUsernameTaken(username)
    if (!usernameTaken) {
      return res.status(200).json({ error: 'Username is yours' });
    }
    res.status(400).json({error: 'Username is taken'})
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: StringConstants.FAILED_USERNAME_SEARCH })
  }
}
