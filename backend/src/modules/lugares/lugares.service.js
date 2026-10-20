import { query } from '../../config/db.js';

export const listar = async ({ q, estado, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const filtros = [];
  const valores = [];

  if (estado) {
    valores.push(estado);
    filtros.push(`estado = $${valores.length}`);
  } else {
    filtros.push(`estado <> 'ELIMINADO'`);
  }

  if (q) {
    valores.push(`%${q}%`);
    filtros.push(`(nombre ILIKE $${valores.length} OR direccion ILIKE $${valores.length})`);
  }

  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  const sqlData = `
    SELECT id, nombre, descripcion, direccion, piso,
           capacidad_maxima, requiere_aprobacion, estado,
           fecha_creacion, fecha_modificacion
      FROM lugar_visita
      ${where}
     ORDER BY nombre ASC
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`;
  const { rows } = await query(sqlData, [...valores, limit, offset]);

  const sqlCount = `SELECT COUNT(*)::int AS total FROM lugar_visita ${where}`;
  const { rows: [{ total }] } = await query(sqlCount, valores);

  return { items: rows, total, page, limit };
};

export const obtener = async (id) => {
  const { rows } = await query(
    `SELECT * FROM lugar_visita WHERE id = $1 AND estado <> 'ELIMINADO'`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Lugar no encontrado'), { status: 404 });
  return rows[0];
};

export const crear = async (datos, userId) => {
  const { rows } = await query(
    `INSERT INTO lugar_visita
       (nombre, descripcion, direccion, piso, capacidad_maxima, requiere_aprobacion, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [
      datos.nombre,
      datos.descripcion || null,
      datos.direccion || null,
      datos.piso || null,
      datos.capacidad_maxima || null,
      datos.requiere_aprobacion ?? true,
      userId,
    ]
  );
  return rows[0];
};

export const actualizar = async (id, datos, userId) => {
  const { rows } = await query(
    `UPDATE lugar_visita
        SET nombre = $1,
            descripcion = $2,
            direccion = $3,
            piso = $4,
            capacidad_maxima = $5,
            requiere_aprobacion = $6,
            modificado_por = $7,
            fecha_modificacion = NOW()
      WHERE id = $8 AND estado <> 'ELIMINADO'
      RETURNING *`,
    [
      datos.nombre,
      datos.descripcion || null,
      datos.direccion || null,
      datos.piso || null,
      datos.capacidad_maxima || null,
      datos.requiere_aprobacion ?? true,
      userId,
      id,
    ]
  );
  if (!rows[0]) throw Object.assign(new Error('Lugar no encontrado'), { status: 404 });
  return rows[0];
};

export const cambiarEstado = async (id, estado, userId) => {
  const permitidos = ['ACTIVO', 'INACTIVO', 'ELIMINADO'];
  if (!permitidos.includes(estado))
    throw Object.assign(new Error('Estado inválido'), { status: 400 });

  const { rows } = await query(
    `UPDATE lugar_visita
        SET estado = $1, modificado_por = $2, fecha_modificacion = NOW()
      WHERE id = $3
      RETURNING *`,
    [estado, userId, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Lugar no encontrado'), { status: 404 });
  return rows[0];
};

/**
 * Antes de eliminar un lugar, validar que no tenga autorizaciones activas.
 */
export const validarSinAutorizacionesActivas = async (id) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total
       FROM autorizacion
      WHERE id_lugar = $1
        AND estado IN ('PENDIENTE','APROBADA','EN_CURSO')`,
    [id]
  );
  if (rows[0].total > 0)
    throw Object.assign(
      new Error(`No se puede eliminar: hay ${rows[0].total} autorización(es) activa(s)`),
      { status: 409 }
    );
};