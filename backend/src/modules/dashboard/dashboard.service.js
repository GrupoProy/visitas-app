import { query } from '../../config/db.js';

// =============================================================================
// Helpers
// =============================================================================
const calcularRango = (periodo) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const desde = new Date(hoy);
  const hasta = new Date(hoy);
  hasta.setHours(23, 59, 59, 999);

  if (periodo === 'semana') {
    const dow = hoy.getDay() === 0 ? 7 : hoy.getDay();
    desde.setDate(hoy.getDate() - (dow - 1));
    hasta.setTime(desde.getTime());
    hasta.setDate(hasta.getDate() + 6);
    hasta.setHours(23, 59, 59, 999);
  } else if (periodo === 'mes') {
    desde.setDate(1);
    hasta.setMonth(desde.getMonth() + 1, 0);
    hasta.setHours(23, 59, 59, 999);
  }
  return { desde, hasta };
};

/**
 * Construye el fragmento de filtro por anfitrión (id_persona) si aplica.
 */
const buildFiltroAnfitrion = (idAnfitrion, valores, alias = 'a') => {
  if (!idAnfitrion) return '';
  valores.push(idAnfitrion);
  return `AND ${alias}.id_anfitrion = $${valores.length}`;
};

// =============================================================================
// KPIs
// =============================================================================
export const obtenerResumen = async ({ periodo = 'hoy', idAnfitrion = null } = {}) => {
  const { desde, hasta } = calcularRango(periodo);
  const valores = [desde, hasta];
  const filtroAf = buildFiltroAnfitrion(idAnfitrion, valores);

  const { rows: [r] } = await query(
    `SELECT
        COUNT(*) FILTER (WHERE a.estado <> 'ELIMINADO')                                            AS total,
        COUNT(*) FILTER (WHERE a.estado = 'APROBADA')                                              AS aprobadas,
        COUNT(*) FILTER (WHERE a.estado = 'EN_CURSO')                                              AS en_curso,
        COUNT(*) FILTER (WHERE a.estado = 'FINALIZADA')                                            AS finalizadas,
        COUNT(*) FILTER (WHERE a.estado = 'PENDIENTE')                                             AS pendientes,
        COUNT(*) FILTER (WHERE a.estado = 'RECHAZADA')                                             AS rechazadas,
        COUNT(*) FILTER (WHERE a.estado = 'CANCELADA')                                             AS canceladas,
        COUNT(DISTINCT a.id_persona)                                                               AS visitantes_unicos,
        COUNT(DISTINCT a.id_lugar)                                                                 AS lugares_activos,
        AVG(EXTRACT(EPOCH FROM (a.fecha_salida_real - a.fecha_ingreso_real)) / 60)
          FILTER (WHERE a.fecha_ingreso_real IS NOT NULL AND a.fecha_salida_real IS NOT NULL)      AS duracion_promedio_min
       FROM autorizacion a
      WHERE a.fecha_inicio BETWEEN $1 AND $2
        ${filtroAf}`,
    valores
  );

  return {
    periodo,
    desde,
    hasta,
    total:               Number(r.total) || 0,
    aprobadas:           Number(r.aprobadas) || 0,
    enCurso:             Number(r.en_curso) || 0,
    finalizadas:         Number(r.finalizadas) || 0,
    pendientes:          Number(r.pendientes) || 0,
    rechazadas:          Number(r.rechazadas) || 0,
    canceladas:          Number(r.canceladas) || 0,
    visitantesUnicos:    Number(r.visitantes_unicos) || 0,
    lugaresActivos:      Number(r.lugares_activos) || 0,
    duracionPromedioMin: r.duracion_promedio_min ? Math.round(Number(r.duracion_promedio_min)) : 0,
  };
};

