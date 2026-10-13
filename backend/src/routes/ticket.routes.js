import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  bookTicket,
  getMyTickets,
  cancelTicket,
  bookTicketSchema,
} from '../controllers/ticket.controller.js';

const router = Router();

router.use(protect);

router.post('/', validate(bookTicketSchema), bookTicket);
router.get('/my-tickets', getMyTickets);
router.delete('/:id', cancelTicket);

export default router;
