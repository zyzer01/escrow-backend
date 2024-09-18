import { Request, Response } from "express";
import { createUser, deleteUser, getAllUsers, getUser, updateUser } from './user.service';

export async function getAllUsersHandler(req: Request, res: Response) {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

export async function getUserHandler(req: Request, res: Response) {
  const { id } = req.params
  try {
    const user = await getUser(id)
    if (!user) {
      return res.status(404).json(`User with id ${id} was not found`)
    }
    res.status(200).json(user)
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' })
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
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(updatedUser)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' })
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
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}