// =============================================================================
// Serie por día
// =============================================================================
export const obtenerSeriePorDia = async ({ dias = 7, idAnfitrion = null } = {}) => {
  const valores = [dias];
  let filtroAf = '';
  if (idAnfitrion) {
    valores.push(idAnfitrion);
    filtroAf = `AND a.id_anfitrion = $${valores.length}`;
  }

  const { rows } = await query(
    `WITH dias AS (
        SELECT generate_series(
          (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS fecha
     )
     SELECT
       d.fecha,
       COUNT(a.id) FILTER (WHERE a.estado <> 'ELIMINADO') AS total,
       COUNT(a.id) FILTER (WHERE a.estado = 'FINALIZADA') AS finalizadas,
       COUNT(a.id) FILTER (WHERE a.estado = 'EN_CURSO')   AS en_curso
     FROM dias d
     LEFT JOIN autorizacion a
       ON a.fecha_inicio::date = d.fecha
      AND a.estado <> 'ELIMINADO'
      ${filtroAf}
     GROUP BY d.fecha
     ORDER BY d.fecha ASC`,
    valores
  );

  return rows.map((r) => ({
    fecha: r.fecha,
    total: Number(r.total) || 0,
    finalizadas: Number(r.finalizadas) || 0,
    enCurso: Number(r.en_curso) || 0,
  }));
};

// =============================================================================
// Por estado
// =============================================================================
export const obtenerPorEstado = async ({ periodo = 'mes', idAnfitrion = null } = {}) => {
  const { desde, hasta } = calcularRango(periodo);
  const valores = [desde, hasta];
  const filtroAf = buildFiltroAnfitrion(idAnfitrion, valores);

  const { rows } = await query(
    `SELECT a.estado, COUNT(*)::int AS total
       FROM autorizacion a
      WHERE a.fecha_inicio BETWEEN $1 AND $2
        AND a.estado <> 'ELIMINADO'
        ${filtroAf}
      GROUP BY a.estado
      ORDER BY total DESC`,
    valores
  );
  return rows.map((r) => ({ estado: r.estado, total: Number(r.total) }));
};

// =============================================================================
// Top lugares
// =============================================================================
export const obtenerTopLugares = async ({ periodo = 'mes', limit = 5, idAnfitrion = null } = {}) => {
  const { desde, hasta } = calcularRango(periodo);
  const valores = [desde, hasta];
  const filtroAf = idAnfitrion ? (() => {
    valores.push(idAnfitrion);
    return `AND a.id_anfitrion = $${valores.length}`;
  })() : '';
  valores.push(limit);

  const { rows } = await query(
    `SELECT l.id, l.nombre, COUNT(a.id)::int AS total
       FROM lugar_visita l
       LEFT JOIN autorizacion a
         ON a.id_lugar = l.id
        AND a.fecha_inicio BETWEEN $1 AND $2
        AND a.estado <> 'ELIMINADO'
        ${filtroAf}
      WHERE l.estado <> 'ELIMINADO'
      GROUP BY l.id, l.nombre
      ORDER BY total DESC, l.nombre ASC
      LIMIT $${valores.length}`,
    valores
  );
  return rows.map((r) => ({ id: r.id, nombre: r.nombre, total: Number(r.total) }));
};

// =============================================================================
// Top anfitriones (solo aplica sin filtro)
// =============================================================================
export const obtenerTopAnfitriones = async ({ periodo = 'mes', limit = 5 } = {}) => {
  const { desde, hasta } = calcularRango(periodo);
  const { rows } = await query(
    `SELECT p.id,
            p.nombres || ' ' || p.primer_apellido ||
              COALESCE(' ' || p.segundo_apellido, '') AS nombre,
            COUNT(a.id)::int AS total
       FROM persona p
       JOIN autorizacion a ON a.id_anfitrion = p.id
      WHERE a.fecha_inicio BETWEEN $1 AND $2
        AND a.estado <> 'ELIMINADO'
      GROUP BY p.id, nombre
      ORDER BY total DESC
      LIMIT $3`,
    [desde, hasta, limit]
  );
  return rows.map((r) => ({ id: r.id, nombre: r.nombre, total: Number(r.total) }));
};

