import { z } from 'zod';
import supabase from '../config/db.js';
import { ok } from '../utils/response.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

export const bookTicketSchema = z.object({
  concertId: z.string().uuid('Invalid concert ID'),
});

export const bookTicket = catchAsync(async (req, res, next) => {
  const { concertId } = req.body;
  const userId = req.user.id;

  const { data: concert, error: concertError } = await supabase
    .from('concerts')
    .select('id, title, artist, venue_name, venue_address, date_time, available_slots')
    .eq('id', concertId)
    .single();

  if (concertError || !concert) return next(new AppError('Concert not found', 404));

  if (new Date(concert.date_time) < new Date()) {
    return next(new AppError('This concert has already taken place', 422));
  }

  if (concert.available_slots <= 0) {
    return next(new AppError('This concert is fully booked', 409));
  }

  const { data: existing } = await supabase
    .from('tickets')
    .select('id, status')
    .eq('user_id', userId)
    .eq('concert_id', concertId)
    .maybeSingle();

  if (existing) {
    return next(new AppError('You are already registered for this concert', 409));
  }

  const { error: slotError } = await supabase
    .from('concerts')
    .update({ available_slots: concert.available_slots - 1 })
    .eq('id', concertId)
    .eq('available_slots', concert.available_slots);

  if (slotError) return next(new AppError('Could not reserve slot — please try again', 409));

  const { data: registration, error: regError } = await supabase
    .from('tickets')
    .insert({
      user_id: userId,
      concert_id: concertId,
      qr_code_data: 'PENDING',
      status: 'PENDING',
    })
    .select()
    .single();

  if (regError) {
    await supabase
      .from('concerts')
      .update({ available_slots: concert.available_slots })
      .eq('id', concertId);
    return next(new AppError('Failed to register', 500));
  }

  ok(res, { registration, message: 'Registration received. Your seat and meal will be assigned by the admin.' }, 201);
});

export const getMyTickets = catchAsync(async (req, res, next) => {
  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('*, concert:concerts(title, artist, venue_name, venue_address, date_time, image_url)')
    .eq('user_id', req.user.id)
    .order('registered_at', { ascending: false });

  if (error) return next(new AppError('Failed to fetch tickets', 500));
  ok(res, tickets);
});

export const cancelTicket = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('id, user_id, concert_id, status')
    .eq('id', id)
    .single();

  if (error || !ticket) return next(new AppError('Ticket not found', 404));
  if (ticket.user_id !== req.user.id) return next(new AppError('You do not own this ticket', 403));
  if (ticket.status === 'CANCELLED') return next(new AppError('Ticket is already cancelled', 400));

  await supabase.from('tickets').update({ status: 'CANCELLED' }).eq('id', id);

  const { data: concert } = await supabase
    .from('concerts')
    .select('available_slots')
    .eq('id', ticket.concert_id)
    .single();

  if (concert) {
    await supabase
      .from('concerts')
      .update({ available_slots: concert.available_slots + 1 })
      .eq('id', ticket.concert_id);
  }

  ok(res, { message: 'Registration cancelled' });
});
