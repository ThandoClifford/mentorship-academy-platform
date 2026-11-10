import { Router } from 'express';
import {
  createGoalHandler,
  listGoalsHandler,
  getGoalHandler,
  updateGoalHandler,
  addMilestoneHandler,
  updateMilestoneHandler,
} from '../controllers/goalController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole('MENTEE'));

router.post('/', asyncHandler(createGoalHandler));
router.get('/', asyncHandler(listGoalsHandler));
router.get('/:id', asyncHandler(getGoalHandler));
router.patch('/:id', asyncHandler(updateGoalHandler));
router.post('/:id/milestones', asyncHandler(addMilestoneHandler));
router.patch('/:id/milestones/:milestoneId', asyncHandler(updateMilestoneHandler));

export default router;