// =============================================================================
// Visitas recientes
// =============================================================================
export const obtenerRecientes = async ({ limit = 8, idAnfitrion = null } = {}) => {
  const valores = [];
  let filtroAf = '';
  if (idAnfitrion) {
    valores.push(idAnfitrion);
    filtroAf = `AND a.id_anfitrion = $${valores.length}`;
  }
  valores.push(limit);

  const { rows } = await query(
    `SELECT a.id, a.codigo, a.estado,
            a.fecha_inicio, a.fecha_fin,
            a.fecha_ingreso_real,
            p.nombres || ' ' || p.primer_apellido ||
              COALESCE(' ' || p.segundo_apellido, '') AS visitante,
            p.numero_documento,
            l.nombre AS lugar
       FROM autorizacion a
       JOIN persona p      ON p.id = a.id_persona
       JOIN lugar_visita l ON l.id = a.id_lugar
      WHERE a.estado <> 'ELIMINADO'
      ${filtroAf}
      ORDER BY a.fecha_creacion DESC
      LIMIT $${valores.length}`,
    valores
  );
  return rows;
};

// =============================================================================
// NUEVO: Visitas huérfanas (EN_CURSO de días anteriores)
// =============================================================================
/**
 * Autorizaciones que quedaron EN_CURSO de días previos.
 * Útil para alertar al operador al inicio de la jornada.
 */
export const obtenerVisitasHuerfanas = async ({ idAnfitrion = null } = {}) => {
  const valores = [];
  let filtroAf = '';
  if (idAnfitrion) {
    valores.push(idAnfitrion);
    filtroAf = `AND a.id_anfitrion = $${valores.length}`;
  }

  const { rows } = await query(
    `SELECT a.id, a.codigo, a.estado, a.motivo,
            a.fecha_inicio, a.fecha_fin,
            a.fecha_ingreso_real, a.fecha_salida_real,
            p.nombres || ' ' || p.primer_apellido ||
              COALESCE(' ' || p.segundo_apellido, '') AS visitante,
            p.numero_documento,
            l.nombre AS lugar,
            an.nombres || ' ' || an.primer_apellido ||
              COALESCE(' ' || an.segundo_apellido, '') AS anfitrion,
            EXTRACT(EPOCH FROM (NOW() - a.fecha_ingreso_real)) / 3600 AS horas_dentro
       FROM autorizacion a
       JOIN persona p      ON p.id  = a.id_persona
       JOIN persona an     ON an.id = a.id_anfitrion
       JOIN lugar_visita l ON l.id  = a.id_lugar
      WHERE a.estado = 'EN_CURSO'
        AND a.fecha_ingreso_real IS NOT NULL
        AND a.fecha_salida_real IS NULL
        AND a.fecha_ingreso_real::date < CURRENT_DATE
        ${filtroAf}
      ORDER BY a.fecha_ingreso_real ASC`,
    valores
  );

  return rows.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    motivo: r.motivo,
    visitante: r.visitante,
    numero_documento: r.numero_documento,
    lugar: r.lugar,
    anfitrion: r.anfitrion,
    fecha_inicio: r.fecha_inicio,
    fecha_fin: r.fecha_fin,
    fecha_ingreso_real: r.fecha_ingreso_real,
    horasDentro: Math.round(Number(r.horas_dentro) || 0),
  }));
};

// =============================================================================
// Endpoint agregado
// =============================================================================
export const obtenerDashboard = async ({ periodo = 'hoy', idAnfitrion = null } = {}) => {
  const [
    resumen,
    serie,
    porEstado,
    topLugares,
    topAnfitriones,
    recientes,
    huerfanas,
  ] = await Promise.all([
    obtenerResumen({ periodo, idAnfitrion }),
    obtenerSeriePorDia({ dias: 7, idAnfitrion }),
    obtenerPorEstado({ periodo: 'mes', idAnfitrion }),
    obtenerTopLugares({ periodo: 'mes', idAnfitrion }),
    idAnfitrion ? Promise.resolve([]) : obtenerTopAnfitriones({ periodo: 'mes' }),
    obtenerRecientes({ limit: 8, idAnfitrion }),
    obtenerVisitasHuerfanas({ idAnfitrion }),
  ]);

  return { resumen, serie, porEstado, topLugares, topAnfitriones, recientes, huerfanas };
};