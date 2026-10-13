import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  lookupUser,
  generateAdminTicket,
  listTickets,
  getStats,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(protect);
router.use(restrictTo('ADMIN'));

router.get('/stats', getStats);
router.get('/lookup', lookupUser);
router.post('/generate-ticket', generateAdminTicket);
router.get('/tickets', listTickets);

export default router;
