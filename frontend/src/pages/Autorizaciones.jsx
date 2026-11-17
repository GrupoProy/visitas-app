import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Plus, RefreshCcw, MapPin, CalendarDays, Loader2,
  Pencil, CheckCircle2, XCircle, Ban, Eye, Undo2, Flag, AlertTriangle,
} from 'lucide-react';
import { api } from '../api/client';
import { usePermisos } from '../hooks/usePermisos';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import NuevaAutorizacion from './NuevaAutorizacion';
import EditarAutorizacion from './EditarAutorizacion';
import BitacoraDrawer from './BitacoraDrawer';
import FinalizarAutorizacion from './FinalizarAutorizacion';
import { accionesDe } from '../utils/estadosMeta';
import { usePageSize } from '../hooks/usePageSize';

const ESTADOS = [
  '', 'PENDIENTE', 'APROBADA', 'EN_CURSO',
  'FINALIZADA', 'RECHAZADA', 'CANCELADA', 'EXPIRADA',
];

const fmtFecha = (iso) =>
  iso
    ? new Date(iso).toLocaleString('es-BO', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

export default function Autorizaciones() {
  const toast = useToast();
  const { tienePermiso } = usePermisos();
  const [searchParams, setSearchParams] = useSearchParams();

  const puedeCrear       = tienePermiso('autorizaciones.crear');
  const puedeEditar      = tienePermiso('autorizaciones.editar');
  const puedeAprobar     = tienePermiso('autorizaciones.aprobar');
  const puedeRechazar    = tienePermiso('autorizaciones.rechazar');
  const puedeCancelar    = tienePermiso('autorizaciones.cancelar');
  const puedeReactivar   = tienePermiso('autorizaciones.reactivar');
  const puedeBitacora    = tienePermiso('autorizaciones.ver_bitacora');
  const puedeRegularizar = tienePermiso('autorizaciones.regularizar');

  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = usePageSize();
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [soloHuerfanas, setSoloHuerfanas] = useState(false);

  const qDebounced = useDebounce(q, 400);

  const [modalNueva, setModalNueva] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalFinalizar, setModalFinalizar] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [confirm, setConfirm] = useState(null);

  // Query params al montar
  useEffect(() => {
    const estadoUrl = searchParams.get('estado');
    const alerta = searchParams.get('alerta');
    if (estadoUrl) setEstado(estadoUrl);
    if (alerta === 'huerfanas') {
      setSoloHuerfanas(true);
      setEstado('EN_CURSO');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/autorizaciones', {
        params: {
          q: qDebounced || undefined,
          estado: soloHuerfanas ? 'EN_CURSO' : (estado || undefined),
          solo_huerfanas: soloHuerfanas || undefined,
          page, limit,
        },
      });
      setLista(data.data.items || []);
      setTotal(data.data.total || 0);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudieron cargar las autorizaciones');
      setLista([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [qDebounced, estado, page, soloHuerfanas]);
  useEffect(() => { setPage(1); }, [qDebounced, estado, soloHuerfanas]);

  // -------------------------------------------------------------------
  // Cambio de estado
  // -------------------------------------------------------------------
  const cambiarEstado = async (id, nuevoEstado, mensaje) => {
    try {
      await api.patch(`/autorizaciones/${id}/estado`, { estado: nuevoEstado });
      toast.success(mensaje);
      cargar();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cambiar estado');
    }
  };

  const ejecutarAccion = async () => {
    const { accion, item } = confirm || {};
    try {
      if (accion === 'aprobar')   await cambiarEstado(item.id, 'APROBADA', 'Autorización aprobada');
      if (accion === 'rechazar')  await cambiarEstado(item.id, 'RECHAZADA', 'Autorización rechazada');
      if (accion === 'cancelar')  await cambiarEstado(item.id, 'CANCELADA', 'Autorización cancelada');
      if (accion === 'reactivar') await cambiarEstado(item.id, 'APROBADA', 'Autorización reactivada');
    } finally {
      setConfirm(null);
    }
  };

  const tituloConfirm = (accion) => ({
    aprobar:   'Aprobar autorización',
    rechazar:  'Rechazar autorización',
    cancelar:  'Cancelar autorización',
    reactivar: 'Reactivar autorización',
  }[accion] || 'Confirmar acción');

  const mensajeConfirm = (accion, item) => ({
    aprobar:   `¿Aprobar la visita de "${item?.visitante}"?`,
    rechazar:  `¿Rechazar la visita de "${item?.visitante}"? El visitante no podrá ingresar.`,
    cancelar:  `¿Cancelar la visita de "${item?.visitante}"?`,
    reactivar: `¿Reactivar la autorización de "${item?.visitante}"? Volverá al estado APROBADA.`,
  }[accion] || '¿Confirmar?');

  const quitarFiltroHuerfanas = () => {
    setSoloHuerfanas(false);
    setEstado('');
    setSearchParams({});
  };

  // -------------------------------------------------------------------
  // Render de acciones por fila
  // -------------------------------------------------------------------
  const renderAcciones = (a) => {
    const acciones = accionesDe('autorizacion', a.estado);

    const btn = (key, icon, title, onClick, colorClass) => (
      <button
        key={key}
        onClick={() => onClick(a)}
        title={title}
        className={`rounded-md p-1.5 hover:bg-slate-100 ${colorClass}`}
      >
        {icon}
      </button>
    );

    return (
      <div className="inline-flex items-center gap-0.5">
        {acciones.includes('aprobar') && puedeAprobar &&
          btn('aprobar', <CheckCircle2 size={16} />, 'Aprobar',
              (x) => setConfirm({ accion: 'aprobar', item: x }),
              'text-emerald-600 hover:text-emerald-700')}

        {acciones.includes('rechazar') && puedeRechazar &&
          btn('rechazar', <XCircle size={16} />,
              a.estado === 'APROBADA' ? 'Rechazar (cancelar la visita)' : 'Rechazar',
              (x) => setConfirm({ accion: 'rechazar', item: x }),
              'text-red-600 hover:text-red-700')}

        {acciones.includes('reactivar') && puedeReactivar &&
          btn('reactivar', <Undo2 size={16} />, 'Reactivar',
              (x) => setConfirm({ accion: 'reactivar', item: x }),
              'text-emerald-600 hover:text-emerald-700')}

        {acciones.includes('editar') && puedeEditar &&
          btn('editar', <Pencil size={16} />, 'Editar',
              (x) => setModalEditar(x),
              'text-brand-600 hover:text-brand-700')}

        {acciones.includes('cancelar') && puedeCancelar &&
          btn('cancelar', <Ban size={16} />, 'Cancelar',
              (x) => setConfirm({ accion: 'cancelar', item: x }),
              'text-amber-600 hover:text-amber-700')}

        {acciones.includes('finalizar') && puedeRegularizar &&
          btn('finalizar', <Flag size={16} />, 'Finalizar visita',
              (x) => setModalFinalizar(x),
              'text-emerald-600 hover:text-emerald-700')}

        {acciones.includes('bitacora') && puedeBitacora &&
          btn('bitacora', <Eye size={16} />, 'Ver bitácora',
              (x) => setDrawer(x),
              'text-slate-600 hover:text-slate-800')}

        {acciones.length === 0 && (
          <span className="text-xs text-slate-400">—</span>
        )}
      </div>
    );
  };

  // ===================================================================
  return (
    <div className="space-y-6">
      {/* Banner huérfanas */}
      {soloHuerfanas && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <b>Mostrando visitas en curso sin salida registrada.</b>
            <span className="text-xs text-amber-700">
              Regulariza registrando la salida real o cancelando la visita.
            </span>
            <button
              onClick={quitarFiltroHuerfanas}
              className="ml-auto rounded-md bg-white px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-300 hover:bg-amber-100"
            >
              Quitar filtro
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Autorizaciones</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Registra, programa y gestiona las visitas autorizadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={cargar} disabled={loading}>
            <RefreshCcw size={16} /> Actualizar
          </Button>
          {puedeCrear && (
            <Button onClick={() => setModalNueva(true)}>
              <Plus size={16} /> Nueva autorización
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Buscar por código, visitante, documento o lugar…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select
            value={estado}
            disabled={soloHuerfanas}
            onChange={(e) => setEstado(e.target.value)}
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{e || 'Todos los estados'}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* Tabla */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Visitante</th>
                <th className="px-4 py-3">Lugar</th>
                <th className="px-4 py-3">Vigencia</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && lista.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                    {soloHuerfanas
                      ? 'No hay visitas sin finalizar. ¡Todo en orden!'
                      : 'No hay autorizaciones para mostrar.'}
                  </td>
                </tr>
              )}
              {!loading && lista.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">
                      {a.codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                        {a.visitante?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{a.visitante}</p>
                        <p className="text-xs text-slate-500">{a.documento_visitante}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <MapPin size={14} className="text-slate-400" />
                      {a.lugar}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <CalendarDays size={14} className="text-slate-400" />
                      <div>
                        <div>{fmtFecha(a.fecha_inicio)}</div>
                        <div className="text-slate-400">→ {fmtFecha(a.fecha_fin)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge estado={a.estado} modulo="autorizacion" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {renderAcciones(a)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && total > 0 && (
          <Pagination page={page} limit={limit} total={total} onChange={setPage} />
        )}
      </Card>

      {/* Modales */}
      <Modal open={modalNueva} onClose={() => setModalNueva(false)} title="Nueva autorización" size="xl">
        <NuevaAutorizacion
          onCancel={() => setModalNueva(false)}
          onCreada={() => { setModalNueva(false); cargar(); }}
        />
      </Modal>

      <Modal
        open={!!modalEditar}
        onClose={() => setModalEditar(null)}
        title={`Editar autorización ${modalEditar?.codigo || ''}`}
        size="xl"
      >
        {modalEditar && (
          <EditarAutorizacion
            autorizacion={modalEditar}
            onCancel={() => setModalEditar(null)}
            onCreada={() => { setModalEditar(null); cargar(); }}
          />
        )}
      </Modal>

      <Modal
        open={!!modalFinalizar}
        onClose={() => setModalFinalizar(null)}
        title={`Finalizar visita ${modalFinalizar?.codigo || ''}`}
        size="md"
      >
        {modalFinalizar && (
          <FinalizarAutorizacion
            autorizacion={modalFinalizar}
            onCancel={() => setModalFinalizar(null)}
            onCreada={() => { setModalFinalizar(null); cargar(); }}
          />
        )}
      </Modal>

      {drawer && <BitacoraDrawer autorizacion={drawer} onClose={() => setDrawer(null)} />}

      <ConfirmDialog
        open={!!confirm}
        title={tituloConfirm(confirm?.accion)}
        message={mensajeConfirm(confirm?.accion, confirm?.item)}
        confirmLabel="Confirmar"
        variant={confirm?.accion === 'rechazar' ? 'danger' : 'primary'}
        onClose={() => setConfirm(null)}
        onConfirm={ejecutarAccion}
      />
    </div>
  );
}