// modules/auditoria/auditoria.service.js
// =============================================================================
// Servicio de auditoría:
//   · Listado paginado de intentos de login con filtros
//   · Resumen (KPIs) para el dashboard
//   · Sesiones activas (refresh tokens no revocados)
//   · Exportación a CSV
// =============================================================================

import { query } from '../../config/db.js';

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Construye el WHERE dinámico + valores para reutilizar en count, select y CSV.
 * @returns {{ where: string, valores: any[] }}
 */
const construirFiltros = ({ q, desde, hasta, resultado, motivo } = {}) => {
  const filtros = [];
  const valores = [];

  // Búsqueda libre: username, IP
  if (q && q.trim()) {
    valores.push(`%${q.trim()}%`);
    filtros.push(`(li.username ILIKE $${valores.length}
                OR li.ip ILIKE $${valores.length})`);
  }

  // Rango de fechas
  if (desde) {
    valores.push(desde);
    filtros.push(`li.fecha >= $${valores.length}::timestamptz`);
  }
  if (hasta) {
    valores.push(hasta);
    filtros.push(`li.fecha <= $${valores.length}::timestamptz`);
  }

  // Resultado: exitosos | fallidos | bloqueados
  if (resultado === 'exitosos') {
    filtros.push(`li.exitoso = TRUE`);
  } else if (resultado === 'fallidos') {
    filtros.push(`li.exitoso = FALSE AND li.motivo_fallo <> 'BLOQUEADO'`);
  } else if (resultado === 'bloqueados') {
    filtros.push(`li.motivo_fallo = 'BLOQUEADO'`);
  }

  // Motivo específico
  if (motivo) {
    valores.push(motivo);
    filtros.push(`li.motivo_fallo = $${valores.length}`);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  return { where, valores };
};

// ---------------------------------------------------------------------------
// Listado paginado
// ---------------------------------------------------------------------------
export const listarIntentos = async ({
  q,
  desde,
  hasta,
  resultado,
  motivo,
  page = 1,
  limit = 20,
} = {}) => {
  const { where, valores } = construirFiltros({ q, desde, hasta, resultado, motivo });
  const offset = (page - 1) * limit;

  const sql = `
    SELECT
      li.id,
      li.username,
      li.id_usuario,
      li.ip,
      li.user_agent,
      li.exitoso,
      li.motivo_fallo,
      li.fecha,
      u.nombres         AS usuario_nombres,
      u.primer_apellido AS usuario_primer_apellido,
      u.email           AS usuario_email
    FROM login_intento li
    LEFT JOIN usuario u ON u.id = li.id_usuario
    ${where}
    ORDER BY li.fecha DESC
    LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}
  `;

  const { rows } = await query(sql, [...valores, limit, offset]);

  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*)::int AS total FROM login_intento li ${where}`,
    valores
  );

  return {
    items: rows.map((r) => ({
      id: r.id,
      username: r.username,
      id_usuario: r.id_usuario,
      usuario: r.id_usuario
        ? {
            id: r.id_usuario,
            nombres: r.usuario_nombres,
            primer_apellido: r.usuario_primer_apellido,
            email: r.usuario_email,
          }
        : null,
      ip: r.ip,
      user_agent: r.user_agent,
      exitoso: r.exitoso,
      motivo_fallo: r.motivo_fallo,
      fecha: r.fecha,
    })),
    total,
    page,
    limit,
  };
};

// ---------------------------------------------------------------------------
// Resumen (KPIs) para dashboard
// ---------------------------------------------------------------------------
export const obtenerResumen = async ({ horas = 24 } = {}) => {
  const horasNum = Math.min(Math.max(parseInt(horas, 10) || 24, 1), 24 * 30);
  const desde = `NOW() - INTERVAL '${horasNum} hours'`;

  // 1. Conteos generales
  const { rows: [conteos] } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE exitoso = TRUE)                              AS logins_exitosos,
      COUNT(*) FILTER (WHERE exitoso = FALSE AND motivo_fallo <> 'BLOQUEADO') AS logins_fallidos,
      COUNT(*) FILTER (WHERE motivo_fallo = 'BLOQUEADO')                  AS intentos_bloqueados
    FROM login_intento
    WHERE fecha >= ${desde}
  `);

  // 2. Cuentas actualmente bloqueadas (no depende del rango)
  const { rows: [{ cuentas_bloqueadas }] } = await query(`
    SELECT COUNT(*)::int AS cuentas_bloqueadas
    FROM usuario
    WHERE bloqueado_hasta IS NOT NULL
      AND bloqueado_hasta > NOW()
      AND estado <> 'ELIMINADO'
  `);

  // 3. Top IPs con fallos
  const { rows: topIps } = await query(`
    SELECT ip, COUNT(*)::int AS total
    FROM login_intento
    WHERE exitoso = FALSE
      AND fecha >= ${desde}
      AND ip IS NOT NULL
    GROUP BY ip
    ORDER BY total DESC
    LIMIT 5
  `);

  // 4. Top usuarios con fallos
  const { rows: topUsuarios } = await query(`
    SELECT username, COUNT(*)::int AS total
    FROM login_intento
    WHERE exitoso = FALSE
      AND fecha >= ${desde}
      AND username IS NOT NULL
    GROUP BY username
    ORDER BY total DESC
    LIMIT 5
  `);

  return {
    periodo: { horas: horasNum },
    loginsExitosos: conteos.logins_exitosos || 0,
    loginsFallidos: conteos.logins_fallidos || 0,
    intentosBloqueados: conteos.intentos_bloqueados || 0,
    cuentasBloqueadas: cuentas_bloqueadas || 0,
    topIpsConFallos: topIps,
    topUsuariosConFallos: topUsuarios,
  };
};

