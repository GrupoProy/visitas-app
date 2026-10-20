import { useEffect, useState } from 'react';
import {
  Plus, Search, RefreshCcw, Pencil, Power, Trash2, KeyRound,
  ShieldCheck, Loader2, UserCheck, Undo2, AlertTriangle, Check, Copy,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { usePermisos } from '../hooks/usePermisos';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import { PersonaCombo } from '../components/ui/PersonaCombo';
import { GestionRolesModal } from '../components/GestionRolesModal';
import { accionesDe } from '../utils/estadosMeta';
import { usePageSize } from '../hooks/usePageSize';


// ---------------------------------------------------------------------------
// Política de contraseñas
// ---------------------------------------------------------------------------
const SIMBOLO_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

const evaluarPassword = (password = '') => ({
  longitud:  password.length >= 8,
  mayuscula: /[A-Z]/.test(password),
  minuscula: /[a-z]/.test(password),
  numero:    /\d/.test(password),
  simbolo:   SIMBOLO_REGEX.test(password),
});

const cumplePolitica = (password) => {
  const c = evaluarPassword(password);
  return c.longitud && c.mayuscula && c.minuscula && c.numero && c.simbolo;
};

const REQUISITOS = [
  { key: 'longitud',  texto: 'Mínimo 8 caracteres' },
  { key: 'mayuscula', texto: 'Al menos una mayúscula' },
  { key: 'minuscula', texto: 'Al menos una minúscula' },
  { key: 'numero',    texto: 'Al menos un número' },
  { key: 'simbolo',   texto: 'Al menos un símbolo' },
];

const vacio = {
  username: '',
  email: '',
  password: '',
  nombres: '',
  primer_apellido: '',
  segundo_apellido: '',
  telefono: '',
  id_persona: '',
  roles: [],
};

// =============================================================================
// Página principal
// =============================================================================
export default function Usuarios() {
  const toast = useToast();
  const { usuario: currentUser, refrescarUsuario } = useAuth();
  const { tienePermiso } = usePermisos();

  const puedeCrear         = tienePermiso('usuarios.crear');
  const puedeEditar        = tienePermiso('usuarios.editar');
  const puedeCambiarEstado = tienePermiso('usuarios.cambiar_estado');
  const puedeResetearPass  = tienePermiso('usuarios.resetear_password');

  const [lista, setLista] = useState([]);
  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
   const limit = usePageSize();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalForm, setModalForm] = useState(null);
  const [modalRoles, setModalRoles] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Reset de contraseña
  const [resetTarget, setResetTarget] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  const qDebounced = useDebounce(q, 400);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/usuarios', {
        params: { q: qDebounced || undefined, page, limit },
      });
      setLista(data.data.items);
      setTotal(data.data.total);
    } catch {
      toast.error('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/roles').then((r) => setRoles(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [qDebounced, page]);

  // -------------------------------------------------------------------
  // Crear / editar
  // -------------------------------------------------------------------
  const guardar = async (datos) => {
    try {
      if (modalForm.modo === 'crear') {
        await api.post('/usuarios', datos);
        toast.success('Usuario creado');
      } else {
        const payload = { ...datos };
        delete payload.password;
        await api.put(`/usuarios/${modalForm.data.id}`, payload);
        toast.success('Usuario actualizado');
      }
      setModalForm(null);
      cargar();
    } catch (e) {
      const detalles = e.response?.data?.detalles;
      if (Array.isArray(detalles) && detalles.length > 0) {
        toast.error(detalles.join(' '));
      } else {
        toast.error(e.response?.data?.message || 'Error al guardar');
      }
    }
  };

  // -------------------------------------------------------------------
  // Cambiar estado
  // -------------------------------------------------------------------
  const ejecutarAccion = async () => {
    const { accion, item } = confirm || {};
    try {
      if (accion === 'reactivar') {
        await api.patch(`/usuarios/${item.id}/estado`, { estado: 'ACTIVO' });
        toast.success('Usuario reactivado');
      } else if (accion === 'toggle') {
        await api.patch(`/usuarios/${item.id}/estado`, { estado: 'INACTIVO' });
        toast.success('Usuario desactivado');
      } else if (accion === 'eliminar') {
        await api.patch(`/usuarios/${item.id}/estado`, { estado: 'ELIMINADO' });
        toast.success('Usuario eliminado');
      }
      setConfirm(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al procesar');
    }
  };

  // -------------------------------------------------------------------
  // Resetear contraseña
  // -------------------------------------------------------------------
  const ejecutarReset = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    try {
      const { data } = await api.post(`/usuarios/${resetTarget.id}/resetear-password`);
      setResetResult({
        passwordTemporal: data.data.passwordTemporal,
        usuario: resetTarget,
      });
      setResetTarget(null);
      toast.success('Contraseña reseteada. Anotá la temporal.');
      await cargar();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al resetear contraseña');
    } finally {
      setResetLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // Abrir modal de roles con datos frescos
  // -------------------------------------------------------------------
  const abrirModalRoles = async (u) => {
    try {
      const { data } = await api.get(`/usuarios/${u.id}`);
      setModalRoles(data.data);
    } catch {
      setModalRoles(u);
    }
  };

  // -------------------------------------------------------------------
  // Render de acciones por fila
  // -------------------------------------------------------------------
  const renderAcciones = (u) => {
    const acciones = accionesDe('usuario', u.estado);
    const esMiCuenta = Number(u.id) === Number(currentUser?.id);

    return (
      <div className="inline-flex gap-1">
        {acciones.includes('resetear_password') && puedeResetearPass && !esMiCuenta && (
          <button
            onClick={() => setResetTarget(u)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-700"
            title="Resetear contraseña"
          >
            <KeyRound size={16} />
          </button>
        )}

        {acciones.includes('editar') && puedeEditar && (
          <button
            onClick={() => setModalForm({ modo: 'editar', data: u })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
        )}

        {acciones.includes('editar') && puedeEditar && (
          <button
            onClick={() => abrirModalRoles(u)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
            title="Gestionar roles"
          >
            <ShieldCheck size={16} />
          </button>
        )}

        {acciones.includes('reactivar') && puedeCambiarEstado && !esMiCuenta && (
          <button
            onClick={() => setConfirm({ accion: 'reactivar', item: u })}
            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            title="Reactivar"
          >
            <Undo2 size={16} />
          </button>
        )}

        {acciones.includes('toggle') && puedeCambiarEstado && !esMiCuenta && (
          <button
            onClick={() => setConfirm({ accion: 'toggle', item: u })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-700"
            title="Desactivar"
          >
            <Power size={16} />
          </button>
        )}

        {acciones.includes('eliminar') && puedeCambiarEstado && !esMiCuenta && (
          <button
            onClick={() => setConfirm({ accion: 'eliminar', item: u })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        )}

        {acciones.length === 0 && (
          <span className="text-xs text-slate-400">—</span>
        )}
      </div>
    );
  };

  // ===================================================================
  // Render
  // ===================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Usuarios</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Gestiona usuarios del sistema, sus roles y la persona vinculada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={cargar}>
            <RefreshCcw size={16} /> Actualizar
          </Button>
          {puedeCrear && (
            <Button onClick={() => setModalForm({ modo: 'crear' })}>
              <Plus size={16} /> Nuevo usuario
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="p-4">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Buscar por username, email o nombre…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Persona vinculada</th>
                <th className="px-4 py-3">Último acceso</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan="6" className="px-4 py-10 text-center text-slate-500">
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && lista.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
              {!loading && lista.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {u.nombres?.[0]}{u.primer_apellido?.[0]}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-800">
                            {u.nombres} {u.primer_apellido}
                          </p>
                          {u.debe_cambiar_password && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700"
                              title="Debe cambiar su contraseña en el próximo login"
                            >
                              <KeyRound size={10} />
                              Cambio pendiente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          @{u.username} · {u.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 && (
                        <span className="text-xs text-slate-400">Sin roles</span>
                      )}
                      {u.roles.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                        >
                          <ShieldCheck size={11} /> {r.nombre}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {u.persona ? (
                      <div className="flex items-center gap-1.5">
                        <UserCheck size={13} className="text-brand-600" />
                        <div>
                          <p className="text-xs font-medium text-slate-800">
                            {u.persona.nombres} {u.persona.primer_apellido}
                            {u.persona.segundo_apellido ? ` ${u.persona.segundo_apellido}` : ''}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {u.persona.numero_documento}
                            {u.persona.es_anfitrion && ' · Anfitrión'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">— Sin vincular —</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-xs text-slate-600">
                    {u.ultimo_acceso
                      ? new Date(u.ultimo_acceso).toLocaleString('es-BO')
                      : '—'}
                  </td>

                  <td className="px-4 py-3">
                    <Badge estado={u.estado} modulo="usuario" />
                  </td>

                  <td className="px-4 py-3 text-right">
                    {renderAcciones(u)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} limit={limit} total={total} onChange={setPage} />
      </Card>

      {/* Modal crear/editar */}
      <ModalUsuario
        open={!!modalForm}
        modo={modalForm?.modo}
        data={modalForm?.data}
        roles={roles}
        onClose={() => setModalForm(null)}
        onSave={guardar}
      />

      {/* Modal gestión de roles */}
      <GestionRolesModal
        open={!!modalRoles}
        usuario={modalRoles}
        roles={roles}
        onClose={() => setModalRoles(null)}
        onActualizado={(usuarioActualizado) => {
          try {
            cargar();
            if (usuarioActualizado?.id === currentUser?.id) {
              refrescarUsuario?.();
            }
          } catch (e) {
            console.warn('Error refrescando la UI:', e);
          }
        }}
      />

      {/* Confirmación cambio de estado */}
      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.accion === 'reactivar' ? 'Reactivar usuario' :
          confirm?.accion === 'toggle'    ? 'Desactivar usuario' :
          confirm?.accion === 'eliminar'  ? 'Eliminar usuario' :
          'Confirmar acción'
        }
        message={
          confirm?.accion === 'reactivar'
            ? `¿Reactivar a @${confirm?.item?.username}? Deberás asignarle un rol activo.`
            : confirm?.accion === 'toggle'
            ? `¿Desactivar a @${confirm?.item?.username}? Sus roles también serán inactivados.`
            : confirm?.accion === 'eliminar'
            ? `¿Eliminar a @${confirm?.item?.username}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel={
          confirm?.accion === 'reactivar' ? 'Reactivar' :
          confirm?.accion === 'toggle'    ? 'Desactivar' :
          confirm?.accion === 'eliminar'  ? 'Eliminar' :
          'Confirmar'
        }
        variant={confirm?.accion === 'reactivar' ? 'success' : 'danger'}
        onClose={() => setConfirm(null)}
        onConfirm={ejecutarAccion}
      />

      {/* Confirmación reset de contraseña */}
      <ConfirmDialog
        open={!!resetTarget}
        title="Resetear contraseña"
        message={
          resetTarget
            ? `¿Resetear la contraseña de ${resetTarget.nombres} ${resetTarget.primer_apellido} (@${resetTarget.username})?` +
              `\n\nSe generará una contraseña temporal. El usuario deberá cambiarla en su próximo login.` +
              (resetTarget.sesiones_activas > 0
                ? `\n\n⚠️ Tiene ${resetTarget.sesiones_activas} sesión(es) activa(s). Se cerrarán automáticamente.`
                : '')
            : ''
        }
        onClose={() => !resetLoading && setResetTarget(null)}
        onConfirm={ejecutarReset}
      />

      {/* Modal contraseña temporal */}
      <Modal
        open={!!resetResult}
        onClose={() => setResetResult(null)}
        title="Contraseña temporal generada"
        size="sm"
      >
        {resetResult && (
          <ModalPasswordTemporal
            resultado={resetResult}
            onClose={() => setResetResult(null)}
          />
        )}
      </Modal>
    </div>
  );
}

// =============================================================================
// Modal de usuario (crear / editar)
// =============================================================================
function ModalUsuario({ open, modo, data, roles, onClose, onSave }) {
  const [form, setForm] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [personas, setPersonas] = useState([]);
  const [cargandoPersonas, setCargandoPersonas] = useState(false);

  const rolAnfitrion = roles.find((r) => r.nombre === 'ANFITRION');
  const requierePersona = rolAnfitrion ? form.roles.includes(rolAnfitrion.id) : false;

  const evalPass = evaluarPassword(form.password);
  const passOk = cumplePolitica(form.password);

  useEffect(() => {
    if (!open) return;
    setCargandoPersonas(true);
    const params = modo === 'editar' && data?.id ? { usuario_id: data.id } : {};
    api.get('/personas/disponibles-usuario', { params })
      .then((r) => setPersonas(r.data.data))
      .catch(() => setPersonas([]))
      .finally(() => setCargandoPersonas(false));
  }, [open, modo, data]);

  useEffect(() => {
    if (open) {
      setForm(
        modo === 'editar' && data
          ? {
              username: data.username,
              email: data.email,
              password: '',
              nombres: data.nombres || '',
              primer_apellido: data.primer_apellido || '',
              segundo_apellido: data.segundo_apellido || '',
              telefono: data.telefono || '',
              id_persona: data.id_persona || '',
              roles: (data.roles || []).map((r) => r.id),
            }
          : vacio
      );
      setErrores({});
    }
  }, [open, modo, data]);

  const setCampo = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => ({ ...e, [k]: undefined }));
  };

  const toggleRol = (id) => {
    // Regla: un solo rol activo
    setForm((f) => ({ ...f, roles: f.roles.includes(id) ? [] : [id] }));
    setErrores((e) => ({ ...e, roles: undefined, id_persona: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};

    if (!form.username.trim()) errs.username = 'Requerido';
    if (!form.email.trim()) errs.email = 'Requerido';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Email inválido';
    if (!form.nombres.trim()) errs.nombres = 'Requerido';
    if (!form.primer_apellido.trim()) errs.primer_apellido = 'Requerido';

    if (modo === 'crear' && !passOk) {
      errs.password = 'Debe cumplir la política';
    }

    if (requierePersona && !form.id_persona) {
      errs.id_persona = 'Obligatorio para usuarios con rol ANFITRION';
    }

    setErrores(errs);
    if (Object.keys(errs).length) return;

    onSave({
      ...form,
      id_persona: form.id_persona ? Number(form.id_persona) : null,
    });
  };

  const esEditar = modo === 'editar';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEditar ? 'Editar usuario' : 'Nuevo usuario'}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Username *"
            value={form.username}
            error={errores.username}
            onChange={(e) => setCampo('username', e.target.value)}
          />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            error={errores.email}
            onChange={(e) => setCampo('email', e.target.value)}
          />
        </div>

        {!esEditar && (
          <>
            <Input
              label="Contraseña inicial *"
              type="password"
              value={form.password}
              error={errores.password}
              onChange={(e) => setCampo('password', e.target.value)}
            />

            <ul className="rounded-lg bg-slate-50 px-3 py-2 text-xs space-y-0.5">
              {REQUISITOS.map((r) => {
                const ok = evalPass[r.key];
                return (
                  <li key={r.key} className={ok ? 'text-emerald-700' : 'text-slate-600'}>
                    {ok ? '✓' : '○'} {r.texto}
                  </li>
                );
              })}
            </ul>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              Al crear el usuario se le pedirá que cambie esta contraseña en su
              primer inicio de sesión.
            </div>
          </>
        )}

        {esEditar && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Para cambiar la contraseña, usá la acción <b>Resetear contraseña</b> en la lista.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Nombres *" value={form.nombres} error={errores.nombres}
                 onChange={(e) => setCampo('nombres', e.target.value.toUpperCase())} />
          <Input label="Primer apellido *" value={form.primer_apellido} error={errores.primer_apellido}
                 onChange={(e) => setCampo('primer_apellido', e.target.value.toUpperCase())} />
          <Input label="Segundo apellido" value={form.segundo_apellido}
                 onChange={(e) => setCampo('segundo_apellido', e.target.value.toUpperCase())} />
        </div>

        <Input label="Teléfono" value={form.telefono}
               onChange={(e) => setCampo('telefono', e.target.value)} />

        <div>
          {cargandoPersonas ? (
            <div className="flex h-[42px] items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Cargando personas…
            </div>
          ) : (
            <PersonaCombo
              label="Persona vinculada"
              value={form.id_persona || ''}
              onChange={(id) => setCampo('id_persona', id ? Number(id) : '')}
              personas={personas}
              placeholder="Buscar persona por nombre, documento o procedencia…"
              error={errores.id_persona}
            />
          )}
          <p className="mt-1 text-xs text-slate-500">
            Obligatorio si el usuario tendrá el rol <b>ANFITRION</b>.
          </p>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            Rol {requierePersona && <span className="text-amber-700">(requiere persona vinculada)</span>}
          </span>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => {
              const activo = form.roles.includes(r.id);
              const esAnfitrion = r.nombre === 'ANFITRION';
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRol(r.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    activo
                      ? esAnfitrion
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {r.nombre}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Un usuario solo puede tener un rol activo.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {esEditar ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// =============================================================================
// Modal: contraseña temporal
// =============================================================================
function ModalPasswordTemporal({ resultado, onClose }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resultado.passwordTemporal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { setCopiado(false); }
  };

  const nombre = `${resultado.usuario.nombres} ${resultado.usuario.primer_apellido}`;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
        <div className="text-sm text-amber-900">
          <p className="font-semibold">Anotá esta contraseña ahora</p>
          <p className="mt-1">
            <b>NO</b> se mostrará nuevamente. El usuario <b>{nombre}</b> deberá cambiarla en su próximo login.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
          Contraseña temporal
        </p>
        <div className="flex items-center justify-between gap-3">
          <code className="select-all break-all font-mono text-lg font-semibold text-slate-800">
            {resultado.passwordTemporal}
          </code>
          <button
            type="button"
            onClick={copiar}
            className={`flex shrink-0 items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition ${
              copiado
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {copiado ? <Check size={14} /> : <Copy size={14} />}
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onClose}>
          <Check size={16} /> Copié la contraseña
        </Button>
      </div>
    </div>
  );
}