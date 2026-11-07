import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getJwtExpiresIn, getJwtSecret } from '../config/auth.js';
import { isDatabaseConnected } from '../config/database.js';
import User, { USER_ROLES } from '../models/User.js';
import ApiError from '../utils/ApiError.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordMinimumLength = 8;
const passwordMaximumBytes = 72;

function requireDatabase() {
  if (!isDatabaseConnected()) {
    throw new ApiError(503, 'Authentication service is temporarily unavailable.');
  }
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validateEmail(email) {
  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !emailPattern.test(email.trim())
  ) {
    throw new ApiError(400, 'Please provide a valid email address.', {
      email: 'Enter a valid email address.',
    });
  }
}

function validatePassword(password) {
  if (
    typeof password !== 'string' ||
    password.length < passwordMinimumLength ||
    Buffer.byteLength(password, 'utf8') > passwordMaximumBytes
  ) {
    throw new ApiError(
      400,
      'Password must be at least 8 characters and no more than 72 bytes.',
      {
        password:
          'Use at least 8 characters. Passwords must not exceed 72 UTF-8 bytes.',
      },
    );
  }
}

function validateName(value, field) {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0 ||
    value.trim().length > 80
  ) {
    throw new ApiError(400, `${field} is required and must be 80 characters or fewer.`, {
      [field === 'First name' ? 'firstName' : 'lastName']:
        `${field} is required and must be 80 characters or fewer.`,
    });
  }
}

function toSafeUser(user) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createToken(user) {
  return jwt.sign(
    { role: user.role },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: getJwtExpiresIn(),
    },
  );
}

export async function register(request, response) {
  const { firstName, lastName, email, password } = request.body ?? {};

  validateName(firstName, 'First name');
  validateName(lastName, 'Last name');
  validateEmail(email);
  validatePassword(password);
  requireDatabase();

  const normalizedEmail = normalizeEmail(email);
  const existingUser = await User.exists({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const user = await User.create({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    password,
    role: USER_ROLES.MENTEE,
  });

  response.status(201).json({
    message: 'Your account has been created. You can now log in.',
    user: toSafeUser(user),
  });
}

export async function login(request, response) {
  const { email, password } = request.body ?? {};

  validateEmail(email);
  if (
    typeof password !== 'string' ||
    password.length === 0 ||
    Buffer.byteLength(password, 'utf8') > passwordMaximumBytes
  ) {
    throw new ApiError(400, 'Please provide a valid password.', {
      password: 'Password is required and must not exceed 72 UTF-8 bytes.',
    });
  }
  requireDatabase();

  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Email or password is incorrect.');
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw new ApiError(401, 'Email or password is incorrect.');
  }

  response.status(200).json({
    token: createToken(user),
    user: toSafeUser(user),
  });
}

export async function getCurrentUser(request, response) {
  if (!request.user || !mongoose.isValidObjectId(request.user.id)) {
    throw new ApiError(401, 'Authentication is required.');
  }

  response.status(200).json({ user: toSafeUser(request.user) });
}
