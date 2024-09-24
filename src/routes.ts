import { Express } from "express";
import { createUserHandler, deleteUserHandler, getAllUsersHandler, getUserHandler, updateUserHandler } from "./resources/users/user.controller";
import { forgotPasswordHandler, loginUserHandler, registerUserHandler, resendEmailVerificationCodeHandler, resetPasswordHandler, verifyEmailHandler } from "./resources/auth/auth.controller";
import { authenticateToken, authorizeRole } from "./lib/middleware/auth";
import { acceptBetHandler, cancelBetHandler, createBetHandler, deleteBetHandler, engageBetHandler, getBetHandler, getBetsHandler, rejectBetHandler, settleBetHandler, updateBetHandler } from "./resources/bets/bet.controller";
import { castVoteHandler, determineWinnerHandler, witnessAcceptInviteHandler, witnessRejectInviteHandler } from "./resources/bets/witnesses/witness.controller";
import { getTotalStakesHandler } from "./resources/escrow/escrow.controller";
import rateLimit from 'express-rate-limit';
import { getAllDisputesHandler, logDisputeHandler, resolveDisputeHandler } from "./resources/bet-disputes/bet-dispute.controller";
import { fundWalletHandler, paystackCallbackHandler, verifyAccountNumberHandler, withdrawFromWalletHandler } from "./resources/wallet/wallet.controller";
import { upload } from "./lib/middleware/multer";
import { deleteFile, uploadFile } from "./file-upload/file-upload.controller";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes',
});


function routes(app: Express) {
  app.get('/api/users', getAllUsersHandler)
  app.get('/api/users/:id', authenticateToken, getUserHandler)
  app.post('/api/users', authenticateToken, authorizeRole('admin'), createUserHandler)
  app.put('/api/users/:id', authenticateToken, updateUserHandler)
  app.delete('/api/users/:id', authenticateToken, authorizeRole('admin'), deleteUserHandler)

  app.post('/auth/register', registerUserHandler)
  app.post('/auth/login', authLimiter, loginUserHandler)
  app.post('/auth/verify-email', verifyEmailHandler)
  app.post('/auth/resend-email-verificationCode', resendEmailVerificationCodeHandler)
  app.post('/auth/forgot-password', forgotPasswordHandler)
  app.post('/auth/reset-password', resetPasswordHandler)

  app.post('/api/bets', createBetHandler)
  app.get('/api/bets', getBetsHandler)
  app.get('/api/bets/:betId', getBetHandler)
  app.put('/api/bets/:betId', updateBetHandler)
  app.delete('/api/bets/:betId', deleteBetHandler)
  app.post('/api/bets/accept', acceptBetHandler)
  app.post('/api/bets/reject', rejectBetHandler)
  app.post('/api/bets/:betId/engage', engageBetHandler)
  app.post('/api/bets/settle', settleBetHandler)
  app.post('/api/bets/:betId/cancel', cancelBetHandler)

  app.post('/api/bets/witness/:witnessId/accept', witnessAcceptInviteHandler)
  app.post('/api/bets/witness/:witnessId/recuse', witnessRejectInviteHandler)
  app.post('/api/bets/witness/vote', castVoteHandler)
  app.post('/api/bets/witness/:witnessId/judge', determineWinnerHandler)

  app.get('/api/escrow/:id/stakes', getTotalStakesHandler)

  app.post('/api/dispute/log', logDisputeHandler)
  app.post('/api/dispute/resolve', resolveDisputeHandler)
  app.get("/api/dispute", getAllDisputesHandler);

  app.post('/api/wallet/fund', fundWalletHandler);
  app.post('/api/wallet/fund-callback', paystackCallbackHandler);
  app.post('/api/wallet/verify-account', verifyAccountNumberHandler);
  app.post('/api/wallet/withdraw', withdrawFromWalletHandler);

  app.post('/api/files/upload', upload.single('file'), uploadFile)
  app.delete('/api/files/:publicId/delete', deleteFile);

}

export default routes;
