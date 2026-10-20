import { randomBytes } from 'crypto';
/*
export const generarCodigo = (prefijo = 'AUT-RRHH') => {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = randomBytes(3).toString('hex').toUpperCase();
  return `${prefijo}-${ts}-${rnd}`;
};

export const generarCodigo = (prefijo = 'AUT') => {
  const rnd = randomBytes(8).toString('hex').toUpperCase();  // 16 chars
  return `${prefijo}-${rnd}`;  // AUT-9F2A1CB7D8E53C4F
};
*/

export const generarCodigo = (prefijo = 'AUT') => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rnd = randomBytes(3).toString('hex').toUpperCase();
  return `${prefijo}-${ymd}-${rnd}`;  // AUT-20250121-9F2A1C
};