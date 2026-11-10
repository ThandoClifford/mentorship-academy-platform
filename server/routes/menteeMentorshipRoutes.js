import { Router } from 'express';
import {
  createRequest,
  listMyRequests,
  listMyRelationshipsMentee,
  getRelationship,
  completeRelationship,
  archiveRelationship,
} from '../controllers/mentorshipController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth, requireRole('MENTEE'));

router.post('/requests', asyncHandler(createRequest));
router.get('/requests', asyncHandler(listMyRequests));
router.get('/relationships', asyncHandler(listMyRelationshipsMentee));
router.get('/:id', asyncHandler(getRelationship));
router.patch('/:id/complete', asyncHandler(completeRelationship));
router.patch('/:id/archive', asyncHandler(archiveRelationship));

export default router;