import { query } from '../../config/db.js';
import { validarTelefono, validarDocumento } from '../../utils/validaciones.js';

// =============================================================================
// BÚSQUEDA PUNTUAL
// =============================================================================

/**
 * Busca una persona por tipo + número de documento.
 * Ignora las marcadas como ELIMINADO.
 */
export const buscarPorDocumento = async (tipo_documento, numero_documento) => {
  const { rows } = await query(
    `SELECT * FROM persona
      WHERE tipo_documento = $1
        AND numero_documento = $2
        AND estado <> 'ELIMINADO'
      LIMIT 1`,
    [tipo_documento, numero_documento]
  );
  return rows[0] || null;
};

// =============================================================================
// CREAR / REUTILIZAR
// =============================================================================

/**
 * Si la persona existe por documento → se reutiliza.
 * Si no existe → se crea.
 *
 * Además, si llega `es_anfitrion = true` y la persona existía sin ese flag,
 * se actualiza el flag automáticamente.
 *
 * Aplica validaciones de documento y teléfono desde parametro_sistema.
 */
export const obtenerOCrear = async (datos, userId) => {
  // Validaciones previas
  const errDoc = await validarDocumento(datos.numero_documento, { requerido: true });
  if (errDoc) throw Object.assign(new Error(errDoc), { status: 422 });

  const errTel = await validarTelefono(datos.telefono);
  if (errTel) throw Object.assign(new Error(errTel), { status: 422 });

  const existente = await buscarPorDocumento(
    datos.tipo_documento,
    String(datos.numero_documento).trim()
  );

  if (existente) {
    // Si hay que actualizar el flag de anfitrión, lo hacemos
    if (datos.es_anfitrion === true && !existente.es_anfitrion) {
      const { rows } = await query(
        `UPDATE persona
            SET es_anfitrion = TRUE,
                modificado_por = $1,
                fecha_modificacion = NOW()
          WHERE id = $2
          RETURNING *`,
        [userId, existente.id]
      );
      return { persona: rows[0], creada: false };
    }
    return { persona: existente, creada: false };
  }

  const { rows } = await query(
    `INSERT INTO persona
       (tipo_documento, numero_documento, nombres, primer_apellido, segundo_apellido,
        email, telefono, procedencia, foto_url, es_anfitrion, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      datos.tipo_documento,
      String(datos.numero_documento).trim(),
      datos.nombres.trim(),
      datos.primer_apellido.trim(),
      datos.segundo_apellido?.trim() || null,
      datos.email?.trim() || null,
      datos.telefono?.trim() || null,
      datos.procedencia?.trim() || null,
      datos.foto_url || null,
      datos.es_anfitrion === true,
      userId,
    ]
  );
  return { persona: rows[0], creada: true };
};

// =============================================================================
// LISTAR (grid con paginación y filtros)
// =============================================================================

export const listar = async ({ q, estado, es_anfitrion, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const filtros = [];
  const valores = [];

  if (estado) {
    valores.push(estado);
    filtros.push(`estado = $${valores.length}`);
  } else {
    filtros.push(`estado <> 'ELIMINADO'`);
  }

  if (es_anfitrion === true || es_anfitrion === 'true') {
    filtros.push(`es_anfitrion = TRUE`);
  }

  if (q) {
    valores.push(`%${q}%`);
    filtros.push(`(
      nombres ILIKE $${valores.length} OR
      primer_apellido ILIKE $${valores.length} OR
      segundo_apellido ILIKE $${valores.length} OR
      numero_documento ILIKE $${valores.length} OR
      email ILIKE $${valores.length}
    )`);
  }

  const where = `WHERE ${filtros.join(' AND ')}`;

  const sqlData = `
    SELECT id, tipo_documento, numero_documento, nombres,
           primer_apellido, segundo_apellido,
           email, telefono, procedencia, es_anfitrion, estado,
           fecha_creacion, fecha_modificacion
      FROM persona
      ${where}
     ORDER BY fecha_creacion DESC
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`;
  const { rows } = await query(sqlData, [...valores, limit, offset]);

  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*)::int AS total FROM persona ${where}`,
    valores
  );

  return { items: rows, total, page, limit };
};

// =============================================================================
// ANFITRIONES (para el <Select> en NuevaAutorizacion)
// =============================================================================

/**
 * Lista sólo personas marcadas como anfitrión y activas.
 * Búsqueda opcional por nombre, apellido o documento.
 */
export const listarAnfitriones = async ({ q } = {}) => {
  const valores = [];
  let filtroQ = '';

  if (q) {
    valores.push(`%${q}%`);
    filtroQ = `AND (
      nombres ILIKE $${valores.length} OR
      primer_apellido ILIKE $${valores.length} OR
      segundo_apellido ILIKE $${valores.length} OR
      numero_documento ILIKE $${valores.length}
    )`;
  }

  const { rows } = await query(
    `SELECT id, tipo_documento, numero_documento, nombres,
            primer_apellido, segundo_apellido, email, procedencia
       FROM persona
      WHERE es_anfitrion = TRUE
        AND estado = 'ACTIVO'
        ${filtroQ}
      ORDER BY nombres ASC, primer_apellido ASC`,
    valores
  );
  return rows;
};

