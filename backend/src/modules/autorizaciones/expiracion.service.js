
import { query } from '../../config/db.js';
import { getValor } from '../parametros/parametros.service.js';

/**
 * Expira todas las autorizaciones que:
 *  - Están PENDIENTES o APROBADAS
 *  - NO registraron ingreso (fecha_ingreso_real IS NULL)
 *  - Su fecha_fin ya pasó hace más de X días (parámetro EXPIRACION_DIAS_GRACIA)
 *
 * No toca las EN_CURSO (esas son huérfanas, requieren regularización manual).
 
 */
export const expirarVencidas = async () => {
  const margenDias = await getValor('EXPIRACION_DIAS_GRACIA', 1);
  const margen = Number(margenDias) >= 0 ? Number(margenDias) : 1;

  const { rows } = await query(
    `UPDATE autorizacion
        SET estado = 'EXPIRADA',
            fecha_modificacion = NOW()
      WHERE estado IN ('PENDIENTE', 'APROBADA')
        AND fecha_ingreso_real IS NULL
        AND fecha_fin < NOW() - ($1 || ' days')::interval
      RETURNING id, codigo, estado, fecha_fin`,
    [margen]
  );

  return {
    total: rows.length,
    margenDias: margen,
    codigos: rows.map((r) => r.codigo),
  };
};

/**
 * Versión "lazy": se llama cuando se listan autorizaciones
 * o al cargar el dashboard para que la UI no muestre como
 * vigentes las que ya expiraron.
 * Idempotente y barata (usa índice parcial).
 */
export const expirarVencidasRapido = async () => {
  const margenDias = await getValor('EXPIRACION_DIAS_GRACIA', 1);
  const margen = Number(margenDias) >= 0 ? Number(margenDias) : 1;

  const { rowCount } = await query(
    `UPDATE autorizacion
        SET estado = 'EXPIRADA',
            fecha_modificacion = NOW()
      WHERE estado IN ('PENDIENTE', 'APROBADA')
        AND fecha_ingreso_real IS NULL
        AND fecha_fin < NOW() - ($1 || ' days')::interval`,
    [margen]
  );
  return rowCount;
};