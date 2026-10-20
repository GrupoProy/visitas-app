// modules/reportes/reportes.service.js
// =============================================================================
// Servicio de reportes:
//   · Por período (serie temporal + KPIs + franja horaria)
//   · Por lugar
//   · Por anfitrión
//   · Por visitante
// =============================================================================

import { query } from '../../config/db.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Construye el WHERE dinámico para los reportes.
 * Filtra por rango de fechas (fecha_inicio) y opcionalmente por lugar/anfitrión.
 */
const construirFiltros = ({ desde, hasta, id_lugar, id_anfitrion, id_persona } = {}) => {
  const filtros = [];
  const valores = [];

  if (desde) {
    valores.push(desde);
    filtros.push(`a.fecha_inicio >= $${valores.length}::timestamptz`);
  }
  if (hasta) {
    valores.push(hasta);
    filtros.push(`a.fecha_inicio < ($${valores.length}::timestamptz + INTERVAL '1 day')`);
  }
  if (id_lugar) {
    valores.push(id_lugar);
    filtros.push(`a.id_lugar = $${valores.length}`);
  }
  if (id_anfitrion) {
    valores.push(id_anfitrion);
    filtros.push(`a.id_anfitrion = $${valores.length}`);
  }
  if (id_persona) {
    valores.push(id_persona);
    filtros.push(`a.id_persona = $${valores.length}`);
  }

  // Excluye eliminadas (no hay tal estado, pero por las dudas)
  filtros.push(`a.estado <> 'ELIMINADA'`);

  return {
    where: filtros.length ? `WHERE ${filtros.join(' AND ')}` : '',
    valores,
  };
};

/** Mapea agrupación a formato de fecha SQL */
const agrupacionSQL = (agrupacion) => {
  switch (agrupacion) {
    case 'semana': return `date_trunc('week', a.fecha_inicio)::date`;
    case 'mes':    return `date_trunc('month', a.fecha_inicio)::date`;
    default:       return `a.fecha_inicio::date`;
  }
};

