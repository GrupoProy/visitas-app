import { useEffect, useState } from 'react';
import {
  Plus, Search, RefreshCcw, Pencil, Power, Trash2, User, Loader2,
  Mail, Phone, Building2, UserCheck, AlertTriangle, Undo2,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { usePermisos } from '../hooks/usePermisos';
import { useParametros } from '../hooks/useParametros';
import { validarTelefono, validarDocumento } from '../utils/validaciones';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import { accionesDe } from '../utils/estadosMeta';
import { usePageSize } from '../hooks/usePageSize';

const vacio = {
  tipo_documento: 'CI',
  numero_documento: '',
  nombres: '',
  primer_apellido: '',
  segundo_apellido: '',
  email: '',
  telefono: '',
  procedencia: '',
  es_anfitrion: false,
};

const nombreCompleto = (p) =>
  [p?.nombres, p?.primer_apellido, p?.segundo_apellido].filter(Boolean).join(' ');

// =============================================================================
export default function Personas() {
  const toast = useToast();
  const { tienePermiso } = usePermisos();

  const puedeCrear    = tienePermiso('personas.crear');
  const puedeEditar   = tienePermiso('personas.editar');
  const puedeEliminar = tienePermiso('personas.eliminar');

  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = usePageSize();
  const [q, setQ] = useState('');
  const [soloAnfitriones, setSoloAnfitriones] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalForm, setModalForm] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const qDebounced = useDebounce(q, 400);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/personas', {
        params: {
          q: qDebounced || undefined,
          es_anfitrion: soloAnfitriones || undefined,
          page, limit,
        },
      });
      setLista(data.data.items);
      setTotal(data.data.total);
    } catch {
      toast.error('No se pudieron cargar las personas');
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [qDebounced, page, soloAnfitriones]);

  const guardar = async (datos) => {
    try {
      if (modalForm.modo === 'crear') {
        await api.post('/personas', datos);
        toast.success('Persona creada');
      } else {
        await api.put(`/personas/${modalForm.data.id}`, datos);
        toast.success('Persona actualizada');
      }
      setModalForm(null);
      cargar();
      return { ok: true };
    } catch (e) {
      const status = e.response?.status;
      const mensaje = e.response?.data?.message || 'Error al guardar';

      if (status === 409) {
        toast.error('Ese documento ya está registrado');
        return { ok: false, duplicado: e.response.data.data };
      }

      toast.error(mensaje);
      return { ok: false };
    }
  };

  const ejecutarAccion = async () => {
    const { accion, item } = confirm;
    try {
      if (accion === 'reactivar') {
        await api.patch(`/personas/${item.id}/estado`, { estado: 'ACTIVO' });
        toast.success('Persona reactivada');
      } else if (accion === 'toggle') {
        await api.patch(`/personas/${item.id}/estado`, { estado: 'INACTIVO' });
        toast.success('Persona desactivada');
      } else if (accion === 'eliminar') {
        await api.patch(`/personas/${item.id}/estado`, { estado: 'ELIMINADO' });
        toast.success('Persona eliminada');
      }
      setConfirm(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al procesar');
    }
  };

  const renderAcciones = (p) => {
    const acciones = accionesDe('persona', p.estado);

    return (
      <div className="inline-flex gap-1">
        {acciones.includes('editar') && puedeEditar && (
          <button
            onClick={() => setModalForm({ modo: 'editar', data: p })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
        )}

        {acciones.includes('toggle') && puedeEliminar && (
          <button
            onClick={() => setConfirm({ accion: 'toggle', item: p })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-700"
            title="Desactivar"
          >
            <Power size={16} />
          </button>
        )}

        {acciones.includes('reactivar') && puedeEliminar && (
          <button
            onClick={() => setConfirm({ accion: 'reactivar', item: p })}
            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            title="Reactivar"
          >
            <Undo2 size={16} />
          </button>
        )}

        {acciones.includes('eliminar') && puedeEliminar && (
          <button
            onClick={() => setConfirm({ accion: 'eliminar', item: p })}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Personas</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Registro único de visitantes y anfitriones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={cargar}>
            <RefreshCcw size={16} /> Actualizar
          </Button>
          {puedeCrear && (
            <Button onClick={() => setModalForm({ modo: 'crear' })}>
              <Plus size={16} /> Nueva persona
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Buscar por nombre, apellido, documento o email…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={soloAnfitriones}
              onChange={(e) => { setSoloAnfitriones(e.target.checked); setPage(1); }}
            />
            <UserCheck size={16} className="text-brand-600" />
            Solo anfitriones
          </label>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Persona</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Procedencia</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">
                  <Loader2 className="mx-auto animate-spin" />
                </td></tr>
              )}
              {!loading && lista.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500">
                  No hay personas registradas.
                </td></tr>
              )}
              {!loading && lista.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {p.nombres?.[0]}{p.primer_apellido?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{nombreCompleto(p)}</p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                          <User size={11} /> ID #{p.id}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-slate-600">{p.tipo_documento}</p>
                    <p className="text-sm text-slate-800">{p.numero_documento}</p>
                  </td>
                  <td className="px-4 py-3">
                    {p.email && (
                      <p className="flex items-center gap-1 text-xs text-slate-600">
                        <Mail size={11} /> {p.email}
                      </p>
                    )}
                    {p.telefono && (
                      <p className="flex items-center gap-1 text-xs text-slate-600">
                        <Phone size={11} /> {p.telefono}
                      </p>
                    )}
                    {!p.email && !p.telefono && <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.procedencia ? (
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <Building2 size={11} /> {p.procedencia}
                      </span>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.es_anfitrion ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
                        <UserCheck size={11} /> Anfitrión
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Visitante</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge estado={p.estado} modulo="persona" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {renderAcciones(p)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} limit={limit} total={total} onChange={setPage} />
      </Card>

      <ModalPersona
        open={!!modalForm}
        modo={modalForm?.modo}
        data={modalForm?.data}
        onClose={() => setModalForm(null)}
        onSave={guardar}
      />

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.accion === 'reactivar' ? 'Reactivar persona' :
          confirm?.accion === 'toggle'    ? 'Desactivar persona' :
          confirm?.accion === 'eliminar'  ? 'Eliminar persona' :
          'Confirmar acción'
        }
        message={
          confirm?.accion === 'reactivar'
            ? `¿Reactivar a "${nombreCompleto(confirm?.item)}"?`
            : confirm?.accion === 'toggle'
            ? `¿Desactivar a "${nombreCompleto(confirm?.item)}"?`
            : confirm?.accion === 'eliminar'
            ? `¿Eliminar a "${nombreCompleto(confirm?.item)}"?`
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
    </div>
  );
}

// =============================================================================
// Modal con validaciones y alerta de duplicado
// =============================================================================
function ModalPersona({ open, modo, data, onClose, onSave }) {
  const [form, setForm] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [alertaDuplicado, setAlertaDuplicado] = useState(null);
  const { parametros: cfg } = useParametros();

  const cfgSafe = {
    TELEFONO_LONGITUD: cfg.TELEFONO_LONGITUD || 7,
    DOCUMENTO_LONGITUD_MIN: cfg.DOCUMENTO_LONGITUD_MIN || 5,
    DOCUMENTO_LONGITUD_MAX: cfg.DOCUMENTO_LONGITUD_MAX || 10,
  };

  useEffect(() => {
    if (open) {
      setForm(modo === 'editar' && data ? {
        tipo_documento: data.tipo_documento,
        numero_documento: data.numero_documento,
        nombres: data.nombres || '',
        primer_apellido: data.primer_apellido || '',
        segundo_apellido: data.segundo_apellido || '',
        email: data.email || '',
        telefono: data.telefono || '',
        procedencia: data.procedencia || '',
        es_anfitrion: !!data.es_anfitrion,
      } : vacio);
      setErrores({});
      setAlertaDuplicado(null);
    }
  }, [open, modo, data]);

  const setCampo = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrores((e) => ({ ...e, [k]: undefined }));
    if (k === 'numero_documento' || k === 'tipo_documento') {
      setAlertaDuplicado(null);
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    const errs = {};
    const errDoc = validarDocumento(
      form.numero_documento,
      cfgSafe.DOCUMENTO_LONGITUD_MIN,
      cfgSafe.DOCUMENTO_LONGITUD_MAX
    );
    if (errDoc) errs.numero_documento = errDoc;

    const errTel = validarTelefono(form.telefono, cfgSafe.TELEFONO_LONGITUD);
    if (errTel) errs.telefono = errTel;

    if (!form.nombres.trim()) errs.nombres = 'Requerido';
    if (!form.primer_apellido.trim()) errs.primer_apellido = 'Requerido';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Email inválido';

    setErrores(errs);
    if (Object.keys(errs).length) return;

    const resultado = await onSave({
      ...form,
      numero_documento: form.numero_documento.trim().toUpperCase(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
    });

    if (resultado?.duplicado) {
      setAlertaDuplicado(resultado.duplicado);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modo === 'editar' ? 'Editar persona' : 'Nueva persona'}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        {alertaDuplicado && (
          <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-900">Persona ya registrada</h4>
                <p className="mt-0.5 text-xs text-amber-800">
                  El documento <b>{form.tipo_documento} {form.numero_documento}</b> ya pertenece a:
                </p>
                <div className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-800 ring-1 ring-amber-200">
                  <p className="font-medium">{nombreCompleto(alertaDuplicado)}</p>
                  {alertaDuplicado.email && (
                    <p className="text-xs text-slate-600">{alertaDuplicado.email}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          <Select
            label="Tipo de documento *"
            value={form.tipo_documento}
            onChange={(e) => setCampo('tipo_documento', e.target.value)}
          >
            <option>CI</option>
            <option>PASAPORTE</option>
          </Select>
          <div className="md:col-span-2">
            <Input
              label="Número de documento *"
              value={form.numero_documento}
              error={errores.numero_documento || (alertaDuplicado ? 'Documento ya registrado' : '')}
              maxLength={cfgSafe.DOCUMENTO_LONGITUD_MAX}
              placeholder={`${cfgSafe.DOCUMENTO_LONGITUD_MIN}–${cfgSafe.DOCUMENTO_LONGITUD_MAX} caracteres`}
              onChange={(e) => setCampo('numero_documento', e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Nombres *" value={form.nombres} error={errores.nombres}
                 onChange={(e) => setCampo('nombres', e.target.value.toUpperCase())} />
          <Input label="Primer apellido *" value={form.primer_apellido} error={errores.primer_apellido}
                 onChange={(e) => setCampo('primer_apellido', e.target.value.toUpperCase())} />
          <Input label="Segundo apellido" value={form.segundo_apellido}
                 onChange={(e) => setCampo('segundo_apellido', e.target.value.toUpperCase())} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Email" type="email" value={form.email} error={errores.email}
                 placeholder="nombre@dominio.com"
                 onChange={(e) => setCampo('email', e.target.value)} />
          <Input
            label={`Teléfono (${cfgSafe.TELEFONO_LONGITUD} dígitos)`}
            value={form.telefono}
            error={errores.telefono}
            maxLength={cfgSafe.TELEFONO_LONGITUD}
            inputMode="numeric"
            placeholder={`${cfgSafe.TELEFONO_LONGITUD} dígitos`}
            onChange={(e) => {
              const limpio = e.target.value.replace(/\D/g, '').slice(0, cfgSafe.TELEFONO_LONGITUD);
              setCampo('telefono', limpio);
            }}
          />
          <Input label="Procedencia" value={form.procedencia}
                 onChange={(e) => setCampo('procedencia', e.target.value)} />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={form.es_anfitrion}
            onChange={(e) => setCampo('es_anfitrion', e.target.checked)}
          />
          <div className="text-sm">
            <p className="font-medium text-slate-800">Es anfitrión</p>
            <p className="text-xs text-slate-500">
              Marca esta casilla si la persona puede recibir visitas dentro de las instalaciones.
            </p>
          </div>
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={!!alertaDuplicado}>
            {modo === 'editar' ? 'Guardar cambios' : 'Crear persona'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}