import { listarClavesPorUsuario } from '../modules/permisos/permisos.service.js';

const cache = new Map();
const TTL = 60 * 1000;

const obtenerPermisos = async (userId) => {
  const ahora = Date.now();
  const entry = cache.get(userId);
  if (entry && ahora - entry.ts < TTL) return entry.permisos;

  const permisos = await listarClavesPorUsuario(userId);
  cache.set(userId, { permisos, ts: ahora });
  return permisos;
};

export const invalidarCachePermisos = (userId = null) => {
  if (userId) cache.delete(userId);
  else cache.clear();
};

export const requirePermiso = (...clavesRequeridas) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'No autenticado' });
      }

      const permisos = await obtenerPermisos(userId);
      const tiene = clavesRequeridas.some((c) => permisos.includes(c));

      if (!tiene) {
        return res.status(403).json({
          success: false,
          message: `Sin permiso. Se requiere uno de: ${clavesRequeridas.join(', ')}`,
        });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
};