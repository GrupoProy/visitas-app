// modules/auditoria/auditoria.routes.js
import { Router } from 'express';
import { param, query as q } from 'express-validator';
import { authenticate, requirePasswordChanged } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './auditoria.controller.js';

const router = Router();

// Todas las rutas requieren autenticación + password cambiada + permiso
router.use(authenticate, requirePasswordChanged);
router.use(requirePermiso('auditoria.ver'));

// ---------------------------------------------------------------------------
// Listado con filtros
// ---------------------------------------------------------------------------
router.get(
  '/login',
  [
    q('page').optional().isInt({ min: 1 }),
    q('limit').optional().isInt({ min: 1, max: 200 }),
    q('desde').optional().isISO8601(),
    q('hasta').optional().isISO8601(),
    q('resultado').optional().isIn(['exitosos', 'fallidos', 'bloqueados']),
    q('motivo').optional().isString(),
    q('q').optional().isString(),
  ],
  validate,
  ctrl.listarIntentos
);

// ---------------------------------------------------------------------------
// Exportación CSV (antes de /:id para no colisionar)
// ---------------------------------------------------------------------------
router.get(
  '/login/export',
  [
    q('desde').optional().isISO8601(),
    q('hasta').optional().isISO8601(),
    q('resultado').optional().isIn(['exitosos', 'fallidos', 'bloqueados']),
    q('motivo').optional().isString(),
    q('q').optional().isString(),
  ],
  validate,
  ctrl.exportarCsv
);

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------
router.get(
  '/login/:id',
  [param('id').isInt({ min: 1 })],
  validate,
  ctrl.obtenerIntento
);

// ---------------------------------------------------------------------------
// Resumen (KPIs)
// ---------------------------------------------------------------------------
router.get(
  '/resumen',
  [q('horas').optional().isInt({ min: 1, max: 720 })],
  validate,
  ctrl.resumen
);

// ---------------------------------------------------------------------------
// Sesiones activas
// ---------------------------------------------------------------------------
router.get(
  '/sesiones',
  [
    q('page').optional().isInt({ min: 1 }),
    q('limit').optional().isInt({ min: 1, max: 200 }),
  ],
  validate,
  ctrl.sesionesActivas
);

export default router;