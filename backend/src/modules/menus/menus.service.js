import { query } from '../../config/db.js';

/**
 * Devuelve los menús activos asignados a los roles del usuario actual.
 * Si el usuario es ADMIN y no tiene filas en menu_rol,
 * se devuelven TODOS los menús activos (fallback de seguridad).
 */
export const listarPorUsuario = async (usuarioId) => {
  const { rows } = await query(
    `SELECT DISTINCT m.id, m.clave, m.etiqueta, m.ruta, m.icono, m.grupo, m.orden
       FROM menu m
       JOIN menu_rol mr ON mr.id_menu = m.id AND mr.estado = 'ACTIVO'
       JOIN rol_usuario ru ON ru.id_rol = mr.id_rol AND ru.estado = 'ACTIVO'
       JOIN rol r ON r.id = ru.id_rol AND r.estado = 'ACTIVO'
      WHERE ru.id_usuario = $1
        AND m.estado = 'ACTIVO'
      ORDER BY m.orden ASC, m.etiqueta ASC, m.grupo ASC`,
    [usuarioId]
  );
  return rows;
};

/**
 * Catálogo completo de menús (para la página de administración).
 */
export const listarTodos = async () => {
  const { rows } = await query(
    `SELECT id, clave, etiqueta, ruta, icono, grupo, orden, estado
       FROM menu
      WHERE estado <> 'ELIMINADO'
      ORDER BY orden ASC, grupo ASC`
  );
  return rows;
};

/**
 * Matriz de asignación: para cada menú, en qué roles está activo.
 * Formato: [{ menu: {...}, roles: [1, 2, 3] }]
 */
export const listarMatriz = async () => {
  const menus = await listarTodos();
  const { rows: asignaciones } = await query(
    `SELECT id_menu, id_rol FROM menu_rol WHERE estado = 'ACTIVO'`
  );

  const porMenu = asignaciones.reduce((acc, a) => {
    (acc[a.id_menu] ||= []).push(Number(a.id_rol));
    return acc;
  }, {});

  return menus.map((m) => ({
    ...m,
    roles: porMenu[m.id] || [],
  }));
};

/**
 * Actualiza los roles asignados a un menú.
 * `rolesIds` = array de ids de rol.
 */
export const actualizarRolesDeMenu = async (idMenu, rolesIds, userId) => {
  // Desactivar todas las asignaciones actuales de ese menú
  await query(
    `UPDATE menu_rol
        SET estado = 'INACTIVO', modificado_por = $1, fecha_modificacion = NOW()
      WHERE id_menu = $2 AND estado = 'ACTIVO'`,
    [userId, idMenu]
  );

  if (!rolesIds?.length) return;

  for (const idRol of rolesIds) {
    const { rows } = await query(
      `SELECT id FROM menu_rol WHERE id_menu = $1 AND id_rol = $2 LIMIT 1`,
      [idMenu, idRol]
    );
    if (rows[0]) {
      await query(
        `UPDATE menu_rol
            SET estado = 'ACTIVO', modificado_por = $1, fecha_modificacion = NOW()
          WHERE id = $2`,
        [userId, rows[0].id]
      );
    } else {
      await query(
        `INSERT INTO menu_rol (id_menu, id_rol, creado_por) VALUES ($1,$2,$3)`,
        [idMenu, idRol, userId]
      );
    }
  }
};