import { z } from 'zod';
import supabase from '../config/db.js';
import { generateQrPayload } from '../utils/qr.js';
import { ok } from '../utils/response.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

export const lookupUser = catchAsync(async (req, res, next) => {
  const { query } = req.query;

  if (!query || query.trim().length < 2) {
    return next(new AppError('Provide at least 2 characters to search', 400));
  }

  const q = query.trim().toLowerCase();

  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, phone, interest, role, created_at')
    .or(`email.ilike.%${q}%,phone.ilike.%${q}%,name.ilike.%${q}%`)
    .limit(10);

  if (error) return next(new AppError('Lookup failed', 500));

  const results = [];

  for (const user of users || []) {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, qr_code_data, status, seat_number, meal_option, issued_by_admin, issued_at, registered_at, concert_id')
      .eq('user_id', user.id);

    results.push({
      ...user,
      tickets: tickets || [],
      hasRegistered: (tickets || []).length > 0,
    });
  }

  ok(res, results);
});

export const generateAdminTicket = catchAsync(async (req, res, next) => {
  const schema = z.object({
    userId: z.string().uuid('Invalid user ID'),
    concertId: z.string().uuid('Invalid concert ID'),
    seatNumber: z.string().min(1, 'Seat number is required'),
    mealOption: z.enum(['standard', 'vegetarian', 'vegan', 'none'], {
      errorMap: () => ({ message: 'Select a valid meal option' }),
    }),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(new AppError(result.error.errors.map(e => e.message).join(', '), 422));
  }

  const { userId, concertId, seatNumber, mealOption } = result.data;

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, phone, interest')
    .eq('id', userId)
    .single();

  if (!user) return next(new AppError('User not found', 404));

  const { data: concert } = await supabase
    .from('concerts')
    .select('id, title, venue_name, venue_address, date_time, available_slots')
    .eq('id', concertId)
    .single();

  if (!concert) return next(new AppError('Concert not found', 404));

  const { data: existing } = await supabase
    .from('tickets')
    .select('id, status, seat_number, meal_option')
    .eq('user_id', userId)
    .eq('concert_id', concertId)
    .maybeSingle();

  if (existing && existing.status === 'CONFIRMED') {
    return next(new AppError('This user already has a confirmed ticket for this concert', 409));
  }

  const { data: seatTaken } = await supabase
    .from('tickets')
    .select('id')
    .eq('concert_id', concertId)
    .eq('seat_number', seatNumber)
    .eq('status', 'CONFIRMED')
    .maybeSingle();

  if (seatTaken) {
    return next(new AppError('Seat ' + seatNumber + ' is already taken', 409));
  }

  const qrCodeData = generateQrPayload(userId, concertId);
  let ticket;

  if (existing && (existing.status === 'PENDING' || existing.status === 'CANCELLED')) {
    const { data: updated, error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'CONFIRMED',
        seat_number: seatNumber,
        meal_option: mealOption,
        qr_code_data: qrCodeData,
        issued_by_admin: true,
        issued_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) return next(new AppError('Failed to update ticket', 500));
    ticket = updated;
  } else {
    const { data: reg, error: insertError } = await supabase
      .from('tickets')
      .insert({
        user_id: userId,
        concert_id: concertId,
        qr_code_data: qrCodeData,
        status: 'CONFIRMED',
        seat_number: seatNumber,
        meal_option: mealOption,
        issued_by_admin: true,
        issued_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) return next(new AppError('Failed to create ticket', 500));
    ticket = reg;

    if (concert.available_slots > 0) {
      await supabase
        .from('concerts')
        .update({ available_slots: concert.available_slots - 1 })
        .eq('id', concertId);
    }
  }

  ok(res, { ticket, user, concert }, 201);
});

export const listTickets = catchAsync(async (req, res, next) => {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*, user:users(name, email, phone, interest), concert:concerts(title, venue_name, date_time)')
    .eq('status', 'CONFIRMED')
    .order('issued_at', { ascending: false });

  if (error) return next(new AppError('Failed to fetch tickets', 500));
  ok(res, tickets);
});

export const getStats = catchAsync(async (req, res, next) => {
  const { count: totalUsers } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  const { count: totalTickets } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'CONFIRMED');

  const { count: pendingCount } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  const { count: adminIssued } = await supabase
    .from('tickets')
    .select('id', { count: 'exact', head: true })
    .eq('issued_by_admin', true)
    .eq('status', 'CONFIRMED');

  const { data: concerts } = await supabase
    .from('concerts')
    .select('available_slots, total_capacity')
    .limit(1);

  const concert = concerts?.[0];

  ok(res, {
    totalUsers: totalUsers || 0,
    totalTickets: totalTickets || 0,
    pendingRegistrations: pendingCount || 0,
    adminIssued: adminIssued || 0,
    spotsLeft: concert ? concert.available_slots : 0,
    totalCapacity: concert ? concert.total_capacity : 0,
  });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', id)
    .single();

  if (!user) return next(new AppError('User not found', 404));

  if (user.role === 'ADMIN') {
    return next(new AppError('Cannot delete an admin account', 403));
  }

  await supabase.from('tickets').delete().eq('user_id', id);

  const { error } = await supabase.from('users').delete().eq('id', id);

  if (error) return next(new AppError('Failed to delete user', 500));

  ok(res, { message: 'User deleted successfully' });
});
