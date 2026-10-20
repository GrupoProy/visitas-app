// components/auditoria/WidgetSeguridad.jsx
import { useEffect, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, Lock, ArrowRight, Loader2,
  TrendingUp, AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { usePermisos } from '../../hooks/usePermisos';

export const WidgetSeguridad = ({ horas = 24 }) => {
  const { tienePermiso } = usePermisos();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const puedeVer = tienePermiso('auditoria.ver');

  useEffect(() => {
    if (!puedeVer) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get('/auditoria/resumen', { params: { horas } })
      .then((r) => setData(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [puedeVer, horas]);

  if (!puedeVer) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Cargando métricas de seguridad…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-card">
        <p className="text-sm text-red-700">
          No se pudieron cargar las métricas de seguridad.
        </p>
      </div>
    );
  }

  const {
    loginsExitosos = 0,
    loginsFallidos = 0,
    intentosBloqueados = 0,
    cuentasBloqueadas = 0,
    topIpsConFallos = [],
  } = data;

  const maxFallosIp = Math.max(1, ...topIpsConFallos.map((x) => x.total));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-brand-700">
            <ShieldCheck size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Seguridad
            </h3>
            <p className="text-xs text-slate-500">
              Últimas {horas} hora{horas !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Link
          to="/auditoria"
          className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
        >
          Ver auditoría <ArrowRight size={12} />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 p-6 md:grid-cols-3">
        <KpiCard
          icono={<ShieldCheck size={18} />}
          color="emerald"
          etiqueta="Logins exitosos"
          valor={loginsExitosos}
        />
        <KpiCard
          icono={<ShieldAlert size={18} />}
          color="amber"
          etiqueta="Fallidos"
          valor={loginsFallidos}
        />
        <KpiCard
          icono={<Lock size={18} />}
          color="red"
          etiqueta="Bloqueados"
          valor={intentosBloqueados}
          extra={
            cuentasBloqueadas > 0
              ? `${cuentasBloqueadas} cuenta${cuentasBloqueadas !== 1 ? 's' : ''} bloqueada${cuentasBloqueadas !== 1 ? 's' : ''}`
              : null
          }
        />
      </div>

      {/* Top IPs */}
      {topIpsConFallos.length > 0 && (
        <div className="border-t border-slate-100 px-6 py-4">
          <div className="mb-3 flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-amber-600" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Top IPs con fallos
            </p>
          </div>
          <ul className="space-y-2">
            {topIpsConFallos.slice(0, 5).map((item) => (
              <li
                key={item.ip}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <code className="font-mono text-xs text-slate-700">
                  {item.ip}
                </code>
                <div className="flex flex-1 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.min(100, (item.total / maxFallosIp) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="min-w-[2rem] text-right text-xs font-semibold text-slate-700">
                    {item.total}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Estado vacío */}
      {loginsExitosos === 0 &&
        loginsFallidos === 0 &&
        intentosBloqueados === 0 && (
          <div className="border-t border-slate-100 px-6 py-4 text-center text-sm text-slate-500">
            <TrendingUp size={16} className="mx-auto mb-1 text-slate-300" />
            Sin actividad en el período.
          </div>
        )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// KpiCard
// ---------------------------------------------------------------------------
const KpiCard = ({ icono, color, etiqueta, valor, extra }) => {
  const colores = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border p-4 ${colores[color]}`}
    >
      <div className="mt-0.5 shrink-0">{icono}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider opacity-80">
          {etiqueta}
        </p>
        <p className="mt-1 text-2xl font-bold leading-none">
          {valor.toLocaleString('es-BO')}
        </p>
        {extra && (
          <p className="mt-1 text-[11px] opacity-75">{extra}</p>
        )}
      </div>
    </div>
  );
};