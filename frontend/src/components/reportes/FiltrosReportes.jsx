// components/reportes/FiltrosReportes.jsx
import { useEffect, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { SearchSelect } from '../ui/SearchSelect';

export const FiltrosReportes = ({ valor, onChange, tab }) => {
  const [lugares, setLugares] = useState([]);
  const [anfitriones, setAnfitriones] = useState([]);
  const [visitantes, setVisitantes] = useState([]);

  // Cargar lugares y anfitriones (defensivo: maneja distintas estructuras)
  useEffect(() => {
    const extraerArray = (resp) => {
      const d = resp?.data?.data ?? resp?.data;
      if (Array.isArray(d)) return d;
      if (Array.isArray(d?.items)) return d.items;
      if (Array.isArray(d?.lugares)) return d.lugares;
      if (Array.isArray(d?.personas)) return d.personas;
      return [];
    };

    api
      .get('/lugares')
      .then((r) => setLugares(extraerArray(r)))
      .catch(() => setLugares([]));

    api
      .get('/personas/anfitriones')
      .then((r) => setAnfitriones(extraerArray(r)))
      .catch(() => setAnfitriones([]));

        api
    .get('/personas/visitantes')
    .then((r) => setVisitantes(extraerArray(r)))
    .catch(() => setVisitantes([]));
  }, []);

  const setCampo = (campo, v) => {
    // Validación cruzada cuando se cambia una fecha
    if (campo === 'desde' && v && valor.hasta && v > valor.hasta) {
      // Ajustar hasta al nuevo desde
      return onChange({ ...valor, desde: v, hasta: v, page: 1 });
    }
    if (campo === 'hasta' && v && valor.desde && v < valor.desde) {
      // Ajustar desde al nuevo hasta
      return onChange({ ...valor, hasta: v, desde: v, page: 1 });
    }
    onChange({ ...valor, [campo]: v, page: 1 });
  };

  // Hoy en formato YYYY-MM-DD (para el atributo max)
  const hoy = new Date().toISOString().slice(0, 10);

  const limpiar = () => {
    onChange({
      desde: defaultDesde(),
      hasta: defaultHasta(),
      id_lugar: '',
      id_anfitrion: '',
      id_persona: '', 
      agrupacion: 'dia',
    });
  };

  const hayFiltros =
    valor.id_lugar || valor.id_anfitrion || valor.id_persona || valor.agrupacion !== 'dia';

  const setRangoRapido = (dias) => {
    const hasta = new Date();
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    const toIso = (d) => d.toISOString().slice(0, 10);
    onChange({
      ...valor,
      desde: toIso(desde),
      hasta: toIso(hasta),
    });
  };

  // Opciones para los combos
  const opcionesLugares = lugares.map((l) => ({
    value: l.id,
    label: l.nombre,
  }));
  const opcionesAnfitriones = anfitriones.map((a) => ({
    value: a.id,
    label: `${a.nombres} ${a.primer_apellido}${a.segundo_apellido ? ` ${a.segundo_apellido}` : ''}`,

  
  }));
  const opcionesVisitantes = visitantes.map((v) => ({
  value: v.id,
  label: `${v.nombres} ${v.primer_apellido}${v.segundo_apellido ? ` ${v.segundo_apellido}` : ''} (${v.numero_documento})`,
}));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {/* Fecha desde */}
        <div className="relative">
          <Calendar
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="date"
            value={valor.desde || ''}
            max={valor.hasta || hoy}
            onChange={(e) => setCampo('desde', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Fecha hasta */}
        <div className="relative">
          <Calendar
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="date"
            value={valor.hasta || ''}
            min={valor.desde || undefined}
            max={hoy}
            onChange={(e) => setCampo('hasta', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {/* Filtro: Lugar (por lugar y por visitante) */}
{(tab === 'lugar' || tab === 'visitante') && (
  <SearchSelect
    value={valor.id_lugar || ''}
    onChange={(v) => setCampo('id_lugar', v)}
    options={opcionesLugares}
    allLabel="Todos los lugares"
    placeholder="Buscar lugar…"
  />
)}

{/* Filtro: Anfitrión (por período y por anfitrión) */}
{(tab === 'periodo' || tab === 'anfitrion') && (
  <SearchSelect
    value={valor.id_anfitrion || ''}
    onChange={(v) => setCampo('id_anfitrion', v)}
    options={opcionesAnfitriones}
    allLabel="Todos los anfitriones"
    placeholder="Buscar anfitrión…"
  />
)}

{tab === 'visitante' && (
  <SearchSelect
    value={valor.id_persona || ''}
    onChange={(v) => setCampo('id_persona', v)}
    options={opcionesVisitantes}
    allLabel="Todos los visitantes"
    placeholder="Buscar visitante por nombre o documento…"
  />
  )}
        {/* Agrupación (solo en período) */}
        {tab === 'periodo' ? (
          <select
            value={valor.agrupacion || 'dia'}
            onChange={(e) => setCampo('agrupacion', e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="dia">Agrupar por día</option>
            <option value="semana">Agrupar por semana</option>
            <option value="mes">Agrupar por mes</option>
          </select>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Rápido:</span>
            <button
              onClick={() => setRangoRapido(7)}
              className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              7d
            </button>
            <button
              onClick={() => setRangoRapido(30)}
              className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              30d
            </button>
            <button
              onClick={() => setRangoRapido(90)}
              className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              90d
            </button>
          </div>
        )}
      </div>

      {/* Fila inferior: rangos rápidos + limpiar (solo en periodo) */}
      {tab === 'periodo' && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Rápido:</span>
          <button
            onClick={() => setRangoRapido(7)}
            className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            7 días
          </button>
          <button
            onClick={() => setRangoRapido(30)}
            className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            30 días
          </button>
          <button
            onClick={() => setRangoRapido(90)}
            className="rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            90 días
          </button>

          {hayFiltros && (
            <Button variant="secondary" size="sm" onClick={limpiar} className="ml-auto">
              <X size={14} /> Limpiar
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export const defaultDesde = () => {
  const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

export const defaultHasta = () => new Date().toISOString().slice(0, 10);