import { Router } from 'express';
import {
  readMentorProfile,
  readMentorProfileCompletion,
  writeMentorProfile,
} from '../controllers/profileController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth, requireRole('MENTOR'));
router.get('/profile/completion', asyncHandler(readMentorProfileCompletion));
router.get('/profile', asyncHandler(readMentorProfile));
router.put('/profile', asyncHandler(writeMentorProfile));

export default router;
