import express from 'express';
import routes from './routes';
import dbConnect from './lib/db';
import dotenv from 'dotenv'

const app = express();
dotenv.config()

const PORT = process.env.PORT || 3000;

app.use(express.json());

dbConnect().then(() => {
  console.log('Connected to the database');

  routes(app);

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Database connection failed', error);
});
