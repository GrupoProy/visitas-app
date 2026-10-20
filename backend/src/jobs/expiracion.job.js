import cron from 'node-cron';
import { expirarVencidas } from '../modules/autorizaciones/expiracion.service.js';
import { getValor } from '../modules/parametros/parametros.service.js';

let tarea = null;

/**
 * Inicia el job diario de expiración.
 * - Lee la expresión cron desde `EXPIRACION_HORA_EJECUCION`
 * - El margen de días se lee en caliente desde `EXPIRACION_DIAS_GRACIA`
 *   (cada vez que se ejecuta el job, no al arrancar).
 */
export const iniciarJobExpiracion = async () => {
  const activo = await getValor('EXPIRACION_AUTOMATICA_ACTIVA', true);
  if (!activo) {
    console.log('ℹ️  Expiración automática desactivada');
    return;
  }

  const expresion = await getValor('EXPIRACION_HORA_EJECUCION', '0 4 0 * * *');

  if (!cron.validate(expresion)) {
    console.error(`❌ Expresión cron inválida: "${expresion}". Job no iniciado.`);
    return;
  }

  // Evita duplicados si se reinicia el proceso
  if (tarea) tarea.stop();

  tarea = cron.schedule(expresion, async () => {
    const ts = new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' });
    try {
      const result = await expirarVencidas();
      if (result.total > 0) {
        console.log(
          `⏰ [${ts}] Expiradas ${result.total} autorizaciones ` +
          `(margen: ${result.margenDias} día(s)):`,
          result.codigos.slice(0, 10).join(', ')
        );
        if (result.codigos.length > 10) {
          console.log(`   … y ${result.codigos.length - 10} más`);
        }
      } else {
        console.log(`⏰ [${ts}] Sin autorizaciones para expirar (margen: ${result.margenDias} día(s))`);
      }
    } catch (e) {
      console.error(`❌ [${ts}] Error en job de expiración:`, e);
    }
  }, {
    scheduled: true,
    timezone: 'America/La_Paz',
  });

  console.log(`⏰ Job de expiración programado con: "${expresion}" (TZ America/La_Paz)`);
};

export const detenerJobExpiracion = () => {
  if (tarea) { tarea.stop(); tarea = null; }
};