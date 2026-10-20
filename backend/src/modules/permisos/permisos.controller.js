import * as s from './permisos.service.js';
import { ok } from '../../utils/response.js';

export const listarMios = async (req, res, next) => {
  try { ok(res, await s.listarClavesPorUsuario(req.user.id)); } catch (e) { next(e); }
};

export const listarMatriz = async (req, res, next) => {
  try { ok(res, await s.listarMatriz()); } catch (e) { next(e); }
};

export const actualizarRoles = async (req, res, next) => {
  try {
    await s.actualizarRolesDePermiso(req.params.id, req.body.roles || [], req.user.username);
    ok(res, null, 'Asignación actualizada');
  } catch (e) { next(e); }
};