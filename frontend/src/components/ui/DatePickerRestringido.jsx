import { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X } from 'lucide-react';

const DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const pad2 = (n) => String(n).padStart(2, '0');

// ─── Helpers de fecha ────────────────────────────────────────────────
const toYMD = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

const toDMY = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${pad2(x.getDate())}/${pad2(x.getMonth() + 1)}/${x.getFullYear()}`;
};

const toLocalInput = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${toYMD(x)}T${pad2(x.getHours())}:${pad2(x.getMinutes())}`;
};

const parseLocal = (s) => {
  if (!s) return null;
  const [date, time] = s.split('T');
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
};

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const fromMin = (minutos) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${pad2(h)}:${pad2(m)}`;
};

// ─── Formato visible: "dd/mm/yyyy HH:mm" ────────────────────────────
const formatoAmigable = (value) => {
  const d = parseLocal(value);
  if (!d) return '';
  return `${toDMY(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// ─── Parser tolerante ───────────────────────────────────────────────
/**
 * Acepta:
 *   23/09/2026 12:33
 *   23/9/2026 12:33
 *   23-09-2026 12:33
 *   23/09/2026
 *   23/09/2026 12
 * Devuelve "YYYY-MM-DDTHH:mm" o null.
 */
/**
 * Parser tolerante. Acepta múltiples formatos:
 *
 *  1) 24/09/2026 08:30      → con separadores
 *  2) 24-09-2026 08:30
 *  3) 24/09/2026            → sin hora
 *  4) 24/09/2026 08
 *  5) 240920260830          → dígitos continuos CON hora (14 chars)
 *  6) 24092026              → dígitos continuos SIN hora (8 chars)
 *  7) 24092026 08:30        → fecha continua + hora con separador
 *  8) 24/09/2026 0830       → hora sin dos puntos
 *
 * Devuelve "YYYY-MM-DDTHH:mm" o null.
 */
const parseAmigable = (texto) => {
  if (!texto) return null;
  const limpio = texto.trim().replace(/\s+/g, ' ');

  let dd, mm, yyyy, hh, mi;

  // ─── 1) Formato continuo de 14 dígitos: DDMMYYYYHHmm ───
  const soloDigitos14 = limpio.match(/^(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})$/);
  if (soloDigitos14) {
    [, dd, mm, yyyy, hh, mi] = soloDigitos14;
  }

  // ─── 2) Formato continuo de 12 dígitos: DDMMYYYYHHmm sin año 2 dígitos? No aplica ───
  // (No lo cubrimos porque el año es de 4 dígitos obligatoriamente)

  // ─── 3) Formato continuo de 8 dígitos: DDMMYYYY (sin hora) ───
  const soloDigitos8 = !dd && limpio.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (soloDigitos8) {
    [, dd, mm, yyyy] = soloDigitos8;
    hh = '00';
    mi = '00';
  }

  // ─── 4) Formato con separadores y hora opcional ───
  if (!dd) {
    const conSep = limpio.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[\sT]+(\d{1,2})(?::?(\d{2}))?)?$/
    );
    if (conSep) {
      [, dd, mm, yyyy, hh, mi] = conSep;
      if (hh === undefined) { hh = '00'; mi = '00'; }
      else if (mi === undefined) { mi = '00'; }
    }
  }

  // ─── 5) Fecha con separadores + hora en formato HHmm (sin dos puntos) ───
  if (!dd) {
    const conSepHoraCompacta = limpio.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[\s]+(\d{4})$/
    );
    if (conSepHoraCompacta) {
      const [, d, m, y, hm] = conSepHoraCompacta;
      dd = d; mm = m; yyyy = y;
      hh = hm.slice(0, 2);
      mi = hm.slice(2, 4);
    }
  }

  if (!dd) return null;

  // ─── Normalizar y validar ───
  const d  = Number(dd);
  const mo = Number(mm);
  const y  = Number(yyyy);
  const h  = Number(hh);
  const min = Number(mi);

  if (d < 1 || d > 31) return null;
  if (mo < 1 || mo > 12) return null;
  if (h < 0 || h > 23) return null;
  if (min < 0 || min > 59) return null;

  const date = new Date(y, mo - 1, d, h, min, 0, 0);

  // Validar que la fecha exista (ej. 31/02 no es válido)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== mo - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }

  return toLocalInput(date);
};

