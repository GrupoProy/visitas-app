// modules/auth/auth.controller.js
import { loginService, obtenerPerfil } from './auth.service.js';
import { rotarRefresh, revocarRefresh } from './refresh.service.js';
import { cambiarPassword } from './password.service.js';
import { listarClavesPorUsuario } from '../permisos/permisos.service.js';

const ipDe = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.socket?.remoteAddress ||
  null;

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const data = await loginService({
      username,
      password,
      ip: ipDe(req),
      userAgent: req.headers['user-agent'] || '',
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        code: 'REFRESH_MISSING',
        message: 'refreshToken es requerido',
      });
    }

    const r = await rotarRefresh({
      refreshToken,
      ip: ipDe(req),
      userAgent: req.headers['user-agent'] || '',
    });

    const perfil = await obtenerPerfil(r.usuario.id);
    const permisos = await listarClavesPorUsuario(r.usuario.id);

    res.json({
      success: true,
      data: {
        accessToken: r.accessToken,
        refreshToken: r.refreshToken,
        refreshExpiraEn: r.refreshExpiraEn,
        usuario: { ...perfil, permisos },
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revocarRefresh(refreshToken, req.user?.username || 'anonimo');
    }
    res.json({ success: true, message: 'Sesión cerrada' });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const me = async (req, res, next) => {
  try {
    const perfil = await obtenerPerfil(req.user.id);
    const permisos = await listarClavesPorUsuario(req.user.id);
    res.json({
      success: true,
      data: { usuario: { ...perfil, permisos } },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    await cambiarPassword({
      idUsuario: req.user.id,
      username: req.user.username,
      passwordActual,
      passwordNueva,
    });
    res.json({
      success: true,
      message: 'Contraseña actualizada. Debe iniciar sesión nuevamente.',
      data: { requiereReLogin: true },
    });
  } catch (err) {
    next(err);
  }
};