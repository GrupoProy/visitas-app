// components/auditoria/FiltrosAuditoria.jsx
import { useEffect, useState } from 'react';
import { Search, X, Calendar } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { Button } from '../ui/Button';

/**
 * Barra de filtros para la auditoría.
 * @param {Object} props
 * @param {Object} props.valor       - Estado actual de los filtros
 * @param {Function} props.onChange  - Callback cuando cambian
 */
export const FiltrosAuditoria = ({ valor, onChange }) => {
  const [q, setQ] = useState(valor.q || '');
  const qDebounced = useDebounce(q, 400);

  // Notificar cambios del buscador (debounced)
  useEffect(() => {
    if (qDebounced !== valor.q) {
      onChange({ ...valor, q: qDebounced, page: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced]);

  const setCampo = (campo, v) => onChange({ ...valor, [campo]: v, page: 1 });

  const limpiar = () => {
    setQ('');
    onChange({
      q: '',
      desde: '',
      hasta: '',
      resultado: '',
      motivo: '',
      page: 1,
    });
  };

  const hayFiltros =
    valor.q || valor.desde || valor.hasta || valor.resultado || valor.motivo;

  // Rango rápido: últimos 7 días
  const setRangoRapido = (dias) => {
    const hasta = new Date();
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    const toIsoDate = (d) => d.toISOString().slice(0, 10);
    onChange({
      ...valor,
      desde: toIsoDate(desde),
      hasta: toIsoDate(hasta),
      page: 1,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Buscador */}
        <div className="relative md:col-span-2">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por usuario o IP…"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {/* Resultado */}
        <select
          value={valor.resultado || ''}
          onChange={(e) => setCampo('resultado', e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Todos los resultados</option>
          <option value="exitosos">Solo exitosos</option>
          <option value="fallidos">Solo fallidos</option>
          <option value="bloqueados">Solo bloqueados</option>
        </select>

        {/* Motivo */}
        <select
          value={valor.motivo || ''}
          onChange={(e) => setCampo('motivo', e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <option value="">Cualquier motivo</option>
          <option value="CREDENCIALES_INVALIDAS">Credenciales inválidas</option>
          <option value="BLOQUEADO">Cuenta bloqueada</option>
          <option value="INACTIVO">Usuario inactivo</option>
          <option value="ELIMINADO">Usuario eliminado</option>
        </select>
      </div>

      {/* Fechas + rangos rápidos */}
      <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Calendar
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="date"
            value={valor.desde || ''}
            onChange={(e) => setCampo('desde', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="relative">
          <Calendar
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="date"
            value={valor.hasta || ''}
            onChange={(e) => setCampo('hasta', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div className="flex items-center gap-1 md:col-span-2">
          <span className="text-xs text-slate-500">Rango rápido:</span>
          <button
            type="button"
            onClick={() => setRangoRapido(1)}
            className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            24h
          </button>
          <button
            type="button"
            onClick={() => setRangoRapido(7)}
            className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            7 días
          </button>
          <button
            type="button"
            onClick={() => setRangoRapido(30)}
            className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            30 días
          </button>
          {hayFiltros && (
            <Button
              variant="secondary"
              size="sm"
              onClick={limpiar}
              className="ml-auto"
            >
              <X size={14} /> Limpiar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};