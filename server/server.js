import './config/env.js';
import cors from 'cors';
import express from 'express';
import { connectDatabase, isDatabaseConfigured } from './config/database.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import menteeProfileRoutes from './routes/menteeProfileRoutes.js';
import mentorProfileRoutes from './routes/mentorProfileRoutes.js';
import menteeMentorshipRoutes from './routes/menteeMentorshipRoutes.js';
import mentorMentorshipRoutes from './routes/mentorMentorshipRoutes.js';
import mentorPublicRoutes from './routes/mentorPublicRoutes.js';
import menteeGoalRoutes from './routes/menteeGoalRoutes.js';
import mentorGoalRoutes from './routes/mentorGoalRoutes.js';

const app = express();
const port = Number(process.env.PORT) || 5000;
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '10kb' }));
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/mentee', menteeProfileRoutes);
app.use('/api/mentor', mentorProfileRoutes);
app.use('/api/mentee/mentorship', menteeMentorshipRoutes);
app.use('/api/mentor/mentorship', mentorMentorshipRoutes);
app.use('/api/mentee/mentorship/:relationshipId/goals', menteeGoalRoutes);
app.use('/api/mentor/mentorship/:relationshipId/goals', mentorGoalRoutes);
app.use('/api/mentors', mentorPublicRoutes);
app.use((request, response) => {
  response.status(404).json({ message: 'Route not found.' });
});
app.use(errorHandler);

async function startServer() {
  if (isDatabaseConfigured()) {
    await connectDatabase();
  } else {
    console.info('MONGO_URI is not configured; starting without MongoDB.');
  }

  app.listen(port, () => {
    console.info(`Mentorship Academy API listening on http://localhost:${port}`);
  });
}

startServer();
