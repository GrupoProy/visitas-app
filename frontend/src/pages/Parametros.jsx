import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, RefreshCcw, Pencil, Power, Trash2, Loader2,
  Settings2, Lock, Globe, Filter, Undo2,
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
import { useDebounce } from '../hooks/useDebounce';
import { accionesDe } from '../utils/estadosMeta';

const vacio = {
  clave: '',
  valor: '',
  tipo_dato: 'STRING',
  grupo: 'GENERAL',
  descripcion: '',
  es_editable: true,
  es_publico: false,
};

const TIPOS = ['STRING', 'INT', 'BOOLEAN', 'JSON', 'DATE'];
const GRUPOS_BASE = ['GENERAL', 'SEGURIDAD', 'VISITAS', 'ESTADOS', 'SISTEMA', 'AUDITORIA', 'UI'];

// =============================================================================
// Página principal
// =============================================================================
export default function Parametros() {
  const toast = useToast();
  const { tienePermiso } = usePermisos();

  const puedeCrear    = tienePermiso('parametros.crear');
  const puedeEditar   = tienePermiso('parametros.editar');
  const puedeEliminar = tienePermiso('parametros.eliminar');

  const [lista, setLista] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const qDebounced = useDebounce(q, 400);

  const [modalForm, setModalForm] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [valorVer, setValorVer] = useState(null);

  useEffect(() => {
    api.get('/parametros/grupos').then((r) => setGrupos(r.data.data)).catch(() => {});
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/parametros', {
        params: { q: qDebounced || undefined, grupo: grupoFiltro || undefined },
      });
      setLista(data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron cargar los parámetros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [qDebounced, grupoFiltro]);

  const guardar = async (datos) => {
    try {
      if (modalForm.modo === 'crear') {
        await api.post('/parametros', datos);
        toast.success('Parámetro creado');
      } else {
        await api.put(`/parametros/${modalForm.data.id}`, datos);
        toast.success('Parámetro actualizado');
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
        await api.patch(`/parametros/${item.id}/estado`, { estado: 'ACTIVO' });
        toast.success('Parámetro reactivado');
      } else if (accion === 'toggle') {
        await api.patch(`/parametros/${item.id}/estado`, { estado: 'INACTIVO' });
        toast.success('Parámetro desactivado');
      } else if (accion === 'eliminar') {
        await api.patch(`/parametros/${item.id}/estado`, { estado: 'ELIMINADO' });
        toast.success('Parámetro eliminado');
      }
      setConfirm(null);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al procesar');
    }
  };

  const porGrupo = useMemo(() => {
    return lista.reduce((acc, p) => {
      (acc[p.grupo] ||= []).push(p);
      return acc;
    }, {});
  }, [lista]);

  const gruposDisponibles = useMemo(() => {
    const set = new Set([...GRUPOS_BASE, ...grupos]);
    return [...set].sort();
  }, [grupos]);

  const totalParams = lista.length;

  // ===================================================================
  // Render de acciones por fila
  // ===================================================================
  const renderAcciones = (p) => {
    const acciones = accionesDe('parametro', p.estado);

    return (
      <div className="inline-flex gap-1">
        {acciones.includes('editar') && p.es_editable && puedeEditar && (
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

  // ===================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <Settings2 size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Parámetros del sistema</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Configuración dinámica aplicada en toda la aplicación.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={cargar}>
            <RefreshCcw size={16} /> Actualizar
          </Button>
          {puedeCrear && (
            <Button onClick={() => setModalForm({ modo: 'crear' })}>
              <Plus size={16} /> Nuevo parámetro
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_240px_auto]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Buscar por clave o descripción…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              value={grupoFiltro}
              onChange={(e) => setGrupoFiltro(e.target.value)}
            >
              <option value="">Todos los grupos</option>
              {gruposDisponibles.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {totalParams} parámetro{totalParams !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </Card>

      {/* Cargando */}
      {loading && (
        <Card>
          <div className="p-10 text-center">
            <Loader2 className="mx-auto animate-spin text-slate-400" />
          </div>
        </Card>
      )}

      {/* Sin resultados */}
      {!loading && Object.keys(porGrupo).length === 0 && (
        <Card>
          <div className="p-12 text-center text-slate-500">
            <Settings2 size={32} className="mx-auto mb-3 text-slate-300" />
            <p>No hay parámetros para mostrar.</p>
          </div>
        </Card>
      )}

      {/* Grupos */}
      {!loading && Object.entries(porGrupo).map(([grupo, items]) => (
        <Card key={grupo} className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-brand-50 text-xs font-bold text-brand-700">
                {items.length}
              </span>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                {grupo}
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '18%' }} />
              </colgroup>

              <thead>
                <tr className="border-b border-slate-200 bg-white text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Clave</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Flags</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 align-top">
                      <p className="truncate font-mono text-xs font-semibold text-slate-800" title={p.clave}>
                        {p.clave}
                      </p>
                      {p.descripcion && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500" title={p.descripcion}>
                          {p.descripcion}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <ValorCelda parametro={p} onVer={() => setValorVer(p)} />
                    </td>

                    <td className="px-4 py-3 align-top">
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {p.tipo_dato}
                      </span>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-1">
                        {!p.es_editable && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            <Lock size={10} /> Solo lectura
                          </span>
                        )}
                        {p.es_publico && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                            <Globe size={10} /> Público
                          </span>
                        )}
                        {p.es_editable && !p.es_publico && (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <Badge estado={p.estado} modulo="parametro" />
                    </td>

                    <td className="px-4 py-3 align-top text-right">
                      {renderAcciones(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {/* Modal crear/editar */}
      <ModalParametro
        open={!!modalForm}
        modo={modalForm?.modo}
        data={modalForm?.data}
        grupos={gruposDisponibles}
        onClose={() => setModalForm(null)}
        onSave={guardar}
      />

      {/* Confirmación */}
      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.accion === 'eliminar'  ? 'Eliminar parámetro' :
          confirm?.accion === 'reactivar' ? 'Reactivar parámetro' :
          'Desactivar parámetro'
        }
        message={
          confirm?.accion === 'eliminar'
            ? `¿Eliminar "${confirm?.item?.clave}"? Dejará de estar disponible.`
            : confirm?.accion === 'reactivar'
            ? `¿Reactivar "${confirm?.item?.clave}"?`
            : `¿Desactivar "${confirm?.item?.clave}"?`
        }
        confirmLabel={
          confirm?.accion === 'eliminar'  ? 'Eliminar' :
          confirm?.accion === 'reactivar' ? 'Reactivar' :
          'Desactivar'
        }
        variant={confirm?.accion === 'reactivar' ? 'success' : 'danger'}
        onClose={() => setConfirm(null)}
        onConfirm={ejecutarAccion}
      />

      {/* Modal ver valor */}
      <Modal
        open={!!valorVer}
        onClose={() => setValorVer(null)}
        title={valorVer?.clave || 'Valor del parámetro'}
        size="lg"
      >
        {valorVer && (
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Clave</p>
              <p className="font-mono text-xs text-slate-800">{valorVer.clave}</p>
              {valorVer.descripcion && (
                <p className="mt-1 text-xs text-slate-500">{valorVer.descripcion}</p>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                Valor {valorVer.tipo_dato === 'JSON' && '(JSON)'}
              </p>

              {valorVer.tipo_dato === 'JSON' ? (
                <JsonViewer value={valorVer.valor} />
              ) : (
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
                  {valorVer.valor}
                </pre>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <Button variant="secondary" onClick={() => setValorVer(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// =============================================================================
// ValorCelda: chips para claves ESTADOS_*, resumen para JSON
// =============================================================================
function ValorCelda({ parametro, onVer }) {
  const { valor, tipo_dato, clave } = parametro;

  // ⭐ Estados: mostrar como chips
  if (clave?.startsWith('ESTADOS_') && tipo_dato === 'STRING') {
    const items = valor.split(',').map((v) => v.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((v) => (
          <span
            key={v}
            className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-medium text-brand-700 ring-1 ring-inset ring-brand-200"
          >
            {v}
          </span>
        ))}
      </div>
    );
  }

  // JSON: resumen
  if (tipo_dato === 'JSON') {
    let items = 0;
    let preview = valor;
    let valido = true;
    try {
      const parsed = JSON.parse(valor);
      if (Array.isArray(parsed)) {
        items = parsed.length;
        preview = `[${items} elemento${items !== 1 ? 's' : ''}]`;
      } else if (parsed && typeof parsed === 'object') {
        items = Object.keys(parsed).length;
        preview = `{${items} propiedad${items !== 1 ? 'es' : ''}}`;
      } else {
        preview = String(parsed);
      }
    } catch {
      valido = false;
      preview = 'JSON inválido';
    }

    return (
      <div className="flex items-start gap-2">
        <div
          className={`flex items-center gap-2 rounded-lg px-2 py-1 ring-1 ${
            valido ? 'bg-violet-50 ring-violet-200' : 'bg-red-50 ring-red-200'
          }`}
        >
          <span
            className={`font-mono text-[10px] font-bold uppercase ${
              valido ? 'text-violet-700' : 'text-red-700'
            }`}
          >
            JSON
          </span>
          <span
            className={`truncate text-xs ${valido ? 'text-violet-800' : 'text-red-800'}`}
            title={preview}
          >
            {preview}
          </span>
        </div>
        <button
          onClick={onVer}
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-brand-700 hover:bg-brand-50"
          title="Ver JSON completo"
        >
          Ver
        </button>
      </div>
    );
  }

  // Otros: texto truncado
  const esLargo = valor.length > 80;

  return (
    <div className="flex items-start gap-2">
      <code
        className="line-clamp-3 max-w-[280px] break-all rounded bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-800"
        title={valor}
      >
        {valor}
      </code>
      {esLargo && (
        <button
          onClick={onVer}
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-brand-700 hover:bg-brand-50"
          title="Ver valor completo"
        >
          Ver
        </button>
      )}
    </div>
  );
}

// =============================================================================
// Modal crear / editar
// =============================================================================
function ModalParametro({ open, modo, data, grupos, onClose, onSave }) {
  const [form, setForm] = useState(vacio);
  const [errores, setErrores] = useState({});

  const esEstados = form.clave?.startsWith('ESTADOS_');

  useEffect(() => {
    if (open) {
      setForm(modo === 'editar' && data ? {
        clave: data.clave,
        valor: String(data.valor),
        tipo_dato: data.tipo_dato,
        grupo: data.grupo,
        descripcion: data.descripcion || '',
        es_editable: !!data.es_editable,
        es_publico: !!data.es_publico,
      } : vacio);
      setErrores({});
    }
  }, [open, modo, data]);

  const handleClave = (v) =>
    v.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');

  const validarValor = (valor, tipo) => {
    if (valor === '' || valor === null || valor === undefined) return 'El valor es obligatorio';
    if (tipo === 'INT' && !/^-?\d+$/.test(valor)) return 'Debe ser un número entero';
    if (tipo === 'BOOLEAN') {
      const v = String(valor).toLowerCase();
      if (!['true', 'false', '1', '0'].includes(v)) return 'Debe ser true o false';
    }
    if (tipo === 'JSON') {
      try { JSON.parse(valor); } catch { return 'JSON inválido'; }
    }
    if (tipo === 'DATE') {
      if (Number.isNaN(new Date(valor).getTime())) return 'Fecha inválida';
    }
    return null;
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.clave.trim()) errs.clave = 'La clave es obligatoria';
    const errValor = validarValor(form.valor, form.tipo_dato);
    if (errValor) errs.valor = errValor;
    setErrores(errs);
    if (Object.keys(errs).length) return;

    let valorFinal = form.valor;
    if (form.tipo_dato === 'BOOLEAN') {
      const v = String(valorFinal).toLowerCase();
      valorFinal = v === 'true' || v === '1' ? 'true' : 'false';
    }

    onSave({ ...form, valor: valorFinal });
  };

  const formatearJSON = () => {
    try {
      const parsed = JSON.parse(form.valor);
      setForm({ ...form, valor: JSON.stringify(parsed, null, 2) });
      setErrores((e) => ({ ...e, valor: undefined }));
    } catch { /* no-op */ }
  };

  const placeholderValor = {
    STRING:  esEstados
      ? 'ACTIVO,INACTIVO,BLOQUEADO,ELIMINADO'
      : 'Ej. mi_valor',
    INT:     'Ej. 10',
    BOOLEAN: 'true o false',
    JSON:    'Ej. ["A","B"] o {"clave":"valor"}',
    DATE:    'Ej. 2025-01-20T09:00:00Z',
  }[form.tipo_dato];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={modo === 'editar' ? 'Editar parámetro' : 'Nuevo parámetro'}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Clave *"
          value={form.clave}
          error={errores.clave}
          disabled={modo === 'editar'}
          placeholder="Ej. DURACION_MAX_VISITA_HORAS"
          onChange={(e) => setForm({ ...form, clave: handleClave(e.target.value) })}
        />
        {modo === 'editar' && (
          <p className="-mt-2 text-xs text-slate-500">
            La clave no se puede modificar una vez creada.
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Tipo de dato *"
            value={form.tipo_dato}
            onChange={(e) => setForm({ ...form, tipo_dato: e.target.value, valor: '' })}
          >
            {TIPOS.map((t) => <option key={t}>{t}</option>)}
          </Select>

          <Select
            label="Grupo *"
            value={form.grupo}
            onChange={(e) => setForm({ ...form, grupo: e.target.value })}
          >
            {grupos.map((g) => <option key={g}>{g}</option>)}
          </Select>
        </div>

        {/* Valor: input simple si es ESTADOS_*, textarea si es JSON, input normal si no */}
        {esEstados && form.tipo_dato === 'STRING' ? (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Valores válidos (separados por coma) *
            </label>
            <input
              type="text"
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder={placeholderValor}
              className={`block w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
                errores.valor ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
              }`}
            />
            <p className="text-xs text-slate-500">
              Separa los valores con coma. Ej: <code>ACTIVO,INACTIVO,ELIMINADO</code>
            </p>
            {errores.valor && <p className="text-xs text-red-600">{errores.valor}</p>}
          </div>
        ) : form.tipo_dato === 'JSON' ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">
                Valor * (JSON)
              </label>
              <button
                type="button"
                onClick={formatearJSON}
                className="text-xs text-brand-700 hover:underline"
              >
                Formatear JSON
              </button>
            </div>
            <textarea
              rows={8}
              value={form.valor}
              placeholder={placeholderValor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className={`block w-full rounded-lg border bg-white px-3 py-2 font-mono text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
                errores.valor ? 'border-red-400' : 'border-slate-300 focus:border-brand-500'
              }`}
            />
            {errores.valor && <p className="text-xs text-red-600">{errores.valor}</p>}
          </div>
        ) : (
          <Input
            label="Valor *"
            value={form.valor}
            error={errores.valor}
            placeholder={placeholderValor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
          />
        )}

        <Textarea
          label="Descripción"
          rows={2}
          placeholder="¿Para qué sirve este parámetro?"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={form.es_editable}
              disabled={modo === 'editar'}
              onChange={(e) => setForm({ ...form, es_editable: e.target.checked })}
            />
            <div className="text-sm">
              <p className="font-medium text-slate-800">Editable</p>
              <p className="text-xs text-slate-500">
                Si se desmarca, solo puede cambiarse por BD.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={form.es_publico}
              onChange={(e) => setForm({ ...form, es_publico: e.target.checked })}
            />
            <div className="text-sm">
              <p className="font-medium text-slate-800">Público</p>
              <p className="text-xs text-slate-500">
                Se expone vía <code>/parametros/publicos</code>.
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">
            {modo === 'editar' ? 'Guardar cambios' : 'Crear parámetro'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// =============================================================================
// Visor JSON
// =============================================================================
function JsonViewer({ value }) {
  const [formato, setFormato] = useState('pretty');
  const [copiado, setCopiado] = useState(false);

  let pretty = value;
  let valido = true;
  try {
    pretty = JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    valido = false;
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pretty);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          <button
            onClick={() => setFormato('pretty')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              formato === 'pretty' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Formateado
          </button>
          <button
            onClick={() => setFormato('raw')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              formato === 'raw' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Crudo
          </button>
        </div>

        {!valido && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
            JSON inválido
          </span>
        )}

        <button
          onClick={copiar}
          className="ml-auto flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          {copiado ? '✓ Copiado' : 'Copiar'}
        </button>
      </div>

      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-slate-900 p-3 font-mono text-xs text-slate-100">
        {formato === 'pretty' ? pretty : value}
      </pre>
    </div>
  );
}