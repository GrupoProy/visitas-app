import { Router } from 'express';
import { body, param, query as q } from 'express-validator';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
// usuarios.routes.js (arriba)
import * as ctrl from './usuarios.controller.js';
const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermiso('usuarios.listar'),
  [q('page').optional().isInt({ min: 1 }), q('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  ctrl.listar
);

router.post(
  '/:id/roles/:idRol',
  requirePermiso('usuarios.editar'),
  [param('id').isInt(), param('idRol').isInt()],
  validate,
  ctrl.asignarRol
);

router.delete(
  '/:id/roles/:idRol',
  requirePermiso('usuarios.editar'),
  [param('id').isInt(), param('idRol').isInt()],
  validate,
  ctrl.revocarRol
);

router.get('/:id', requirePermiso('usuarios.listar'), [param('id').isInt()], validate, ctrl.obtener);

const base = [
  body('username').trim().isLength({ min: 3 }),
  body('email').isEmail(),
  body('nombres').trim().notEmpty(),
  body('primer_apellido').trim().notEmpty(),
    body('id_persona').optional({ nullable: true }).isInt(),

];

router.post(
  '/',
  requirePermiso('usuarios.crear'),
  [...base, body('password').isLength({ min: 6 })],
  validate,
  ctrl.crear
);


router.put(
  '/:id',
  requirePermiso('usuarios.editar'),
  [param('id').isInt(), ...base, body('password').optional({ values: 'falsy' })],
  validate,
  ctrl.actualizar
);
/*
router.patch(
  '/:id/estado',
  requirePermiso('usuarios.cambiar_estado'),
  [param('id').isInt(), body('estado').isIn(['ACTIVO', 'INACTIVO', 'BLOQUEADO', 'ELIMINADO'])],
  validate,
  ctrl.cambiarEstado
);

router.patch(
  '/:id/password',
  requirePermiso('usuarios.resetear_password'),
  [param('id').isInt(), body('password').isLength({ min: 6 })],
  validate,
  ctrl.resetearPassword
);*/

router.patch(
  '/:id/estado',
  requirePermiso('usuarios.cambiar_estado'),
  [
    param('id').isInt(),
    body('estado').isIn(['ACTIVO', 'INACTIVO', 'BLOQUEADO', 'ELIMINADO']),
  ],
  validate,
  ctrl.cambiarEstado
);

router.post(
  '/:id/resetear-password',
  requirePermiso('usuarios.resetear_password'),
  [param('id').isInt()],
  validate,
  ctrl.resetearPassword
);


export default router;