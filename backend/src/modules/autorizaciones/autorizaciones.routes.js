import { Router } from 'express';
import { body, param, query as q } from 'express-validator';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import { validate } from '../../middlewares/validate.js';
import * as ctrl from './autorizaciones.controller.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermiso(
    'autorizaciones.ver_bitacora',
    'autorizaciones.crear',
    'autorizaciones.verificar'
  ),
  ctrl.listar
);

router.post(
  '/verificar-disponibilidad',
  requirePermiso('autorizaciones.crear', 'autorizaciones.editar'),
  [
    body('fecha_inicio').isISO8601(),
    body('fecha_fin').isISO8601(),
    body('id_persona').optional({ nullable: true }).isInt(),
    body('id_anfitrion').optional({ nullable: true }).isInt(),
  ],
  validate,
  ctrl.verificarDisponibilidad
);

router.get(
  '/verificar-por-documento',
  requirePermiso('autorizaciones.verificar'),
  [q('tipo').notEmpty(), q('numero').notEmpty()],
  validate,
  ctrl.verificarPorDocumento
);

router.get(
  '/verificar/:codigo',
  requirePermiso('autorizaciones.verificar'),
  [param('codigo').notEmpty()],
  validate,
  ctrl.verificar
);

router.post(
  '/',
  requirePermiso('autorizaciones.crear'),
  [
    body('visitante.tipo_documento').notEmpty(),
    body('visitante.numero_documento').notEmpty(),
    body('visitante.nombres').notEmpty(),
    body('visitante.primer_apellido').notEmpty(),

    // Anfitrión es opcional: si el usuario es solo ANFITRION,
    // el backend lo resuelve desde su propia persona.
    body('anfitrion').optional({ nullable: true }),
    body('anfitrion.tipo_documento').if(body('anfitrion').exists()).notEmpty(),
    body('anfitrion.numero_documento').if(body('anfitrion').exists()).notEmpty(),
    body('anfitrion.nombres').if(body('anfitrion').exists()).notEmpty(),
    body('anfitrion.primer_apellido').if(body('anfitrion').exists()).notEmpty(),

    body('id_lugar').isInt(),
    body('motivo').notEmpty(),
    body('fecha_inicio').isISO8601(),
    body('fecha_fin').isISO8601(),
  ],
  validate,
  ctrl.crear
);
router.post(
  '/ejecutar-expiracion',
  requirePermiso('parametros.editar'),   // solo ADMIN
  ctrl.ejecutarExpiracion
);
router.put(
  '/:id',
  requirePermiso('autorizaciones.editar'),
  [
    param('id').isInt(),
    body('id_lugar').optional().isInt(),
    body('id_anfitrion').optional().isInt(),
    body('motivo').optional().isString(),
    body('fecha_inicio').optional().isISO8601(),
    body('fecha_fin').optional().isISO8601(),
  ],
  validate,
  ctrl.actualizar
);

router.patch(
  '/:id/estado',
  requirePermiso(
    'autorizaciones.aprobar',
    'autorizaciones.rechazar',
    'autorizaciones.cancelar',
    'autorizaciones.reactivar'
  ),
  [param('id').isInt(), body('estado').notEmpty()],
  validate,
  ctrl.cambiarEstado
);

router.get(
  '/:id/bitacora',
  requirePermiso('autorizaciones.ver_bitacora'),
  [param('id').isInt()],
  validate,
  ctrl.listarBitacora
);

router.patch(
  '/:id/finalizar',
  requirePermiso('autorizaciones.regularizar'),
  [
    param('id').isInt(),
    body('fecha_salida_real').optional().isISO8601(),
    body('observacion').optional().isString(),
  ],
  validate,
  ctrl.finalizarVisita
);

export default router;