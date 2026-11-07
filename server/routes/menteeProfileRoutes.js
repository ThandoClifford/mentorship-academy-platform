import { Router } from 'express';
import {
  readMenteeProfile,
  readMenteeProfileCompletion,
  writeMenteeProfile,
} from '../controllers/profileController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth, requireRole('MENTEE'));
router.get('/profile/completion', asyncHandler(readMenteeProfileCompletion));
router.get('/profile', asyncHandler(readMenteeProfile));
router.put('/profile', asyncHandler(writeMenteeProfile));

export default router;
