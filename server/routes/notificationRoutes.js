import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  listNotifications,
  unreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(listNotifications));
router.get('/unread-count', asyncHandler(unreadCount));
router.patch('/:id/read', asyncHandler(markAsRead));
router.patch('/read-all', asyncHandler(markAllAsRead));

export default router;