// =============================================================================
// OBTENER
// =============================================================================

export const obtener = async (id) => {
  const { rows } = await query(
    `SELECT * FROM persona WHERE id = $1 AND estado <> 'ELIMINADO'`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Persona no encontrada'), { status: 404 });
  return rows[0];
};

// =============================================================================
// ACTUALIZAR
// =============================================================================

export const actualizar = async (id, datos, userId) => {
  const existente = await obtener(id);

  // Validaciones previas
  const errDoc = await validarDocumento(datos.numero_documento, { requerido: true });
  if (errDoc) throw Object.assign(new Error(errDoc), { status: 422 });

  const errTel = await validarTelefono(datos.telefono);
  if (errTel) throw Object.assign(new Error(errTel), { status: 422 });

  // Si el documento cambió, verificar que no colisione con otra persona
  const numeroNuevo = String(datos.numero_documento).trim();
  if (
    datos.tipo_documento !== existente.tipo_documento ||
    numeroNuevo !== existente.numero_documento
  ) {
    const duplicado = await buscarPorDocumento(datos.tipo_documento, numeroNuevo);
    if (duplicado && duplicado.id !== Number(id)) {
      throw Object.assign(
        new Error('Ya existe otra persona con ese tipo y número de documento'),
        { status: 409 }
      );
    }
  }

  const { rows } = await query(
    `UPDATE persona
        SET tipo_documento = $1,
            numero_documento = $2,
            nombres = $3,
            primer_apellido = $4,
            segundo_apellido = $5,
            email = $6,
            telefono = $7,
            procedencia = $8,
            foto_url = $9,
            es_anfitrion = $10,
            modificado_por = $11,
            fecha_modificacion = NOW()
      WHERE id = $12 AND estado <> 'ELIMINADO'
      RETURNING *`,
    [
      datos.tipo_documento,
      numeroNuevo,
      datos.nombres.trim(),
      datos.primer_apellido.trim(),
      datos.segundo_apellido?.trim() || null,
      datos.email?.trim() || null,
      datos.telefono?.trim() || null,
      datos.procedencia?.trim() || null,
      datos.foto_url || null,
      datos.es_anfitrion === true,
      userId,
      id,
    ]
  );
  return rows[0];
};

// =============================================================================
// CAMBIAR ESTADO
// =============================================================================

export const cambiarEstado = async (id, estado, userId) => {
  const permitidos = ['ACTIVO', 'INACTIVO', 'ELIMINADO'];
  if (!permitidos.includes(estado))
    throw Object.assign(new Error('Estado inválido'), { status: 400 });

  const { rows } = await query(
    `UPDATE persona
        SET estado = $1, modificado_por = $2, fecha_modificacion = NOW()
      WHERE id = $3
      RETURNING *`,
    [estado, userId, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Persona no encontrada'), { status: 404 });
  return rows[0];
};

// =============================================================================
// VALIDACIÓN DE ELIMINACIÓN
// =============================================================================

/**
 * Antes de eliminar una persona, verificar que no tenga autorizaciones activas
 * como visitante o como anfitrión.
 */
export const validarSinAutorizacionesActivas = async (id) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total
       FROM autorizacion
      WHERE (id_persona = $1 OR id_anfitrion = $1)
        AND estado IN ('PENDIENTE','APROBADA','EN_CURSO')`,
    [id]
  );
  if (rows[0].total > 0)
    throw Object.assign(
      new Error(`No se puede eliminar: tiene ${rows[0].total} autorización(es) activa(s)`),
      { status: 409 }
    );
};

/**
 * Personas que NO están vinculadas a un usuario (para asignar en Usuarios).
 * Si `incluirIdUsuario` se pasa, se incluye también la persona ya asignada
 * a ese usuario (para no perderla al editar).
 */
export const listarDisponiblesParaUsuario = async ({ incluirIdUsuario = null } = {}) => {
  const valores = [];
  let filtroUsuario = '';

  if (incluirIdUsuario) {
    valores.push(incluirIdUsuario);
    filtroUsuario = `OR u.id = $${valores.length}`;
  }

  const { rows } = await query(
    `SELECT p.id, p.tipo_documento, p.numero_documento,
            p.nombres, p.primer_apellido, p.segundo_apellido,
            p.email, p.procedencia, p.es_anfitrion
       FROM persona p
       LEFT JOIN usuario u ON u.id_persona = p.id AND u.estado <> 'ELIMINADO'
      WHERE p.estado = 'ACTIVO'
         AND P.es_anfitrion = TRUE
        AND (u.id IS NULL ${filtroUsuario})
      ORDER BY p.nombres ASC, p.primer_apellido ASC
      limit 2000`,
    valores
  );
  return rows;
};

// modules/personas/personas.service.js
/**
 * Lista personas que NO son anfitriones y están activas.
 * Útil para el combo de filtros del reporte por visitante.
 */
export const listarVisitantes = async () => {
  const { rows } = await query(
    `SELECT id, tipo_documento, numero_documento,
            nombres, primer_apellido, segundo_apellido,
            email, telefono, procedencia
       FROM persona
      WHERE es_anfitrion = FALSE
        AND estado = 'ACTIVO'
      ORDER BY nombres, primer_apellido`
  );
  return rows;
};