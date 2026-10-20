import { useEffect, useState } from 'react';
import { Loader2, Plus, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from './ui/Toast';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';

export const GestionRolesModal = ({ open, usuario, roles, onClose, onActualizado }) => {
  const toast = useToast();
  const [rolesActuales, setRolesActuales] = useState([]);
  const [guardando, setGuardando] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Cargar roles del usuario desde el backend al abrir el modal
  useEffect(() => {
  if (!open || !usuario?.id) return;

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await api.get(`/usuarios/${usuario.id}`);
      const rolesRaw = data.data.roles || [];

      // ⭐ Normalizar TODO a Number para evitar mismatch de tipos
      const ids = rolesRaw
        .map((r) => {
          if (typeof r === 'number') return Number(r);
          if (typeof r === 'string') return Number(r);
          if (r && typeof r === 'object' && 'id' in r) return Number(r.id);
          return null;
        })
        .filter((id) => id !== null && !Number.isNaN(id));

      console.log('🔍 Roles activos [IDs]:', ids, 'tipos:', ids.map((i) => typeof i));
      setRolesActuales(ids);
    } catch (e) {
      console.error('Error cargando roles:', e);
      const fallback = (usuario.roles || [])
        .map((r) => Number(typeof r === 'object' ? r.id : r))
        .filter((id) => !Number.isNaN(id));
      setRolesActuales(fallback);
    } finally {
      setCargando(false);
    }
  };

  cargar();
}, [open, usuario?.id]);

  if (!usuario) return null;

const tieneRol = (idRol) => rolesActuales.includes(Number(idRol));



const asignar = async (idRol) => {
  const id = Number(idRol);
  setGuardando(id);

  let exito = false;

  try {
    // 1) Asignar el rol
    await api.post(`/usuarios/${usuario.id}/roles/${id}`);
    exito = true;
    toast.success('Rol asignado');
  } catch (e) {
    toast.error(e.response?.data?.message || 'Error al asignar rol');
    setGuardando(null);
    return;
  }

  // 2) Refrescar los roles (fuera del try del POST)
  try {
    const { data } = await api.get(`/usuarios/${usuario.id}`);
    const ids = (data.data.roles || [])
      .map((r) => Number(typeof r === 'object' ? r.id : r))
      .filter((v) => !Number.isNaN(v));
    setRolesActuales(ids);
    onActualizado?.(data.data);
  } catch (e) {
    // No es un error fatal: el rol SÍ se asignó. Solo no se refrescó.
    console.warn('No se pudieron refrescar los roles:', e);
  } finally {
    setGuardando(null);
  }
};

const revocar = async (idRol) => {
  const id = Number(idRol);
  setGuardando(id);

  try {
    await api.delete(`/usuarios/${usuario.id}/roles/${id}`);
    toast.success('Rol revocado');
  } catch (e) {
    toast.error(e.response?.data?.message || 'Error al revocar rol');
    setGuardando(null);
    return;
  }

  try {
    const { data } = await api.get(`/usuarios/${usuario.id}`);
    const ids = (data.data.roles || [])
      .map((r) => Number(typeof r === 'object' ? r.id : r))
      .filter((v) => !Number.isNaN(v));
    setRolesActuales(ids);
    onActualizado?.(data.data);
  } catch (e) {
    console.warn('No se pudieron refrescar los roles:', e);
  } finally {
    setGuardando(null);
  }
};

  const soloUnRol = rolesActuales.length === 1;
  const nombreCompleto = [usuario.nombres, usuario.primer_apellido]
    .filter(Boolean)
    .join(' ');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Roles de ${nombreCompleto}`}
      size="md"
    >
      <div className="space-y-4">
        {/* Info del usuario */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="text-xs text-slate-500">Usuario</p>
          <p className="font-medium text-slate-800">
            @{usuario.username} · {usuario.email}
          </p>
        </div>

        {/* Advertencia */}
        {soloUnRol && !cargando && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              El usuario tiene <b>un solo rol</b>. Debes asignarle otro antes de revocar el actual.
            </span>
          </div>
        )}

        {/* Cargando */}
        {cargando && (
          <div className="flex items-center justify-center py-6 text-slate-500">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {/* Lista de roles */}
        {!cargando && (
          <div className="space-y-2">
  {roles.map((rol) => {
    const rolId = Number(rol.id);
    const activo = tieneRol(rolId);
    const cargandoRol = guardando === rolId;

    return (
      <div
        key={rolId}
        className={`flex items-center gap-3 rounded-lg border p-3 transition ${
          activo
            ? 'border-brand-300 bg-brand-50'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
          activo ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
        }`}>
          <ShieldCheck size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-800">
              {rol.nombre}
            </p>
            {activo && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Activo
              </span>
            )}
          </div>
          {rol.descripcion && (
            <p className="truncate text-xs text-slate-500">
              {rol.descripcion}
            </p>
          )}
        </div>

        {activo ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => revocar(rolId)}
            disabled={cargandoRol}
          >
            {cargandoRol ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            Revocar
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => asignar(rolId)}
            disabled={cargandoRol}
          >
            {cargandoRol ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Asignar
          </Button>
        )}
      </div>
    );
  })}
</div>
        )}

        {/* Resumen de roles activos */}
        {!cargando && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
    Rol activo actual
  </p>
  <div className="flex flex-wrap gap-1.5">
    {rolesActuales.length === 0 && (
      <span className="text-xs text-slate-400">Sin rol activo</span>
    )}
    {roles.filter((r) => rolesActuales.includes(Number(r.id))).map((r) => (
      <Badge key={r.id} estado="APROBADA">
        {r.nombre}
      </Badge>
    ))}
  </div>
</div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
};