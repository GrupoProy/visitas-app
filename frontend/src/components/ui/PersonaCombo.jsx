import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, UserCheck, X } from 'lucide-react';

export const PersonaCombo = ({
  label,
  value,               // id seleccionado
  onChange,            // (id) => void
  personas = [],
  placeholder = 'Seleccionar…',
  error,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  const seleccionada = useMemo(
    () => personas.find((p) => String(p.id) === String(value)),
    [personas, value]
  );

  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return personas;
    const q = busqueda.toLowerCase();
    return personas.filter((p) =>
      [p.nombres, p.primer_apellido, p.segundo_apellido, p.numero_documento, p.procedencia]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q))
    );
  }, [personas, busqueda]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const nombreCompleto = (p) =>
    [p.nombres, p.primer_apellido, p.segundo_apellido].filter(Boolean).join(' ');

  const handleSelect = (p) => {
    onChange(String(p.id));
    setOpen(false);
    setBusqueda('');
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtradas[highlight]) handleSelect(filtradas[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setBusqueda('');
    }
  };

  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      )}

      <div ref={wrapRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          onKeyDown={handleKeyDown}
          className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
            error ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
          } ${disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
        >
          <span className={`flex items-center gap-2 truncate ${!seleccionada ? 'text-slate-400' : ''}`}>
            {seleccionada ? (
              <>
                <UserCheck size={14} className="shrink-0 text-brand-600" />
                <span className="truncate">
                  {nombreCompleto(seleccionada)}
                  {seleccionada.procedencia ? ` — ${seleccionada.procedencia}` : ''}
                </span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {seleccionada && !disabled && (
              <X
                size={14}
                className="text-slate-400 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              />
            )}
            <ChevronDown size={16} className="text-slate-400" />
          </span>
        </button>

        {open && (
          <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  className="w-full rounded-md border border-slate-200 py-1.5 pl-8 pr-2 text-sm focus:border-brand-500 focus:outline-none"
                  placeholder="Buscar por nombre, documento o procedencia…"
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setHighlight(0); }}
                />
              </div>
            </div>

            <ul className="max-h-56 overflow-y-auto py-1">
              {filtradas.length === 0 && (
                <li className="px-3 py-3 text-center text-xs text-slate-500">
                  Sin resultados
                </li>
              )}
              {filtradas.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => handleSelect(p)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      i === highlight ? 'bg-brand-50 text-brand-700' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
                      {p.nombres?.[0]}{p.primer_apellido?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">
                        {nombreCompleto(p)}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {p.tipo_documento} {p.numero_documento}
                        {p.procedencia ? ` · ${p.procedencia}` : ''}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
};