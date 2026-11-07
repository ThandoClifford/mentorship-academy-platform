import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { getJwtSecret } from '../config/auth.js';
import { isDatabaseConnected } from '../config/database.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export default asyncHandler(async (request, _response, next) => {
  const authorization = request.get('authorization');
  const [scheme, token, ...extra] = authorization?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token || extra.length > 0) {
    throw new ApiError(401, 'Authentication is required.');
  }

  if (!isDatabaseConnected()) {
    throw new ApiError(503, 'Authentication service is temporarily unavailable.');
  }

  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, 'The authentication token is invalid or expired.');
  }

  if (
    typeof payload === 'string' ||
    !payload.sub ||
    !mongoose.isValidObjectId(payload.sub)
  ) {
    throw new ApiError(401, 'The authentication token is invalid or expired.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw new ApiError(401, 'The authentication token is invalid or expired.');
  }

  request.user = user;
  next();
});
