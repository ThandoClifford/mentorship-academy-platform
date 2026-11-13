import ApiError from '../utils/ApiError.js';
import MentorProfile from '../models/MentorProfile.js';
import asyncHandler from '../utils/asyncHandler.js';

export default function requireRole(...allowedRoles) {
  return asyncHandler(async function checkRole(request, _response, next) {
    if (!request.user) {
      return next(new ApiError(401, 'Authentication is required.'));
    }

    if (!allowedRoles.includes(request.user.role)) {
      return next(new ApiError(403, 'You are not authorized to access this resource.'));
    }

    if (
      request.user.role === 'MENTOR' &&
      allowedRoles.includes('MENTOR')
    ) {
      const mentorProfile = await MentorProfile.findOne({ user: request.user._id })
        .select('status')
        .lean();

      if (mentorProfile?.status !== 'APPROVED') {
        return next(new ApiError(403, 'You are not authorized to access this resource.'));
      }
    }

    return next();
  });
}
