// modules/limpieza/limpieza.controller.js
import { ejecutarLimpiezaCompleta, limpiarRefreshDeUsuario } from './limpieza.service.js';

export const ejecutarManual = async (req, res, next) => {
  try {
    const r = await ejecutarLimpiezaCompleta();
    res.json({ success: true, data: r });
  } catch (e) { next(e); }
};

export const limpiarUsuario = async (req, res, next) => {
  try {
    const { id } = req.params;
    const n = await limpiarRefreshDeUsuario(parseInt(id, 10), 0);
    res.json({ success: true, data: { eliminados: n } });
  } catch (e) { next(e); }
};