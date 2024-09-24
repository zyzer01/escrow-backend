import express from 'express';
import routes from './routes';
import dbConnect from './lib/db';
import dotenv from 'dotenv'
import helmet from 'helmet'
import cors from 'cors'

const app = express();
dotenv.config()

const PORT = process.env.PORT || 3000;

app.use(express.json());
const allowedDomains = ['https://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin, like mobile apps or curl requests
        if (!origin) return callback(null, true);
        if (allowedDomains.indexOf(origin) !== -1) {
            callback(null, true); // Allow the request if the origin is in the allowed list
        } else {
            callback(new Error('Not allowed by CORS')); // Block the request if origin is not allowed
        }
    }
}));

app.use(helmet())

dbConnect().then(() => {
  console.log('Connected to the database');

  routes(app);

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Database connection failed', error);
});