// ═════════════════════════════════════════════════════════════════════
// Componente
// ═════════════════════════════════════════════════════════════════════
export const DatePickerRestringido = ({
  label,
  value = '',
  onChange,
  min,
  max,
  error,
  diasPermitidos = [1, 2, 3, 4, 5],
  feriados = [],
  disabled = false,
  horaInicio = '00:00',
  horaFin = '23:59',
  pasoMinutos = 5,
  placeholder = 'dd/mm/aaaa HH:mm',
}) => {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState(() => formatoAmigable(value));
  const [editando, setEditando] = useState(false);
  const popoverRef = useRef(null);

  const valorDate = useMemo(() => parseLocal(value), [value]);

  // Estado interno del picker
  const [diaSel, setDiaSel] = useState(() => {
  if (valorDate) return valorDate;

  // Sin valor: proponer HOY si es un día válido
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Validar día
  const diaISO = hoy.getDay() === 0 ? 7 : hoy.getDay();
  if (!diasPermitidos.includes(diaISO)) return null;

  const ymd = toYMD(hoy);
  if (feriados.includes(ymd)) return null;

  // Validar contra `min`
  if (min) {
    const minDate = parseLocal(min);
    if (minDate) {
      const minFecha = new Date(minDate);
      minFecha.setHours(0, 0, 0, 0);
      if (hoy < minFecha) return null;
    }
  }

  return hoy;
});
  const [hora, setHora] = useState(() => {
  if (valorDate) return pad2(valorDate.getHours());
  // Sin valor → usar la hora de inicio del sistema
  return horaInicio.slice(0, 2); // "08"
});

const [minuto, setMinuto] = useState(() => {
  if (valorDate) return pad2(valorDate.getMinutes());
  // Sin valor → usar el minuto de inicio del sistema
  return horaInicio.slice(3, 5); // "30"
});

  // Sincronizar cuando cambia `value` desde afuera
  useEffect(() => {
    const d = parseLocal(value);
    setTexto(formatoAmigable(value));
    if (d) {
      setDiaSel(d);
      setHora(pad2(d.getHours()));
      setMinuto(pad2(d.getMinutes()));
    }
  }, [value]);

  // Mes visible
  const [mesActual, setMesActual] = useState(() => {
  const base = valorDate || new Date();  // `new Date()` = hoy
  return new Date(base.getFullYear(), base.getMonth(), 1);
});

  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const minEfectivo = useMemo(() => {
    if (min) return min;
    const d = new Date();
    d.setSeconds(0, 0);
    return toLocalInput(d);
  }, [min]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // Matriz de días
  const dias = useMemo(() => {
    const y = mesActual.getFullYear();
    const m = mesActual.getMonth();
    const primerDia = new Date(y, m, 1);
    const ultimoDia = new Date(y, m + 1, 0);
    const offset = (primerDia.getDay() + 6) % 7;

    const arr = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      arr.push(new Date(y, m, d));
    }
    return arr;
  }, [mesActual]);

  const diaEsValido = (d) => {
    if (!d) return false;
    const soloFecha = new Date(d);
    soloFecha.setHours(0, 0, 0, 0);

    if (minEfectivo) {
      const minDate = parseLocal(minEfectivo);
      const minFecha = new Date(minDate);
      minFecha.setHours(0, 0, 0, 0);
      if (soloFecha < minFecha) return false;
    }
    if (soloFecha < hoy) return false;

    const diaISO = d.getDay() === 0 ? 7 : d.getDay();
    if (!diasPermitidos.includes(diaISO)) return false;
    if (feriados.includes(toYMD(d))) return false;
    return true;
  };

  const horaValida = (hh, mi) => {
    const total = Number(hh) * 60 + Number(mi);
    return total >= toMin(horaInicio) && total <= toMin(horaFin);
  };

  const construirValor = () => {
    if (!diaSel) return null;
    if (!horaValida(hora, minuto)) return null;
    return `${toYMD(diaSel)}T${hora}:${minuto}`;
  };

  const aplicar = () => {
    const v = construirValor();
    if (!v) return;
    onChange(v);
    setTexto(formatoAmigable(v));
    setOpen(false);
  };

  const limpiar = () => {
    onChange('');
    setTexto('');
    setDiaSel(null);
    setOpen(false);
  };

  const cancelar = () => {
    setTexto(formatoAmigable(value));
    if (valorDate) {
      setDiaSel(valorDate);
      setHora(pad2(valorDate.getHours()));
      setMinuto(pad2(valorDate.getMinutes()));
    }
    setOpen(false);
  };

  // Input handlers
  const onInputChange = (e) => setTexto(e.target.value);

  const onInputBlur = () => {
    setEditando(false);
    const parsed = parseAmigable(texto);
    if (parsed) {
      onChange(parsed);
      setTexto(formatoAmigable(parsed));
    } else if (texto.trim() === '') {
      onChange('');
    } else {
      setTexto(formatoAmigable(value));
    }
  };

  const onInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
    if (e.key === 'Escape') {
      setTexto(formatoAmigable(value));
      e.target.blur();
    }
  };

  const cambiarMes = (delta) => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + delta, 1));
  };

  // ─── Horas y minutos parametrizados ────────────────────────────
 // ─── Horas y minutos parametrizados ────────────────────────────
