// utils/exportarCsv.js
import { api } from '../api/client';

/**
 * Descarga un CSV desde un endpoint protegido.
 * @param {string} url      - Ruta relativa (ej. '/auditoria/login/export')
 * @param {object} params   - Query params
 * @param {string} filename - Nombre de archivo sugerido
 */
export const exportarCsv = async (url, params = {}, filename = 'export.csv') => {
  const response = await api.get(url, {
    params,
    responseType: 'blob', // importante: binario
  });

  // Crear blob y disparar descarga
  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);

  link.href = objectUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
};