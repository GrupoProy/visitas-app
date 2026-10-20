// jobs/limpieza.job.js
// =============================================================================
// Job diario de limpieza de datos antiguos.
//   · Lee la expresión cron desde LIMPIEZA_HORA_EJECUCION
//   · Lee las políticas de retención en caliente desde los parámetros
// =============================================================================

import cron from 'node-cron';
import { ejecutarLimpiezaCompleta } from '../modules/limpieza/limpieza.service.js';
import { getValor } from '../modules/parametros/parametros.service.js';

let tarea = null;

export const iniciarJobLimpieza = async () => {
  const activo = await getValor('LIMPIEZA_AUTOMATICA_ACTIVA', true);
  if (!activo) {
    console.log('ℹ️  Limpieza automática desactivada');
    return;
  }

  const expresion = await getValor('LIMPIEZA_HORA_EJECUCION', '0 0 3 * * *');

  if (!cron.validate(expresion)) {
    console.error(`❌ Expresión cron inválida de limpieza: "${expresion}". Job no iniciado.`);
    return;
  }

  if (tarea) tarea.stop();

  tarea = cron.schedule(expresion, async () => {
    const ts = new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' });
    try {
      const r = await ejecutarLimpiezaCompleta();

      const partes = [];
      if (r.refreshTokens.eliminados > 0) {
        partes.push(`${r.refreshTokens.eliminados} refresh`);
      }
      if (r.loginIntentos.eliminados > 0) {
        partes.push(`${r.loginIntentos.eliminados} login_intento`);
      }

      if (partes.length === 0) {
        console.log(`🧹 [${ts}] Limpieza: sin registros para purgar (${r.duracionMs}ms)`);
      } else {
        console.log(`🧹 [${ts}] Limpieza: ${partes.join(', ')} (${r.duracionMs}ms)`);
      }

      if (r.errores.length > 0) {
        console.error(`❌ [${ts}] Errores en limpieza:`, r.errores);
      }
    } catch (e) {
      console.error(`❌ [${ts}] Error en job de limpieza:`, e);
    }
  }, {
    scheduled: true,
    timezone: 'America/La_Paz',
  });

  console.log(`🧹 Job de limpieza programado con: "${expresion}" (TZ America/La_Paz)`);
};

export const detenerJobLimpieza = () => {
  if (tarea) { tarea.stop(); tarea = null; }
};