// Ventana permitida en minutos desde 00:00
const ventana = useMemo(() => {
  const inicio = toMin(horaInicio);   // ej. 08:30 → 510
  const fin    = toMin(horaFin);      // ej. 16:30 → 990
  return { inicio, fin };
}, [horaInicio, horaFin]);

// Hora de inicio y hora de fin como números
const horaInicioNum = useMemo(() => Math.floor(ventana.inicio / 60), [ventana]);
const horaFinNum    = useMemo(() => Math.floor(ventana.fin / 60),    [ventana]);
const minInicioNum  = useMemo(() => ventana.inicio % 60,             [ventana]);
const minFinNum     = useMemo(() => ventana.fin % 60,                [ventana]);

// Lista de HORAS: desde horaInicio hasta horaFin (inclusive)
const horasDisponibles = useMemo(() => {
  const arr = [];
  for (let h = horaInicioNum; h <= horaFinNum; h++) {
    arr.push(pad2(h));
  }
  return arr;
}, [horaInicioNum, horaFinNum]);

// Lista de MINUTOS válidos para la hora seleccionada
const minutosDisponibles = useMemo(() => {
  const paso = Number(pasoMinutos) > 0 ? Number(pasoMinutos) : 5;
  const hh = Number(hora);

  const arr = [];
  for (let m = 0; m < 60; m += paso) {
    const total = hh * 60 + m;
    if (total < ventana.inicio) continue;
    if (total > ventana.fin) continue;
    arr.push(pad2(m));
  }

  // Si la hora es la de inicio y el paso no la alcanza, incluye el minuto exacto de inicio
  if (hh === horaInicioNum && !arr.includes(pad2(minInicioNum))) {
    arr.unshift(pad2(minInicioNum));
  }

  // Si la hora es la de fin y el paso no la alcanza, incluye el minuto exacto de fin
  if (hh === horaFinNum && !arr.includes(pad2(minFinNum))) {
    arr.push(pad2(minFinNum));
  }

  // Asegurar orden y unicidad
  return [...new Set(arr)].sort();
}, [hora, ventana, horaInicioNum, horaFinNum, minInicioNum, minFinNum, pasoMinutos]);

  const validoPreview = diaSel && horaValida(hora, minuto);
  const hayValor = !!value;
  const esFinde = (d) => d.getDay() === 0 || d.getDay() === 6;
