// hooks/usePageSize.js
import { useParametros } from './useParametros';

/**
 * Devuelve el tamaño de página configurado en UI_PAGE_SIZE_DEFAULT.
 * Si el parámetro no está definido, usa 10 como fallback.
 *
 * @param {number} [fallback=10] - Valor de respaldo
 * @returns {number} - Cantidad de filas por página
 */
export const usePageSize = (fallback = 10) => {
  const { parametros } = useParametros();
  const valor = parametros?.UI_PAGE_SIZE_DEFAULT;

  const parsed = parseInt(valor, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};