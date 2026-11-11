import { Router } from 'express';
import {
  listRelationshipMessages,
  sendRelationshipMessage,
} from '../controllers/messagingController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.use(requireAuth, requireRole('MENTOR'));
router.get('/', asyncHandler(listRelationshipMessages));
router.post('/', asyncHandler(sendRelationshipMessage));

export default router;
