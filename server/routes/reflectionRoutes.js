import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  listReflections,
  createReflection,
  getReflection,
  updateReflectionHandler,
  deleteReflectionHandler,
  listAdminReflectionsHandler,
} from '../controllers/reflectionController.js';

const router = Router({ mergeParams: true });
const mentorRouter = Router({ mergeParams: true });
const adminRouter = Router();

router.use(requireAuth, requireRole('MENTEE'));
router.get('/', asyncHandler(listReflections));
router.post('/', asyncHandler(createReflection));
router.get('/:id', asyncHandler(getReflection));
router.patch('/:id', asyncHandler(updateReflectionHandler));
router.delete('/:id', asyncHandler(deleteReflectionHandler));

mentorRouter.use(requireAuth, requireRole('MENTOR'));
mentorRouter.get('/', asyncHandler(listReflections));
mentorRouter.get('/:id', asyncHandler(getReflection));

adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.get('/', asyncHandler(listAdminReflectionsHandler));

export { adminRouter, mentorRouter };
export default router;
