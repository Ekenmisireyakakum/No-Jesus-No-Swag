import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getConcerts,
  getConcertById,
  createConcert,
  createConcertSchema,
} from '../controllers/concert.controller.js';

const router = Router();

router.get('/', getConcerts);
router.get('/:id', getConcertById);
router.post('/', protect, restrictTo('ADMIN'), validate(createConcertSchema), createConcert);

export default router;
