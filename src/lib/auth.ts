import { admin, createAuthMiddleware, openAPI, username } from 'better-auth/plugins';
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { Prisma, PrismaClient } from "@prisma/client";
import { sendEmail } from "../mail/mail.service";
import { userMetadata } from './plugins';
import { prisma } from './db';

export const auth = betterAuth({
  appName: "Escrowbet",
  trustedOrigins: ["http://localhost:3000"],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        template: "forgot-password",
        params: { link: url },
      });
    },
  },
  callbackURL: "http://localhost:3000",
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email address",
        template: "confirm-email",
        params: { link: url },
      });
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0,
          currency: "NGN"
        }
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailVerification: async ({ user, newEmail, url, token }, request) => {
        await sendEmail({
          to: newEmail,
          subject: 'Verify your email change',
          template: 'email-change-request',
          params: { link: url },
        })
      }
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async (
        {
          user,
          url,
          token
        },
        request
      ) => {
        await sendEmail({
          to: user.email,
          subject: 'Delete your account',
          template: 'account-deletion',
          params: { link: url },
        })
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path.startsWith("/sign-up")) {
        const newSession = ctx.context.newSession;
        if (newSession) {
          try {
            await prisma.$transaction(async (tx) => {
              await tx.wallet.create({
                data: {
                  userId: newSession.user.id,
                  balance: 0,
                  currency: "NGN"
                }
              });
            });
            await sendEmail({
              to: newSession.user.email,
              subject: 'Welcome to Escrow Bet',
              template: 'welcome',
              params: { firstName: newSession.user.name },
            });
    
          } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
              switch (error.code) {
                case 'P2002':
                  console.error(`Unique constraint violation for user ${newSession.user.id}`);
                  break;
                case 'P2003':
                  console.error(`Foreign key constraint violation for user ${newSession.user.id}`);
                  break;
                default:
                  console.error(`Database error creating wallet for user ${newSession.user.id}:`, error);
              }
            } else {
              console.error('Error in signup process:', error);
            }
          }
        }
      }
    }),
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [
    admin(),
    username(),
    userMetadata(),
    openAPI()
  ],
  advanced: {
    cookiePrefix: "_Secure_eb"
  }
});
