import { useEffect, useMemo, useState } from 'react';

import {
  Users, Clock, CheckCircle2, TrendingUp, MapPin,
  CalendarDays, Loader2, RefreshCcw, Building2, Timer,
  AlertTriangle, User, Hourglass,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { usePermisos } from '../hooks/usePermisos';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { BarChart } from '../components/charts/BarChart';
import { DonutChart } from '../components/charts/DonutChart';
import { RankList } from '../components/charts/RankList';
import { WidgetSeguridad } from '../components/auditoria/WidgetSeguridad';


import { useNavigate } from 'react-router-dom';

const COLORES_ESTADO = {
  APROBADA:   '#3b82f6',
  EN_CURSO:   '#10b981',
  FINALIZADA: '#64748b',
  PENDIENTE:  '#f59e0b',
  RECHAZADA:  '#ef4444',
  CANCELADA:  '#94a3b8',
  EXPIRADA:   '#a78bfa',
};

const PERIODOS = [
  { id: 'hoy',    label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes',    label: 'Este mes' },
];

const fmtFecha = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-BO', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

const fmtDia = (iso) =>
  new Date(iso).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric' });

export default function Dashboard() {
  const toast = useToast();
  const { tienePermiso } = usePermisos();
  const navigate = useNavigate();
  const verTopAnfitriones = tienePermiso('menus.gestionar') ||
                            tienePermiso('usuarios.listar');

  const [periodo, setPeriodo] = useState('hoy');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data: r } = await api.get('/dashboard', { params: { periodo } });
      setData(r.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [periodo]);

  const serie = useMemo(() => {
    if (!data?.serie) return [];
    return data.serie.map((s) => ({
      label: fmtDia(s.fecha),
      value: s.total,
      value2: s.finalizadas,
    }));
  }, [data]);

  const donut = useMemo(() => {
    if (!data?.porEstado) return [];
    return data.porEstado.map((s) => ({
      label: s.estado,
      value: s.total,
      color: COLORES_ESTADO[s.estado] || '#94a3b8',
    }));
  }, [data]);

  const r = data?.resumen;
  const huerfanas = data?.huerfanas || [];

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* ALERTA: VISITAS SIN FINALIZAR (HUÉRFANAS)                     */}
      {/* ============================================================ */}
      {!loading && huerfanas.length > 0 && (
        <div className="overflow-hidden rounded-2xl border-2 border-red-400 bg-red-50 shadow-card">
          <div className="flex items-center gap-3 bg-red-600 px-6 py-4 text-white">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20">
              <AlertTriangle size={22} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold">
                {huerfanas.length} visita{huerfanas.length !== 1 ? 's' : ''} sin finalizar
              </h2>
              <p className="text-sm opacity-90">
                Ingresaron en días anteriores y no registraron su salida. Requieren regularización.
              </p>
            </div>
          </div>

          <ul className="divide-y divide-red-200">
            {huerfanas.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center gap-3 bg-red-50 px-5 py-3 text-sm"
              >
                <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                  {h.codigo}
                </span>

                <span className="flex items-center gap-1 font-medium text-slate-800">
                  <User size={13} className="text-slate-400" />
                  {h.visitante}
                </span>

                <span className="flex items-center gap-1 text-slate-600">
                  <MapPin size={13} className="text-slate-400" />
                  {h.lugar}
                </span>

                {h.anfitrion && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    con <b>{h.anfitrion}</b>
                  </span>
                )}

                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <Hourglass size={12} />
                  <b>{h.horasDentro} h</b> sin salida
                </span>

                <span className="ml-auto text-xs text-slate-500">
                  Ingresó el {new Date(h.fecha_ingreso_real).toLocaleString('es-BO')}
                </span>
              </li>
            ))}
          </ul>

          <div className="border-t border-red-200 bg-white/40 px-6 py-3 text-right">
            <Button
              variant="danger"
              size="sm"
              onClick={() => window.location.href = '/?alerta=huerfanas'}
            >
              Ir a Autorizaciones para regularizar
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Header + filtro                                               */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Panel de control</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Estadísticas de visitas y actividad en el sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-card">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  periodo === p.id
                    ? 'bg-red-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={cargar} disabled={loading}>
            <RefreshCcw size={16} /> Actualizar
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Loading                                                       */}
      {/* ============================================================ */}
      {loading && (
        <Card>
          <div className="p-16 text-center text-slate-500">
            <Loader2 className="mx-auto animate-spin" />
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* Contenido                                                     */}
      {/* ============================================================ */}
      {!loading && r && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={CalendarDays}
              label="Visitas programadas"
              value={r.total}
              hint={`Período: ${periodo}`}
              accent="brand"
            />
            <KpiCard
              icon={Clock}
              label="En curso"
              value={r.enCurso}
              hint="Personas dentro de las instalaciones"
              accent="emerald"
            />
            <KpiCard
              icon={CheckCircle2}
              label="Finalizadas"
              value={r.finalizadas}
              hint="Visitas completadas"
              accent="slate"
            />
            <KpiCard
              icon={Users}
              label="Visitantes únicos"
              value={r.visitantesUnicos}
              hint={`${r.lugaresActivos} lugar(es) con actividad`}
              accent="amber"
            />
          </div>

          {/* Gráfico principal + donut */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">
                    Visitas últimos 7 días
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Comparativa entre totales y finalizadas
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand-500" />
                    Total
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                    Finalizadas
                  </span>
                </div>
              </div>
              <div className="p-5">
                <BarChart
                  data={serie}
                  showSecond
                  color="#3366ff"
                  color2="#10b981"
                    labelFirst="Visitas programadas"
                  labelSecond="Visitas finalizadas"
                />
              </div>
            </Card>

            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-700">
                  Distribución por estado
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">Último mes</p>
              </div>
              <div className="flex items-center justify-center p-5">
                <DonutChart
                  data={donut}
                  size={180}
                  thickness={22}
                  centerLabel="Visitas"
                />
              </div>
            </Card>
          </div>

          {/* Rankings + indicadores */}
          <div className={`grid grid-cols-1 gap-6 ${verTopAnfitriones ? 'xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
            <Card>
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <MapPin size={16} className="text-brand-600" />
                <h2 className="text-sm font-semibold text-slate-700">Top lugares</h2>
              </div>
              <div className="p-5">
                <RankList
                  data={data.topLugares.map((l) => ({
                    id: l.id, nombre: l.nombre, total: l.total,
                  }))}
                  color="bg-brand-500"
                  emptyText="Sin actividad en el período"
                />
              </div>
            </Card>

            {verTopAnfitriones && data.topAnfitriones.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                  <Building2 size={16} className="text-emerald-600" />
                  <h2 className="text-sm font-semibold text-slate-700">Top anfitriones</h2>
                </div>
                <div className="p-5">
                  <RankList
                    data={data.topAnfitriones}
                    color="bg-emerald-500"
                    emptyText="Sin actividad en el período"
                  />
                </div>
              </Card>
            )}

            <Card>
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <Timer size={16} className="text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-700">Indicadores</h2>
              </div>
              <div className="space-y-4 p-5">
                <MiniStat
                  label="Duración promedio"
                  value={`${r.duracionPromedioMin} min`}
                  hint="Ingreso → salida"
                />
                <MiniStat
                  label="Pendientes de aprobación"
                  value={r.pendientes}
                  hint="Requieren atención"
                />
                <MiniStat
                  label="Rechazadas / canceladas"
                  value={r.rechazadas + r.canceladas}
                  hint="En el período"
                />
              </div>
            </Card>
          </div>

              <WidgetSeguridad horas={24} />
          {/* Visitas recientes */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-brand-600" />
                <h2 className="text-sm font-semibold text-slate-700">Visitas recientes</h2>
              </div>
              <span className="text-xs text-slate-500">
                Últimas {data.recientes.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Visitante</th>
                    <th className="px-4 py-3">Lugar</th>
                    <th className="px-4 py-3">Inicio</th>
                    <th className="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recientes.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-10 text-center text-slate-500">
                        Sin visitas recientes.
                      </td>
                    </tr>
                  )}
                  {data.recientes.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                          {a.codigo}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                            {a.visitante?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{a.visitante}</p>
                            <p className="text-xs text-slate-500">{a.numero_documento}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{a.lugar}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {fmtFecha(a.fecha_inicio)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge estado={a.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Componentes auxiliares
// =============================================================================
const ACCENTS = {
  brand:   { bg: 'bg-brand-50',   text: 'text-brand-700',   icon: 'text-brand-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-600' },
  slate:   { bg: 'bg-slate-100',  text: 'text-slate-700',   icon: 'text-slate-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'text-amber-600' },
};

function KpiCard({ icon: Icon, label, value, hint, accent = 'brand' }) {
  const a = ACCENTS[accent] || ACCENTS.brand;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {/* Label: gris claro en dark */}
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {/* Valor: BLANCO en dark — este es el cambio clave */}
          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
            {value}
          </p>
          {/* Hint: gris medio en dark */}
          {hint && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {hint}
            </p>
          )}
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${a.bg} ${a.icon}`}>
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}

function MiniStat({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}