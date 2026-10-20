import { query } from '../../config/db.js';

export const listar = async () => {
  const { rows } = await query(
    `SELECT id, nombre, descripcion, estado
       FROM rol
      WHERE estado = 'ACTIVO'
      ORDER BY nombre ASC`
  );
  return rows;
};