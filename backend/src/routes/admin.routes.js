import { Router } from 'express';
import { protect, restrictTo } from '../middleware/auth.js';
import {
  lookupUser,
  generateAdminTicket,
  listTickets,
  getStats,
  deleteUser,
} from '../controllers/admin.controller.js';

const router = Router();

router.use(protect);
router.use(restrictTo('ADMIN'));

router.get('/stats', getStats);
router.get('/lookup', lookupUser);
router.post('/generate-ticket', generateAdminTicket);
router.get('/tickets', listTickets);
router.delete('/users/:id', deleteUser);

export default router;
