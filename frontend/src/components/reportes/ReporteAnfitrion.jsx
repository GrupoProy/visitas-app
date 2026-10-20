// components/reportes/ReporteAnfitrion.jsx
import { useMemo, useState } from 'react';
import { Users, TrendingUp, UserCheck } from 'lucide-react';
import { Card } from '../ui/Card';
import { RankList } from '../charts/RankList';
import { Pagination } from '../ui/Pagination';
import { usePageSize } from '../../hooks/usePageSize';


export const ReporteAnfitrion = ({ data }) => {
  const items = data.items || [];
  const total = data.total || 0;
  const pageSize = usePageSize();

  const [pageDetalle, setPageDetalle] = useState(1);

  const itemsPaginados = useMemo(() => {
    const start = (pageDetalle - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageDetalle, pageSize]);

  const rankingData = items.slice(0, 10).map((i) => ({
    id: i.id,
    nombre: `${i.nombres} ${i.primer_apellido}`,
    total: i.total,
  }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Anfitriones activos
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">{items.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total de visitas
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-100">{total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Anfitrión más activo
          </p>
          <p className="mt-2 text-lg font-bold text-slate-800 dark:text-slate-100">
            {items[0] ? `${items[0].nombres} ${items[0].primer_apellido}` : '—'}
          </p>
          {items[0] && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {items[0].total} visitas
            </p>
          )}
        </Card>
      </div>

      {/* Ranking */}
      <Card>
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <Users size={16} className="text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Top anfitriones por cantidad de visitas
          </h2>
        </div>
        <div className="p-5">
          {rankingData.length > 0 ? (
            <RankList
              data={rankingData}
              color="bg-emerald-500"
              emptyText="Sin datos en el período"
            />
          ) : (
            <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              Sin datos en el período.
            </div>
          )}
        </div>
      </Card>

      {/* Tabla con paginación */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Detalle por anfitrión
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {items.length} anfitrión{items.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="px-4 py-3">Anfitrión</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Finalizadas</th>
                <th className="px-4 py-3 text-right">En curso</th>
                <th className="px-4 py-3 text-right">Canceladas</th>
                <th className="px-4 py-3 text-right">Visitantes únicos</th>
                <th className="px-4 py-3">Lugar favorito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No hay datos para el período seleccionado.
                  </td>
                </tr>
              )}
              {itemsPaginados.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {i.nombres?.[0]}{i.primer_apellido?.[0]}
                      </div>
                      <p className="font-medium text-slate-800 dark:text-slate-100">
                        {i.nombres} {i.primer_apellido}
                        {i.segundo_apellido ? ` ${i.segundo_apellido}` : ''}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                    {i.numero_documento}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">
                    {i.total}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">
                    {i.finalizadas}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.en_curso > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        {i.en_curso}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400">
                    {i.canceladas}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                    {i.visitantes_unicos}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {i.lugar_favorito ? (
                      <span className="inline-flex items-center gap-1">
                        <UserCheck size={12} className="text-slate-400" />
                        {i.lugar_favorito}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pageDetalle}
          limit={pageSize}
          total={items.length}
          onChange={setPageDetalle}
        />
      </Card>
    </div>
  );
};