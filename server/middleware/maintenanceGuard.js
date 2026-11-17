import { getAcademySettings } from '../services/academySettingsService.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const allowedDuringMaintenance = new Set([
  '/admin',
  '/auth/login',
  '/auth/me',
  '/health',
  '/platform/status',
]);

export default asyncHandler(async (request, _response, next) => {
  if (
    allowedDuringMaintenance.has(request.path) ||
    request.path.startsWith('/admin/')
  ) {
    return next();
  }

  const settings = await getAcademySettings();
  if (settings.maintenanceMode) {
    throw new ApiError(503, settings.maintenanceMessage);
  }

  return next();
});
