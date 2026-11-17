import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export function LugarCombo({ label, value, onChange, lugares = [], placeholder, error, disabled }) {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  const seleccionado = useMemo(
    () => lugares.find((l) => String(l.id) === String(value)),
    [lugares, value]
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return lugares;
    return lugares.filter((l) =>
      `${l.nombre} ${l.piso ?? ''}`.toLowerCase().includes(q)
    );
  }, [lugares, busqueda]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setHighlight(0); }, [busqueda, open]);

  const seleccionar = (l) => {
    onChange(String(l.id));
    setOpen(false);
    setBusqueda('');
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtrados.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtrados[highlight]) seleccionar(filtrados[highlight]);
    } else if (e.key === 'Escape') setOpen(false);
  };

  const textoMostrado = seleccionado
    ? `${seleccionado.nombre}${seleccionado.piso ? ` (Piso ${seleccionado.piso})` : ''}`
    : '';

  return (
    <div ref={wrapRef} className="relative">
      {label && (
        <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:bg-slate-800 dark:text-slate-100 ${
          error
            ? 'border-red-400 dark:border-red-500'
            : 'border-slate-300 dark:border-slate-700'
        } disabled:opacity-60`}
      >
        <span className={seleccionado ? '' : 'text-slate-400 dark:text-slate-500'}>
          {textoMostrado || placeholder || '— Seleccionar lugar —'}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {error && (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>
      )}

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-100 p-2 dark:border-slate-700">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                autoFocus
                className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Buscar lugar por nombre o piso…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={onKeyDown}
              />
            </div>
          </div>

          <ul className="max-h-56 overflow-auto py-1 text-sm">
            {filtrados.length === 0 && (
              <li className="px-3 py-2 text-slate-500 dark:text-slate-400">
                Sin resultados
              </li>
            )}
            {filtrados.map((l, i) => (
              <li key={l.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => seleccionar(l)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left ${
                    i === highlight
                      ? 'bg-brand-50 text-brand-800 dark:bg-brand-900/30 dark:text-brand-200'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <span>
                    {l.nombre}
                    {l.piso ? ` (Piso ${l.piso})` : ''}
                  </span>
                  {String(l.id) === String(value) && (
                    <span className="text-xs text-brand-600">✓</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}