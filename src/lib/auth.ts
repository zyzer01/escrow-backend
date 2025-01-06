import { admin, createAuthMiddleware, username } from 'better-auth/plugins';
import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { sendEmail } from "../mail/mail.service";
import { userMetadata } from './plugins';

const client = new MongoClient(process.env.MONGODB_URI as string);
const db = client.db()

client.connect()
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

export const auth = betterAuth({
  appName: "Escrowbet",
  trustedOrigins: ["http://localhost:3000"],
  database: mongodbAdapter(db),
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
          console.log(newSession)
          await sendEmail({
            to: newSession.user.email,
            subject: 'Welcome to Escrow Bet',
            template: 'welcome',
            params: { firstName: newSession.user.name },
          });
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
    userMetadata()
  ],
  advanced: {
    cookiePrefix: "_Secure_eb"
  }
});