// Auto-rellenar con HOY + horaInicio si no hay valor y el día de hoy es válido
useEffect(() => {
  if (value) return;               // ya hay valor
  if (!diaSel) return;             // no se pudo proponer un día válido
  if (!open) return;               // solo cuando se abre el calendario

  const propuesto = `${toYMD(diaSel)}T${hora}:${minuto}`;
  if (!horaValida(hora, minuto)) return;

  // No actualizamos `value` porque el usuario aún no confirmó.
  // Solo actualizamos el texto para que vea la propuesta.
  setTexto(formatoAmigable(propuesto));
}, [open, diaSel, hora, minuto, value]);
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      )}

      <div className="relative" ref={popoverRef}>
        <input
          type="text"
          inputMode="numeric"
          value={texto}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onInputChange}
          onFocus={() => setEditando(true)}
          onBlur={onInputBlur}
          onKeyDown={onInputKeyDown}
          onClick={() => !editando && !disabled && setOpen(true)}
          className={`block w-full rounded-md border bg-white px-2.5 py-1.5 pr-14 text-[13px] shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
            error ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
          } ${disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
        />

        {hayValor && !disabled && (
          <button
            type="button"
            onClick={limpiar}
            className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Limpiar"
          >
            <X size={13} />
          </button>
        )}

        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
          title="Abrir calendario"
        >
          <Calendar size={14} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-40 mt-1 w-[21rem] max-w-[92vw] rounded-lg border border-slate-200 bg-white p-2.5 shadow-xl">
            <div className="grid grid-cols-[1fr_auto] gap-2.5">
              {/* ─── Calendario ───────────────────────── */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => cambiarMes(-1)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  <select
                    value={`${mesActual.getFullYear()}-${mesActual.getMonth()}`}
                    onChange={(e) => {
                      const [y, m] = e.target.value.split('-').map(Number);
                      setMesActual(new Date(y, m, 1));
                    }}
                    className="rounded border border-transparent bg-transparent px-1.5 py-0.5 text-[12px] font-semibold text-slate-800 hover:border-slate-200 focus:border-brand-500 focus:outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => {
                      const y = mesActual.getFullYear();
                      return (
                        <option key={i} value={`${y}-${i}`}>
                          {MESES[i]} {y}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => cambiarMes(1)}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>

                <div className="mb-0.5 grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium uppercase text-slate-500">
                  {DIAS.map((d, i) => (
                    <div key={i} className={i >= 5 ? 'text-red-400' : ''}>
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5">
                  {dias.map((d, i) => {
                    if (!d) return <div key={i} className="h-7" />;

                    const valido = diaEsValido(d);
                    const isHoy = toYMD(d) === toYMD(hoy);
                    const seleccionado = diaSel && toYMD(d) === toYMD(diaSel);
                    const esFeriado = feriados.includes(toYMD(d));
                    const finde = esFinde(d);

                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={!valido}
                        onClick={() => setDiaSel(d)}
                        title={!valido ? (esFeriado ? 'Feriado' : 'No disponible') : undefined}
                        className={`h-7 rounded text-[12px] transition ${
                          seleccionado
                            ? 'bg-brand-600 font-semibold text-white'
                            : valido
                            ? isHoy
                              ? 'bg-slate-200 font-semibold text-slate-800 hover:bg-brand-100'
                              : finde
                              ? 'text-red-500 hover:bg-slate-100'
                              : 'text-slate-700 hover:bg-slate-100'
                            : esFeriado || finde
                            ? 'cursor-not-allowed text-red-200'
                            : 'cursor-not-allowed text-slate-300'
                        }`}
                      >
                        {d.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── Hora + Minutos ───────────────────── */}
              <div className="flex flex-col border-l border-slate-100 pl-2.5">
                <div className="mb-1 text-center text-[10px] font-medium uppercase text-slate-500">
                  hora
                </div>

                <div className="flex items-start gap-1">
                  {/* Hora */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => {
                        const idx = horasDisponibles.indexOf(hora);
                        setHora(horasDisponibles[Math.max(0, idx - 1)]);
                      }}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <ChevronUp size={14} />
                    </button>

                    <select
                      size={6}
                      value={hora}
                      onChange={(e) => {
                        const nuevaHora = e.target.value;
                        setHora(nuevaHora);
                        // Ajustar minuto si queda fuera de la ventana
                        const hh = Number(nuevaHora);
                        const total = hh * 60 + Number(minuto);
                        if (total < toMin(horaInicio)) {
                          setMinuto(horaInicio.slice(3, 5));
                        } else if (total > toMin(horaFin)) {
                          setMinuto(horaFin.slice(3, 5));
                        }
                      }}
                      className="w-10 overflow-hidden rounded border-none bg-transparent py-0.5 text-center text-[13px] font-medium focus:outline-none [&>option]:py-0.5 [&>option:checked]:rounded [&>option:checked]:bg-brand-600 [&>option:checked]:text-white"
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      {horasDisponibles.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        const idx = horasDisponibles.indexOf(hora);
                        setHora(horasDisponibles[Math.min(horasDisponibles.length - 1, idx + 1)]);
                      }}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <span className="mt-7 text-sm font-semibold text-slate-400">:</span>

                  {/* Minutos */}
                  <div className="flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => {
                        const idx = minutosDisponibles.indexOf(minuto);
                        setMinuto(minutosDisponibles[Math.max(0, idx - 1)] ?? minuto);
                      }}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <ChevronUp size={14} />
                    </button>

                    <select
                      size={6}
                      value={minuto}
                      onChange={(e) => setMinuto(e.target.value)}
                      className="w-10 overflow-hidden rounded border-none bg-transparent py-0.5 text-center text-[13px] font-medium focus:outline-none [&>option]:py-0.5 [&>option:checked]:rounded [&>option:checked]:bg-brand-600 [&>option:checked]:text-white"
                      style={{ scrollbarWidth: 'thin' }}
                    >
                      {minutosDisponibles.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        const idx = minutosDisponibles.indexOf(minuto);
                        setMinuto(minutosDisponibles[Math.min(minutosDisponibles.length - 1, idx + 1)] ?? minuto);
                      }}
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-1 text-center text-[10px] text-slate-400">
                  {horaInicio}–{horaFin}
                </div>
              </div>
            </div>

            {/* ─── Footer ──────────────────────────────── */}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={limpiar}
                className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                Limpiar
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cancelar}
                  className="rounded px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={aplicar}
                  disabled={!validoPreview}
                  className="rounded bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
};