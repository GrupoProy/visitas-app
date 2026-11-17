import { useState } from 'react';
import {
  ShieldCheck, ScanLine, Loader2, CheckCircle2, XCircle,
  CalendarDays, MapPin, User, Hash, IdCard, ListChecks, ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

export default function Verificacion() {
  const toast = useToast();

  // const [modo, setModo] = useState('codigo'); // ❌ antes
  // ⭐ Modo forzado a 'documento' — el modo "por código" está comentado temporalmente
  const [modo] = useState('documento');

  // Modo por código (comentado temporalmente)
  // const [codigo, setCodigo] = useState('');

  // Modo por documento
  const [tipoDocumento, setTipoDocumento] = useState('CI');
  const [numeroDocumento, setNumeroDocumento] = useState('');

  const [resultado, setResultado] = useState(null);
  const [eleccion, setEleccion] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------------------
  // Verificar por código (comentado temporalmente)
  // ---------------------------------------------------------------------
  // const verificarCodigo = async (e) => {
  //   e?.preventDefault();
  //   if (!codigo.trim()) return;
  //   setError(''); setResultado(null); setEleccion(null); setLoading(true);
  //   try {
  //     const { data } = await api.get(`/autorizaciones/verificar/${codigo.trim()}`);
  //     setResultado(data.data);
  //     setCodigo('');
  //   } catch (err) {
  //     setError(err.response?.data?.message || 'Error al verificar');
  //   } finally { setLoading(false); }
  // };

  // ---------------------------------------------------------------------
  // Verificar por documento
  // ---------------------------------------------------------------------
  const verificarDocumento = async (e) => {
    e?.preventDefault();
    if (!numeroDocumento.trim()) return;
    setError(''); setResultado(null); setEleccion(null); setLoading(true);
    try {
      const { data } = await api.get('/autorizaciones/verificar-por-documento', {
        params: { tipo: tipoDocumento, numero: numeroDocumento.trim() },
      });

      const payload = data.data;

      if (payload.requiere_eleccion) {
        setEleccion({ autorizaciones: payload.autorizaciones });
        toast.info(`Hay ${payload.autorizaciones.length} autorizaciones vigentes`);
      } else {
        setResultado(payload);
      }
      setNumeroDocumento('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al verificar');
    } finally { setLoading(false); }
  };

  // ---------------------------------------------------------------------
  // Procesar una autorización elegida de la lista
  // ---------------------------------------------------------------------
  const procesarElegida = async (codigoSeleccionado) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/autorizaciones/verificar/${codigoSeleccionado}`);
      setResultado(data.data);
      setEleccion(null);
      setNumeroDocumento('');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al procesar');
    } finally { setLoading(false); }
  };

  // ---------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------
  const limpiar = () => {
    setResultado(null);
    setEleccion(null);
    setError('');
  };

  const permitido = resultado?.resultado === 'PERMITIDO';
  const denegado  = resultado?.resultado === 'DENEGADO';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Encabezado */}
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/20">
          <ScanLine size={26} />
        </div>
        <h1 className="text-xl font-semibold text-slate-800">Verificación en punto de acceso</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Valida el ingreso o la salida por número de documento.
        </p>
      </div>

      {/* ============================================================ */}
      {/* Selector de modo — comentado temporalmente                    */}
      {/* Solo se usa "Por documento"                                   */}
      {/* ============================================================ */}
      {/*
      <div className="mx-auto flex max-w-md items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-card">
        <button
          onClick={() => { setModo('codigo'); limpiar(); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            modo === 'codigo'
              ? 'bg-brand-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Hash size={16} /> Por código
        </button>
        <button
          onClick={() => { setModo('documento'); limpiar(); }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
            modo === 'documento'
              ? 'bg-brand-600 text-white shadow'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <IdCard size={16} /> Por documento
        </button>
      </div>
      */}

      {/* Formulario: solo documento */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        {/* 
        Modo código comentado temporalmente:
        {modo === 'codigo' ? (
          <form onSubmit={verificarCodigo} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <Input
                label="Código de autorización"
                placeholder="Ej. AUT-XXXX-XXXX"
                autoFocus
                maxLength={17}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              />
            </div>
            <Button type="submit" size="lg" disabled={loading || !codigo.trim()}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Verificar
            </Button>
          </form>
        ) : (
        */}
          <form onSubmit={verificarDocumento} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="md:w-32">
              <Select
                label="Tipo"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
              >
                <option>CI</option>
                <option>PASAPORTE</option>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                label="N° documento del visitante"
                placeholder="Ej. 12345678"
                autoFocus
                maxLength={13}
                value={numeroDocumento}
                onChange={(e) => setNumeroDocumento(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" disabled={loading || !numeroDocumento.trim()}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              Buscar
            </Button>
          </form>
        {/* )} */}
      </div>

      {/* Errores */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <XCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Lista para elegir cuando hay varias vigentes */}
      {eleccion && (
        <div className="overflow-hidden rounded-2xl border-2 border-amber-400 bg-amber-50 shadow-card">
          <div className="flex items-center gap-3 bg-amber-500 px-6 py-4 text-white">
            <ListChecks size={26} />
            <div>
              <h2 className="text-lg font-bold">Múltiples autorizaciones vigentes</h2>
              <p className="text-sm opacity-90">
                Selecciona cuál deseas procesar (ingreso o salida).
              </p>
            </div>
          </div>

          <ul className="divide-y divide-amber-200">
            {eleccion.autorizaciones.map((a) => {
              const dentro = a.fecha_ingreso_real && !a.fecha_salida_real;
              const accion = dentro ? 'Registrar salida' : 'Registrar ingreso';
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-white px-2 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                        {a.codigo}
                      </span>
                      <Badge estado={resultado.resultado} tipo="verificacion" />
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-800">{a.lugar}</p>
                    <p className="text-xs text-slate-600">
                      <CalendarDays size={11} className="mr-1 inline" />
                      {new Date(a.fecha_inicio).toLocaleString('es-BO')} →{' '}
                      {new Date(a.fecha_fin).toLocaleString('es-BO')}
                    </p>
                    <p className="text-xs text-slate-600">
                      <User size={11} className="mr-1 inline" />
                      Anfitrión: {a.anfitrion}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 italic">{a.motivo}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={dentro ? 'danger' : 'success'}
                    onClick={() => procesarElegida(a.codigo)}
                    disabled={loading}
                  >
                    {accion} <ArrowRight size={14} />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Resultado (permitido / denegado) */}
      {resultado && (
        <div
          className={`overflow-hidden rounded-2xl border-2 shadow-card ${
            permitido ? 'border-emerald-500 bg-emerald-50'
            : denegado ? 'border-red-500 bg-red-50'
            : 'border-slate-300 bg-white'
          }`}
        >
          <div className={`flex items-center gap-3 px-6 py-5 ${
            permitido ? 'bg-emerald-600 text-white'
            : denegado ? 'bg-red-600 text-white'
            : 'bg-slate-700 text-white'
          }`}>
            {permitido ? <CheckCircle2 size={32} /> : <XCircle size={32} />}
            <div>
              <h2 className="text-2xl font-bold">{resultado.resultado}</h2>
              <p className="text-sm opacity-90">
                Acción: <b>{resultado.motivo}</b>
              </p>
            </div>
          </div>

          {resultado.autorizacion && (
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <Dato icon={User} label="Visitante" value={resultado.autorizacion.visitante} />
              <Dato icon={Hash} label="Documento" value={resultado.autorizacion.numero_documento} />
              <Dato icon={MapPin} label="Lugar" value={resultado.autorizacion.lugar} />
              <Dato
                icon={CalendarDays}
                label="Vigencia"
                value={`${new Date(resultado.autorizacion.fecha_inicio).toLocaleString('es-BO')} → ${new Date(resultado.autorizacion.fecha_fin).toLocaleString('es-BO')}`}
              />
            </div>
          )}

          <div className="flex justify-end border-t border-slate-200/60 bg-white/40 px-6 py-3">
            <Button variant="secondary" size="sm" onClick={limpiar}>
              Verificar otra
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const Dato = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/70 text-slate-700 ring-1 ring-slate-200">
      <Icon size={16} />
    </div>
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
    </div>
  </div>
);