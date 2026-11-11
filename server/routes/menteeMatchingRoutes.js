import { Router } from 'express';
import { getMatches } from '../controllers/matchingController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth, requireRole('MENTEE'));

router.get('/match', asyncHandler(getMatches));

export default router;