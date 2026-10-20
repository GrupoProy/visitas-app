import bcrypt from 'bcryptjs';
import { query } from '../../config/db.js';
import { invalidarCachePermisos } from '../../middlewares/permisos.js';
import { resetearPassword as resetearPasswordAuth } from '../auth/password.service.js';
import { validarPoliticaPassword } from '../auth/password.service.js';

const SELECT_USUARIO = `
  SELECT u.id, u.username, u.email, u.nombres,
         u.primer_apellido, u.segundo_apellido,
         u.telefono, u.ultimo_acceso, u.estado,
         u.id_persona,
         u.debe_cambiar_password,
         u.password_actualizado_en,
         u.fecha_creacion, u.fecha_modificacion,
         COALESCE(
           (SELECT json_agg(json_build_object('id', r.id, 'nombre', r.nombre))
              FROM rol_usuario ru
              JOIN rol r ON r.id = ru.id_rol
             WHERE ru.id_usuario = u.id AND ru.estado = 'ACTIVO'),
           '[]'::json
         ) AS roles,
         (SELECT json_build_object(
                   'id', p.id,
                   'nombres', p.nombres,
                   'primer_apellido', p.primer_apellido,
                   'segundo_apellido', p.segundo_apellido,
                   'numero_documento', p.numero_documento,
                   'es_anfitrion', p.es_anfitrion
                 )
            FROM persona p
           WHERE p.id = u.id_persona) AS persona,
         (SELECT COUNT(*)::int
            FROM refresh_token rt
           WHERE rt.id_usuario = u.id
             AND rt.revocado = FALSE
             AND rt.expira_en > NOW()) AS sesiones_activas
    FROM usuario u
`;

