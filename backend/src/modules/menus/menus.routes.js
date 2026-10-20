import { Router } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './menus.controller.js';

const router = Router();
router.use(authenticate);

router.get('/mios', ctrl.listarMios);
router.get('/matriz', requirePermiso('menus.gestionar'), ctrl.listarMatriz);

router.put(
  '/:id/roles',
  requirePermiso('menus.gestionar'),
  [param('id').isInt(), body('roles').isArray()],
  validate,
  ctrl.actualizarRoles
);

export default router;