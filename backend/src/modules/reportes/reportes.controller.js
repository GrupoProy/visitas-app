// modules/reportes/reportes.controller.js
import * as s from './reportes.service.js';
import { ok } from '../../utils/response.js';
import { generarPDF } from './reportes.pdf.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const parseFiltros = (req) => ({
  desde: req.query.desde,
  hasta: req.query.hasta,
  id_lugar: req.query.id_lugar ? Number(req.query.id_lugar) : undefined,
  id_anfitrion: req.query.id_anfitrion ? Number(req.query.id_anfitrion) : undefined,
  id_persona: req.query.id_persona ? Number(req.query.id_persona) : undefined,
  agrupacion: req.query.agrupacion || 'dia',
});

const escaparCsv = (valor) => {
  if (valor === null || valor === undefined) return '';
  const s = String(valor);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const formatearPeriodo = (desde, hasta) => {
  if (!desde && !hasta) return 'Todo el histórico';
  const f = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  };
  return `${f(desde)} – ${f(hasta)}`;
};

const construirResumen = (tipo, datos) => {
  if (tipo === 'periodo' && datos.filtros?.resumen) {
    const r = datos.filtros.resumen;
    return {
      'Total de visitas': r.total,
      'Finalizadas': r.finalizadas,
      'Canceladas': r.canceladas,
      'Rechazadas': r.rechazadas,
      'Expiradas': r.expiradas,
      'En curso': r.enCurso,
      'Visitantes únicos': r.visitantesUnicos,
      'Duración promedio (min)': r.duracionPromedioMin,
    };
  }
  if (datos.filtros?.total) {
    return {
      'Registros en el reporte': datos.filas.length,
      'Total de visitas': datos.filtros.total,
    };
  }
  return {};
};

// ---------------------------------------------------------------------------
// Endpoints JSON
// ---------------------------------------------------------------------------
export const porPeriodo = async (req, res, next) => {
  try { ok(res, await s.reportePeriodo(parseFiltros(req))); } catch (e) { next(e); }
};

export const porLugar = async (req, res, next) => {
  try { ok(res, await s.reportePorLugar(parseFiltros(req))); } catch (e) { next(e); }
};

export const porAnfitrion = async (req, res, next) => {
  try { ok(res, await s.reportePorAnfitrion(parseFiltros(req))); } catch (e) { next(e); }
};

export const porVisitante = async (req, res, next) => {
  try { ok(res, await s.reportePorVisitante(parseFiltros(req))); } catch (e) { next(e); }
};

// ---------------------------------------------------------------------------
// Export CSV
// ---------------------------------------------------------------------------
export const exportar = async (req, res, next) => {
  try {
    const { tipo } = req.params;
    const r = await s.exportarReporte({ tipo, ...parseFiltros(req) });

    const lineas = [r.cabecera.join(',')];
    for (const fila of r.filas) {
      lineas.push(fila.map(escaparCsv).join(','));
    }
    const csv = '\uFEFF' + lineas.join('\r\n');

    const nombre = `reporte-${tipo}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(csv);
  } catch (e) { next(e); }
};

// ---------------------------------------------------------------------------
// Export PDF
// ---------------------------------------------------------------------------
/*export const exportarPDF = async (req, res, next) => {
  try {
    const { tipo } = req.params;
    const filtros = parseFiltros(req);

    const datos = await s.exportarReporte({ tipo, ...filtros });

    const titulos = {
      periodo:   'Reporte de Visitas por Período',
      lugar:     'Reporte de Visitas por Lugar',
      anfitrion: 'Reporte de Visitas por Anfitrión',
      visitante: 'Reporte de Visitas por Visitante',
    };

    const meta = {
      titulo: titulos[tipo] || 'Reporte',
      subtitulo: 'Sistema de Registro y Autorización de Visitas',
      periodo: formatearPeriodo(filtros.desde, filtros.hasta),
      generadoPor: req.user?.username || 'Sistema',
      generadoEn: new Date().toLocaleString('es-BO'),
      nombreArchivo: `reporte-${tipo}-${new Date().toISOString().slice(0, 10)}.pdf`,
    };

    const resumen = construirResumen(tipo, datos);

    const tabla = {
      cabecera: datos.cabecera,
      filas: datos.filas,
      
    };

    generarPDF({ meta, resumen, tabla }, res);
  } catch (e) { next(e); }
};*/


export const exportarPDF = async (req, res, next) => {
  try {
    const { tipo } = req.params;
    const filtros = parseFiltros(req);

    const datos = await s.exportarReporte({ tipo, ...filtros });

    const titulos = {
      periodo:   'Reporte de Visitas por Período',
      lugar:     'Reporte de Visitas por Lugar',
      anfitrion: 'Reporte de Visitas por Anfitrión',
      visitante: 'Reporte de Visitas por Visitante',
    };

    const meta = {
      titulo: titulos[tipo] || 'Reporte',
      subtitulo: 'Sistema de Registro y Autorización de Visitas',
      periodo: formatearPeriodo(filtros.desde, filtros.hasta),
      generadoPor: req.user?.username || 'Sistema',
      generadoEn: new Date().toLocaleString('es-BO'),
      nombreArchivo: `reporte-${tipo}-${new Date().toISOString().slice(0, 10)}.pdf`,
    };

    const tabla = {
      cabecera: datos.cabecera,
      filas: datos.filas,
      anchos: datos.anchos,
    };

    // Sin resumen: el PDF arranca directo con la tabla
    generarPDF({ meta, tabla }, res);
  } catch (e) { next(e); }
};