import { query } from '../../config/db.js';
import { invalidarCachePermisos } from '../../middlewares/permisos.js';

export const listarClavesPorUsuario = async (usuarioId) => {
  const { rows } = await query(
    `SELECT DISTINCT p.clave
       FROM permiso p
       JOIN rol_permiso rp ON rp.id_permiso = p.id AND rp.estado = 'ACTIVO'
       JOIN rol_usuario ru ON ru.id_rol = rp.id_rol AND ru.estado = 'ACTIVO'
       JOIN rol r ON r.id = ru.id_rol AND r.estado = 'ACTIVO'
      WHERE ru.id_usuario = $1
        AND p.estado = 'ACTIVO'
      ORDER BY p.clave ASC`,
    [usuarioId]
  );
  return rows.map((r) => r.clave);
};

export const listarTodos = async () => {
  const { rows } = await query(
    `SELECT id, clave, modulo, accion, descripcion, estado
       FROM permiso
      WHERE estado <> 'ELIMINADO'
      ORDER BY modulo ASC, accion ASC`
  );
  return rows;
};

export const listarMatriz = async () => {
  const permisos = await listarTodos();
  const { rows: asignaciones } = await query(
    `SELECT id_permiso, id_rol FROM rol_permiso WHERE estado = 'ACTIVO'`
  );

  const porPermiso = asignaciones.reduce((acc, a) => {
    (acc[a.id_permiso] ||= []).push(Number(a.id_rol));
    return acc;
  }, {});

  return permisos.map((p) => ({ ...p, roles: porPermiso[p.id] || [] }));
};

export const actualizarRolesDePermiso = async (idPermiso, rolesIds, userId) => {
  await query(
    `UPDATE rol_permiso
        SET estado = 'INACTIVO', modificado_por = $1, fecha_modificacion = NOW()
      WHERE id_permiso = $2 AND estado = 'ACTIVO'`,
    [userId, idPermiso]
  );

  if (rolesIds?.length) {
    for (const idRol of rolesIds) {
      const { rows } = await query(
        `SELECT id FROM rol_permiso WHERE id_permiso = $1 AND id_rol = $2 LIMIT 1`,
        [idPermiso, idRol]
      );
      if (rows[0]) {
        await query(
          `UPDATE rol_permiso
              SET estado = 'ACTIVO', modificado_por = $1, fecha_modificacion = NOW()
            WHERE id = $2`,
          [userId, rows[0].id]
        );
      } else {
        await query(
          `INSERT INTO rol_permiso (id_permiso, id_rol, creado_por) VALUES ($1,$2,$3)`,
          [idPermiso, idRol, userId]
        );
      }
    }
  }

  // Invalidar caché global (afecta a múltiples usuarios)
  invalidarCachePermisos();
};