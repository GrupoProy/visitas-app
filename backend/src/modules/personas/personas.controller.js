import * as s from './personas.service.js';
import { ok, created } from '../../utils/response.js';

export const buscarPorDocumento = async (req, res, next) => {
  try {
    const { tipo, numero } = req.query;
    if (!tipo || !numero)
      return res.status(400).json({ success: false, message: 'tipo y numero son requeridos' });
    ok(res, await s.buscarPorDocumento(tipo, numero));
  } catch (e) { next(e); }
};

export const listar = async (req, res, next) => {
  try {
    ok(res, await s.listar({
      q: req.query.q,
      estado: req.query.estado,
      es_anfitrion: req.query.es_anfitrion,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    }));
  } catch (e) { next(e); }
};

export const listarAnfitriones = async (req, res, next) => {
  try { ok(res, await s.listarAnfitriones({ q: req.query.q })); } catch (e) { next(e); }
};

export const obtener = async (req, res, next) => {
  try { ok(res, await s.obtener(req.params.id)); } catch (e) { next(e); }
};

export const crear = async (req, res, next) => {
  try {
    const { tipo_documento, numero_documento } = req.body;

    // Validar duplicado ANTES de crear
    const existente = await s.buscarPorDocumento(tipo_documento, numero_documento);
    if (existente) {
      return res.status(409).json({
        success: false,
        message: `Ya existe una persona registrada con ${tipo_documento} ${numero_documento}.`,
        data: {
          id: existente.id,
          nombres: existente.nombres,
          primer_apellido: existente.primer_apellido,
          segundo_apellido: existente.segundo_apellido,
          email: existente.email,
          procedencia: existente.procedencia,
        },
      });
    }

    // Crear
    const { persona } = await s.obtenerOCrear(req.body, req.user.username);
    created(res, persona, 'Persona creada');
  } catch (e) { next(e); }
};

export const actualizar = async (req, res, next) => {
  try {
    ok(res, await s.actualizar(req.params.id, req.body, req.user.username), 'Persona actualizada');
  } catch (e) { next(e); }
};

export const cambiarEstado = async (req, res, next) => {
  try {
    const { estado } = req.body;
    if (estado === 'ELIMINADO') await s.validarSinAutorizacionesActivas(req.params.id);
    ok(res, await s.cambiarEstado(req.params.id, estado, req.user.username));
  } catch (e) { next(e); }
};

export const listarDisponiblesParaUsuario = async (req, res, next) => {
  try {
    ok(res, await s.listarDisponiblesParaUsuario({
      incluirIdUsuario: req.query.usuario_id ? Number(req.query.usuario_id) : null,
    }));
  } catch (e) { next(e); }
};

export const listarVisitantes = async (req, res, next) => {
  try {
    ok(res, await s.listarVisitantes());
  } catch (e) { next(e); }
};