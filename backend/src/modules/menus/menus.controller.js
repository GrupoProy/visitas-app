import * as s from './menus.service.js';
import { ok } from '../../utils/response.js';

export const listarMios = async (req, res, next) => {
  try { ok(res, await s.listarPorUsuario(req.user.id)); } catch (e) { next(e); }
};

export const listarMatriz = async (req, res, next) => {
  try { ok(res, await s.listarMatriz()); } catch (e) { next(e); }
};

export const actualizarRoles = async (req, res, next) => {
  try {
    await s.actualizarRolesDeMenu(req.params.id, req.body.roles || [], req.user.username);
    ok(res, null, 'Asignación actualizada');
  } catch (e) { next(e); }
};