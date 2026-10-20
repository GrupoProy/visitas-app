import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, Clock, User, MapPin } from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';

const isoToLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function FinalizarAutorizacion({ autorizacion, onCreada, onCancel }) {
  const [fecha, setFecha] = useState('');
  const [obs, setObs] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // Por defecto: la fecha de fin programada (que es cuando debía salir)
    setFecha(isoToLocal(autorizacion?.fecha_fin) || isoToLocal(new Date().toISOString()));
    setObs('');
    setErrores({});
  }, [autorizacion]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!fecha) errs.fecha = 'Requerido';
    if (fecha) {
      const f = new Date(fecha);
      const ingreso = new Date(autorizacion.fecha_ingreso_real);
      if (f < ingreso) errs.fecha = 'No puede ser anterior al ingreso';
      if (f > new Date()) errs.fecha = 'No puede ser en el futuro';
    }
    setErrores(errs);
    if (Object.keys(errs).length) return;

    setEnviando(true);
    try {
      await api.patch(`/autorizaciones/${autorizacion.id}/finalizar`, {
        fecha_salida_real: new Date(fecha).toISOString(),
        observacion: obs.trim() || null,
      });
      onCreada?.();
    } catch (e) {
      setErrores({ global: e.response?.data?.message || 'Error al finalizar' });
    } finally { setEnviando(false); }
  };

  const horas = autorizacion?.fecha_ingreso_real
    ? Math.round((new Date() - new Date(autorizacion.fecha_ingreso_real)) / 3600000)
    : 0;

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-900">
              Visita sin registrar salida — <b>{horas} h</b> en curso
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Estás por finalizar esta visita manualmente. La fecha de salida debe
              reflejar cuándo salió realmente el visitante.
            </p>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-2">
        <p className="flex items-center gap-1.5 text-slate-700">
          <User size={14} className="text-slate-400" />
          <b>{autorizacion?.visitante}</b>
        </p>
        <p className="flex items-center gap-1.5 text-slate-700">
          <MapPin size={14} className="text-slate-400" />
          {autorizacion?.lugar}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-slate-500 md:col-span-2">
          <Clock size={13} className="text-slate-400" />
          Ingresó: {new Date(autorizacion?.fecha_ingreso_real).toLocaleString('es-BO')}
        </p>
      </div>

      {/* Formulario */}
      <Input
        type="datetime-local"
        label="Fecha/hora real de salida *"
        value={fecha}
        error={errores.fecha}
        max={isoToLocal(new Date().toISOString())}
        onChange={(e) => { setFecha(e.target.value); setErrores({}); }}
      />

      <Textarea
        label="Observación (opcional)"
        rows={2}
        placeholder="Ej. Se olvidó registrar la salida, confirmado con el anfitrión"
        value={obs}
        onChange={(e) => setObs(e.target.value)}
      />

      {errores.global && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errores.global}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={enviando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={enviando}>
          {enviando && <Loader2 size={16} className="animate-spin" />}
          Finalizar visita
        </Button>
      </div>
    </form>
  );
}