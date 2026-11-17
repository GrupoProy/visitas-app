import { getValor } from '../modules/parametros/parametros.service.js';

// =============================================================================
// Helpers internos
// =============================================================================
const parseHora = (hhmm) => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
};

// =============================================================================
// Conversión de fechas
// =============================================================================

/**
 * Convierte un Date (o string ISO) a "YYYY-MM-DD" respetando la zona local.
 */
export const toFechaLocal = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// =============================================================================
// Configuración
// =============================================================================

/**
 * Obtiene la configuración de horario desde parametro_sistema.
 */
export const obtenerConfigHorario = async () => {
  const [inicio, fin, dias, feriados] = await Promise.all([
    getValor('HORARIO_VISITA_INICIO', '08:30'),
    getValor('HORARIO_VISITA_FIN', '16:30'),
    getValor('DIAS_VISITA_PERMITIDOS', [1, 2, 3, 4, 5]),
    getValor('DIAS_FERIADOS', []),
  ]);

  return {
    inicio,
    fin,
    diasPermitidos: Array.isArray(dias) ? dias : [1, 2, 3, 4, 5],
    diasFeriados: Array.isArray(feriados) ? feriados : [],
  };
};

// =============================================================================
// Validación completa
// =============================================================================

/**
 * Valida que un rango [fechaInicio, fechaFin] esté dentro del horario permitido,
 * en días permitidos y que no sea feriado.
 * Lanza error con mensaje claro si no cumple.
 */
export const validarRangoHorario = async (fechaInicio, fechaFin) => {
  const cfg = await obtenerConfigHorario();

  const iniMin = parseHora(cfg.inicio);
  const finMin = parseHora(cfg.fin);
  if (iniMin === null || finMin === null) {
    throw Object.assign(
      new Error('Configuración de horario inválida en parametro_sistema'),
      { status: 500 }
    );
  }

  const iniDia = fechaInicio.getDay();
  const finDia = fechaFin.getDay();
  const diaISO = (d) => (d === 0 ? 7 : d); // 0=Dom → 7

  if (!cfg.diasPermitidos.includes(diaISO(iniDia))) {
    throw Object.assign(
      new Error('La fecha de inicio debe caer en un día permitido'),
      { status: 400 }
    );
  }
  if (!cfg.diasPermitidos.includes(diaISO(finDia))) {
    throw Object.assign(
      new Error('La fecha de fin debe caer en un día permitido'),
      { status: 400 }
    );
  }
  if (iniDia !== finDia) {
    throw Object.assign(
      new Error('La visita debe iniciar y terminar el mismo día'),
      { status: 400 }
    );
  }

  // ⭐ Validar feriados
  const fechaStr = toFechaLocal(fechaInicio);
  if (cfg.diasFeriados.includes(fechaStr)) {
    throw Object.assign(
      new Error(`No se pueden programar visitas en feriados (${fechaStr})`),
      { status: 400 }
    );
  }

  const iniMinutos = fechaInicio.getHours() * 60 + fechaInicio.getMinutes();
  const finMinutos = fechaFin.getHours() * 60 + fechaFin.getMinutes();

  if (iniMinutos < iniMin) {
    throw Object.assign(
      new Error(`La visita no puede iniciar antes de las ${cfg.inicio}`),
      { status: 400 }
    );
  }
  if (finMinutos > finMin) {
    throw Object.assign(
      new Error(`La visita no puede terminar después de las ${cfg.fin}`),
      { status: 400 }
    );
  }

  return cfg;
};