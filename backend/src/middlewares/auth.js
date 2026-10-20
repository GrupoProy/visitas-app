// middlewares/auth.js
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      code: 'TOKEN_MISSING',
      message: 'Token no proporcionado',
    });
  }

  try {
    req.user = jwt.verify(header.split(' ')[1], ENV.JWT_SECRET);
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
    return res.status(401).json({
      success: false,
      code,
      message: code === 'TOKEN_EXPIRED' ? 'Token expirado' : 'Token inválido o expirado',
    });
  }
};

export const authorize = (...rolesPermitidos) => (req, res, next) => {
  const roles = req.user?.roles || [];
  if (!roles.some((r) => rolesPermitidos.includes(r))) {
    return res.status(403).json({
      success: false,
      code: 'FORBIDDEN',
      message: 'Sin permisos para esta acción',
    });
  }
  next();
};

export const requirePasswordChanged = (req, res, next) => {
  if (req.user?.mustChangePassword === true) {
    return res.status(403).json({
      success: false,
      code: 'MUST_CHANGE_PASSWORD',
      message: 'Debe cambiar su contraseña antes de continuar.',
    });
  }
  next();
};

/** Atajo: authenticate + requirePasswordChanged */
export const authenticateAndReady = [authenticate, requirePasswordChanged];