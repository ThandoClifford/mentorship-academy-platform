import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  submitApplication,
  getOwnApplication,
} from '../controllers/mentorApplicationController.js';

const router = Router();

router.use(requireAuth);

router.post('/', asyncHandler(submitApplication));
router.get('/me', asyncHandler(getOwnApplication));

export default router;
