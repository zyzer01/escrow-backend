import { betController } from './resources/bets/bet.controller';
import { Application } from "express";
import { userController } from "./resources/users/user.controller";
import { authenticateToken, authorizeRole } from "./lib/middleware/auth";
import { witnessController } from "./resources/bets/witnesses/witness.controller";
import { escrowController } from "./resources/escrow/escrow.controller";
import { betDisputeController } from "./resources/bet-disputes/bet-dispute.controller";
import { walletController } from "./resources/wallet/wallet.controller";
import { upload } from "./lib/middleware/multer";
import { forgotPasswordLimiter } from "./common/rate-limit";
import { signupLimiter } from "./common/rate-limit/signup-limiter";
import { emailVerificationLimiter } from "./common/rate-limit/email-verification";
import { authLimiter } from "./common/rate-limit/auth";
import { googleCallbackHandler, googleHandler } from "./resources/auth/google/google.controller";
import {authController} from "./resources/auth/auth.controller";
import { notificationController } from './resources/notifications/notification.controller';
import { bankAccountController } from './resources/bank-account/bank-account.controller';
import { fileUploadController } from './file-upload/file-upload.controller';
import { profileController } from './resources/users/profile/profile.controller';


function routes(app: Application) {
  app.get('/v1/users/admin', authenticateToken, authorizeRole('admin'), userController.getAllUsers)
  app.get('/v1/users', userController.getUsers)
  app.get('/v1/users/:id', authenticateToken, userController.getUser)
  app.put('/v1/users/:id', authenticateToken, userController.updateUser)
  app.delete('/v1/users/:id', authenticateToken, authorizeRole('admin'), userController.deleteUser)
  app.get('/v1/search-users', userController.searchUsers);
  app.post('/v1/users/check-username', userController.isUsernameTaken)

  app.get('/v1/profile', authenticateToken, profileController.getProfile)
  app.put('/v1/profile', authenticateToken, profileController.updateProfile)
  app.get('/v1/profiles', profileController.getAllProfiles)

  app.post('/v1/auth/request-email-verification', signupLimiter, authController.requestEmailVerification)
  app.post('/v1/auth/complete-profile', authController.completeRegistration)
  app.post('/v1/auth/login', authLimiter, authController.loginUser)
  app.post('/v1/auth/verify-email', authController.verifyEmail)
  app.post('/v1/auth/resend-email-verificationCode', emailVerificationLimiter, authController.resendEmailVerificationCode)
  app.post('/v1/auth/forgot-password', forgotPasswordLimiter, authController.forgotPassword)
  app.post('/v1/auth/reset-password', authController.resetPassword)
  app.get('/v1/auth/session', authController.userSession)
  app.post('/v1/auth/refresh', authController.refreshTokens)
  app.post('/v1/auth/logout', authController.logout)
  app.get('/v1/auth/google', googleHandler)
  app.get('/v1/auth/google/callback', googleCallbackHandler)

  app.post('/v1/bets', authenticateToken, betController.createBet)
  app.get('/v1/bets/all', betController.getAllBets)
  app.get('/v1/bets', authenticateToken, betController.getBets)
  app.get('/v1/bets-history', authenticateToken, betController.getBetsHistory)
  app.get('/v1/bet/:betId', authenticateToken, betController.getBet)
  app.put('/v1/bet/:betId', authenticateToken, betController.updateBet)
  app.delete('/v1/bets/:betId', authenticateToken, betController.deleteBet)
  app.get('/v1/bets/invitation/:invitationId', authenticateToken, betController.getBetInvitation)
  app.post('/v1/bets/accept', authenticateToken, betController.acceptBetInvitation)
  app.post('/v1/bets/reject/:invitationId', betController.rejectBetInvitation)
  app.post('/v1/bets/:betId/engage', betController.engageBet)
  app.post('/v1/bets/settle', betController.settleBet)
  app.post('/v1/bets/:betId/cancel', betController.cancelBet)

  app.get('/v1/bets/witness/:betId', authenticateToken, witnessController.getBetWitnesses)
  app.get('/v1/witness/:witnessId', witnessController.getWitnessInvite)
  app.post('/v1/witness/:witnessId/accept', witnessController.witnessAcceptInvite)
  app.post('/v1/witness/reject/:witnessId', witnessController.witnessRejectInvite)
  app.post('/v1/witness/vote', witnessController.castVote)
  app.post('/v1/witness/:witnessId/judge', witnessController.determineWinner)

  app.get('/v1/escrow/:betId', escrowController.getEscrow)
  app.get('/v1/escrow/:id/stakes', escrowController.getTotalStakes)

  app.get("/v1/disputes/admin", authorizeRole('admin'), betDisputeController.getAllDisputes);
  app.get("/v1/disputes", authenticateToken, betDisputeController.getDisputes);
  app.get("/v1/dispute", authenticateToken, betDisputeController.getDispute);
  app.post('/v1/dispute/log', betDisputeController.logDispute)
  app.post('/v1/dispute/resolve', betDisputeController.resolveDispute)

  app.get("/v1/notifications", authenticateToken, notificationController.getUserNotifications)
  app.post("/v1/notifications/:id/read", authenticateToken, notificationController.markAsRead)

  app.get('/v1/wallet/balance', authenticateToken, walletController.getWalletBalance);
  app.post('/v1/wallet/fund', walletController.fundWallet);
  app.post('/v1/wallet/fund-callback', walletController.paystackCallback);
  app.post('/v1/wallet/verify-account', walletController.verifyAccountNumber);
  app.post('/v1/wallet/withdraw', walletController.withdrawFromWallet);

  app.get('/v1/banks', bankAccountController.fetchAvailableBanks)
  app.post('/v1/bank/save', bankAccountController.saveBankAccount)
  app.get('/v1/bank/:userId/accounts', bankAccountController.saveBankAccount)
  app.post('/v1/bank/set-primary', bankAccountController.setPrimaryBankAccount)
  app.delete('/v1/bank/:userId/accounts/:bankAccountId', bankAccountController.deleteBankAccount)

  app.post('/v1/files/upload', upload.single('file'), authenticateToken, fileUploadController.uploadFile)
  app.delete('/v1/files/:publicId/delete', fileUploadController.deleteFile);

}

export default routes;
