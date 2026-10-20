// components/reportes/ReportePeriodo.jsx
import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { BarChart } from '../charts/BarChart';
import { Pagination } from '../ui/Pagination';
import { usePageSize } from '../../hooks/usePageSize';


const COLORES_ESTADO = {
  APROBADA: '#3b82f6',
  EN_CURSO: '#10b981',
  FINALIZADA: '#64748b',
  PENDIENTE: '#f59e0b',
  RECHAZADA: '#ef4444',
  CANCELADA: '#94a3b8',
  EXPIRADA: '#a78bfa',
};

const fmtDia = (iso, agrupacion) => {
  const d = new Date(iso);
  if (agrupacion === 'mes') {
    return d.toLocaleDateString('es-BO', { month: 'short', year: 'numeric' });
  }
  if (agrupacion === 'semana') {
    return `Sem ${d.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: '2-digit',
    })}`;
  }
  return d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' });
};


export const ReportePeriodo = ({ data }) => {
  const r = data.resumen || {};
  const serie = data.serie || [];
  const serieDetalle = data.serieDetalle || [];
  const porHora = data.porHora || [];
    const pageSize = usePageSize();

  const [pageDetalle, setPageDetalle] = useState(1);

  const serieDetallePaginada = useMemo(() => {
    const start = (pageDetalle - 1) * pageSize;
    return serieDetalle.slice(start, start + pageSize);
  }, [serieDetalle, pageDetalle]);

  const serieChart = useMemo(
    () =>
      serie.map((s) => ({
        label: fmtDia(s.fecha, data.agrupacion),
        value: s.total,
        value2: s.finalizadas,
      })),
    [serie, data.agrupacion]
  );

  const maxHora = Math.max(1, ...porHora.map((h) => h.total));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CalendarDays}
          label="Total de visitas"
          value={r.total || 0}
          hint={`Promedio ${r.promedioPorDia || 0} por día`}
          accent="brand"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Finalizadas"
          value={r.finalizadas || 0}
          hint={`${pct(r.finalizadas, r.total)}% del total`}
          accent="emerald"
        />
        <KpiCard
          icon={Clock}
          label="Duración promedio"
          value={`${r.duracionPromedioMin || 0} min`}
          hint="Ingreso → salida"
          accent="slate"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Canceladas + rechazadas"
          value={(r.canceladas || 0) + (r.rechazadas || 0)}
          hint={`${r.expiradas || 0} expiradas`}
          accent="amber"
        />
      </div>

      {/* Serie temporal */}
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Visitas por{' '}
              {data.agrupacion === 'dia'
                ? 'día'
                : data.agrupacion === 'semana'
                ? 'semana'
                : 'mes'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Comparativa entre totales y finalizadas
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
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
          {serieChart.length > 0 ? (
            <BarChart
              data={serieChart}
              showSecond
              color="#3366ff"
              color2="#10b981"
              labelFirst="Visitas programadas"
              labelSecond="Visitas finalizadas"
            />
          ) : (
            <EmptyMini />
          )}
        </div>
      </Card>

      {/* Franja horaria + Distribución por estado */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Distribución por hora del día
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Cuándo se programan más visitas
            </p>
          </div>
          <div className="p-5">
            {porHora.length > 0 ? (
              <ul className="space-y-1.5">
                {porHora.map((h) => (
                  <li key={h.hora} className="flex items-center gap-2 text-sm">
                    <span className="w-12 shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {String(h.hora).padStart(2, '0')}:00
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-500"
                        style={{ width: `${(h.total / maxHora) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                      {h.total}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyMini />
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Distribución por estado
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Total de visitas del período
            </p>
          </div>
          <div className="p-5">
            {(data.porEstado || []).length > 0 ? (
              <ul className="space-y-2">
                {data.porEstado.map((e) => (
                  <li key={e.estado} className="flex items-center gap-2 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        background: COLORES_ESTADO[e.estado] || '#94a3b8',
                      }}
                    />
                    <span className="flex-1 text-slate-700 dark:text-slate-200">
                      {e.estado}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {e.total}
                    </span>
                    <span className="w-12 text-right text-xs text-slate-500 dark:text-slate-400">
                      {pct(e.total, r.total)}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyMini />
            )}
          </div>
        </Card>
      </div>

      {/* Tabla detalle con paginación */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Detalle por período y anfitrión
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {serieDetalle.length} fila{serieDetalle.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="px-4 py-3 whitespace-nowrap">Período</th>
                <th className="px-4 py-3 whitespace-nowrap">Anfitrión</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Finalizadas</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">En curso</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Canceladas</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Rechazadas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {serieDetalle.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-10 text-center text-slate-500 dark:text-slate-400"
                  >
                    Sin datos en el período.
                  </td>
                </tr>
              )}
              {serieDetallePaginada.map((s, i) => (
                <tr
                  key={`${s.fecha}-${s.id_anfitrion}-${i}`}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                >
                  {/* Período */}
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {new Date(s.fecha).toLocaleDateString('es-BO')}
                  </td>

                  {/* Anfitrión */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {s.anfitrion
                          ?.split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')}
                      </div>
                      <span
                        className="inline-block max-w-[220px] truncate align-middle text-slate-800 dark:text-slate-100"
                        title={s.anfitrion}
                      >
                        {s.anfitrion}
                      </span>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {s.total}
                  </td>

                  {/* Finalizadas */}
                  <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {s.finalizadas}
                  </td>

                  {/* En curso */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {s.en_curso > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {s.en_curso}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">0</span>
                    )}
                  </td>

                  {/* Canceladas */}
                  <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400 whitespace-nowrap">
                    {s.canceladas}
                  </td>

                  {/* Rechazadas */}
                  <td className="px-4 py-3 text-right text-red-700 dark:text-red-400 whitespace-nowrap">
                    {s.rechazadas}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pageDetalle}
          limit={pageSize}
          total={serieDetalle.length}
          onChange={setPageDetalle}
        />
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Auxiliares
// ---------------------------------------------------------------------------
const pct = (parte, total) =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

const EmptyMini = () => (
  <div className="flex h-32 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
    Sin datos en el período.
  </div>
);

const ACCENTS = {
  brand: {
    bg: 'bg-brand-50 dark:bg-brand-900/30',
    text: 'text-brand-700 dark:text-brand-300',
    icon: 'text-brand-600 dark:text-brand-400',
  },
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  slate: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    icon: 'text-slate-600 dark:text-slate-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
  },
};

const KpiCard = ({ icon: Icon, label, value, hint, accent = 'brand' }) => {
  const a = ACCENTS[accent] || ACCENTS.brand;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {hint}
            </p>
          )}
        </div>
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${a.bg} ${a.icon}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
};