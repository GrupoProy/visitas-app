// =============================================================================
// VALIDACIONES DE CAMPOS
// =============================================================================

/**
 * Valida teléfono: exactamente N dígitos.
 * @returns string | null (null si OK)
 */
export const validarTelefono = (valor, longitud = 7) => {
  if (!valor) return null; // opcional
  const limpio = String(valor).trim();
  if (!/^\d+$/.test(limpio)) return 'Solo se permiten números';
  if (limpio.length !== longitud)
    return `Debe tener exactamente ${longitud} dígitos`;
  return null;
};

/**
 * Valida número de documento: alfanumérico, min-max caracteres.
 */
export const validarDocumento = (valor, min = 5, max = 10) => {
  if (!valor) return 'El número de documento es obligatorio';
  const limpio = String(valor).trim();
  if (!/^[A-Za-z0-9]+$/.test(limpio)) return 'Solo letras y números';
  if (limpio.length < min || limpio.length > max)
    return `Debe tener entre ${min} y ${max} caracteres`;
  return null;
};

// =============================================================================
// HELPERS DE FECHA (siempre en zona horaria LOCAL)
// =============================================================================

/**
 * Convierte un Date (o string) a "YYYY-MM-DD" en hora local.
 */
export const toFechaLocal = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Convierte un Date (o string) a "YYYY-MM-DDTHH:mm" en hora local.
 * Formato para `<input type="datetime-local">`.
 *
 * ⚠️ NO usar `toISOString()` porque devuelve UTC y desfasa
 * el `min` del input por el offset de la zona.
 */
export const toLocalInput = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Devuelve "ahora" en formato local, redondeado al minuto actual
 * (sin segundos ni milisegundos).
 * Sirve para el `min` de los inputs datetime-local sin que el navegador
 * bloquee el minuto exacto actual.
 */
export const ahoraLocal = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return toLocalInput(d);
};

/**
 * Días ISO: 1=Lunes ... 7=Domingo.
 */
export const diaISO = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return d.getDay() === 0 ? 7 : d.getDay();
};

/**
 * Verifica si una fecha (YYYY-MM-DD) está en la lista de feriados.
 */
export const esFeriado = (fechaYMD, feriados = []) => {
  if (!fechaYMD) return false;
  return feriados.includes(fechaYMD);
};

/**
 * Verifica si una fecha es fin de semana (Sáb o Dom).
 */
export const esFinDeSemana = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6;
};

// =============================================================================
// VALIDACIÓN DE RANGO HORARIO
// =============================================================================

/**
 * Valida un rango horario contra las reglas configurables.
 * @returns string | null (null si es válido)
 */
export const validarRangoHorario = (fechaInicioStr, fechaFinStr, cfg) => {
  if (!fechaInicioStr) return 'Fecha de inicio requerida';
  if (!fechaFinStr) return 'Fecha de fin requerida';

  const ini = new Date(fechaInicioStr);
  const fin = new Date(fechaFinStr);

  if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime()))
    return 'Fechas inválidas';

  if (fin <= ini) return 'La fecha de fin debe ser posterior al inicio';

  const { inicio, fin: finCfg, diasPermitidos = [1,2,3,4,5], diasFeriados = [] } = cfg;

  const iniDia = diaISO(ini);
  const finDia = diaISO(fin);

  if (!diasPermitidos.includes(iniDia))
    return 'La visita debe iniciar en un día permitido';
  if (!diasPermitidos.includes(finDia))
    return 'La visita debe terminar en un día permitido';
  if (iniDia !== finDia)
    return 'La visita debe iniciar y terminar el mismo día';

  // Feriados
  const fechaStr = toFechaLocal(ini);
  if (diasFeriados.includes(fechaStr))
    return `No se pueden programar visitas en feriados (${fechaStr})`;

  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const iniMin = ini.getHours() * 60 + ini.getMinutes();
  const finMin = fin.getHours() * 60 + fin.getMinutes();

  if (iniMin < toMin(inicio)) return `No puede iniciar antes de las ${inicio}`;
  if (finMin > toMin(finCfg)) return `No puede terminar después de las ${finCfg}`;

  return null;
};

/**
 * Determina si una fecha es programable (≥ hoy, día permitido, no feriado).
 * @returns { ok: boolean, motivo: string }
 */
export const validarFechaProgramable = (date, { diasPermitidos = [1,2,3,4,5], feriados = [] } = {}) => {
  const d = date instanceof Date ? date : new Date(date);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const soloFecha = new Date(d);
  soloFecha.setHours(0, 0, 0, 0);

  if (soloFecha < hoy) return { ok: false, motivo: 'No puede ser anterior a hoy' };

  const dia = diaISO(d);
  if (!diasPermitidos.includes(dia)) return { ok: false, motivo: 'Día no permitido' };

  const fechaStr = toFechaLocal(d);
  if (feriados.includes(fechaStr)) return { ok: false, motivo: 'Día feriado' };

  return { ok: true, motivo: '' };
};