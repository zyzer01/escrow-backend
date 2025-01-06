import express, { Application } from 'express';
import routes from './routes';
import dbConnect from './lib/db';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './lib/middleware/ErrorHandler';
import { toNodeHandler } from "better-auth/node";
import { auth } from './lib/auth';
import { fromNodeHeaders } from "better-auth/node";

const app: Application = express();
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (process.env.NODE_ENV === 'development') {
  app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
  }));
} else {
  app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
  }));
}

app.use(cookieParser());

app.all("/api/auth/**", toNodeHandler(auth));

app.use(express.json());

app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

app.get("/api/active-sessions", async (req, res) => {
  const session = await auth.api.listSessions({
    headers: fromNodeHeaders(req.headers),
  });
  return res.json(session);
});

routes(app);
app.use(errorHandler);

dbConnect().then(() => {
  console.log('Connected to the database');
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${NODE_ENV} mode`);
  });
}).catch(error => {
  console.error('Database connection failed', error);
});
