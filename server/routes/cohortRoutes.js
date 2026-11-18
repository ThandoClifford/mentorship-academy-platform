import { Router } from 'express';
import {
  assignCohortMember,
  createCohort,
  getCohort,
  getCurrentCohort,
  listCohortMembers,
  listCohorts,
  updateCohort,
  updateCohortMemberStatus,
  updateCohortStatus,
} from '../controllers/cohortController.js';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get('/cohorts/current', requireAuth, asyncHandler(getCurrentCohort));

router.use('/admin/cohorts', requireAuth, requireRole('ADMIN'));
router.get('/admin/cohorts', asyncHandler(listCohorts));
router.post('/admin/cohorts', asyncHandler(createCohort));
router.get('/admin/cohorts/:cohortId', asyncHandler(getCohort));
router.patch('/admin/cohorts/:cohortId', asyncHandler(updateCohort));
router.patch('/admin/cohorts/:cohortId/status', asyncHandler(updateCohortStatus));
router.get('/admin/cohorts/:cohortId/members', asyncHandler(listCohortMembers));
router.post('/admin/cohorts/:cohortId/members', asyncHandler(assignCohortMember));
router.patch(
  '/admin/cohorts/:cohortId/members/:membershipId',
  asyncHandler(updateCohortMemberStatus),
);

export default router;
