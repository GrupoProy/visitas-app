// modules/limpieza/limpieza.service.js
// =============================================================================
// Servicio de limpieza de datos antiguos.
//   · login_intento   → purga por antigüedad
//   · refresh_token   → purga revocados y expirados
// =============================================================================

import { query } from '../../config/db.js';
import { getValor } from '../parametros/parametros.service.js';

/**
 * Purga refresh tokens según política:
 *   - Revocados: se borran tras N días desde revocado_en
 *   - Expirados (no revocados): se borran tras M días desde expira_en
 */
export const limpiarRefreshTokens = async () => {
  const diasRevocados = parseInt(
    await getValor('LIMPIEZA_RETENCION_REFRESH_DIAS', '30'),
    10
  );
  const diasExpirados = parseInt(
    await getValor('LIMPIEZA_RETENCION_REFRESH_EXPIRADOS_DIAS', '7'),
    10
  );

  const { rowCount } = await query(
    `DELETE FROM refresh_token
      WHERE (revocado = TRUE
             AND revocado_en IS NOT NULL
             AND revocado_en < NOW() - ($1 || ' days')::INTERVAL)
         OR (revocado = FALSE
             AND expira_en < NOW() - ($2 || ' days')::INTERVAL)`,
    [diasRevocados, diasExpirados]
  );

  return {
    eliminados: rowCount,
    politica: { diasRevocados, diasExpirados },
  };
};

/**
 * Purga registros de login_intento más viejos que N días.
 */
export const limpiarLoginIntentos = async () => {
  const dias = parseInt(await getValor('LIMPIEZA_RETENCION_LOGIN_DIAS', '90'), 10);

  const { rowCount } = await query(
    `DELETE FROM login_intento
      WHERE fecha < NOW() - ($1 || ' days')::INTERVAL`,
    [dias]
  );

  return { eliminados: rowCount, dias };
};

/**
 * Purga refresh tokens revocados de un usuario específico.
 * Útil desde la UI de admin ("limpiar sesiones cerradas").
 */
export const limpiarRefreshDeUsuario = async (idUsuario, diasRevocados = 0) => {
  const { rowCount } = await query(
    `DELETE FROM refresh_token
      WHERE id_usuario = $1
        AND revocado = TRUE
        AND revocado_en < NOW() - ($2 || ' days')::INTERVAL`,
    [idUsuario, diasRevocados]
  );
  return rowCount;
};

/**
 * Ejecuta TODAS las tareas de limpieza y devuelve un resumen.
 * Se llama desde el job diario.
 */
export const ejecutarLimpiezaCompleta = async () => {
  const inicio = Date.now();
  const errores = [];
  let refresh = { eliminados: 0 };
  let login = { eliminados: 0 };

  try {
    refresh = await limpiarRefreshTokens();
  } catch (e) {
    errores.push({ tarea: 'refresh_token', error: e.message });
  }

  try {
    login = await limpiarLoginIntentos();
  } catch (e) {
    errores.push({ tarea: 'login_intento', error: e.message });
  }

  return {
    duracionMs: Date.now() - inicio,
    refreshTokens: refresh,
    loginIntentos: login,
    errores,
  };
};