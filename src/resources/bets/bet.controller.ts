import { Request, Response } from "express";
import { createBet, deleteBet, getBet, getBets, updateBet } from "./bet.service"
import { StringConstants } from '../../common/strings';


export async function createBetHandler(req: Request, res: Response) {
    const betData = req.body
    try {
        const bet = createBet(betData)
        res.status(201).json(bet)
    } catch (error) {
        res.status(500).json({error: 'Failed to create bet'})
    }
}

export async function getBetsHandler(req: Request, res: Response) {
    try {
        const bets = await getBets()
        res.status(200).json(bets)
    } catch (error) {
        res.status(500).json({error: 'Failed to fetch bets'})
    }
}

export async function getBetHandler(req: Request, res: Response) {
    const { id } = req.params
    try {
      const user = await getBet(id)
      if (!user) {
        return res.status(404).json(`User with id ${id} was not found`)
      }
      res.status(200).json(user)
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' })
    }
  }


export async function updateBetHandler(req: Request, res: Response) {
    const userData = req.body
    const { id } = req.params
    try {
        const updatedUser = await updateBet(id, userData);
    if (!updatedUser) {
        return res.status(404).json({ error: StringConstants.USER_NOT_FOUND });
    }
    res.status(200).json(updatedUser)
    } catch (error) {
    res.status(500).json({ error: 'Failed to update user' })
    }
}

export async function deleteBetHandler(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;

    try {
        const deletedBet = await deleteBet(id);

        if (!deletedBet) {
            return res.status(404).json({ error: StringConstants.BET_NOT_FOUND });
        }

        return res.status(204).send();
    } catch (error) {
        console.error('Error deleting bet:', error);
        return res.status(500).json({ error: 'Failed to delete bet' });
    }
}
