import { MongoServerError } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { generateTokens } from '../../../lib/utils/auth';
import User from '../../users/user.model';
import { CLIENT_BASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SERVER_URL } from '../../../config/google';
import { Session } from '../session/session.model';

const client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${SERVER_URL}/auth/google/callback`
);

export async function googleHandler(req: Request, res: Response) {
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
      audience: GOOGLE_CLIENT_ID
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
        throw error;
      }
    }

    const session = await Session.create({
      userId: user.id,
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip,
      isValid: true,
    });

    const { accessToken, refreshToken } = generateTokens({
      userId: user._id.toString(),
      role: user.role,
      sessionId: session._id.toString()
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/auth/refresh',
    });

    return res.redirect(`${CLIENT_BASE_URL}`);
  } catch (error) {
    console.error('Google Auth Error:', error);
    return res.redirect(`${CLIENT_BASE_URL}/auth/error?error=GoogleAuthFailed`);
  }
}