// ---------------------------------------------------------------------------
// 1. Reporte por período
// ---------------------------------------------------------------------------
export const reportePeriodo = async ({
  desde,
  hasta,
  id_lugar,
  id_anfitrion,
  agrupacion = 'dia',
} = {}) => {
  const { where, valores } = construirFiltros({ desde, hasta, id_lugar, id_anfitrion});

  // 1. Resumen global
  const { rows: [resumen] } = await query(
    `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE estado = 'FINALIZADA')::int AS finalizadas,
        COUNT(*) FILTER (WHERE estado = 'CANCELADA')::int  AS canceladas,
        COUNT(*) FILTER (WHERE estado = 'RECHAZADA')::int  AS rechazadas,
        COUNT(*) FILTER (WHERE estado = 'EXPIRADA')::int   AS expiradas,
        COUNT(*) FILTER (WHERE estado = 'EN_CURSO')::int   AS en_curso,
        COUNT(DISTINCT a.id_persona)::int AS visitantes_unicos,
        COUNT(DISTINCT a.id_lugar)::int   AS lugares_activos,
        COUNT(DISTINCT a.fecha_inicio::date)::int AS dias_con_actividad,
        AVG(
          CASE
            WHEN a.estado = 'FINALIZADA'
             AND a.fecha_ingreso_real IS NOT NULL
             AND a.fecha_salida_real IS NOT NULL
            THEN EXTRACT(EPOCH FROM (a.fecha_salida_real - a.fecha_ingreso_real)) / 60
          END
        )::int AS duracion_promedio_min
       FROM autorizacion a
       ${where}`,
    valores
  );

  // 2. Serie temporal
  const expr = agrupacionSQL(agrupacion);
  const { rows: serie } = await query(
    `SELECT
        ${expr} AS fecha,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE estado = 'FINALIZADA')::int AS finalizadas,
        COUNT(*) FILTER (WHERE estado = 'CANCELADA')::int  AS canceladas,
        COUNT(*) FILTER (WHERE estado = 'RECHAZADA')::int  AS rechazadas
       FROM autorizacion a
       ${where}
       GROUP BY fecha
       ORDER BY fecha ASC`,
    valores
  );

    // 2.5. Serie desglosada por período + anfitrión (para la tabla detallada)
  const { rows: serieDetalle } = await query(
    `SELECT
        ${expr} AS fecha,
        p.id AS id_anfitrion,
        p.nombres || ' ' || p.primer_apellido ||
          COALESCE(' ' || p.segundo_apellido, '') AS anfitrion,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE a.estado = 'FINALIZADA')::int AS finalizadas,
        COUNT(*) FILTER (WHERE a.estado = 'EN_CURSO')::int   AS en_curso,
        COUNT(*) FILTER (WHERE a.estado = 'CANCELADA')::int  AS canceladas,
        COUNT(*) FILTER (WHERE a.estado = 'RECHAZADA')::int  AS rechazadas
       FROM autorizacion a
       JOIN persona p ON p.id = a.id_anfitrion
       ${where}
       GROUP BY fecha, p.id, p.nombres, p.primer_apellido, p.segundo_apellido
       ORDER BY fecha ASC, total DESC`,
    valores
  );

  

  // 3. Distribución por estado
  const { rows: porEstado } = await query(
    `SELECT estado, COUNT(*)::int AS total
       FROM autorizacion a
       ${where}
       GROUP BY estado
       ORDER BY total DESC`,
    valores
  );

  // 4. Franja horaria (por hora del día)
  const { rows: porHora } = await query(
    `SELECT EXTRACT(HOUR FROM a.fecha_inicio)::int AS hora,
            COUNT(*)::int AS total
       FROM autorizacion a
       ${where}
       GROUP BY hora
       ORDER BY hora ASC`,
    valores
  );

  // Calcular promedio por día
  const dias = resumen.dias_con_actividad || 1;
  const promedioPorDia = resumen.total > 0
    ? Math.round((resumen.total / dias) * 10) / 10
    : 0;

  return {
    resumen: {
      total: resumen.total || 0,
      finalizadas: resumen.finalizadas || 0,
      canceladas: resumen.canceladas || 0,
      rechazadas: resumen.rechazadas || 0,
      expiradas: resumen.expiradas || 0,
      enCurso: resumen.en_curso || 0,
      visitantesUnicos: resumen.visitantes_unicos || 0,
      lugaresActivos: resumen.lugares_activos || 0,
      diasConActividad: dias,
      duracionPromedioMin: resumen.duracion_promedio_min || 0,
      promedioPorDia,
    },
    serie,
    serieDetalle,
    porEstado,
    porHora,
    agrupacion,
  };
};

// ---------------------------------------------------------------------------
// 2. Reporte por lugar
// ---------------------------------------------------------------------------
export const reportePorLugar = async ({
  desde,
  hasta,
  id_lugar,
  id_anfitrion,
} = {}) => {
  const { where, valores } = construirFiltros({ desde, hasta, id_lugar, id_anfitrion });

  const { rows } = await query(
    `SELECT
        l.id,
        l.nombre,
        l.piso,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE a.estado = 'FINALIZADA')::int AS finalizadas,
        COUNT(*) FILTER (WHERE a.estado = 'EN_CURSO')::int   AS en_curso,
        COUNT(*) FILTER (WHERE a.estado = 'CANCELADA')::int  AS canceladas,
        COUNT(*) FILTER (WHERE a.estado = 'RECHAZADA')::int  AS rechazadas,
        COUNT(DISTINCT a.id_persona)::int AS visitantes_unicos,
        AVG(
          CASE
            WHEN a.estado = 'FINALIZADA'
             AND a.fecha_ingreso_real IS NOT NULL
             AND a.fecha_salida_real IS NOT NULL
            THEN EXTRACT(EPOCH FROM (a.fecha_salida_real - a.fecha_ingreso_real)) / 60
          END
        )::int AS duracion_promedio_min,
        (
          SELECT EXTRACT(HOUR FROM a2.fecha_inicio)::int
            FROM autorizacion a2
           WHERE a2.id_lugar = l.id
             AND a2.fecha_inicio >= COALESCE(${valores.length > 0 ? '$1' : 'NOW() - INTERVAL \'10 years\''}::timestamptz, NOW() - INTERVAL '10 years')
           GROUP BY EXTRACT(HOUR FROM a2.fecha_inicio)
           ORDER BY COUNT(*) DESC
           LIMIT 1
        ) AS hora_pico
       FROM autorizacion a
       JOIN lugar_visita l ON l.id = a.id_lugar
       ${where}
       GROUP BY l.id, l.nombre, l.piso
       ORDER BY total DESC`,
    valores
  );

  const total = rows.reduce((acc, r) => acc + r.total, 0);
  return { items: rows, total };
};

