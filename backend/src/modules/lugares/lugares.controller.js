import * as s from './lugares.service.js';
import { ok, created } from '../../utils/response.js';

export const listar = async (req, res, next) => {
  try {
    ok(res, await s.listar({
      q: req.query.q,
      estado: req.query.estado,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    }));
  } catch (e) { next(e); }
};

export const obtener = async (req, res, next) => {
  try { ok(res, await s.obtener(req.params.id)); } catch (e) { next(e); }
};

export const crear = async (req, res, next) => {
  try { created(res, await s.crear(req.body, req.user.username), 'Lugar creado'); } catch (e) { next(e); }
};

export const actualizar = async (req, res, next) => {
  try { ok(res, await s.actualizar(req.params.id, req.body, req.user.username), 'Lugar actualizado'); } catch (e) { next(e); }
};

export const cambiarEstado = async (req, res, next) => {
  try {
    const { estado } = req.body;
    if (estado === 'ELIMINADO') await s.validarSinAutorizacionesActivas(req.params.id);
    ok(res, await s.cambiarEstado(req.params.id, estado, req.user.username));
  } catch (e) { next(e); }
};