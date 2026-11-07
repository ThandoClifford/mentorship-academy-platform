import ApiError from '../utils/ApiError.js';

export default function requireRole(...allowedRoles) {
  return function checkRole(request, _response, next) {
    if (!request.user) {
      return next(new ApiError(401, 'Authentication is required.'));
    }

    if (!allowedRoles.includes(request.user.role)) {
      return next(new ApiError(403, 'You are not authorized to access this resource.'));
    }

    return next();
  };
}
