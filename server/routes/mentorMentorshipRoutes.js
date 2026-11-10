import { Router } from 'express';
import {
  listMentorRequests,
  listMentorRelationships,
  getRelationship,
  acceptRequest,
  declineRequest,
  activateRelationship,
  completeRelationship,
  archiveRelationship,
} from '../controllers/mentorshipController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth, requireRole('MENTOR'));

router.get('/requests', asyncHandler(listMentorRequests));
router.get('/relationships', asyncHandler(listMentorRelationships));
router.get('/:id', asyncHandler(getRelationship));
router.patch('/:id/accept', asyncHandler(acceptRequest));
router.patch('/:id/decline', asyncHandler(declineRequest));
router.patch('/:id/activate', asyncHandler(activateRelationship));
router.patch('/:id/complete', asyncHandler(completeRelationship));
router.patch('/:id/archive', asyncHandler(archiveRelationship));

export default router;