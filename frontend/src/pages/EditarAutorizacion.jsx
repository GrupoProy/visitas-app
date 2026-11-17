import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useParametros } from '../hooks/useParametros';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { DatePickerRestringido } from '../components/ui/DatePickerRestringido';
import { LugarCombo } from '../components/ui/LugarCombo';
import { validarRangoHorario } from '../utils/validaciones';

export default function EditarAutorizacion({ autorizacion, onCreada, onCancel }) {
  const toast = useToast();
  const { parametros: cfg } = useParametros();

  const [form, setForm] = useState({
    id_lugar: '', id_anfitrion: '', motivo: '',
    fecha_inicio: '', fecha_fin: '', observaciones: '',
  });
  const [lugares, setLugares] = useState([]);
  const [anfitriones, setAnfitriones] = useState([]);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [conflicto, setConflicto] = useState(null);

  const [esExcepcion, setEsExcepcion] = useState(false);
  const [motivoExcepcion, setMotivoExcepcion] = useState('');

  const cfgSafe = useMemo(
    () => ({
      HORARIO_VISITA_INICIO: cfg.HORARIO_VISITA_INICIO || '08:30',
      HORARIO_VISITA_FIN: cfg.HORARIO_VISITA_FIN || '16:30',
      DIAS_VISITA_PERMITIDOS: cfg.DIAS_VISITA_PERMITIDOS || [1, 2, 3, 4, 5],
      DIAS_FERIADOS: cfg.DIAS_FERIADOS || [],
      DURACION_MAX_VISITA_HORAS: cfg.DURACION_MAX_VISITA_HORAS || 12,
    }),
    [cfg]
  );

  const excedeDuracion = useMemo(() => {
    if (!form.fecha_inicio || !form.fecha_fin) return false;
    const ini = new Date(form.fecha_inicio);
    const fin = new Date(form.fecha_fin);
    if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime())) return false;
    return (fin.getTime() - ini.getTime()) / 3600000 > cfgSafe.DURACION_MAX_VISITA_HORAS;
  }, [form.fecha_inicio, form.fecha_fin, cfgSafe.DURACION_MAX_VISITA_HORAS]);

  const pickerHoraInicio = esExcepcion ? '00:00' : cfgSafe.HORARIO_VISITA_INICIO;
  const pickerHoraFin    = esExcepcion ? '23:59' : cfgSafe.HORARIO_VISITA_FIN;

  const isoToLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    Promise.all([
      api.get('/lugares', { params: { limit: 100 } }),
      api.get('/personas/anfitriones'),
    ]).then(([rLugares, rAnf]) => {
      setLugares(rLugares.data.data.items.filter((l) => l.estado === 'ACTIVO'));
      setAnfitriones(rAnf.data.data);
    }).catch(() => toast.error('No se pudieron cargar los catálogos'));

    setForm({
      id_lugar: String(autorizacion.id_lugar),
      id_anfitrion: String(autorizacion.id_anfitrion),
      motivo: autorizacion.motivo || '',
      fecha_inicio: isoToLocalInput(autorizacion.fecha_inicio),
      fecha_fin: isoToLocalInput(autorizacion.fecha_fin),
      observaciones: autorizacion.observaciones || '',
    });

    const excOriginal = autorizacion.es_excepcion || false;
    setEsExcepcion(excOriginal);
    setMotivoExcepcion(autorizacion.motivo_excepcion || '');

    if (!excOriginal && autorizacion.fecha_inicio && autorizacion.fecha_fin) {
      const err = validarRangoHorario(autorizacion.fecha_inicio, autorizacion.fecha_fin, {
        inicio: cfgSafe.HORARIO_VISITA_INICIO,
        fin: cfgSafe.HORARIO_VISITA_FIN,
        diasPermitidos: cfgSafe.DIAS_VISITA_PERMITIDOS,
        diasFeriados: cfgSafe.DIAS_FERIADOS,
      });
      if (err) {
        setEsExcepcion(true);
        setMotivoExcepcion('');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizacion]);

  useEffect(() => {
    let cancelado = false;
    const verificar = async () => {
      if (!form.fecha_inicio || !form.fecha_fin) { setConflicto(null); return; }
      try {
        const { data } = await api.post('/autorizaciones/verificar-disponibilidad', {
          id_persona: autorizacion.id_persona,
          id_anfitrion: form.id_anfitrion ? Number(form.id_anfitrion) : null,
          fecha_inicio: new Date(form.fecha_inicio).toISOString(),
          fecha_fin: new Date(form.fecha_fin).toISOString(),
        });
        if (cancelado) return;
        const conflictos = (data.data.conflictos || []).filter((c) => c.id !== autorizacion.id);
        if (!data.data.disponible && conflictos.length > 0) {
          setConflicto({ mensaje: `Conflicto con ${conflictos[0].codigo}`, conflictos });
        } else { setConflicto(null); }
      } catch { if (!cancelado) setConflicto(null); }
    };
    verificar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fecha_inicio, form.fecha_fin, form.id_anfitrion]);

  const handleToggleExcepcion = (checked) => {
    setEsExcepcion(checked);
    if (!checked) {
      setMotivoExcepcion('');
      if (form.fecha_inicio && form.fecha_fin) {
        const err = validarRangoHorario(form.fecha_inicio, form.fecha_fin, {
          inicio: cfgSafe.HORARIO_VISITA_INICIO,
          fin: cfgSafe.HORARIO_VISITA_FIN,
          diasPermitidos: cfgSafe.DIAS_VISITA_PERMITIDOS,
          diasFeriados: cfgSafe.DIAS_FERIADOS,
        });
        if (err) {
          setForm((f) => ({ ...f, fecha_inicio: '', fecha_fin: '' }));
          toast.error('Las fechas seleccionadas estaban fuera del horario permitido. Selecciona un nuevo rango.');
        }
      }
    }
  };

  const validar = () => {
    const errs = {};
    if (!form.id_lugar) errs.id_lugar = 'Selecciona un lugar';
    if (!form.id_anfitrion) errs.id_anfitrion = 'Selecciona un anfitrión';
    if (!form.motivo.trim()) errs.motivo = 'El motivo es obligatorio';

    if (!esExcepcion) {
      const errHorario = validarRangoHorario(form.fecha_inicio, form.fecha_fin, {
        inicio: cfgSafe.HORARIO_VISITA_INICIO,
        fin: cfgSafe.HORARIO_VISITA_FIN,
        diasPermitidos: cfgSafe.DIAS_VISITA_PERMITIDOS,
        diasFeriados: cfgSafe.DIAS_FERIADOS,
      });
      if (errHorario) errs.fecha_inicio = errHorario;
    } else if (!motivoExcepcion.trim()) {
      errs.motivoExcepcion = 'Debes explicar el motivo de la excepción';
    }

    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (conflicto) { toast.error('Hay conflicto de horario'); return; }
    if (!validar()) { toast.error('Revisa los campos marcados'); return; }

    setEnviando(true);
    try {
      await api.put(`/autorizaciones/${autorizacion.id}`, {
        id_lugar: Number(form.id_lugar),
        id_anfitrion: Number(form.id_anfitrion),
        motivo: form.motivo.trim(),
        fecha_inicio: new Date(form.fecha_inicio).toISOString(),
        fecha_fin: new Date(form.fecha_fin).toISOString(),
        observaciones: form.observaciones.trim() || null,
        es_excepcion: esExcepcion,
        motivo_excepcion: esExcepcion ? motivoExcepcion : null,
      });
      toast.success('Autorización actualizada');
      onCreada?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al actualizar');
    } finally { setEnviando(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
        esExcepcion
          ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
          : 'border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300'
      }`}>
        {esExcepcion ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> : <Clock size={14} className="mt-0.5 shrink-0" />}
        <span>
          {esExcepcion ? (
            <>Modo excepción activo: no se valida el rango {cfgSafe.HORARIO_VISITA_INICIO}–{cfgSafe.HORARIO_VISITA_FIN} ni la duración máxima.</>
          ) : (
            <><b>Horario permitido:</b> {cfgSafe.HORARIO_VISITA_INICIO} a {cfgSafe.HORARIO_VISITA_FIN}</>
          )}
        </span>
      </div>

      {conflicto && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <b>Conflicto:</b> {conflicto.mensaje}
            <ul className="mt-1 list-disc pl-4">
              {conflicto.conflictos.map((c) => (
                <li key={c.id}>
                  {new Date(c.fecha_inicio).toLocaleString()} → {new Date(c.fecha_fin).toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <p className="mb-3 text-sm text-slate-600">
          <b>Visitante:</b> {autorizacion.visitante} — {autorizacion.documento_visitante}
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <LugarCombo
            label="Lugar *"
            value={form.id_lugar}
            onChange={(v) => setForm({ ...form, id_lugar: v })}
            lugares={lugares}
            placeholder="Buscar lugar por nombre o piso…"
            error={errores.id_lugar}
          />

          <Select label="Anfitrión *" value={form.id_anfitrion} error={errores.id_anfitrion}
            onChange={(e) => setForm({ ...form, id_anfitrion: e.target.value })}>
            <option value="">— Seleccionar —</option>
            {anfitriones.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombres} {a.primer_apellido}{a.segundo_apellido ? ` ${a.segundo_apellido}` : ''}
              </option>
            ))}
          </Select>

          <Input label="Motivo *" value={form.motivo} error={errores.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })} />

          <div />

          <DatePickerRestringido
            label="Fecha/hora inicio *"
            value={form.fecha_inicio}
            onChange={(v) => setForm({ ...form, fecha_inicio: v })}
            min={isoToLocalInput(autorizacion.fecha_inicio)}
            diasPermitidos={cfgSafe.DIAS_VISITA_PERMITIDOS}
            feriados={cfgSafe.DIAS_FERIADOS}
            horaInicio={pickerHoraInicio}
            horaFin={pickerHoraFin}
            pasoMinutos={15}
            error={errores.fecha_inicio}
          />

          <DatePickerRestringido
            label="Fecha/hora fin *"
            value={form.fecha_fin}
            onChange={(v) => setForm({ ...form, fecha_fin: v })}
            min={form.fecha_inicio || isoToLocalInput(autorizacion.fecha_inicio)}
            diasPermitidos={cfgSafe.DIAS_VISITA_PERMITIDOS}
            feriados={cfgSafe.DIAS_FERIADOS}
            horaInicio={pickerHoraInicio}
            horaFin={pickerHoraFin}
            pasoMinutos={15}
            error={errores.fecha_fin}
          />

          <div className="md:col-span-2 mt-2">
            {!esExcepcion ? (
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={esExcepcion}
                    onChange={(e) => handleToggleExcepcion(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500" />
                  <span>
                    ¿Necesitas autorizar <b>fuera de horario</b> o por más de {cfgSafe.DURACION_MAX_VISITA_HORAS} horas?
                  </span>
                </label>
                {excedeDuracion && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>
                      La duración excede el máximo permitido ({cfgSafe.DURACION_MAX_VISITA_HORAS}h).
                      Marca la casilla superior para registrarla como excepción.
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 text-amber-600" size={20} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">Excepción de horario activada</p>
                      <button type="button" onClick={() => handleToggleExcepcion(false)}
                        className="text-xs text-amber-700 underline hover:text-amber-900 dark:text-amber-300">
                        Desactivar
                      </button>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                      El horario permitido y la duración máxima <b>no se validarán</b>.
                    </p>
                    <div className="mt-3">
                      <Textarea label="Motivo de la excepción *"
                        placeholder="Explica brevemente por qué se autoriza esta excepción…"
                        rows={2} value={motivoExcepcion}
                        onChange={(e) => setMotivoExcepcion(e.target.value)}
                        error={errores.motivoExcepcion} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <Textarea label="Observaciones" rows={2}
              value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={enviando}>Cancelar</Button>
        <Button type="submit" disabled={enviando || !!conflicto}>
          {enviando && <Loader2 size={16} className="animate-spin" />}
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}