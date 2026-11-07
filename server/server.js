import './config/env.js';
import cors from 'cors';
import express from 'express';
import { connectDatabase, isDatabaseConfigured } from './config/database.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();
const port = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: clientOrigin }));
app.use(express.json());
app.use('/api', healthRoutes);

async function startServer() {
  if (isDatabaseConfigured()) {
    await connectDatabase();
  } else {
    console.info('MONGODB_URI is not configured; starting without MongoDB.');
  }

  app.listen(port, () => {
    console.info(`Mentorship Academy API listening on http://localhost:${port}`);
  });
}

startServer();
