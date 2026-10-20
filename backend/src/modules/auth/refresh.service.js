// modules/auth/refresh.service.js
// =============================================================================
// Servicio de refresh tokens
//   · Emitir par (access + refresh)
//   · Validar refresh
//   · Rotar refresh (con ventana de gracia)
//   · Revocar refresh (logout)
//   · Revocar TODOS los refresh de un usuario (cambio password / bloqueo)
// =============================================================================

import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db.js';
import { ENV } from '../../config/env.js';
import { parseDuracion, enSegundos } from '../../utils/duration.js';
import { getValor, getBool } from '../parametros/parametros.service.js';

const DEBUG_ROTACION = process.env.DEBUG_ROTACION === 'true';

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

/** SHA-256 del token en hex. Nunca guardamos el token plano. */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/** Normaliza user-agent (mismo criterio en INSERT y en WHERE) */
const normalizarUA = (ua) => (ua || '').substring(0, 255);

/** Genera un JWT de refresh con jti (UUID) */
const firmarRefresh = ({ idUsuario, jti, expiresIn }) =>
  jwt.sign(
    { sub: idUsuario, jti, typ: 'refresh' },
    ENV.JWT_REFRESH_SECRET,
    { expiresIn }
  );

/** Lee la duración de refresh desde parametro_sistema con fallback a ENV */
const obtenerDuracionRefresh = async (recordar = false) => {
  if (recordar) {
    const diasStr = await getValor('REFRESH_RECORDAR_DIAS', '30');
    const dias = parseInt(diasStr, 10) || 30;
    return `${dias}d`;
  }
  return (await getValor('JWT_REFRESH_EXPIRES_IN', ENV.JWT_REFRESH_EXPIRES))
    || ENV.JWT_REFRESH_EXPIRES;
};

/** Log interno de rotación (solo si DEBUG_ROTACION=true) */
const logRot = (...args) => {
  if (DEBUG_ROTACION) console.log('[refresh]', ...args);
};

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/**
 * Emite un par access+refresh y persiste el refresh en BD.
 *
 * IMPORTANTE: antes de insertar el nuevo refresh, revoca los refresh
 * previos del MISMO usuario + MISMO user_agent. Esto implementa el
 * criterio "una sola sesión activa por dispositivo".
 *
 * @param {Object} opts
 * @param {boolean} [opts.revocarPrevios=true]  si false, no revoca (útil para /refresh)
 */
