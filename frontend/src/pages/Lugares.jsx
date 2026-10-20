import { useEffect, useState } from 'react';
import {
  Plus, Search, RefreshCcw, Pencil, Power, Trash2, MapPin, Loader2, Undo2,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { usePermisos } from '../hooks/usePermisos';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import { accionesDe } from '../utils/estadosMeta';

const vacio = {
  nombre: '', descripcion: '', direccion: '', piso: '',
  capacidad_maxima: '', requiere_aprobacion: true,
};

export default function Lugares() {
  const toast = useToast();
  const { tienePermiso } = usePermisos();

  const puedeCrear    = tienePermiso('lugares.crear');
  const puedeEditar   = tienePermiso('lugares.editar');
  const puedeEliminar = tienePermiso('lugares.eliminar');

  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalForm, setModalForm] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const qDebounced = useDebounce(q, 400);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/lugares', {
        params: { q: qDebounced || undefined, page, limit },
      });
      setLista(data.data.items);
      setTotal(data.data.total);
    } catch {
      toast.error('No se pudieron cargar los lugares');
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [qDebounced, page]);

  const guardar = async (datos) => {
    try {
      if (modalForm.modo === 'crear') {
        await api.post('/lugares', datos);
        toast.success('Lugar creado');
      } else {
        await api.put(`/lugares/${modalForm.data.id}`, datos);
        toast.success('Lugar actualizado');
      }
      setModalForm(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    }
  };

  const ejecutarAccion = async () => {
    const { accion, item } = confirm;
    try {
      if (accion === 'reactivar') {
        await api.patch(`/lugares/${item.id}/estado`, { estado: 'ACTIVO' });
        toast.success('Lugar reactivado');
      } else if (accion === 'toggle') {
        await api.patch(`/lugares/${item.id}/estado`, { estado: 'INACTIVO' });
        toast.success('Lugar desactivado');
      } else if (accion === 'eliminar') {
        await api.patch(`/lugares/${item.id}/estado`, { estado: 'ELIMINADO' });
        toast.success('Lugar eliminado');
      }
      setConfirm(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al procesar');
    }
  };

  const renderAcciones = (l) => {
    const acciones = accionesDe('lugar', l.estado);

    return (
      <div className="inline-flex gap-1">
        {acciones.includes('editar') && puedeEditar && (
          <button
            onClick={() => setModalForm({ modo: 'editar', data: l })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-700"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
        )}
        {acciones.includes('toggle') && puedeEliminar && (
          <button
            onClick={() => setConfirm({ accion: 'toggle', item: l })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-700"
            title="Desactivar"
          >
            <Power size={16} />
          </button>
        )}
        {acciones.includes('reactivar') && puedeEliminar && (
          <button
            onClick={() => setConfirm({ accion: 'reactivar', item: l })}
            className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            title="Reactivar"
          >
            <Undo2 size={16} />
          </button>
        )}
        {acciones.includes('eliminar') && puedeEliminar && (
          <button
            onClick={() => setConfirm({ accion: 'eliminar', item: l })}
            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        )}
        {acciones.length === 0 && <span className="text-xs text-slate-400">—</span>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Lugares de visita</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Administra las áreas donde se autorizan visitas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={cargar}>
            <RefreshCcw size={16} /> Actualizar
          </Button>
          {puedeCrear && (
            <Button onClick={() => setModalForm({ modo: 'crear' })}>
              <Plus size={16} /> Nuevo lugar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="p-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Buscar por nombre o dirección…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Lugar</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Capacidad</th>
                <th className="px-4 py-3">Aprobación</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">
                  <Loader2 className="mx-auto animate-spin" />
                </td></tr>
              )}
              {!loading && lista.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                  No hay lugares registrados.
                </td></tr>
              )}
              {!loading && lista.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-brand-700">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{l.nombre}</p>
                        {l.descripcion && (
                          <p className="text-xs text-slate-500 line-clamp-1">{l.descripcion}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {l.direccion || '—'}{l.piso ? `, Piso ${l.piso}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.capacidad_maxima || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge estado={l.requiere_aprobacion ? 'APROBADA' : 'INACTIVO'}>
                      {l.requiere_aprobacion ? 'Requiere' : 'No requiere'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge estado={l.estado} modulo="lugar" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {renderAcciones(l)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} limit={limit} total={total} onChange={setPage} />
      </Card>

      <ModalLugar
        open={!!modalForm}
        modo={modalForm?.modo}
        data={modalForm?.data}
        onClose={() => setModalForm(null)}
        onSave={guardar}
      />

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.accion === 'reactivar' ? 'Reactivar lugar' :
          confirm?.accion === 'toggle'    ? 'Desactivar lugar' :
          confirm?.accion === 'eliminar'  ? 'Eliminar lugar' :
          'Confirmar acción'
        }
        message={
          confirm?.accion === 'reactivar'
            ? `¿Reactivar "${confirm?.item?.nombre}"?`
            : confirm?.accion === 'toggle'
            ? `¿Desactivar "${confirm?.item?.nombre}"?`
            : confirm?.accion === 'eliminar'
            ? `¿Eliminar "${confirm?.item?.nombre}"? No podrás usarlo en nuevas autorizaciones.`
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

function ModalLugar({ open, modo, data, onClose, onSave }) {
  const [form, setForm] = useState(vacio);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    if (open) {
      setForm(modo === 'editar' && data ? {
        nombre: data.nombre || '',
        descripcion: data.descripcion || '',
        direccion: data.direccion || '',
        piso: data.piso || '',
        capacidad_maxima: data.capacidad_maxima ?? '',
        requiere_aprobacion: data.requiere_aprobacion ?? true,
      } : vacio);
      setErrores({});
    }
  }, [open, modo, data]);

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    setErrores(errs);
    if (Object.keys(errs).length) return;

    onSave({
      ...form,
      capacidad_maxima: form.capacidad_maxima ? Number(form.capacidad_maxima) : null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modo === 'editar' ? 'Editar lugar' : 'Nuevo lugar'}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Nombre *"
          value={form.nombre}
          error={errores.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
        />
        <Textarea
          label="Descripción"
          rows={2}
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <Input
              label="Dirección"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
          <Input
            label="Piso"
            value={form.piso}
            onChange={(e) => setForm({ ...form, piso: e.target.value })}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Capacidad máxima"
            type="number"
            min="1"
            value={form.capacidad_maxima}
            onChange={(e) => setForm({ ...form, capacidad_maxima: e.target.value })}
          />
          <Select
            label="Requiere aprobación"
            value={form.requiere_aprobacion ? 'si' : 'no'}
            onChange={(e) => setForm({ ...form, requiere_aprobacion: e.target.value === 'si' })}
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </Select>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{modo === 'editar' ? 'Guardar cambios' : 'Crear lugar'}</Button>
        </div>
      </form>
    </Modal>
  );
}