/**
 * Lista con barras horizontales para ranking.
 * props:
 *   data: [{ nombre, total }]
 *   color: clase tailwind para el fill (default brand)
 */
export const RankList = ({ data = [], color = 'bg-brand-500', emptyText = 'Sin datos' }) => {
  const max = Math.max(1, ...data.map((d) => d.total));

  if (!data.length) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.id ?? i}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate pr-2 font-medium text-slate-700">
              <span className="mr-2 text-xs text-slate-400">{i + 1}.</span>
              {d.nombre}
            </span>
            <span className="shrink-0 text-slate-500">{d.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${color} transition-all`}
              style={{ width: `${(d.total / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};