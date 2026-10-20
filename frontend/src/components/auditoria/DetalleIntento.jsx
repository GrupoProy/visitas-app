// components/auditoria/DetalleIntento.jsx
import { useEffect, useState } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, MapPin,
  Monitor, Calendar, User as UserIcon, ShieldCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../ui/Modal';

export const DetalleIntento = ({ open, intentoId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !intentoId) {
      setData(null);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    api
      .get(`/auditoria/login/${intentoId}`)
      .then((r) => setData(r.data.data))
      .catch((e) =>
        setError(e.response?.data?.message || 'No se pudo cargar el detalle')
      )
      .finally(() => setLoading(false));
  }, [open, intentoId]);

  return (
    <Modal open={open} onClose={onClose} title="Detalle del intento" size="md">
      {loading && (
        <div className="flex items-center justify-center py-10 text-slate-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && <ContenidoDetalle data={data} />}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Contenido
// ---------------------------------------------------------------------------
const ContenidoDetalle = ({ data }) => {
  const fecha = data.fecha
    ? new Date(data.fecha).toLocaleString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

  const exitoso = data.exitoso;

  return (
    <div className="space-y-5">
      {/* Banner de resultado */}
      <div
        className={`flex items-start gap-3 rounded-lg border p-4 ${
          exitoso
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}
      >
        {exitoso ? (
          <CheckCircle2 size={22} className="mt-0.5 shrink-0" />
        ) : (
          <XCircle size={22} className="mt-0.5 shrink-0" />
        )}
        <div>
          <p className="font-semibold">
            {exitoso ? 'Login exitoso' : 'Intento fallido'}
          </p>
          {!exitoso && data.motivo_fallo && (
            <p className="text-sm mt-0.5">
              Motivo:{' '}
              <code className="rounded bg-white/60 px-1.5 py-0.5 text-xs font-mono">
                {data.motivo_fallo}
              </code>
            </p>
          )}
        </div>
      </div>

      {/* Datos del intento */}
      <div className="grid gap-3 md:grid-cols-2">
        <Field icon={<UserIcon size={14} />} label="Usuario" value={data.username || '—'} />
        <Field icon={<Calendar size={14} />} label="Fecha" value={fecha} />
        <Field icon={<MapPin size={14} />} label="IP" value={data.ip || '—'} mono />
        <Field
          icon={<ShieldCheck size={14} />}
          label="ID Usuario"
          value={data.id_usuario ?? 'No vinculado'}
        />
      </div>

      {/* User agent */}
      <Field
        icon={<Monitor size={14} />}
        label="User-Agent"
        value={data.user_agent || '—'}
        small
      />

      {/* Estado actual del usuario (si existe) */}
      {data.id_usuario && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Estado actual del usuario
          </p>
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="text-slate-500">Nombre:</span>{' '}
              <b>
                {data.nombres} {data.primer_apellido}
                {data.segundo_apellido ? ` ${data.segundo_apellido}` : ''}
              </b>
            </p>
            <p>
              <span className="text-slate-500">Email:</span> {data.email || '—'}
            </p>
            <p>
              <span className="text-slate-500">Estado:</span>{' '}
              <BadgeEstado estado={data.usuario_estado} />
            </p>
            <p>
              <span className="text-slate-500">Intentos fallidos:</span>{' '}
              <b>{data.intentos_fallidos ?? 0}</b>
            </p>
            {data.bloqueado_hasta && new Date(data.bloqueado_hasta) > new Date() && (
              <p className="md:col-span-2 flex items-center gap-1 text-amber-700">
                <AlertTriangle size={13} />
                Bloqueado hasta{' '}
                {new Date(data.bloqueado_hasta).toLocaleString('es-BO')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ icon, label, value, mono = false, small = false }) => (
  <div>
    <p className="mb-1 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500">
      {icon}
      {label}
    </p>
    <p
      className={`break-words text-slate-800 ${mono ? 'font-mono text-sm' : ''} ${
        small ? 'text-xs' : 'text-sm'
      }`}
    >
      {value}
    </p>
  </div>
);

const BadgeEstado = ({ estado }) => {
  const colores = {
    ACTIVO: 'bg-emerald-100 text-emerald-700',
    INACTIVO: 'bg-slate-100 text-slate-700',
    BLOQUEADO: 'bg-red-100 text-red-700',
    ELIMINADO: 'bg-slate-200 text-slate-600',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
        colores[estado] || colores.INACTIVO
      }`}
    >
      {estado || '—'}
    </span>
  );
};