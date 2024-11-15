import { MongoServerError } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { generateTokens } from '../../../lib/utils/auth';
import User from '../../users/user.model';
import { CLIENT_BASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SERVER_URL } from '../../../config/google';

const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${SERVER_URL}/auth/google/callback`
);

export async function googleHandler (req: Request, res: Response) {
  const authUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
  });

  return res.redirect(authUrl);
}

export async function googleCallbackHandler(req: Request, res: Response) {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      console.error('No code received from Google');
      return res.redirect(`${CLIENT_BASE_URL}/auth/error?error=NoCode`);
    }

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('No payload in ID token');
    }

    const { email, sub: googleId, given_name, family_name, picture } = payload;

    let user = await User.findOne({ googleId });

    if (!user) {
      try {
        user = await User.create({
          email,
          googleId,
          firstName: given_name,
          lastName: family_name,
          isEmailVerified: true,
          profilePicture: picture,
          role: 'user',
        });
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11000) {
          return res.redirect(`${CLIENT_BASE_URL}/auth/error?error=EmailAlreadyRegistered`);
        }
        throw error; // re-throw the error if it's not a duplicate key error
      }
    }

    const token = generateTokens({
      userId: user._id.toString(),
      role: user.role
    });

    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600000, // 1 hour in milliseconds
      path: '/',
    });

    return res.redirect(`${CLIENT_BASE_URL}`);
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.redirect(`${CLIENT_BASE_URL}/auth/error?error=GoogleAuthFailed`);
  }
}
