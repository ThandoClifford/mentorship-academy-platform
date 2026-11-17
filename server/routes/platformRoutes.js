import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { getPlatformStatus } from '../controllers/platformController.js';

const router = Router();

router.get('/platform/status', asyncHandler(getPlatformStatus));

export default router;
