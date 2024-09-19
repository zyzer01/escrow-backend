import { Express } from "express";
import { createUserHandler, deleteUserHandler, getAllUsersHandler, getUserHandler, updateUserHandler } from "./resources/users/user.controller";
import { forgotPasswordHandler, loginUserHandler, registerUserHandler, resendEmailVerificationCodeHandler, resetPasswordHandler, verifyEmailHandler } from "./resources/auth/auth.controller";
import { authenticateToken, authorizeRole } from "./lib/middleware";
import { acceptBetHandler, createBetHandler, deleteBetHandler, getBetHandler, getBetsHandler, updateBetHandler } from "./resources/bets/bet.controller";

function routes(app: Express) {
    app.get('/api/users', authenticateToken, authorizeRole('admin'), getAllUsersHandler)
    app.get('/api/users/:id', authenticateToken, getUserHandler)
    app.post('/api/users', authenticateToken, authorizeRole('admin'), createUserHandler)
    app.put('/api/users/:id', authenticateToken, updateUserHandler)
    app.delete('/api/users/:id', authenticateToken, authorizeRole('admin'), deleteUserHandler)

    app.post('/auth/register', registerUserHandler)
    app.post('/auth/login', loginUserHandler)
    app.post('/auth/verify-email', verifyEmailHandler)
    app.post('/auth/resend-email-verificationCode', resendEmailVerificationCodeHandler)
    app.post('/auth/forgot-password', forgotPasswordHandler)
    app.post('/auth/reset-password', resetPasswordHandler)

    app.post('/api/bets', createBetHandler)
    app.get('/api/bets', getBetsHandler)
    app.get('/api/bets/:id', getBetHandler)
    app.put('/api/bets/:id', updateBetHandler)
    app.delete('/api/bets/:id', deleteBetHandler)
    app.post('/api/bets/accept', acceptBetHandler)
}

export default routes;
