import { AppError } from './errorHandler.js';

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(', ');
      return next(new AppError(message, 422));
    }
    req.body = result.data;
    next();
  };
}
