import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';

export default function errorHandler(error, _request, response, _next) {
  let statusCode = error instanceof ApiError ? error.statusCode : 500;
  let message = error instanceof ApiError
    ? error.message
    : 'An unexpected server error occurred.';
  let errors = error.errors;

  if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body must contain valid JSON.';
    errors = undefined;
  } else if (error.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
    errors = undefined;
  } else if (error instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Please check the provided information.';
    errors = Object.fromEntries(
      Object.entries(error.errors).map(([field, detail]) => [
        field,
        detail.message,
      ]),
    );
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'An account with this email already exists.';
  } else if (!(error instanceof ApiError) && statusCode >= 500) {
    console.error(error);
    message = 'An unexpected server error occurred.';
    errors = undefined;
  }

  response.status(statusCode).json({
    message,
    ...(errors ? { errors } : {}),
  });
}
