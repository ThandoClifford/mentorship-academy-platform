import ApiError from '../utils/ApiError.js';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new ApiError(500, 'Authentication is not configured on the server.');
  }
  return secret;
}

export function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '1d';
}
