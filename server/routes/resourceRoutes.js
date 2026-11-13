import { Router } from 'express';
import optionalAuth from '../middleware/optionalAuth.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  listResources,
  getResource,
  listAdminResourcesHandler,
  createAdminResource,
  updateAdminResource,
  publishAdminResource,
  unpublishAdminResource,
  deleteAdminResource,
} from '../controllers/resourceController.js';

const router = Router();
const adminRouter = Router();

router.get('/', optionalAuth, asyncHandler(listResources));
router.get('/:id', optionalAuth, asyncHandler(getResource));

adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.get('/', asyncHandler(listAdminResourcesHandler));
adminRouter.post('/', asyncHandler(createAdminResource));
adminRouter.patch('/:id', asyncHandler(updateAdminResource));
adminRouter.patch('/:id/publish', asyncHandler(publishAdminResource));
adminRouter.patch('/:id/unpublish', asyncHandler(unpublishAdminResource));
adminRouter.delete('/:id', asyncHandler(deleteAdminResource));

export { adminRouter };
export default router;
