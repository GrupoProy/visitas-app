import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './parametros.controller.js';

const router = Router();
router.use(authenticate);

// Públicos: cualquier autenticado (para validaciones del frontend)
router.get('/publicos', ctrl.listarPublicos);

router.get('/grupos', requirePermiso('parametros.listar'), ctrl.listarGrupos);
router.get('/', requirePermiso('parametros.listar'), ctrl.listar);

router.post(
  '/',
  requirePermiso('parametros.crear'),
  [
    body('clave').trim().notEmpty(),
    body('valor').notEmpty(),
    body('tipo_dato').optional().isIn(['STRING', 'INT', 'BOOLEAN', 'JSON', 'DATE']),
  ],
  validate,
  ctrl.crear
);

router.get('/estados', ctrl.obtenerEstados);


router.put(
  '/:id',
  requirePermiso('parametros.editar'),
  [param('id').isInt()],
  validate,
  ctrl.actualizar
);

router.patch(
  '/:id/estado',
  requirePermiso('parametros.eliminar'),
  [param('id').isInt(), body('estado').isIn(['ACTIVO', 'INACTIVO', 'ELIMINADO'])],
  validate,
  ctrl.cambiarEstado
);

export default router;