import { Router } from 'express';
import {
  listMentorGoalsHandler,
  getMentorGoalHandler,
  addMentorFeedbackHandler,
} from '../controllers/goalController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole('MENTOR'));

router.get('/', asyncHandler(listMentorGoalsHandler));
router.get('/:id', asyncHandler(getMentorGoalHandler));
router.patch('/:id/feedback', asyncHandler(addMentorFeedbackHandler));

export default router;