import { Request, Response } from "express";
import { acceptBetInvitation, createBet, deleteBet, getBet, getBets, rejectBetInvitation, updateBet } from "./bet.service"
import { StringConstants } from '../../common/strings';


export async function createBetHandler(req: Request, res: Response) {
    const { designatedWitnesses, ...betData } = req.body;
  
    try {
      const bet = await createBet(betData, designatedWitnesses);
      res.status(201).json(bet);
    } catch (error) {
      console.error('Error creating bet:', error);
      res.status(500).json({ error: 'Failed to create bet' });
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


export async function acceptBetHandler(req: Request, res: Response): Promise<Response> {
    const {invitationId, opponentStake} = req.body
    try {
        const acceptance = await acceptBetInvitation(invitationId, opponentStake)
        return res.status(200).json(acceptance)
    } catch (error) {
        console.error('Error accepting bet:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export async function rejectBetHandler(req: Request, res: Response): Promise<Response> {
    const {invitationId} = req.body
    try {
        const rejection = await rejectBetInvitation(invitationId)
        return res.status(200).json(rejection)
    } catch (error) {
        console.error('Error rejecting bet:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
