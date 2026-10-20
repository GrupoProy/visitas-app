import { Router } from 'express';
import { body, param, query as q } from 'express-validator';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './personas.controller.js';

const router = Router();
router.use(authenticate);

router.get(
  '/buscar',
  requirePermiso('autorizaciones.crear', 'personas.crear', 'personas.editar'),
  [q('tipo').notEmpty(), q('numero').notEmpty()],
  validate,
  ctrl.buscarPorDocumento
);

router.get(
  '/anfitriones',
  requirePermiso('autorizaciones.crear', 'autorizaciones.editar'),
  ctrl.listarAnfitriones
);

router.get(
  '/visitantes',
  requirePermiso('reportes.ver', 'personas.listar'),
  ctrl.listarVisitantes
);


router.get(
  '/',
  requirePermiso('personas.crear', 'personas.editar'),
  [q('page').optional().isInt({ min: 1 }), q('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  ctrl.listar
);
router.get(
  '/disponibles-usuario',
  requirePermiso('usuarios.crear', 'usuarios.editar'),
  ctrl.listarDisponiblesParaUsuario
);
router.get(
  '/:id',
  requirePermiso('personas.crear', 'personas.editar'),
  ctrl.obtener
);

const validacionesPersona = [
  body('tipo_documento').notEmpty(),
  body('numero_documento').trim().notEmpty(),
  body('nombres').trim().notEmpty(),
  body('primer_apellido').trim().notEmpty(),
  body('email').optional({ values: 'falsy' }).isEmail(),
  body('es_anfitrion').optional().isBoolean(),
];

router.post('/', requirePermiso('personas.crear'), validacionesPersona, validate, ctrl.crear);

router.put(
  '/:id',
  requirePermiso('personas.editar'),
  [param('id').isInt(), ...validacionesPersona],
  validate,
  ctrl.actualizar
);

router.patch(
  '/:id/estado',
  requirePermiso('personas.eliminar'),
  [param('id').isInt(), body('estado').isIn(['ACTIVO', 'INACTIVO', 'ELIMINADO'])],
  validate,
  ctrl.cambiarEstado
);


export default router;