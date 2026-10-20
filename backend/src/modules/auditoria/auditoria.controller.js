// modules/auditoria/auditoria.controller.js
import * as s from './auditoria.service.js';
import { ok } from '../../utils/response.js';

// GET /api/auditoria/login
export const listarIntentos = async (req, res, next) => {
  try {
    const data = await s.listarIntentos({
      q: req.query.q,
      desde: req.query.desde,
      hasta: req.query.hasta,
      resultado: req.query.resultado,
      motivo: req.query.motivo,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    ok(res, data);
  } catch (e) { next(e); }
};

// GET /api/auditoria/login/:id
export const obtenerIntento = async (req, res, next) => {
  try {
    ok(res, await s.obtenerIntento(Number(req.params.id)));
  } catch (e) { next(e); }
};

// GET /api/auditoria/resumen?horas=24
export const resumen = async (req, res, next) => {
  try {
    const horas = Number(req.query.horas) || 24;
    ok(res, await s.obtenerResumen({ horas }));
  } catch (e) { next(e); }
};

// GET /api/auditoria/sesiones
export const sesionesActivas = async (req, res, next) => {
  try {
    const data = await s.listarSesionesActivas({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
    });
    ok(res, data);
  } catch (e) { next(e); }
};

// GET /api/auditoria/login/export
export const exportarCsv = async (req, res, next) => {
  try {
    const filas = await s.listarParaExport({
      q: req.query.q,
      desde: req.query.desde,
      hasta: req.query.hasta,
      resultado: req.query.resultado,
      motivo: req.query.motivo,
    });

    // Generar CSV
    const cabecera = ['Fecha', 'Usuario', 'IP', 'User-Agent', 'Resultado', 'Motivo'];
    const lineas = [cabecera.join(',')];

    for (const f of filas) {
      const resultado = f.exitoso ? 'EXITOSO' : 'FALLIDO';
      const motivo = f.motivo_fallo || '';
      const campos = [
        formatearFecha(f.fecha),
        f.username || '',
        f.ip || '',
        f.user_agent || '',
        resultado,
        motivo,
      ].map(escaparCsv);
      lineas.push(campos.join(','));
    }

    // BOM para Excel (evita problemas con acentos)
    const csv = '\uFEFF' + lineas.join('\r\n');

    const nombre = `auditoria-login-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(csv);
  } catch (e) { next(e); }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const d = new Date(fecha);
  // Formato local America/La_Paz
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

const escaparCsv = (valor) => {
  if (valor === null || valor === undefined) return '';
  const s = String(valor);
  // Si contiene coma, comilla o salto de línea, envolver en comillas y duplicar las internas
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};