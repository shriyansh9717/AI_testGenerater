import multer from 'multer';
import { config } from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/* eslint-disable-next-line no-unused-vars */
export function errorHandler(err, _req, res, _next) {
  let error = err;

  if (err instanceof multer.MulterError) {
    const messages = {
      LIMIT_FILE_SIZE: `That file is larger than the ${config.maxUploadMb} MB limit.`,
      LIMIT_FILE_COUNT: 'Too many files in one upload.',
      LIMIT_UNEXPECTED_FILE: 'Unexpected file field in the upload.',
    };
    error = ApiError.badRequest(messages[err.code] || 'The upload could not be processed.');
  } else if (err?.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({ field: e.path, message: e.message }));
    error = ApiError.badRequest('Some fields need attention.', details);
  } else if (err?.name === 'CastError') {
    error = ApiError.badRequest('That identifier is not valid.');
  } else if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || { value: 1 })[0];
    error = ApiError.conflict(
      field === 'email' ? 'An account already uses that email address.' : `Duplicate value for ${field}.`
    );
  } else if (err?.name === 'MongoNetworkError' || err?.name === 'MongooseServerSelectionError') {
    error = ApiError.serviceUnavailable('The database is unreachable right now. Try again shortly.');
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(err.statusCode || 500, err.message || 'Something went wrong on our side.');
    error.isOperational = false;
  }

  if (!error.isOperational || error.statusCode >= 500) {
    console.error('[error]', err);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
    ...(error.details ? { details: error.details } : {}),
    ...(config.env === 'development' && !error.isOperational ? { stack: err.stack } : {}),
  });
}
