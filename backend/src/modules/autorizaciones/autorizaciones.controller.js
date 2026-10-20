// modules/autorizaciones/autorizaciones.controller.js
import * as s from './autorizaciones.service.js';
import { expirarVencidasRapido } from './expiracion.service.js';
import { ok, created } from '../../utils/response.js';
import { obtenerConfigHorario, toFechaLocal } from '../../utils/horario.js';

// =============================================================================
// Helpers
// =============================================================================
const esSoloAnfitrion = (user) =>
  user.roles?.length === 1 && user.roles.includes('ANFITRION');

// =============================================================================
// LISTAR
// =============================================================================
export const listar = async (req, res, next) => {
  try {
    // Limpieza lazy (rápida, con índice)
    await expirarVencidasRapido();

    // Si el usuario es SOLO ANFITRION → filtrar por su id_persona
    const soloAnfitrion = esSoloAnfitrion(req.user);
    const idAnfitrion = soloAnfitrion ? req.user.id_persona : null;

    // Si es solo anfitrión pero no tiene persona asociada, no verá nada
    if (soloAnfitrion && !idAnfitrion) {
      return ok(res, { items: [], total: 0, page: 1, limit: 20 });
    }

    ok(res, await s.listar({
      estado:         req.query.estado,
      desde:          req.query.desde,
      hasta:          req.query.hasta,
      id_persona:     req.query.id_persona,
      id_anfitrion:   idAnfitrion,
      solo_huerfanas: req.query.solo_huerfanas === 'true' || req.query.solo_huerfanas === '1',
      q:              req.query.q,
      page:           Number(req.query.page) || 1,
      limit:          Number(req.query.limit) || 20,
    }));
  } catch (e) { next(e); }
};

// =============================================================================
// BITÁCORA
// =============================================================================
export const listarBitacora = async (req, res, next) => {
  try {
    // ⭐ SEGURIDAD: si es solo anfitrión, verificar que la autorización sea suya
    if (esSoloAnfitrion(req.user)) {
      if (!req.user.id_persona) {
        return res.status(403).json({
          success: false,
          code: 'USUARIO_SIN_PERSONA',
          message: 'Tu usuario no está vinculado a una persona',
        });
      }
      const aut = await s.obtenerPorId(req.params.id);
      if (Number(aut.id_anfitrion) !== Number(req.user.id_persona)) {
        return res.status(403).json({
          success: false,
          code: 'ANFITRION_NO_AUTORIZADO',
          message: 'No tenés permiso para ver esta autorización',
        });
      }
    }

    ok(res, await s.listarBitacora(req.params.id));
  } catch (e) { next(e); }
};

// =============================================================================
// CREAR
// =============================================================================
export const crear = async (req, res, next) => {
  try {
    // El service hace el guard de seguridad internamente
    created(res, await s.crear(req.body, req.user.username), 'Autorización creada');
  } catch (e) { next(e); }
};

// =============================================================================
// CAMBIAR ESTADO
// =============================================================================
export const cambiarEstado = async (req, res, next) => {
  try {
    // El service hace el guard de seguridad internamente
    ok(res, await s.cambiarEstado(req.params.id, req.body.estado, req.user.username));
  } catch (e) { next(e); }
};

// =============================================================================
// VERIFICAR (por código)
// =============================================================================
export const verificar = async (req, res, next) => {
  try {
    const data = await s.verificar(
      req.params.codigo,
      req.query.punto || 'PUERTA_PRINCIPAL',
      req.user.username
    );
    ok(res, data, `Acceso ${data.resultado}`);
  } catch (e) { next(e); }
};

// =============================================================================
// VERIFICAR (por documento)
// =============================================================================
export const verificarPorDocumento = async (req, res, next) => {
  try {
    const { tipo, numero } = req.query;
    if (!tipo || !numero)
      return res.status(400).json({
        success: false,
        message: 'Parámetros "tipo" y "numero" son requeridos',
      });

    const data = await s.verificarPorDocumento(
      tipo,
      numero,
      req.query.punto || 'PUERTA_PRINCIPAL',
      req.user.username
    );
    ok(res, data, `Verificación por documento: ${data.resultado}`);
  } catch (e) { next(e); }
};

// =============================================================================
// VERIFICAR DISPONIBILIDAD
// =============================================================================
export const verificarDisponibilidad = async (req, res, next) => {
  try {
    const { id_persona, fecha_inicio, fecha_fin } = req.body;

    // Validar feriado antes de devolver disponibilidad
    const ini = new Date(fecha_inicio);
    const cfg = await obtenerConfigHorario();
    const fechaStr = toFechaLocal(ini);
    if (cfg.diasFeriados.includes(fechaStr)) {
      return ok(res, {
        disponible: false,
        motivo: `El ${fechaStr} es feriado`,
        conflictos: [],
      });
    }

    ok(res, await s.verificarDisponibilidad({
      idPersona:   id_persona ? Number(id_persona) : null,
      fechaInicio: fecha_inicio,
      fechaFin:    fecha_fin,
    }));
  } catch (e) { next(e); }
};

// =============================================================================
// ACTUALIZAR
// =============================================================================
export const actualizar = async (req, res, next) => {
  try {
    // El service hace el guard de seguridad internamente
    ok(res,
       await s.actualizar(req.params.id, req.body, req.user.username),
       'Autorización actualizada');
  } catch (e) { next(e); }
};

// =============================================================================
// EJECUTAR EXPIRACIÓN (manual)
// =============================================================================
export const ejecutarExpiracion = async (req, res, next) => {
  try {
    const total = await expirarVencidasRapido();
    ok(res, { total }, `Expiradas ${total} autorizaciones`);
  } catch (e) { next(e); }
};

// =============================================================================
// FINALIZAR VISITA (huérfanas)
// =============================================================================
export const finalizarVisita = async (req, res, next) => {
  try {
    // El service hace el guard de seguridad internamente
    ok(res,
       await s.finalizarVisita(req.params.id, req.body, req.user.username),
       'Visita finalizada');
  } catch (e) { next(e); }
};