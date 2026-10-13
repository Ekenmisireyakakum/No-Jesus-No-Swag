import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { register, login, registerSchema, loginSchema } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

export default router;
