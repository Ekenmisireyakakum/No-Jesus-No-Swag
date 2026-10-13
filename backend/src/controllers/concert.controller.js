import { z } from 'zod';
import supabase from '../config/db.js';
import { ok } from '../utils/response.js';
import { AppError, catchAsync } from '../middleware/errorHandler.js';

export const createConcertSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  description: z.string().optional(),
  venueName: z.string().min(1, 'Venue name is required'),
  venueAddress: z.string().min(1, 'Venue address is required'),
  dateTime: z.string().datetime('Invalid date — use ISO 8601'),
  totalCapacity: z.number().int().positive('Capacity must be a positive integer'),
  imageUrl: z.string().url().optional(),
});

export const getConcerts = catchAsync(async (req, res) => {
  const now = new Date().toISOString();

  const { data: concerts, error } = await supabase
    .from('concerts')
    .select('id, title, artist, venue_name, venue_address, date_time, available_slots, total_capacity, image_url')
    .gte('date_time', now)
    .order('date_time', { ascending: true });

  if (error) {
    console.error('Concerts fetch error:', error);
    throw new AppError(error.message || 'Failed to fetch concerts', 500);
  }
  ok(res, concerts);
});

export const getConcertById = catchAsync(async (req, res, next) => {
  const { data: concert, error } = await supabase
    .from('concerts')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !concert) return next(new AppError('Concert not found', 404));
  ok(res, concert);
});

export const createConcert = catchAsync(async (req, res, next) => {
  const { title, artist, description, venueName, venueAddress, dateTime, totalCapacity, imageUrl } = req.body;

  const { data: concert, error } = await supabase
    .from('concerts')
    .insert({
      title,
      artist,
      description,
      venue_name: venueName,
      venue_address: venueAddress,
      date_time: dateTime,
      total_capacity: totalCapacity,
      available_slots: totalCapacity,
      image_url: imageUrl,
    })
    .select()
    .single();

  if (error) return next(new AppError('Failed to create concert', 500));
  ok(res, concert, 201);
});
