import { accionesDe } from './estadosMeta';

// Compatibilidad con código existente
export const accionesPorEstado = (estado, mapa) => mapa[estado] || [];

export const ACCIONES_USUARIO       = null; // ya no se usa
export const ACCIONES_PERSONA       = null;
export const ACCIONES_LUGAR         = null;
export const ACCIONES_PARAMETRO     = null;
export const ACCIONES_AUTORIZACION  = null;

// ⭐ Nueva forma (recomendada)
export { accionesDe };