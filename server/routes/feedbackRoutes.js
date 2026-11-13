import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  submitFeedback,
  listRelationshipFeedback,
  listAdminFeedback,
} from '../controllers/feedbackController.js';

const router = Router({ mergeParams: true });
const adminRouter = Router();

router.use(requireAuth);
router.post('/', asyncHandler(submitFeedback));
router.get('/', asyncHandler(listRelationshipFeedback));

adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.get('/', asyncHandler(listAdminFeedback));

export { adminRouter };
export default router;
