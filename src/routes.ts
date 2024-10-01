import { Express } from "express";
import { createUserHandler, deleteUserHandler, getAllUsersHandler, getUserHandler, isUsernameTakenHandler, updateUserHandler } from "./resources/users/user.controller";
import { forgotPasswordHandler, loginUserHandler, registerUserHandler, resendEmailVerificationCodeHandler, resetPasswordHandler, verifyEmailHandler } from "./resources/auth/auth.controller";
import { authenticateToken, authorizeRole } from "./lib/middleware/auth";
import { acceptBetInvitationHandler, cancelBetHandler, createBetHandler, deleteBetHandler, engageBetHandler, getBetHandler, getBetsHandler, rejectBetInvitationHandler, settleBetHandler, updateBetHandler } from "./resources/bets/bet.controller";
import { castVoteHandler, determineWinnerHandler, witnessAcceptInviteHandler, witnessRejectInviteHandler } from "./resources/bets/witnesses/witness.controller";
import { getTotalStakesHandler } from "./resources/escrow/escrow.controller";
import rateLimit from 'express-rate-limit';
import { getAllDisputesHandler, logDisputeHandler, resolveDisputeHandler } from "./resources/bet-disputes/bet-dispute.controller";
import { fundWalletHandler, paystackCallbackHandler, verifyAccountNumberHandler, withdrawFromWalletHandler } from "./resources/wallet/wallet.controller";
import { upload } from "./lib/middleware/multer";
import { deleteFile, uploadFile } from "./file-upload/file-upload.controller";
import { deleteBankAccountHandler, fetchAvailableBanksHandler, saveBankAccountHandler, setPrimaryBankAccountHandler } from "./resources/bank-account/bank-account.controller";
import { getUserNotificationsHandler, markAsReadHandler } from "./resources/notifications/notification.controller";

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
  app.post('/api/users/username', isUsernameTakenHandler)

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
  app.post('/api/bets/accept', acceptBetInvitationHandler)
  app.post('/api/bets/reject', rejectBetInvitationHandler)
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

  app.get("/api/notifications", getUserNotificationsHandler)
  app.post("/api/notifications/:id/read", markAsReadHandler)

  app.post('/api/wallet/fund', fundWalletHandler);
  app.post('/api/wallet/fund-callback', paystackCallbackHandler);
  app.post('/api/wallet/verify-account', verifyAccountNumberHandler);
  app.post('/api/wallet/withdraw', withdrawFromWalletHandler);

  app.get('/api/banks', fetchAvailableBanksHandler)
  app.post('/api/bank/save', saveBankAccountHandler)
  app.get('/api/bank/:userId/accounts', saveBankAccountHandler)
  app.post('/api/bank/set-primary', setPrimaryBankAccountHandler)
  app.delete('/api/bank/:userId/accounts/:bankAccountId', deleteBankAccountHandler)

  app.post('/api/files/upload', upload.single('file'), uploadFile)
  app.delete('/api/files/:publicId/delete', deleteFile);

}

export default routes;
