// middlewares/rateLimit.js
import rateLimit from 'express-rate-limit';
import { ENV } from '../config/env.js';

const MAX = parseInt(process.env.LOGIN_IP_MAX_INTENTOS || '20', 10);
const VENTANA_MIN = parseInt(process.env.LOGIN_IP_VENTANA_MINUTOS || '15', 10);

export const loginLimiter = rateLimit({
  windowMs: VENTANA_MIN * 60 * 1000,
  max: MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown',
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      code: 'IP_RATE_LIMIT',
      message: 'Demasiados intentos desde esta IP. Intente más tarde.',
    });
  },
});