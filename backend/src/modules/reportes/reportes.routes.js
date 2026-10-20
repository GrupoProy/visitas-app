// modules/reportes/reportes.routes.js
import { Router } from 'express';
import { query as q } from 'express-validator';
import { authenticate, requirePasswordChanged } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './reportes.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChanged);
router.use(requirePermiso('reportes.ver'));

const filtrosComunes = [
  q('desde').optional().isISO8601(),
  q('hasta').optional().isISO8601(),
  q('id_lugar').optional().isInt({ min: 1 }),
  q('id_anfitrion').optional().isInt({ min: 1 }),
  q('id_persona').optional().isInt({ min: 1 }),
  q('agrupacion').optional().isIn(['dia', 'semana', 'mes']),
];

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------
router.get('/por-periodo',   filtrosComunes, validate, ctrl.porPeriodo);
router.get('/por-lugar',     filtrosComunes, validate, ctrl.porLugar);
router.get('/por-anfitrion', filtrosComunes, validate, ctrl.porAnfitrion);
router.get('/por-visitante', filtrosComunes, validate, ctrl.porVisitante);

// ---------------------------------------------------------------------------
// Exportaciones (deben ir DESPUÉS de las rutas específicas)
// ---------------------------------------------------------------------------
router.get('/:tipo/export', filtrosComunes, validate, ctrl.exportar);
router.get('/:tipo/pdf',    filtrosComunes, validate, ctrl.exportarPDF);

export default router;