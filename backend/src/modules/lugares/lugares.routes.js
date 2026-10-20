import { Router } from 'express';
import { body, param, query as q } from 'express-validator';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './lugares.controller.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermiso('autorizaciones.crear', 'lugares.crear', 'lugares.editar'),
  [q('page').optional().isInt({ min: 1 }), q('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  ctrl.listar
);

router.get(
  '/:id',
  requirePermiso('lugares.crear', 'lugares.editar'),
  ctrl.obtener
);

router.post(
  '/',
  requirePermiso('lugares.crear'),
  [body('nombre').trim().notEmpty()],
  validate,
  ctrl.crear
);

router.put(
  '/:id',
  requirePermiso('lugares.editar'),
  [param('id').isInt(), body('nombre').trim().notEmpty()],
  validate,
  ctrl.actualizar
);

router.patch(
  '/:id/estado',
  requirePermiso('lugares.eliminar'),
  [param('id').isInt(), body('estado').isIn(['ACTIVO', 'INACTIVO', 'ELIMINADO'])],
  validate,
  ctrl.cambiarEstado
);

export default router;