// ---------------------------------------------------------------------------
// 3. Reporte por anfitrión
// ---------------------------------------------------------------------------
export const reportePorAnfitrion = async ({
  desde,
  hasta,
  id_lugar,
  id_anfitrion,

} = {}) => {
  const { where, valores } = construirFiltros({ desde, hasta, id_lugar, id_anfitrion });

  const { rows } = await query(
    `SELECT
        p.id,
        p.nombres,
        p.primer_apellido,
        p.segundo_apellido,
        p.numero_documento,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE a.estado = 'FINALIZADA')::int AS finalizadas,
        COUNT(*) FILTER (WHERE a.estado = 'EN_CURSO')::int   AS en_curso,
        COUNT(*) FILTER (WHERE a.estado = 'CANCELADA')::int  AS canceladas,
        COUNT(DISTINCT a.id_persona)::int AS visitantes_unicos,
        (
          SELECT l.nombre
            FROM autorizacion a2
            JOIN lugar_visita l ON l.id = a2.id_lugar
           WHERE a2.id_anfitrion = p.id
           GROUP BY l.nombre
           ORDER BY COUNT(*) DESC
           LIMIT 1
        ) AS lugar_favorito
       FROM autorizacion a
       JOIN persona p ON p.id = a.id_anfitrion
       ${where}
       GROUP BY p.id, p.nombres, p.primer_apellido, p.segundo_apellido, p.numero_documento
       ORDER BY total DESC`,
    valores
  );

  const total = rows.reduce((acc, r) => acc + r.total, 0);
  return { items: rows, total };
};

// ---------------------------------------------------------------------------
// 4. Reporte por visitante
// ---------------------------------------------------------------------------
export const reportePorVisitante = async ({
  desde,
  hasta,
  id_lugar,
  id_persona,
} = {}) => {
  const { where, valores } = construirFiltros({ desde, hasta, id_lugar, id_persona });

   const { rows } = await query(
    `SELECT
        p.id,
        p.nombres,
        p.primer_apellido,
        p.segundo_apellido,
        p.numero_documento,
        p.procedencia,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE a.estado = 'FINALIZADA')::int AS finalizadas,
        COUNT(*) FILTER (WHERE a.estado = 'EN_CURSO')::int    AS en_curso,
        COUNT(DISTINCT a.id_lugar)::int AS lugares_distintos,
        COUNT(DISTINCT a.id_anfitrion)::int AS anfitriones_distintos,
        MAX(a.fecha_inicio) AS ultima_visita,
        -- Lugar favorito (top 1 por cantidad de visitas)
        (
          SELECT l.nombre
            FROM autorizacion a2
            JOIN lugar_visita l ON l.id = a2.id_lugar
           WHERE a2.id_persona = p.id
             AND a2.estado <> 'ELIMINADA'
           GROUP BY l.nombre
           ORDER BY COUNT(*) DESC, l.nombre ASC
           LIMIT 1
        ) AS lugar_favorito,
        -- Anfitrión favorito (nombre completo, top 1)
        (
          SELECT an.nombres || ' ' || an.primer_apellido ||
                 COALESCE(' ' || an.segundo_apellido, '')
            FROM autorizacion a3
            JOIN persona an ON an.id = a3.id_anfitrion
           WHERE a3.id_persona = p.id
             AND a3.estado <> 'ELIMINADA'
           GROUP BY an.id, an.nombres, an.primer_apellido, an.segundo_apellido
           ORDER BY COUNT(*) DESC, an.nombres ASC
           LIMIT 1
        ) AS anfitrion_favorito
       FROM autorizacion a
       JOIN persona p ON p.id = a.id_persona
       ${where}
       GROUP BY p.id, p.nombres, p.primer_apellido, p.segundo_apellido, p.numero_documento, p.procedencia
       ORDER BY total DESC`,
    valores
  );

  const total = rows.reduce((acc, r) => acc + r.total, 0);
  return { items: rows, total };
};

