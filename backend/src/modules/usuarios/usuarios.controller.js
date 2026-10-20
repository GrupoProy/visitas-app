// usuarios.controller.js
import * as s from './usuarios.service.js';
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
  try {
    created(res, await s.crear(req.body, req.user.username), 'Usuario creado');
  } catch (e) { next(e); }
};

export const actualizar = async (req, res, next) => {
  try {
    ok(res, await s.actualizar(req.params.id, req.body, req.user.username), 'Usuario actualizado');
  } catch (e) { next(e); }
};

export const cambiarEstado = async (req, res, next) => {
  try {
    ok(res, await s.cambiarEstado(
      req.params.id,
      req.body.estado,
      { usuarioId: req.user.id, username: req.user.username }
    ));
  } catch (e) { next(e); }
};

export const resetearPassword = async (req, res, next) => {
  try {
    const { passwordTemporal } = await s.resetearPassword({
      idUsuario: parseInt(req.params.id, 10),
      adminUsername: req.user.username,
    });
    ok(res, { passwordTemporal },
      'Contraseña reseteada. Anote la temporal, no se mostrará nuevamente.');
  } catch (e) { next(e); }
};

export const asignarRol = async (req, res, next) => {
  try {
    ok(res, await s.asignarRol(
      req.params.id,
      req.params.idRol,
      req.user.username
    ), 'Rol asignado');
  } catch (e) { next(e); }
};

export const revocarRol = async (req, res, next) => {
  try {
    ok(res, await s.revocarRol(
      req.params.id,
      req.params.idRol,
      req.user.username
    ), 'Rol revocado');
  } catch (e) { next(e); }
};