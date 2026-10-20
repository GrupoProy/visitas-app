import * as s from './parametros.service.js';
import { ok, created } from '../../utils/response.js';

export const listar = async (req, res, next) => {
  try {
    ok(res, await s.listar({
      grupo: req.query.grupo,
      q: req.query.q,
      soloPublicos: req.query.publicos === 'true',
    }));
  } catch (e) { next(e); }
};

export const listarPublicos = async (req, res, next) => {
  try { ok(res, await s.listarPublicos()); } catch (e) { next(e); }
};

export const listarGrupos = async (req, res, next) => {
  try { ok(res, await s.listarGrupos()); } catch (e) { next(e); }
};

export const crear = async (req, res, next) => {
  try { created(res, await s.crear(req.body, req.user.username), 'Parámetro creado'); }
  catch (e) { next(e); }
};

export const actualizar = async (req, res, next) => {
  try { ok(res, await s.actualizar(req.params.id, req.body, req.user.username), 'Parámetro actualizado'); }
  catch (e) { next(e); }
};

export const cambiarEstado = async (req, res, next) => {
  try { ok(res, await s.cambiarEstado(req.params.id, req.body.estado, req.user.username)); }
  catch (e) { next(e); }
};

export const obtenerEstados = async (req, res, next) => {
  try { ok(res, await s.obtenerEstados()); } catch (e) { next(e); }
};