// ---------------------------------------------------------------------------
// Sesiones activas (refresh tokens no revocados)
// ---------------------------------------------------------------------------
export const listarSesionesActivas = async ({ page = 1, limit = 50 } = {}) => {
  const offset = (page - 1) * limit;

  const sql = `
    SELECT
      rt.id,
      rt.id_usuario,
      rt.ip_creacion,
      rt.user_agent,
      rt.fecha_creacion,
      rt.expira_en,
      u.username,
      u.nombres,
      u.primer_apellido,
      u.email
    FROM refresh_token rt
    JOIN usuario u ON u.id = rt.id_usuario
    WHERE rt.revocado = FALSE
      AND rt.expira_en > NOW()
      AND u.estado = 'ACTIVO'
    ORDER BY rt.fecha_creacion DESC
    LIMIT $1 OFFSET $2
  `;

  const { rows } = await query(sql, [limit, offset]);

  const { rows: [{ total }] } = await query(`
    SELECT COUNT(*)::int AS total
    FROM refresh_token rt
    JOIN usuario u ON u.id = rt.id_usuario
    WHERE rt.revocado = FALSE
      AND rt.expira_en > NOW()
      AND u.estado = 'ACTIVO'
  `);

  return {
    items: rows.map((r) => ({
      id: r.id,
      usuario: {
        id: r.id_usuario,
        username: r.username,
        nombres: r.nombres,
        primer_apellido: r.primer_apellido,
        email: r.email,
      },
      ip: r.ip_creacion,
      user_agent: r.user_agent,
      creada_en: r.fecha_creacion,
      expira_en: r.expira_en,
    })),
    total,
    page,
    limit,
  };
};

// ---------------------------------------------------------------------------
// Datos para exportar CSV (sin paginación)
// ---------------------------------------------------------------------------
export const listarParaExport = async ({
  q,
  desde,
  hasta,
  resultado,
  motivo,
  limiteMax = 10000,
} = {}) => {
  const { where, valores } = construirFiltros({ q, desde, hasta, resultado, motivo });

  const sql = `
    SELECT
      li.fecha,
      li.username,
      li.ip,
      li.user_agent,
      li.exitoso,
      li.motivo_fallo
    FROM login_intento li
    ${where}
    ORDER BY li.fecha DESC
    LIMIT $${valores.length + 1}
  `;

  const { rows } = await query(sql, [...valores, limiteMax]);
  return rows;
};

// ---------------------------------------------------------------------------
// Detalle de un intento (para modal)
// ---------------------------------------------------------------------------
export const obtenerIntento = async (id) => {
  const { rows } = await query(
    `SELECT
        li.id, li.username, li.id_usuario,
        li.ip, li.user_agent, li.exitoso,
        li.motivo_fallo, li.fecha,
        u.nombres, u.primer_apellido, u.segundo_apellido,
        u.email, u.estado AS usuario_estado,
        u.intentos_fallidos, u.bloqueado_hasta
       FROM login_intento li
       LEFT JOIN usuario u ON u.id = li.id_usuario
      WHERE li.id = $1
      LIMIT 1`,
    [id]
  );
  if (!rows[0]) {
    throw Object.assign(new Error('Intento no encontrado'), { status: 404 });
  }
  return rows[0];
};