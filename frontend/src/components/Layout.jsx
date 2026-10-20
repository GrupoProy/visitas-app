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
      {/* SIDEBAR                                                       */}
      {/* ============================================================ */}
      <aside
        className={clsx(
          'flex shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200',
          'dark:border-slate-800 dark:bg-slate-900',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-3 dark:border-slate-800">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg">
            <img
              src="/senado.webp"
              alt="Cámara de Senadores"
              className="h-7 w-7 object-contain"
            />
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
              Visitas
            </span>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {loadingMenus && (
            <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
              Cargando…
            </p>
          )}
          {!loadingMenus && menus.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
              Sin menús asignados
            </p>
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
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
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
              <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
              <NavLink
                to="/menus"
                end
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
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
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/20 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
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
          className="m-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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

        {/* HEADER */}
        <header
          className="relative flex h-12 items-center overflow-hidden border-b border-slate-200 bg-cover bg-center dark:border-slate-800"
          style={{ backgroundImage: 'url(/senado3.png)' }}
        >
          {/* Overlay claro para legibilidad */}
          <div className="pointer-events-none absolute inset-0 bg-white/75 dark:bg-slate-900/80" />

          {/* Contenido */}
          <div className="relative z-10 flex w-full items-center px-6">

            {/* Botón menú móvil */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="mr-3 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Abrir menú"
            >
              <Menu size={20} />
            </button>

            {/* Leyenda institucional centrada */}
            <div className="flex min-w-0 flex-1 items-center justify-center">
              <div className="hidden h-7 w-px bg-slate-300/70 md:block dark:bg-slate-700" />
              <div className="flex min-w-0 flex-col items-center justify-center px-4 leading-tight">
                <span className="truncate text-[11px] font-semibold uppercase tracking-widest text-red-800 md:text-xl [text-shadow:0_1px_2px_rgba(255,255,255,5)] dark:text-red-400 dark:[text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
                  Estado Plurinacional de Bolivia
                </span>
                <span className="truncate text-[11px] text-slate-700 md:text-xs dark:text-slate-300">
                  Cámara de Senadores
                </span>
              </div>
              <div className="hidden h-7 w-px bg-slate-300/70 md:block dark:bg-slate-700" />
            </div>

            {/* Zona de usuario */}
            <div className="flex shrink-0 items-center gap-2 md:gap-3">

              {/* ⭐ Toggle de tema */}
              <ThemeToggle size="sm" />

              {/* Info del usuario */}
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight text-slate-800 dark:text-slate-100">
                  {usuario?.nombres} {usuario?.primer_apellido}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {usuario?.roles?.join(', ')}
                </p>
              </div>

              {/* Avatar */}
              <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white shadow-sm">
                {usuario?.nombres?.[0]}{usuario?.primer_apellido?.[0]}
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 text-slate-600 transition hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1 overflow-y-auto bg-slate-100 p-6 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}