// pages/Auditoria.jsx
import { useEffect, useState } from 'react';
import {
  RefreshCcw, Download, Loader2, ShieldAlert, Activity,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useDebounce } from '../hooks/useDebounce';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Pagination } from '../components/ui/Pagination';
import { FiltrosAuditoria } from '../components/auditoria/FiltrosAuditoria';
import { DetalleIntento } from '../components/auditoria/DetalleIntento';
import { exportarCsv } from '../utils/exportarCsv';
import { usePageSize } from '../hooks/usePageSize';

const FILTROS_INICIALES = {
  q: '',
  desde: '',
  hasta: '',
  resultado: '',
  motivo: '',
  page: 1,
};

export default function Auditoria() {
  const toast = useToast();

  const [tab, setTab] = useState('intentos'); // 'intentos' | 'sesiones'
  const limit = usePageSize(); 
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detalleId, setDetalleId] = useState(null);
  const [exportando, setExportando] = useState(false);
  

  //const limit = 20;

  const cargar = async () => {
    setLoading(true);
    try {
      if (tab === 'intentos') {
        const { data } = await api.get('/auditoria/login', {
          params: {
            q: filtros.q || undefined,
            desde: filtros.desde || undefined,
            hasta: filtros.hasta || undefined,
            resultado: filtros.resultado || undefined,
            motivo: filtros.motivo || undefined,
            page: filtros.page,
            limit,
          },
        });
        setItems(data.data.items);
        setTotal(data.data.total);
      } else {
        const { data } = await api.get('/auditoria/sesiones', {
          params: { page: filtros.page, limit },
        });
        setItems(data.data.items);
        setTotal(data.data.total);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filtros]);

  const exportar = async () => {
    setExportando(true);
    try {
      const params = {
        q: filtros.q || undefined,
        desde: filtros.desde || undefined,
        hasta: filtros.hasta || undefined,
        resultado: filtros.resultado || undefined,
        motivo: filtros.motivo || undefined,
      };
      await exportarCsv('/auditoria/login/export', params, 'auditoria-login.csv');
      toast.success('Exportación descargada');
    } catch (e) {
      toast.error('No se pudo exportar');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Auditoría y seguridad
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Historial de accesos y sesiones activas del sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={cargar}>
            <RefreshCcw size={16} /> Actualizar
          </Button>
          {tab === 'intentos' && (
            <Button onClick={exportar} disabled={exportando}>
              {exportando ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              Exportar CSV
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <TabBtn
          activo={tab === 'intentos'}
          onClick={() => {
            setTab('intentos');
            setFiltros({ ...FILTROS_INICIALES });
          }}
          icon={<ShieldAlert size={15} />}
        >
          Intentos de login
        </TabBtn>
        <TabBtn
          activo={tab === 'sesiones'}
          onClick={() => {
            setTab('sesiones');
            setFiltros({ ...FILTROS_INICIALES });
          }}
          icon={<Activity size={15} />}
        >
          Sesiones activas
        </TabBtn>
      </div>

      {/* Contenido según tab */}
      {tab === 'intentos' && (
        <>
          <FiltrosAuditoria valor={filtros} onChange={setFiltros} />

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">IP</th>
                    <th className="px-4 py-3">User-Agent</th>
                    <th className="px-4 py-3">Resultado</th>
                    <th className="px-4 py-3">Motivo</th>
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
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-12 text-center text-slate-500">
                        No hay registros que coincidan con los filtros.
                      </td>
                    </tr>
                  )}
                  {!loading && items.map((it) => (
                    <FilaIntento
                      key={it.id}
                      item={it}
                      onClick={() => setDetalleId(it.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={filtros.page}
              limit={limit}
              total={total}
              onChange={(p) => setFiltros({ ...filtros, page: p })}
            />
          </Card>
        </>
      )}

      {tab === 'sesiones' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">Dispositivo</th>
                  <th className="px-4 py-3">Iniciada</th>
                  <th className="px-4 py-3">Expira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-slate-500">
                      <Loader2 className="mx-auto animate-spin" />
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-12 text-center text-slate-500">
                      No hay sesiones activas.
                    </td>
                  </tr>
                )}
                {!loading && items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {s.usuario?.nombres} {s.usuario?.primer_apellido}
                      </p>
                      <p className="text-xs text-slate-500">
                        @{s.usuario?.username}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {s.ip || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <span title={s.user_agent}>
                        {truncar(s.user_agent, 50) || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(s.creada_en).toLocaleString('es-BO')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {new Date(s.expira_en).toLocaleString('es-BO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={filtros.page}
            limit={limit}
            total={total}
            onChange={(p) => setFiltros({ ...filtros, page: p })}
          />
        </Card>
      )}

      {/* Modal de detalle */}
      <DetalleIntento
        open={!!detalleId}
        intentoId={detalleId}
        onClose={() => setDetalleId(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------
const TabBtn = ({ activo, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
      activo
        ? 'border-brand-600 text-brand-700'
        : 'border-transparent text-slate-500 hover:text-slate-700'
    }`}
  >
    {icon}
    {children}
  </button>
);

const FilaIntento = ({ item, onClick }) => {
  const fecha = new Date(item.fecha).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const badge = item.exitoso ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      Exitoso
    </span>
  ) : item.motivo_fallo === 'BLOQUEADO' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      Bloqueado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      Fallido
    </span>
  );

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-slate-50/70"
    >
      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">{fecha}</td>
      <td className="px-4 py-3 text-sm text-slate-800">
        {item.username || <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600">
        {item.ip || '—'}
      </td>
      <td className="px-4 py-3 text-xs text-slate-500">
        <span title={item.user_agent}>{truncar(item.user_agent, 30) || '—'}</span>
      </td>
      <td className="px-4 py-3">{badge}</td>
      <td className="px-4 py-3 text-xs text-slate-600">
        {item.motivo_fallo ? (
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px]">
            {item.motivo_fallo}
          </code>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
};

const truncar = (s, n) => {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n)}…` : s;
};