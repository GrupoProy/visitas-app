/**
 * Home por permisos. Nunca debe devolver '/login' salvo que NO haya usuario.
 * Si el usuario está logueado pero no tiene permisos, devolvemos '/' para
 * que vea la pantalla de "acceso restringido" en lugar de un loop.
 */
export const homePorRol = (usuario) => {
  if (!usuario) return '/login';

  const permisos = usuario?.permisos || [];

  if (permisos.includes('dashboard.ver')) return '/dashboard';
  if (permisos.includes('autorizaciones.verificar')) return '/verificacion';
  if (permisos.includes('autorizaciones.ver_bitacora')) return '/';

  // Fallback: usuario logueado sin permisos reconocidos → evita loop
  return '/';
};