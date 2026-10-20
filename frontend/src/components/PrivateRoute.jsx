// components/PrivateRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMenus } from '../hooks/useMenus';
import { usePermisos } from '../hooks/usePermisos';
import { homePorRol } from '../utils/homePorRol';
import { ShieldCheck, Loader2 } from 'lucide-react';

export const PrivateRoute = ({ children, menu, permiso }) => {
  const { usuario, loading, mustChangePassword } = useAuth();
  const { tienePermiso } = usePermisos();
  const location = useLocation();

  const { menus, loading: loadingMenus } = useMenus({
    enabled: !loading && !!usuario,
  });

  // 1. Cargando auth
  if (loading) {
    return (
      <div className="grid h-screen place-items-center bg-slate-100">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Cargando…
        </div>
      </div>
    );
  }

  // 2. Sin sesión → login
  if (!usuario) return <Navigate to="/login" replace />;

  // 3. ⭐ Debe cambiar contraseña → pantalla bloqueante
  if (mustChangePassword) {
    return <Navigate to="/cambiar-password" replace />;
  }

  // 4. Esperando menús (si la ruta depende de ellos)
  if (menu && loadingMenus) {
    return (
      <div className="grid h-screen place-items-center bg-slate-100">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 size={18} className="animate-spin" />
          Cargando…
        </div>
      </div>
    );
  }

  const tieneMenu = !menu || menus.some((m) => m.clave === menu);
  const tieneElPermiso = !permiso || tienePermiso(permiso);

  if (tieneMenu && tieneElPermiso) return children;

  // 5. Sin acceso → redirigir al home (con guard anti-bucle)
  const home = homePorRol(usuario);

  if (home === location.pathname) {
    return (
      <div className="grid h-screen place-items-center bg-slate-100 p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-card">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-600">
            <ShieldCheck size={22} />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Acceso restringido</h2>
          <p className="mt-1 text-sm text-slate-500">
            Tu rol <b>{usuario.roles?.join(', ')}</b> no tiene permisos para esta sección.
          </p>
        </div>
      </div>
    );
  }

  return <Navigate to={home} replace />;
};