import { getValor } from '../modules/parametros/parametros.service.js';

/**
 * Valida que un string contenga exactamente N dígitos.
 * Devuelve null si es válido, o un mensaje de error.
 */
export const validarTelefono = async (valor, { requerido = false } = {}) => {
  if (valor === null || valor === undefined || valor === '') {
    return requerido ? 'El teléfono es obligatorio' : null;
  }
  const longitud = await getValor('TELEFONO_LONGITUD', 7);
  const limpio = String(valor).trim();
  if (!/^\d+$/.test(limpio))
    return 'El teléfono debe contener solo números';
  if (limpio.length !== longitud)
    return `El teléfono debe tener exactamente ${longitud} dígitos`;
  return null;
};

/**
 * Valida el número de documento: alfanumérico, longitud entre min y max.
 */
export const validarDocumento = async (valor, { requerido = false } = {}) => {
  if (valor === null || valor === undefined || valor === '') {
    return requerido ? 'El número de documento es obligatorio' : null;
  }
  const min = await getValor('DOCUMENTO_LONGITUD_MIN', 5);
  const max = await getValor('DOCUMENTO_LONGITUD_MAX', 10);
  const limpio = String(valor).trim();

  if (!/^[A-Za-z0-9]+$/.test(limpio))
    return 'El documento solo admite letras y números';
  if (limpio.length < min || limpio.length > max)
    return `El documento debe tener entre ${min} y ${max} caracteres`;
  return null;
};