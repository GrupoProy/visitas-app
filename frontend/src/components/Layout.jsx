import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LogOut, Menu, ChevronLeft, Settings2, KeyRound,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';
import { useMenus } from '../hooks/useMenus';
import { usePermisos } from '../hooks/usePermisos';
import { obtenerIcono } from '../utils/iconos';
import { ThemeToggle } from './ui/ThemeToggle';
import { useEstados } from '../hooks/useEstados';

export default function Layout({ children }) {
  const { usuario, logout } = useAuth();
  const { menus, loading: loadingMenus } = useMenus();
  const { tienePermiso } = usePermisos();
  const nav = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  useEstados();

  const puedeGestionar = tienePermiso('menus.gestionar');
  const handleLogout = () => { logout(); nav('/login'); };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* ============================================================ */}
      {/* SIDEBAR CON FONDO GUINDO E IMAGEN DE AGUA                     */}
      {/* ============================================================ */}
      <aside
        className={clsx(
          'relative flex shrink-0 flex-col border-r border-guindo-dark transition-all duration-200',
          // ⭐ Fondo guindo fijo con textura de agua
          'bg-guindo bg-[url("/agua-bg.png")] bg-cover bg-center bg-blend-overlay',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Overlay para oscurecer la imagen y asegurar legibilidad */}
        <div className="absolute inset-0 bg-guindo/85 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex h-14 items-center gap-2 border-b border-white/10 px-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white/10">
            <img
              src="/senado.webp"
              alt="Cámara de Senadores"
              className="h-7 w-7 object-contain"
            />
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-semibold text-white">
              Visitas
            </span>
          )}
        </div>

        {/* Navegación */}
        <nav className="relative z-10 flex-1 space-y-1 overflow-y-auto p-2">
          {loadingMenus && (
            <p className="px-3 py-2 text-xs text-white/60">Cargando…</p>
          )}
          {!loadingMenus && menus.length === 0 && (
            <p className="px-3 py-2 text-xs text-white/60">Sin menús asignados</p>
          )}

          {!loadingMenus && menus.map(({ clave, ruta, etiqueta, icono }) => {
            const Icon = obtenerIcono(icono);
            return (
              <NavLink
                key={clave}
                to={ruta}
                end={ruta === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  )
                }
                title={collapsed ? etiqueta : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{etiqueta}</span>}
              </NavLink>
            );
          })}

          {puedeGestionar && (
            <>
              <div className="my-2 border-t border-white/10" />
              <NavLink
                to="/menus"
                end
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  )
                }
                title={collapsed ? 'Menús' : undefined}
              >
                <Settings2 size={18} className="shrink-0" />
                {!collapsed && <span>Menús</span>}
              </NavLink>
              <NavLink
                to="/permisos"
                end
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  )
                }
                title={collapsed ? 'Permisos' : undefined}
              >
                <KeyRound size={18} className="shrink-0" />
                {!collapsed && <span>Permisos</span>}
              </NavLink>
            </>
          )}
        </nav>

        {/* Botón colapsar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="relative z-10 m-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft
            size={16}
            className={clsx('transition-transform', collapsed && 'rotate-180')}
          />
          {!collapsed && <span>Colapsar</span>}
        </button>
      </aside>

      {/* ============================================================ */}
      {/* CONTENIDO PRINCIPAL                                           */}
      {/* ============================================================ */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* HEADER CON FONDO GUINDO FIJO */}
        <header className="relative flex h-14 items-center border-b border-guindo-dark bg-guindo px-6 text-white">
          {/* Botón menú móvil */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mr-3 rounded-lg p-1.5 text-white/80 hover:bg-white/10 md:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          {/* Leyenda institucional centrada */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <div className="hidden h-7 w-px bg-white/20 md:block" />
            <div className="flex min-w-0 flex-col items-center justify-center px-4 leading-tight">
              <span className="truncate text-[11px] font-semibold uppercase tracking-widest text-white md:text-xl">
                Cámara de Senadores
              </span>
              <span className="truncate text-[11px] text-white/70 md:text-xs">
                Sistema de Control de Visitas
              </span>
            </div>
            <div className="hidden h-7 w-px bg-white/20 md:block" />
          </div>

          {/* Zona de usuario */}
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            
            {/* Toggle de tema */}
            <ThemeToggle size="sm" />

            {/* Info del usuario */}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-white">
                {usuario?.nombres} {usuario?.primer_apellido}
              </p>
              <p className="text-[11px] uppercase tracking-wider text-white/70">
                {usuario?.roles?.join(', ')}
              </p>
            </div>

            {/* Avatar (invertimos colores para que resalte en guindo) */}
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-sm font-semibold text-guindo shadow-sm">
              {usuario?.nombres?.[0]}{usuario?.primer_apellido?.[0]}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* MAIN (Sigue respondiendo al modo claro/oscuro) */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}