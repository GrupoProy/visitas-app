// components/ui/SearchSelect.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * Select con búsqueda integrada.
 * - Filtra opciones al escribir.
 * - Mantiene la opción "Todos".
 * - Cierra con Esc o click afuera.
 *
 * @param {Object} props
 * @param {string} props.value        - Valor actual
 * @param {Function} props.onChange   - (nuevoValor) => void
 * @param {Array} props.options       - [{ value, label }, ...]
 * @param {string} [props.allLabel]   - Texto de la opción "todos" (ej. "Todos los anfitriones")
 * @param {string} [props.placeholder]
 * @param {boolean} [props.disabled]
 */
export const SearchSelect = ({
  value,
  onChange,
  options = [],
  allLabel = 'Todos',
  placeholder = 'Buscar…',
  disabled = false,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const contenedorRef = useRef(null);
  const inputRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const onClickFuera = (e) => {
      if (!contenedorRef.current?.contains(e.target)) {
        setAbierto(false);
        setBusqueda('');
      }
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        setBusqueda('');
      }
    };
    document.addEventListener('mousedown', onClickFuera);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickFuera);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  // Foco en el buscador al abrir
  useEffect(() => {
    if (abierto) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [abierto]);

  // Opciones filtradas
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, busqueda]);

  // Etiqueta del valor actual
  const labelActual = useMemo(() => {
    if (!value) return allLabel;
    const found = options.find((o) => String(o.value) === String(value));
    return found?.label || allLabel;
  }, [value, options, allLabel]);

  const seleccionar = (v) => {
    onChange(v);
    setAbierto(false);
    setBusqueda('');
  };

  return (
    <div ref={contenedorRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600 dark:disabled:bg-slate-900"
      >
        <span className={`truncate ${!value ? 'text-slate-500 dark:text-slate-400' : ''}`}>
          {labelActual}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {/* Buscador */}
          <div className="border-b border-slate-100 p-2 dark:border-slate-700">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Opciones */}
          <ul className="max-h-64 overflow-y-auto py-1">
            {/* Opción "todos" */}
            <li>
              <button
                type="button"
                onClick={() => seleccionar('')}
                className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-700 ${
                  !value ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {allLabel}
              </button>
            </li>

            {/* Opciones filtradas */}
            {filtradas.length === 0 && (
              <li className="px-3 py-2 text-center text-xs text-slate-400 dark:text-slate-500">
                Sin resultados para "{busqueda}"
              </li>
            )}
            {filtradas.map((o) => {
              const activo = String(o.value) === String(value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => seleccionar(o.value)}
                    className={`flex w-full items-center px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-slate-700 ${
                      activo ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};