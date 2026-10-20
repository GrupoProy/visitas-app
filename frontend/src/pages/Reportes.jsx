// pages/Reportes.jsx
import { useCallback, useEffect, useState } from 'react';
import {
  RefreshCcw, Download, FileText, Loader2, BarChart3, MapPin,
  Users, UserCheck, Calendar,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { FiltrosReportes, defaultDesde, defaultHasta } from '../components/reportes/FiltrosReportes';
import { ReportePeriodo } from '../components/reportes/ReportePeriodo';
import { ReporteLugar } from '../components/reportes/ReporteLugar';
import { ReporteAnfitrion } from '../components/reportes/ReporteAnfitrion';
import { ReporteVisitante } from '../components/reportes/ReporteVisitante';
import { descargarBlob } from '../utils/descargas';


const FILTROS_INICIALES = {
  desde: defaultDesde(),
  hasta: defaultHasta(),
  id_lugar: '',
  id_anfitrion: '',
  id_persona: '',
  agrupacion: 'dia',
};

const TABS = [
  { id: 'periodo',   label: 'Por período',   icon: Calendar },
  { id: 'lugar',     label: 'Por lugar',     icon: MapPin },
  { id: 'anfitrion', label: 'Por anfitrión', icon: Users },
  { id: 'visitante', label: 'Por visitante', icon: UserCheck },
];

export default function Reportes() {
  const toast = useToast();

  const [tab, setTab] = useState('periodo');
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(null); // 'csv' | 'pdf' | null

  // -----------------------------------------------------------------
  // Carga
  // -----------------------------------------------------------------
  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = {
        periodo:   '/reportes/por-periodo',
        lugar:     '/reportes/por-lugar',
        anfitrion: '/reportes/por-anfitrion',
        visitante: '/reportes/por-visitante',
      }[tab];

      const params = {
        desde: filtros.desde || undefined,
        hasta: filtros.hasta || undefined,
        id_lugar: filtros.id_lugar || undefined,
        id_anfitrion: filtros.id_anfitrion || undefined,
        id_persona: filtros.id_persona || undefined,
        agrupacion: filtros.agrupacion || undefined,
      };

      const { data: r } = await api.get(endpoint, { params });
      setData(r.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'No se pudo cargar el reporte');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tab, filtros, toast]);

  useEffect(() => { cargar(); }, [cargar]);

  // -----------------------------------------------------------------
  // Exportaciones
  // -----------------------------------------------------------------
 const exportar = async (formato) => {
  setExportando(formato);
  try {
    const params = {
      desde: filtros.desde || undefined,
      hasta: filtros.hasta || undefined,
      id_lugar: filtros.id_lugar || undefined,
      id_anfitrion: filtros.id_anfitrion || undefined,
      id_persona: filtros.id_persona || undefined,
      agrupacion: filtros.agrupacion || undefined,
    };
    const rutaFormato = formato === 'csv' ? 'export' : 'pdf';

    const response = await api.get(`/reportes/${tab}/${rutaFormato}`, {
      params,
      responseType: 'blob',
      timeout: 120000, 
    });

    // Verificar que la respuesta sea realmente un blob
    if (!(response.data instanceof Blob)) {
      throw new Error('La respuesta no es un archivo válido');
    }

    // Verificar tamaño
    if (response.data.size === 0) {
      throw new Error('El archivo está vacío');
    }

    // Verificar si el blob contiene un error JSON (por si el backend devolvió
    // 200 con un error disfrazado)
    if (response.data.type === 'application/json') {
      const texto = await response.data.text();
      const json = JSON.parse(texto);
      throw new Error(json.message || 'Error del servidor');
    }

    const extension = formato === 'pdf' ? 'pdf' : 'csv';
    const fecha = new Date().toISOString().slice(0, 10);
    descargarBlob(response.data, `reporte-${tab}-${fecha}.${extension}`);
    toast.success(`Descargando ${formato.toUpperCase()}…`);
  } catch (e) {
    console.error('[exportar] Error:', e);
    const msg = e.message || `No se pudo exportar el ${formato.toUpperCase()}`;
    toast.error(msg);
  } finally {
    setExportando(null);
  }
};

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Reportes</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Análisis de visitas por período, lugar, anfitrión y visitante.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={cargar} disabled={loading}>
            <RefreshCcw size={16} /> Actualizar
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportar('csv')}
            disabled={loading || exportando === 'csv'}
          >
            {exportando === 'csv' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            CSV
          </Button>
          <Button
            onClick={() => exportar('pdf')}
            disabled={loading || exportando === 'pdf'}
          >
            {exportando === 'pdf' ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileText size={16} />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const activo = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                activo
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <FiltrosReportes valor={filtros} onChange={setFiltros} tab={tab} />

      {/* Loading */}
      {loading && (
        <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-20 shadow-card">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      )}

      {/* Contenido por tab */}
      {!loading && data && (
        <>
          {tab === 'periodo'   && <ReportePeriodo   data={data} />}
          {tab === 'lugar'     && <ReporteLugar     data={data} />}
          {tab === 'anfitrion' && <ReporteAnfitrion data={data} />}
          {tab === 'visitante' && <ReporteVisitante data={data} />}
        </>
      )}

      {/* Sin datos */}
      {!loading && !data && (
        <div className="grid place-items-center rounded-2xl border border-slate-200 bg-white py-16 text-slate-500 shadow-card">
          <BarChart3 size={32} className="mb-2 text-slate-300" />
          <p className="text-sm">No hay datos para el período seleccionado.</p>
        </div>
      )}
    </div>
  );
}