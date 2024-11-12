import express from 'express';
import routes from './routes';
import dbConnect from './lib/db';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './lib/middleware/ErrorHandler';

const app = express();
dotenv.config();

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(express.json());

const allowedOrigins = NODE_ENV === 'production'
  ? ['https://app.domain.com']
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || (NODE_ENV === 'development' && origin?.startsWith('http://localhost:'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// app.use(helmet());
app.use(cookieParser());

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