export const emitirPar = async ({
  usuario,
  roles,
  recordar = false,
  ip,
  userAgent,
  revocarPrevios = true,
}) => {
  const ua = normalizarUA(userAgent);

  // 0. Revocar refresh previos del mismo user_agent (una sesión por dispositivo)
  if (revocarPrevios) {
    const { rowCount } = await query(
      `UPDATE refresh_token
          SET revocado = TRUE,
              revocado_en = NOW(),
              estado = 'REVOCADO',
              modificado_por = $1,
              fecha_modificacion = NOW()
        WHERE id_usuario = $2
          AND user_agent = $3
          AND revocado = FALSE`,
      [`login:${usuario.username}`, usuario.id, ua]
    );
    if (rowCount > 0) {
      logRot(`emitirPar: revocados ${rowCount} refresh previos de user=${usuario.id} ua=${ua.slice(0, 40)}`);
    }
  }

  // 1. Access token (corto)
  const duracionAccess = await getValor('JWT_EXPIRES_IN', ENV.JWT_EXPIRES);
  const accessToken = jwt.sign(
    {
      id: usuario.id,
      username: usuario.username,
      roles,
      id_persona: usuario.id_persona || null,
      mustChangePassword: !!usuario.debe_cambiar_password,
    },
    ENV.JWT_SECRET,
    { expiresIn: duracionAccess }
  );

  // 2. Refresh token (largo), con jti único
  const jti = crypto.randomUUID();
  const duracionRefreshStr = await obtenerDuracionRefresh(recordar);
  const { segundos: refreshSegundos } = parseDuracion(duracionRefreshStr);
  const refreshToken = firmarRefresh({
    idUsuario: usuario.id,
    jti,
    expiresIn: duracionRefreshStr,
  });

  // 3. Persistir hash del refresh
  const { rows } = await query(
    `INSERT INTO refresh_token
       (id_usuario, token_hash, expira_en, ip_creacion, user_agent, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      usuario.id,
      hashToken(refreshToken),
      enSegundos(refreshSegundos),
      ip || null,
      ua,
      usuario.username,
    ]
  );

  logRot(`emitirPar: creado refresh id=${rows[0].id} user=${usuario.id} ua=${ua.slice(0, 40)}`);

  return {
    accessToken,
    refreshToken,
    refreshExpiraEn: enSegundos(refreshSegundos),
    refreshId: rows[0].id,
  };
};

/**
 * Valida un refresh token (firma + BD + expiración + no revocado).
 * @returns {Promise<{ row, payload }>}
 */
export const validarRefresh = async (refreshToken) => {
  // 1. Verificar firma
  let payload;
  try {
    payload = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Refresh token inválido o expirado'), {
      status: 401,
      code: 'REFRESH_INVALID',
    });
  }

  if (payload.typ !== 'refresh') {
    throw Object.assign(new Error('Token no es un refresh'), {
      status: 401,
      code: 'REFRESH_INVALID',
    });
  }

  // 2. Buscar en BD por hash
  const hash = hashToken(refreshToken);
  const { rows } = await query(
    `SELECT id, id_usuario, expira_en, revocado, revocado_en, reemplazado_por, estado
       FROM refresh_token
      WHERE token_hash = $1
      LIMIT 1`,
    [hash]
  );
  const row = rows[0];

  if (!row) {
    throw Object.assign(new Error('Refresh token no reconocido'), {
      status: 401,
      code: 'REFRESH_NOT_FOUND',
    });
  }

  if (row.revocado) {
    // Reuso detectado: puede ser intento de robo, o race condition del frontend.
    // Por seguridad, revocamos TODA la cadena del usuario.
    await revocarTodosLosRefresh(row.id_usuario, 'REUSO_DETECTADO');
    throw Object.assign(new Error('Refresh token revocado. Sesión cerrada por seguridad.'), {
      status: 401,
      code: 'REFRESH_REVOKED',
    });
  }

  if (new Date(row.expira_en) < new Date()) {
    throw Object.assign(new Error('Refresh token expirado'), {
      status: 401,
      code: 'REFRESH_EXPIRED',
    });
  }

  if (row.estado !== 'ACTIVO') {
    throw Object.assign(new Error('Refresh token inactivo'), {
      status: 401,
      code: 'REFRESH_INACTIVE',
    });
  }

  return { row, payload };
};

/**
 * Rotación: valida el viejo, emite uno nuevo, y revoca el viejo
 * + cualquier otro refresh activo del mismo user_agent.
 */
export const rotarRefresh = async ({ refreshToken, ip, userAgent }) => {
  const rotacionActiva = await getBool('REFRESH_ROTACION_ACTIVA', true);
  const ua = normalizarUA(userAgent);

  const { row } = await validarRefresh(refreshToken);

  // Traer usuario + roles
  const { rows: uRows } = await query(
    `SELECT id, username, id_persona, debe_cambiar_password, estado
       FROM usuario WHERE id = $1 LIMIT 1`,
    [row.id_usuario]
  );
  const usuario = uRows[0];
  if (!usuario) {
    throw Object.assign(new Error('Usuario no encontrado'), { status: 401 });
  }
  if (usuario.estado !== 'ACTIVO') {
    await revocarTodosLosRefresh(usuario.id, 'USUARIO_NO_ACTIVO');
    throw Object.assign(new Error('Usuario inactivo o bloqueado'), { status: 403 });
  }

  const { rows: rolesRows } = await query(
    `SELECT r.nombre
       FROM rol r
       JOIN rol_usuario ru ON ru.id_rol = r.id
      WHERE ru.id_usuario = $1
        AND ru.estado = 'ACTIVO'
        AND r.estado = 'ACTIVO'`,
    [usuario.id]
  );
  const roles = rolesRows.map((r) => r.nombre);

  // Emitir nuevo par SIN revocar previos (porque ya vamos a revocar el `row` abajo).
  // Si revocáramos acá todos los del user_agent, revocaríamos el nuevo antes de crear el vínculo.
  const nuevo = await emitirPar({
    usuario,
    roles,
    ip,
    userAgent: ua,
    revocarPrevios: false,
  });

  // Revocar el viejo + hermanos del mismo user_agent (rotación estricta)
  if (rotacionActiva) {
    const { rowCount } = await query(
      `UPDATE refresh_token
          SET revocado = TRUE,
              revocado_en = NOW(),
              reemplazado_por = $1,
              estado = 'REVOCADO',
              modificado_por = $2,
              fecha_modificacion = NOW()
        WHERE id_usuario = $3
          AND user_agent = $4
          AND id <> $1
          AND revocado = FALSE`,
      [nuevo.refreshId, usuario.username, usuario.id, ua]
    );

    logRot(`rotarRefresh: revocados ${rowCount} refresh de user=${usuario.id} ua=${ua.slice(0, 40)} → nuevo id=${nuevo.refreshId}`);
  }

  return {
    accessToken: nuevo.accessToken,
    refreshToken: nuevo.refreshToken,
    refreshExpiraEn: nuevo.refreshExpiraEn,
    usuario: { id: usuario.id, username: usuario.username },
  };
};

/**
 * Revoca un refresh específico (logout).
 */
export const revocarRefresh = async (refreshToken, username = 'sistema') => {
  const hash = hashToken(refreshToken);
  await query(
    `UPDATE refresh_token
        SET revocado = TRUE,
            revocado_en = NOW(),
            estado = 'REVOCADO',
            modificado_por = $1,
            fecha_modificacion = NOW()
      WHERE token_hash = $2 AND revocado = FALSE`,
    [username, hash]
  );
};

/**
 * Revoca TODOS los refresh activos de un usuario.
 * Usos: cambio de password, bloqueo de cuenta, detección de robo.
 */
export const revocarTodosLosRefresh = async (idUsuario, motivo = 'MANUAL') => {
  const { rowCount } = await query(
    `UPDATE refresh_token
        SET revocado = TRUE,
            revocado_en = NOW(),
            estado = 'REVOCADO',
            modificado_por = $1,
            fecha_modificacion = NOW()
      WHERE id_usuario = $2 AND revocado = FALSE`,
    [`revocado:${motivo}`, idUsuario]
  );
  if (rowCount > 0) {
    logRot(`revocarTodosLosRefresh: user=${idUsuario} motivo=${motivo} revocados=${rowCount}`);
  }
  return rowCount;
};

/**
 * Limpieza: borra refresh ya revocados o expirados.
 * Llamar desde un job diario o al vuelo.
 */
export const limpiarRefreshViejos = async ({ diasRetencionRevocados = 30, diasRetencionExpirados = 7 } = {}) => {
  const { rowCount } = await query(
    `DELETE FROM refresh_token
      WHERE (revocado = TRUE AND revocado_en < NOW() - ($1 || ' days')::INTERVAL)
         OR (revocado = FALSE AND expira_en  < NOW() - ($2 || ' days')::INTERVAL)`,
    [diasRetencionRevocados, diasRetencionExpirados]
  );
  return rowCount;
};