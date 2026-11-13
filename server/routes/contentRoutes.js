import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  listPublicContent,
  getPublicContentBySlug,
  listAdminContentHandler,
  createAdminContent,
  updateAdminContent,
  deleteAdminContent,
} from '../controllers/contentController.js';

const router = Router();
const adminRouter = Router();

router.get('/', asyncHandler(listPublicContent));
router.get('/:slug', asyncHandler(getPublicContentBySlug));

adminRouter.use(requireAuth, requireRole('ADMIN'));
adminRouter.get('/', asyncHandler(listAdminContentHandler));
adminRouter.post('/', asyncHandler(createAdminContent));
adminRouter.patch('/:id', asyncHandler(updateAdminContent));
adminRouter.delete('/:id', asyncHandler(deleteAdminContent));

export { adminRouter };
export default router;