export const listar = async ({ q, estado, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  const filtros = [];
  const valores = [];

  if (estado) {
    valores.push(estado);
    filtros.push(`u.estado = $${valores.length}`);
  } else {
    filtros.push(`u.estado <> 'ELIMINADO'`);
  }

  if (q) {
    valores.push(`%${q}%`);
    filtros.push(`(u.username ILIKE $${valores.length}
                 OR u.email ILIKE $${valores.length}
                 OR u.nombres ILIKE $${valores.length}
                 OR u.primer_apellido ILIKE $${valores.length})`);
  }

  const where = `WHERE ${filtros.join(' AND ')}`;

  const { rows } = await query(
    `${SELECT_USUARIO} ${where}
     ORDER BY u.fecha_creacion DESC
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
    [...valores, limit, offset]
  );

  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*)::int AS total FROM usuario u ${where}`, valores
  );

  return { items: rows, total, page, limit };
};

export const obtener = async (id) => {
  const { rows } = await query(`${SELECT_USUARIO} WHERE u.id = $1`, [id]);
  if (!rows[0]) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  return rows[0];
};

export const crear = async (datos, username) => {
  const { username: nuevoUsername, email, password, nombres, primer_apellido,
          segundo_apellido, telefono, roles, id_persona } = datos;

  const { valida, errores } = await validarPoliticaPassword(password);
  if (!valida) {
    throw Object.assign(new Error(errores.join(' ')), {
      status: 400,
      code: 'PASSWORD_NO_CUMPLE_POLITICA',
      detalles: errores,
    });
  }

  const dup = await query(
    `SELECT id FROM usuario WHERE username = $1 OR email = $2 LIMIT 1`,
    [nuevoUsername, email]
  );
  if (dup.rows[0])
    throw Object.assign(new Error('Ya existe un usuario con ese username o email'), { status: 409 });

  const hash = await bcrypt.hash(password, 10);

  const { rows } = await query(
    `INSERT INTO usuario
       (username, email, password_hash, nombres, primer_apellido,
        segundo_apellido, telefono, id_persona, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      nuevoUsername, email, hash, nombres, primer_apellido,
      segundo_apellido || null, telefono || null,
      id_persona || null, username,  
    ]
  );
  const newId = rows[0].id;

  await asignarRoles(newId, roles || [], username);
  return obtener(newId);
};

export const actualizar = async (id, datos, username) => {
  const { username: nuevoUsername, email, password, nombres, primer_apellido,
          segundo_apellido, telefono, roles, id_persona } = datos;

  const dup = await query(
    `SELECT id FROM usuario
      WHERE (username = $1 OR email = $2) AND id <> $3
      LIMIT 1`,
    [nuevoUsername, email, id]
  );
  if (dup.rows[0])
    throw Object.assign(new Error('Ya existe otro usuario con ese username o email'), { status: 409 });

  if (password && password.trim().length > 0) {
    const { valida, errores } = await validarPoliticaPassword(password);
    if (!valida) {
      throw Object.assign(new Error(errores.join(' ')), {
        status: 400,
        code: 'PASSWORD_NO_CUMPLE_POLITICA',
        detalles: errores,
      });
    }
  }

  const params = [
    nuevoUsername, email, nombres, primer_apellido, segundo_apellido || null,
    telefono || null, id_persona || null, username, id,   
  ];
  let sql = `UPDATE usuario
                SET username = $1, email = $2, nombres = $3,
                    primer_apellido = $4, segundo_apellido = $5,
                    telefono = $6, id_persona = $7, modificado_por = $8,
                    fecha_modificacion = NOW()`;

  if (password && password.trim().length > 0) {
    const hash = await bcrypt.hash(password, 10);
    params.push(hash);
    sql += `, password_hash = $${params.length}`;
  }

  sql += ` WHERE id = $9 RETURNING id`;

  const { rows } = await query(sql, params);
  if (!rows[0]) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  if (Array.isArray(roles)) await asignarRoles(id, roles, username);

  return obtener(id);
};

/*
const asignarRoles = async (idUsuario, roles, username) => {
  await query(
    `UPDATE rol_usuario
        SET estado = 'INACTIVO', modificado_por = $1, fecha_modificacion = NOW()
      WHERE id_usuario = $2 AND estado = 'ACTIVO'`,
    [username, idUsuario]   
  );

  if (roles.length) {
    for (const idRol of roles) {
      const { rows } = await query(
        `SELECT id FROM rol_usuario WHERE id_usuario = $1 AND id_rol = $2 LIMIT 1`,
        [idUsuario, idRol]
      );
      if (rows[0]) {
        await query(
          `UPDATE rol_usuario
              SET estado = 'ACTIVO', modificado_por = $1, fecha_modificacion = NOW()
            WHERE id = $2`,
          [username, rows[0].id]   
        );
      } else {
        await query(
          `INSERT INTO rol_usuario (id_rol, id_usuario, creado_por) VALUES ($1,$2,$3)`,
          [idRol, idUsuario, username]   
        );
      }
    }
  }

  invalidarCachePermisos(idUsuario);
};
*/
/*
export const cambiarEstado = async (id, estado, { usuarioId, username }) => {
  const permitidos = ['ACTIVO', 'INACTIVO', 'BLOQUEADO', 'ELIMINADO'];
  if (!permitidos.includes(estado))
    throw Object.assign(new Error('Estado inválido'), { status: 400 });

  if (Number(id) === Number(usuarioId) && estado !== 'ACTIVO')
    throw Object.assign(new Error('No puedes desactivar tu propio usuario'), { status: 400 });

  const { rows } = await query(
    `UPDATE usuario
        SET estado = $1, modificado_por = $2, fecha_modificacion = NOW()
      WHERE id = $3
      RETURNING id`,
    [estado, username, id]   
  );
  if (!rows[0]) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  invalidarCachePermisos(id);
  return obtener(id);
};*/



export const cambiarEstado = async (id, estado, { usuarioId, username }) => {
  const permitidos = ['ACTIVO', 'INACTIVO', 'BLOQUEADO', 'ELIMINADO'];
  if (!permitidos.includes(estado))
    throw Object.assign(new Error('Estado inválido'), { status: 400 });

  if (Number(id) === Number(usuarioId) && estado !== 'ACTIVO')
    throw Object.assign(new Error('No puedes desactivar tu propio usuario'), { status: 400 });

  // Verificar que el usuario existe
  const { rows: actualRows } = await query(
    `SELECT id, username, estado FROM usuario WHERE id = $1`,
    [id]
  );
  if (!actualRows[0])
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  const estadoAnterior = actualRows[0].estado;

  // Actualizar el estado del usuario
  const { rows } = await query(
    `UPDATE usuario
        SET estado = $1, modificado_por = $2, fecha_modificacion = NOW()
      WHERE id = $3
      RETURNING id`,
    [estado, username, id]
  );
  if (!rows[0])
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  // ⭐ CASCADE: si el usuario pasa a un estado no-ACTIVO,
  //    todos sus roles pasan a INACTIVO también.
  if (estado !== 'ACTIVO' && estadoAnterior === 'ACTIVO') {
    await query(
      `UPDATE rol_usuario
          SET estado = 'INACTIVO',
              modificado_por = $1,
              fecha_modificacion = NOW()
        WHERE id_usuario = $2 AND estado = 'ACTIVO'`,
      [username, id]
    );
  }

  // ⭐ Si se reactiva al usuario, no tocamos los roles (el admin decide).

  invalidarCachePermisos(id);
  return obtener(id);
};

export const resetearPassword = async ({ idUsuario, adminUsername }) => {
  const { passwordTemporal } = await resetearPasswordAuth({
    idUsuario,
    adminUsername,
  });
  return { passwordTemporal };
};


// =============================================================================
// ASIGNAR ROL (regla: solo un rol activo por usuario)
// =============================================================================
/**
 * Asigna un rol a un usuario.
 * REGLA DE NEGOCIO: un usuario solo puede tener UN rol ACTIVO a la vez.
 * Al asignar uno nuevo, todos los demás se marcan INACTIVO.
 */
export const asignarRol = async (idUsuario, idRol, username) => {
  // Verificar que el usuario existe y está activo
  const { rows: userRows } = await query(
    `SELECT id, username, estado FROM usuario WHERE id = $1 AND estado <> 'ELIMINADO'`,
    [idUsuario]
  );
  if (!userRows[0])
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  if (userRows[0].estado !== 'ACTIVO') {
    throw Object.assign(
      new Error('El usuario no está activo. Actívalo antes de asignarle roles.'),
      { status: 400 }
    );
  }

  // Verificar que el rol existe y está activo
  const { rows: rolRows } = await query(
    `SELECT id, nombre FROM rol WHERE id = $1 AND estado = 'ACTIVO'`,
    [idRol]
  );
  if (!rolRows[0])
    throw Object.assign(new Error('Rol no encontrado o inactivo'), { status: 404 });

  // ¿Ya tiene ese rol activo?
  const { rows: existente } = await query(
    `SELECT id FROM rol_usuario
      WHERE id_usuario = $1 AND id_rol = $2 AND estado = 'ACTIVO'
      LIMIT 1`,
    [idUsuario, idRol]
  );
  if (existente[0]) {
    throw Object.assign(
      new Error(`El usuario ya tiene asignado el rol "${rolRows[0].nombre}"`),
      { status: 409 }
    );
  }

  // ⭐ REVOCAR los demás roles activos (regla: uno solo activo)
  await query(
    `UPDATE rol_usuario
        SET estado = 'INACTIVO', modificado_por = $1, fecha_modificacion = NOW()
      WHERE id_usuario = $2 AND estado = 'ACTIVO' AND id_rol <> $3`,
    [username, idUsuario, idRol]
  );

  // Activar o crear la relación
  const { rows: relacion } = await query(
    `SELECT id FROM rol_usuario WHERE id_usuario = $1 AND id_rol = $2 LIMIT 1`,
    [idUsuario, idRol]
  );

  if (relacion[0]) {
    await query(
      `UPDATE rol_usuario
          SET estado = 'ACTIVO', modificado_por = $1, fecha_modificacion = NOW()
        WHERE id = $2`,
      [username, relacion[0].id]
    );
  } else {
    await query(
      `INSERT INTO rol_usuario (id_rol, id_usuario, creado_por) VALUES ($1,$2,$3)`,
      [idRol, idUsuario, username]
    );
  }

  invalidarCachePermisos(idUsuario);
  return obtener(idUsuario);
};

// =============================================================================
// REVOCAR ROL INDIVIDUAL
// =============================================================================
// =============================================================================
// REVOCAR ROL
// =============================================================================
/**
 * Revoca un rol específico de un usuario.
 * Regla: se permite dejar al usuario sin roles activos
 * (el admin puede reactivarlo después).
 */
export const revocarRol = async (idUsuario, idRol, username) => {
  // Verificar que el usuario existe
  const { rows: userRows } = await query(
    `SELECT id, username FROM usuario WHERE id = $1 AND estado <> 'ELIMINADO'`,
    [idUsuario]
  );
  if (!userRows[0])
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  // Verificar que el rol existe
  const { rows: rolRows } = await query(
    `SELECT id, nombre FROM rol WHERE id = $1`,
    [idRol]
  );
  if (!rolRows[0])
    throw Object.assign(new Error('Rol no encontrado'), { status: 404 });

  // ¿El usuario tiene ese rol activo?
  const { rows: existente } = await query(
    `SELECT id FROM rol_usuario
      WHERE id_usuario = $1 AND id_rol = $2 AND estado = 'ACTIVO'
      LIMIT 1`,
    [idUsuario, idRol]
  );
  if (!existente[0])
    throw Object.assign(
      new Error(`El usuario no tiene asignado el rol "${rolRows[0].nombre}"`),
      { status: 404 }
    );

  // Revocar
  await query(
    `UPDATE rol_usuario
        SET estado = 'INACTIVO', modificado_por = $1, fecha_modificacion = NOW()
      WHERE id_usuario = $2 AND id_rol = $3 AND estado = 'ACTIVO'`,
    [username, idUsuario, idRol]
  );

  invalidarCachePermisos(idUsuario);
  return obtener(idUsuario);
};