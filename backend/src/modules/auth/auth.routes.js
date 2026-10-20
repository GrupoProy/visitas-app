// modules/auth/auth.routes.js
import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/auth.js';
import { loginLimiter } from '../../middlewares/rateLimit.js';
import {
  login, refresh, logout, me, changePassword,
} from './auth.controller.js';

const router = Router();

// Públicas
router.post(
  '/login',
  loginLimiter,
  [
    body('username').notEmpty().withMessage('username es requerido'),
    body('password').notEmpty().withMessage('password es requerido'),
  ],
  validate,
  login
);

router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('refreshToken es requerido')],
  validate,
  refresh
);

// Autenticadas
router.get('/me', authenticate, me);

router.post(
  '/logout',
  authenticate,
  [body('refreshToken').optional()],
  validate,
  logout
);

router.post(
  '/change-password',
  authenticate,
  [
    body('passwordActual').notEmpty().withMessage('passwordActual es requerido'),
    body('passwordNueva')
      .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
  ],
  validate,
  changePassword
);

export default router;