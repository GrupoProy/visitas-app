import { useEffect, useMemo, useState } from 'react';
import { Loader2, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useParametros } from '../hooks/useParametros';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { validarRangoHorario } from '../utils/validaciones';

export default function EditarAutorizacion({ autorizacion, onCreada, onCancel }) {
  const toast = useToast();
  const { parametros: cfg } = useParametros();

  const [form, setForm] = useState({
    id_lugar: '',
    id_anfitrion: '',
    motivo: '',
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
  });
  const [lugares, setLugares] = useState([]);
  const [anfitriones, setAnfitriones] = useState([]);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [conflicto, setConflicto] = useState(null);

  // Estados de excepción
  const [esExcepcion, setEsExcepcion] = useState(false);
  const [motivoExcepcion, setMotivoExcepcion] = useState('');

  const cfgSafe = useMemo(
    () => ({
      HORARIO_VISITA_INICIO: cfg.HORARIO_VISITA_INICIO || '08:30',
      HORARIO_VISITA_FIN: cfg.HORARIO_VISITA_FIN || '16:30',
      DIAS_VISITA_PERMITIDOS: cfg.DIAS_VISITA_PERMITIDOS || [1, 2, 3, 4, 5],
      DURACION_MAX_VISITA_HORAS: cfg.DURACION_MAX_VISITA_HORAS || 12,
    }),
    [cfg]
  );

  // Helper: convertir ISO a valor de <input type="datetime-local">
  const isoToLocalInput = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // ⭐ Calcular si requiere excepción (para habilitar el checkbox)
  const requiereExcepcion = useMemo(() => {
    if (!form.fecha_inicio || !form.fecha_fin) return false;
    
    const ini = new Date(form.fecha_inicio);
    const fin = new Date(form.fecha_fin);
    
    const [hIni, mIni] = cfgSafe.HORARIO_VISITA_INICIO.split(':').map(Number);
    const [hFin, mFin] = cfgSafe.HORARIO_VISITA_FIN.split(':').map(Number);
    const iniMinutos = ini.getHours() * 60 + ini.getMinutes();
    const finMinutos = fin.getHours() * 60 + fin.getMinutes();
    
    const fueraDeHorario = iniMinutos < (hIni * 60 + mIni) || finMinutos > (hFin * 60 + mFin);

    const duracionHoras = (fin.getTime() - ini.getTime()) / 3600000;
    const excedeDuracion = duracionHoras > cfgSafe.DURACION_MAX_VISITA_HORAS;

    return fueraDeHorario || excedeDuracion;
  }, [form.fecha_inicio, form.fecha_fin, cfgSafe]);

  // Cargar catálogos y prellenar formulario
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

    // Cargar datos de excepción previa
    setEsExcepcion(autorizacion.es_excepcion || false);
    setMotivoExcepcion(autorizacion.motivo_excepcion || '');

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizacion]);

  // Verificación de conflicto
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

        // Filtrar la propia autorización
        const conflictos = (data.data.conflictos || []).filter(
          (c) => c.id !== autorizacion.id
        );
        if (!data.data.disponible && conflictos.length > 0) {
          setConflicto({
            mensaje: `Conflicto con ${conflictos[0].codigo}`,
            conflictos,
          });
        } else {
          setConflicto(null);
        }
      } catch {
        if (!cancelado) setConflicto(null);
      }
    };
    verificar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fecha_inicio, form.fecha_fin, form.id_anfitrion]);

  const validar = () => {
    const errs = {};
    if (!form.id_lugar) errs.id_lugar = 'Selecciona un lugar';
    if (!form.id_anfitrion) errs.id_anfitrion = 'Selecciona un anfitrión';
    if (!form.motivo.trim()) errs.motivo = 'El motivo es obligatorio';

    // Validar horario solo si NO es excepción
    if (!esExcepcion) {
      const errHorario = validarRangoHorario(form.fecha_inicio, form.fecha_fin, {
        inicio: cfgSafe.HORARIO_VISITA_INICIO,
        fin: cfgSafe.HORARIO_VISITA_FIN,
        diasPermitidos: cfgSafe.DIAS_VISITA_PERMITIDOS,
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
    if (conflicto) {
      toast.error('Hay conflicto de horario');
      return;
    }
    if (!validar()) {
      toast.error('Revisa los campos marcados');
      return;
    }

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
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Aviso de horario */}
      <div className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800">
        <Clock size={14} className="mt-0.5 shrink-0" />
        <span>
          <b>Horario permitido:</b> {cfgSafe.HORARIO_VISITA_INICIO} a {cfgSafe.HORARIO_VISITA_FIN}
        </span>
      </div>

      {/* Conflicto */}
      {conflicto && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            <b>Conflicto:</b> {conflicto.mensaje}
            <ul className="mt-1 list-disc pl-4">
              {conflicto.conflictos.map((c) => (
                <li key={c.id}>
                  {new Date(c.fecha_inicio).toLocaleString()} →{' '}
                  {new Date(c.fecha_fin).toLocaleString()}
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
          <Select
            label="Lugar *"
            value={form.id_lugar}
            error={errores.id_lugar}
            onChange={(e) => setForm({ ...form, id_lugar: e.target.value })}
          >
            <option value="">— Seleccionar —</option>
            {lugares.map((l) => (
              <option key={l.id} value={l.id}>{l.nombre}</option>
            ))}
          </Select>

          <Select
            label="Anfitrión *"
            value={form.id_anfitrion}
            error={errores.id_anfitrion}
            onChange={(e) => setForm({ ...form, id_anfitrion: e.target.value })}
          >
            <option value="">— Seleccionar —</option>
            {anfitriones.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombres} {a.primer_apellido}{a.segundo_apellido ? ` ${a.segundo_apellido}` : ''}
              </option>
            ))}
          </Select>

          <Input
            label="Motivo *"
            value={form.motivo}
            error={errores.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          />

          <div />

          <Input
            type="datetime-local"
            label="Fecha/hora inicio *"
            value={form.fecha_inicio}
            error={errores.fecha_inicio}
            onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
          />

          <Input
            type="datetime-local"
            label="Fecha/hora fin *"
            value={form.fecha_fin}
            onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
          />

          {/* UI DE EXCEPCIÓN EN EDICIÓN */}
          {requiereExcepcion && (
            <div className="md:col-span-2 mt-2">
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 text-amber-600" size={20} />
                  <div className="flex-1">
                    <p className="font-semibold text-amber-900">
                      Esta visita excede los límites permitidos
                    </p>
                    <p className="text-xs text-amber-800 mt-1">
                      Has seleccionado un horario fuera del permitido o una duración mayor a {cfgSafe.DURACION_MAX_VISITA_HORAS} horas.
                    </p>
                    
                    <label className="flex items-center gap-2 mt-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={esExcepcion}
                        onChange={(e) => {
                          setEsExcepcion(e.target.checked);
                          if (!e.target.checked) setMotivoExcepcion('');
                        }}
                        className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm font-medium text-amber-900">
                        Autorizar como excepción
                      </span>
                    </label>

                    {esExcepcion && (
                      <div className="mt-3">
                        <Textarea
                          label="Motivo de la excepción *"
                          placeholder="Explica brevemente por qué se autoriza esta excepción..."
                          rows={2}
                          value={motivoExcepcion}
                          onChange={(e) => setMotivoExcepcion(e.target.value)}
                          error={errores.motivoExcepcion}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <Textarea
              label="Observaciones"
              rows={2}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando || !!conflicto}>
          {enviando && <Loader2 size={16} className="animate-spin" />}
          {enviando ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}