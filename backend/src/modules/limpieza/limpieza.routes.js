// modules/limpieza/limpieza.routes.js
import { Router } from 'express';
import { authenticate, requirePasswordChanged } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { ejecutarManual, limpiarUsuario } from './limpieza.controller.js';

const router = Router();

router.use(authenticate, requirePasswordChanged);

router.post(
  '/ejecutar',
  requirePermiso('parametros.editar'),  // o un permiso dedicado
  ejecutarManual
);

router.delete(
  '/usuario/:id/sesiones',
  requirePermiso('usuarios.editar'),
  limpiarUsuario
);

export default router;