// ---------------------------------------------------------------------------
// 5. Datos para exportación CSV (según tipo)
// ---------------------------------------------------------------------------
export const exportarReporte = async ({ tipo, ...filtros }) => {
  switch (tipo) {
        case 'periodo': {
      const r = await reportePeriodo(filtros);
      return {
        cabecera: ['Período', 'Anfitrión', 'Total', 'Finalizadas','En curso', 'Canceladas', 'Rechazadas'],
        filas: (r.serieDetalle || []).map((s) => [
          formatearFecha(s.fecha),
          s.anfitrion,
          s.total,
          s.finalizadas,
          s.en_curso,
          s.canceladas,
          s.rechazadas,
        ]),
        anchos: [80, 160, 55, 65, 55, 65, 65],
        resumen: r.resumen,
        filtros: r,
      };
    }
    case 'lugar': {
      const r = await reportePorLugar(filtros);
      return {
        cabecera: ['Lugar', 'Piso', 'Total', 'Finalizadas', 'En curso', 'Canceladas', 'Visitantes únicos', 'Duración prom. (min)'],
        filas: r.items.map((i) => [
          i.nombre,
          i.piso || '',
          i.total,
          i.finalizadas,
          i.en_curso,
          i.canceladas,
          i.visitantes_unicos,
          i.duracion_promedio_min || 0,
        ]),
        anchos: [140, 40, 45, 55, 55, 55, 55, 60],
        filtros: r,
      };
    }
    case 'anfitrion': {
      const r = await reportePorAnfitrion(filtros);
      return {
        cabecera: ['Anfitrión', 'Documento', 'Total', 'Finalizadas', 'En curso', 'Canceladas', 'Visitantes únicos', 'Lugar favorito'],
        filas: r.items.map((i) => [
          `${i.nombres} ${i.primer_apellido}${i.segundo_apellido ? ' ' + i.segundo_apellido : ''}`,
          i.numero_documento,
          i.total,
          i.finalizadas,
          i.en_curso,
          i.canceladas,
          i.visitantes_unicos,
          i.lugar_favorito || '',
        ]),
                anchos: [130, 70, 45, 55, 55, 55, 55, 100],
        filtros: r,
      };
    }
        case 'visitante': {
      const r = await reportePorVisitante(filtros);
      return {
        cabecera: ['Visitante', 'Documento', 'Procedencia', 'Lugar', 'Anfitrión', 'Total', 'Finalizadas', 'En curso', 'Última visita'],
        filas: r.items.map((i) => [
          `${i.nombres} ${i.primer_apellido}${i.segundo_apellido ? ' ' + i.segundo_apellido : ''}`,
          i.numero_documento,
          i.procedencia || '',
          i.lugar_favorito || '—',
          i.anfitrion_favorito || '—',
          i.total,
          i.finalizadas,
          i.en_curso,
          i.ultima_visita ? formatearFecha(i.ultima_visita) : '',
        ]),
        anchos: [110, 60, 80, 110, 120, 45, 55, 55, 70],
        filtros: r,
      };
    }
    default:
      throw Object.assign(new Error('Tipo de reporte inválido'), { status: 400 });
  }
};

// ---------------------------------------------------------------------------
// Helper de fecha para CSV
// ---------------------------------------------------------------------------
const formatearFecha = (fecha) => {
  if (!fecha) return '';
  const d = new Date(fecha);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};