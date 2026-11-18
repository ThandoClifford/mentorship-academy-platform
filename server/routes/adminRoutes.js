import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  getDashboard,
  listUsers,
  getUser,
  updateUserStatus,
  listMentorApplications,
  getMentorApplication,
  approveMentorApplication,
  rejectMentorApplication,
  suspendMentorApplication,
  listMentors,
  getMentor,
  listMentees,
  getMentee,
  listRelationships,
  getRelationship,
  approveRelationship,
  rejectRelationship,
  getMatches,
  listAudit,
} from '../controllers/adminController.js';
import { broadcastAdminNotifications } from '../controllers/notificationController.js';
import {
  getSettings,
  replaceSettings,
  patchSettings,
} from '../controllers/academySettingsController.js';
import {
  adjustRecommendation,
  approveRecommendation,
  generateCohortRecommendations,
  getRecommendation,
  listRecommendationsForCohort,
  rejectRecommendation,
} from '../controllers/matchRecommendationController.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/dashboard', asyncHandler(getDashboard));
router.get('/settings', asyncHandler(getSettings));
router.put('/settings', asyncHandler(replaceSettings));
router.patch('/settings', asyncHandler(patchSettings));

router.get('/users', asyncHandler(listUsers));
router.get('/users/:id', asyncHandler(getUser));
router.patch('/users/:id/status', asyncHandler(updateUserStatus));

router.get('/mentor-applications', asyncHandler(listMentorApplications));
router.get('/mentor-applications/:id', asyncHandler(getMentorApplication));
router.patch('/mentor-applications/:id/approve', asyncHandler(approveMentorApplication));
router.patch('/mentor-applications/:id/reject', asyncHandler(rejectMentorApplication));
router.patch('/mentor-applications/:id/suspend', asyncHandler(suspendMentorApplication));

router.get('/mentors', asyncHandler(listMentors));
router.get('/mentors/:id', asyncHandler(getMentor));

router.get('/mentees', asyncHandler(listMentees));
router.get('/mentees/:id', asyncHandler(getMentee));

router.get('/relationships', asyncHandler(listRelationships));
router.patch('/relationships/:id/approve', asyncHandler(approveRelationship));
router.patch('/relationships/:id/reject', asyncHandler(rejectRelationship));
router.get('/relationships/:id', asyncHandler(getRelationship));

router.get('/matches/:menteeId', asyncHandler(getMatches));

router.post(
  '/cohorts/:cohortId/recommendations/generate',
  asyncHandler(generateCohortRecommendations),
);
router.get('/cohorts/:cohortId/recommendations', asyncHandler(listRecommendationsForCohort));
router.get(
  '/cohorts/:cohortId/recommendations/:recommendationId',
  asyncHandler(getRecommendation),
);
router.patch(
  '/cohorts/:cohortId/recommendations/:recommendationId/approve',
  asyncHandler(approveRecommendation),
);
router.patch(
  '/cohorts/:cohortId/recommendations/:recommendationId/reject',
  asyncHandler(rejectRecommendation),
);
router.patch(
  '/cohorts/:cohortId/recommendations/:recommendationId/adjust',
  asyncHandler(adjustRecommendation),
);

router.post('/notifications/broadcast', asyncHandler(broadcastAdminNotifications));

router.get('/audit', asyncHandler(listAudit));

export default router;
