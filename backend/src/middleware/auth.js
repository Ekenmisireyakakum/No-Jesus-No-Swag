import { verifyToken } from '../utils/jwt.js';
import { AppError } from './errorHandler.js';
import supabase from '../config/db.js';

export async function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = header.split(' ')[1];

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('id', decoded.id)
    .single();

  if (!user) return next(new AppError('User no longer exists', 401));

  req.user = user;
  next();
}

export function restrictTo(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
}
