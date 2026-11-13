import requireAuth from './requireAuth.js';

export default function optionalAuth(request, response, next) {
  if (!request.get('authorization')) {
    return next();
  }

  return requireAuth(request, response, next);
}
