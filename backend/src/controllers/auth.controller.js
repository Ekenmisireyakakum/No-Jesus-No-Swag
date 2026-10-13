import bcrypt from 'bcrypt';
import { z } from 'zod';
import supabase from '../config/db.js';
import { signToken } from '../utils/jwt.js';
import { ok } from '../utils/response.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  interest: z.enum(['attendee', 'organizer', 'artist', 'volunteer'], {
    errorMap: () => ({ message: 'Please select an interest' }),
  }),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const register = catchAsync(async (req, res, next) => {
  const { name, email, phone, interest, password } = req.body;

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return next(new AppError('An account with this email already exists', 409));
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, email, phone, interest, password_hash: passwordHash, role: 'USER' })
    .select('id, name, email, phone, interest, role, created_at')
    .single();

  if (error) {
    console.error('Register error:', error);
    return next(new AppError(error.message || 'Failed to create account', 500));
  }

  const token = signToken({ id: user.id, role: user.role });
  ok(res, { user, token }, 201);
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, phone, interest, role, password_hash')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Login error:', error);
    return next(new AppError('Login failed', 500));
  }

  if (!user) return next(new AppError('Invalid email or password', 401));

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return next(new AppError('Invalid email or password', 401));

  const token = signToken({ id: user.id, role: user.role });

  ok(res, {
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone, interest: user.interest, role: user.role },
    token,
  });
});
