import { Express } from "express";
import { createUserHandler, deleteUserHandler, getAllUsersHandler, getUserHandler, isUsernameTakenHandler, searchUsersHandler, updateUserHandler } from "./resources/users/user.controller";
import { completeRegistrationHandler, forgotPasswordHandler, requestEmailVerificationHandler, loginUserHandler, resendEmailVerificationCodeHandler, resetPasswordHandler, verifyEmailHandler, logoutHandler, refreshTokenHandler, checkAuthTokenHandler } from "./resources/auth/auth.controller";
import { authenticateToken, authorizeRole } from "./lib/middleware/auth";
import { acceptBetInvitationHandler, cancelBetHandler, createBetHandler, deleteBetHandler, engageBetHandler, getBetHandler, getBetInvitationHandler, getBetsHandler, rejectBetInvitationHandler, settleBetHandler, updateBetHandler } from "./resources/bets/bet.controller";
import { castVoteHandler, determineWinnerHandler, getWitnessInviteHandler, witnessAcceptInviteHandler, witnessRejectInviteHandler } from "./resources/bets/witnesses/witness.controller";
import { getEscrowHandler, getTotalStakesHandler } from "./resources/escrow/escrow.controller";
import { getAllDisputesHandler, logDisputeHandler, resolveDisputeHandler } from "./resources/bet-disputes/bet-dispute.controller";
import { fundWalletHandler, getWalletBalanceHandler, paystackCallbackHandler, verifyAccountNumberHandler, withdrawFromWalletHandler } from "./resources/wallet/wallet.controller";
import { upload } from "./lib/middleware/multer";
import { deleteFile, uploadFile } from "./file-upload/file-upload.controller";
import { deleteBankAccountHandler, fetchAvailableBanksHandler, saveBankAccountHandler, setPrimaryBankAccountHandler } from "./resources/bank-account/bank-account.controller";
import { getUserNotificationsHandler, markAsReadHandler } from "./resources/notifications/notification.controller";
import { forgotPasswordLimiter } from "./common/rate-limit";
import { googleCallbackHandler, googleHandler } from "./resources/auth/google/google.controller";
import { signupLimiter } from "./common/rate-limit/signup-limiter";
import { emailVerificationLimiter } from "./common/rate-limit/email-verification";
import { authLimiter } from "./common/rate-limit/auth";



function routes(app: Express) {
  app.get('/users', getAllUsersHandler)
  app.get('/users/:id', authenticateToken, getUserHandler)
  app.post('/users', authenticateToken, authorizeRole('admin'), createUserHandler)
  app.put('/users/:id', authenticateToken, updateUserHandler)
  app.delete('/users/:id', authenticateToken, authorizeRole('admin'), deleteUserHandler)
  app.get('/search-users', authenticateToken, searchUsersHandler);
  app.post('/users/check-username', isUsernameTakenHandler)

  app.post('/auth/request-email-verification', signupLimiter, requestEmailVerificationHandler)
  app.post('/auth/complete-profile', completeRegistrationHandler)
  app.post('/auth/login', authLimiter, loginUserHandler)
  app.post('/auth/verify-email', verifyEmailHandler)
  app.post('/auth/resend-email-verificationCode', emailVerificationLimiter, resendEmailVerificationCodeHandler)
  app.post('/auth/forgot-password', forgotPasswordLimiter, forgotPasswordHandler)
  app.post('/auth/reset-password', resetPasswordHandler)
  app.post('/auth/refresh', refreshTokenHandler)
  app.post('/auth/check-auth-token', checkAuthTokenHandler)
  app.post('/auth/logout', logoutHandler)
  app.get('/auth/google', googleHandler)
  app.get('/auth/google/callback', googleCallbackHandler)

  app.post('/api/bets', authenticateToken, createBetHandler)
  app.get('/api/bets', authenticateToken, getBetsHandler)
  app.get('/api/bets/:betId', authenticateToken, getBetHandler)
  app.put('/api/bets/:betId', updateBetHandler)
  app.delete('/api/bets/:betId', deleteBetHandler)
  app.get('/api/bets/invitation/:invitationId', authenticateToken, getBetInvitationHandler)
  app.post('/api/bets/accept', acceptBetInvitationHandler)
  app.post('/api/bets/:invitationId/reject', rejectBetInvitationHandler)
  app.post('/api/bets/:betId/engage', engageBetHandler)
  app.post('/api/bets/settle', settleBetHandler)
  app.post('/api/bets/:betId/cancel', cancelBetHandler)

  app.get('/api/bets/witness/:witnessId', getWitnessInviteHandler)
  app.post('/api/bets/witness/:witnessId/accept', witnessAcceptInviteHandler)
  app.post('/api/bets/witness/:witnessId/recuse', witnessRejectInviteHandler)
  app.post('/api/bets/witness/vote', castVoteHandler)
  app.post('/api/bets/witness/:witnessId/judge', determineWinnerHandler)

  app.get('/api/escrow/:betId', getEscrowHandler)
  app.get('/api/escrow/:id/stakes', getTotalStakesHandler)

  app.post('/api/dispute/log', logDisputeHandler)
  app.post('/api/dispute/resolve', resolveDisputeHandler)
  app.get("/api/dispute", getAllDisputesHandler);

  app.get("/api/notifications", authenticateToken, getUserNotificationsHandler)
  app.post("/api/notifications/:id/read", markAsReadHandler)

  app.get('/wallet/balance', authenticateToken, getWalletBalanceHandler);
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
