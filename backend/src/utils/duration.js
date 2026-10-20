// utils/duration.js
// =============================================================================
// Parser de duraciones tipo "15m", "7d", "12h", "30s"
// Devuelve SIEMPRE segundos (para JWT) y milisegundos (para Date)
// =============================================================================

const UNIDADES = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

/**
 * Convierte "15m" → { segundos: 900, ms: 900000 }
 * Acepta número puro → asume segundos.
 * Lanza error si el formato es inválido.
 */
export const parseDuracion = (valor) => {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return { segundos: valor, ms: valor * 1000 };
  }
  if (typeof valor !== 'string') {
    throw new Error(`Duración inválida: ${valor}`);
  }
  const match = valor.trim().match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error(`Formato de duración inválido: "${valor}". Usa "15m", "7d", "12h".`);
  }
  const cantidad = parseInt(match[1], 10);
  const unidad = match[2].toLowerCase();
  const segundos = cantidad * UNIDADES[unidad];
  return { segundos, ms: segundos * 1000 };
};

/** Helper: devuelve Date dentro de N segundos */
export const enSegundos = (segundos) => new Date(Date.now() + segundos * 1000);