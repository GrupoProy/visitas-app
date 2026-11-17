import { useEffect, useMemo, useState } from 'react';
import {
  UserPlus, CheckCircle2, MapPin, CalendarClock, Loader2, Search,
  Clock, AlertTriangle, Ban, UserX, UserPlus2, Lock, Info,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useParametros } from '../hooks/useParametros';
import { Button } from '../components/ui/Button';
import { Input, Select, Textarea } from '../components/ui/Input';
import { PersonaCombo } from '../components/ui/PersonaCombo';
import { LugarCombo } from '../components/ui/LugarCombo';
import { DatePickerRestringido } from '../components/ui/DatePickerRestringido';
import {
  validarDocumento, validarTelefono, validarRangoHorario, ahoraLocal,
} from '../utils/validaciones';

const vacioPersona = {
  tipo_documento: 'CI', numero_documento: '', nombres: '',
  primer_apellido: '', segundo_apellido: '', telefono: '', procedencia: '',
};

const nombreCompleto = (p) =>
  [p?.nombres, p?.primer_apellido, p?.segundo_apellido].filter(Boolean).join(' ');

const DIAS_NOMBRE = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// =============================================================================
// Bloque Visitante
// =============================================================================
function BloqueVisitante({ valor, setValor, existe, setExiste, cfg }) {
  const [buscando, setBuscando] = useState(false);
  const [errores, setErrores] = useState({});
  const [busco, setBusco] = useState(false);
  const [noEncontrado, setNoEncontrado] = useState(false);

  const setCampo = (k, v) => {
    setValor({ ...valor, [k]: v });
    setErrores((e) => ({ ...e, [k]: undefined }));
  };

  const modoCreacion = busco && !existe;

  const buscar = async () => {
    const errDoc = validarDocumento(valor.numero_documento, cfg.DOCUMENTO_LONGITUD_MIN, cfg.DOCUMENTO_LONGITUD_MAX);
    if (errDoc) { setErrores({ numero_documento: errDoc }); return; }
    setBuscando(true); setNoEncontrado(false); setBusco(false);
    try {
      const { data } = await api.get('/personas/buscar', {
        params: { tipo: valor.tipo_documento, numero: valor.numero_documento.trim() },
      });
      const persona = data.data;
      setExiste(persona); setBusco(true);
      if (persona) {
        setValor({ ...valor, nombres: persona.nombres || '', primer_apellido: persona.primer_apellido || '',
          segundo_apellido: persona.segundo_apellido || '', telefono: persona.telefono || '',
          procedencia: persona.procedencia || '' });
        setNoEncontrado(false);
      } else {
        setNoEncontrado(true);
        setValor({ ...valor, nombres: '', primer_apellido: '', segundo_apellido: '', telefono: '', procedencia: '' });
      }
      setErrores({});
    } catch (e) {
      setErrores({ numero_documento: e.response?.data?.message || 'Error al buscar' });
    } finally { setBuscando(false); }
  };

  const esAnfitrion = existe?.es_anfitrion === true;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-3 flex items-center gap-2">
        <UserPlus size={16} className="text-brand-600 dark:text-brand-400" />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Visitante</h4>
      </div>
      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <Select label="Tipo doc." value={valor.tipo_documento}
            onChange={(e) => { setCampo('tipo_documento', e.target.value); setExiste(null); setBusco(false); setNoEncontrado(false); }}>
            <option>CI</option><option>PASAPORTE</option>
          </Select>
        </div>
        <div className="md:col-span-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">N° documento</span>
            <div className="relative">
              <input
                className={`block w-full rounded-lg border bg-white px-3 py-2 pr-20 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                  errores.numero_documento || esAnfitrion ? 'border-red-400 dark:border-red-500' : 'border-slate-300 focus:border-brand-500 dark:border-slate-700'}`}
                placeholder={`${cfg.DOCUMENTO_LONGITUD_MIN}–${cfg.DOCUMENTO_LONGITUD_MAX} caracteres`}
                maxLength={cfg.DOCUMENTO_LONGITUD_MAX}
                value={valor.numero_documento}
                onChange={(e) => { setCampo('numero_documento', e.target.value.toUpperCase()); setExiste(null); setBusco(false); setNoEncontrado(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }}
              />
              <button type="button" onClick={buscar}
                disabled={buscando || !valor.numero_documento.trim()}
                className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60">
                {buscando ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Buscar
              </button>
            </div>
            {errores.numero_documento && (
              <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{errores.numero_documento}</span>
            )}
          </label>
        </div>
        <div className="md:col-span-4">
          {esAnfitrion && (
            <div className="flex h-full items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
              <Ban size={16} className="mt-0.5 shrink-0" />
              <div><b>No puede ser visitante.</b><p className="mt-0.5">"{nombreCompleto(existe)}" está marcada como <b>anfitrión</b>.</p></div>
            </div>
          )}
          {existe && !esAnfitrion && (
            <div className="flex h-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <CheckCircle2 size={16} className="shrink-0" /><span><b>Persona ya registrada.</b> Se reutilizará.</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Input label="Nombres *" value={valor.nombres} disabled={!modoCreacion} error={errores.nombres}
               onChange={(e) => setCampo('nombres', e.target.value.toUpperCase())} />
        <Input label="Primer apellido *" value={valor.primer_apellido} disabled={!modoCreacion} error={errores.primer_apellido}
               onChange={(e) => setCampo('primer_apellido', e.target.value.toUpperCase())} />
        <Input label="Segundo apellido" value={valor.segundo_apellido} disabled={!modoCreacion}
               onChange={(e) => setCampo('segundo_apellido', e.target.value.toUpperCase())} />
        <Input label={`Teléfono (${cfg.TELEFONO_LONGITUD} dígitos)`} value={valor.telefono} disabled={!modoCreacion}
               error={errores.telefono} maxLength={cfg.TELEFONO_LONGITUD} inputMode="numeric"
               placeholder={`${cfg.TELEFONO_LONGITUD} dígitos`}
               onChange={(e) => { const limpio = e.target.value.replace(/\D/g, '').slice(0, cfg.TELEFONO_LONGITUD); setCampo('telefono', limpio); }} />
        <Input label="Procedencia" value={valor.procedencia} disabled={!modoCreacion}
               onChange={(e) => setCampo('procedencia', e.target.value)} />
      </div>
    </div>
  );
}

// =============================================================================
// Formulario principal
// =============================================================================
export default function NuevaAutorizacion({ onCreada, onCancel }) {
  const toast = useToast();
  const { usuario } = useAuth();
  const { parametros: cfg } = useParametros();

  // Roles normalizados
  const rolesUsuario = useMemo(() => {
    const arr = Array.isArray(usuario?.roles) ? usuario.roles : [];
    return arr.map((r) => (typeof r === 'string' ? r : r?.nombre)).filter(Boolean);
  }, [usuario]);

  const esSoloAnfitrion = rolesUsuario.length === 1 && rolesUsuario.includes('ANFITRION');
  const esOperador = rolesUsuario.includes('OPERADOR') && !esSoloAnfitrion;

  // Fallback para la persona del OPERADOR (por si el AuthContext no la trae)
  const [miPersona, setMiPersona] = useState(null);
  
  const miPersonaId = useMemo(() => {
    const raw = miPersona?.id ?? usuario?.persona?.id ?? usuario?.id_persona ?? usuario?.persona_id ?? null;
    const n = raw != null ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [miPersona, usuario]);

  const [visitante, setVisitante] = useState(vacioPersona);
  const [existeVisitante, setExisteVisitante] = useState(null);
  const [anfitriones, setAnfitriones] = useState([]);
  const [idAnfitrion, setIdAnfitrion] = useState('');
  const [anfitrionAutoAsignado, setAnfitrionAutoAsignado] = useState(null);
  const [lugares, setLugares] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  const [form, setForm] = useState({
    id_lugar: '', motivo: '', fecha_inicio: '', fecha_fin: '', observaciones: '',
  });

  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [conflicto, setConflicto] = useState(null);
  const [esExcepcion, setEsExcepcion] = useState(false);
  const [motivoExcepcion, setMotivoExcepcion] = useState('');

  const cfgSafe = useMemo(
    () => ({
      HORARIO_VISITA_INICIO: cfg.HORARIO_VISITA_INICIO || '08:30',
      HORARIO_VISITA_FIN: cfg.HORARIO_VISITA_FIN || '16:30',
      DIAS_VISITA_PERMITIDOS: cfg.DIAS_VISITA_PERMITIDOS || [1, 2, 3, 4, 5],
      DIAS_FERIADOS: cfg.DIAS_FERIADOS || [],
      TELEFONO_LONGITUD: cfg.TELEFONO_LONGITUD || 7,
      DOCUMENTO_LONGITUD_MIN: cfg.DOCUMENTO_LONGITUD_MIN || 5,
      DOCUMENTO_LONGITUD_MAX: cfg.DOCUMENTO_LONGITUD_MAX || 10,
      DURACION_MAX_VISITA_HORAS: cfg.DURACION_MAX_VISITA_HORAS || 12,
    }),
    [cfg]
  );

  // Intentar recuperar persona si no viene en el contexto
  useEffect(() => {
    if (!esOperador || miPersonaId) return;
    api.get('/auth/me')
      .then(({ data }) => {
        const p = data?.data?.persona ?? data?.persona ?? data?.data?.usuario?.persona;
        if (p?.id) setMiPersona(p);
      })
      .catch(() => console.warn('Endpoint /auth/me no disponible o no devuelve persona.'));
  }, [esOperador, miPersonaId]);

  // Cargar catálogos
  useEffect(() => {
    setCargandoCatalogos(true);
    Promise.all([
      api.get('/lugares', { params: { limit: 100 } }),
      esSoloAnfitrion ? Promise.resolve({ data: { data: [] } }) : api.get('/personas/anfitriones'),
    ]).then(([rLugares, rAnfitriones]) => {
      const activos = rLugares.data.data.items.filter((l) => l.estado === 'ACTIVO');
      setLugares(activos);
      setAnfitriones(rAnfitriones.data.data || []);
      if (activos.length > 0) setForm((f) => (f.id_lugar ? f : { ...f, id_lugar: String(activos[0].id) }));
    }).catch(() => toast.error('Error al cargar catálogos'))
      .finally(() => setCargandoCatalogos(false));
  }, []);

  // Inyectar persona del OPERADOR a la lista de anfitriones si no está
  const anfitrionesEfectivos = useMemo(() => {
    if (!esOperador || !miPersonaId) return anfitriones;
    const yaEsta = anfitriones.some((a) => Number(a.id) === miPersonaId);
    if (yaEsta) return anfitriones;

    const p = usuario?.persona ?? miPersona;
    if (!p) return anfitriones;

    return [{ ...p, es_anfitrion: true }, ...anfitriones];
  }, [esOperador, miPersonaId, anfitriones, usuario, miPersona]);

  // Prellenar Anfitrión
  useEffect(() => {
    if (esSoloAnfitrion) {
      const p = usuario?.persona ?? miPersona;
      if (!p) return toast.error('Tu usuario no tiene persona vinculada.');
      setIdAnfitrion(String(p.id));
      setAnfitrionAutoAsignado({ id: p.id, nombre: nombreCompleto(p) });
      return;
    }
    if (esOperador && miPersonaId && !idAnfitrion) {
      setIdAnfitrion(String(miPersonaId));
    }
  }, [esSoloAnfitrion, esOperador, miPersonaId]);

  const submit = async (e) => {
    e.preventDefault();
    if (conflicto) return toast.error('Existe un conflicto de horario.');
    if (!form.id_lugar) return setErrores({ id_lugar: 'Selecciona un lugar' });
    if (!idAnfitrion) return setErrores({ id_anfitrion: 'Selecciona un anfitrión' });
    if (!form.motivo.trim()) return setErrores({ motivo: 'El motivo es obligatorio' });

    let af = esSoloAnfitrion ? (usuario?.persona ?? miPersona) : anfitrionesEfectivos.find((a) => String(a.id) === String(idAnfitrion));
    if (!af) return toast.error('Anfitrión no encontrado');

    setEnviando(true);
    try {
      const payload = {
        visitante: existeVisitante || { ...visitante, numero_documento: visitante.numero_documento.trim().toUpperCase() },
        id_lugar: Number(form.id_lugar),
        motivo: form.motivo.trim(),
        fecha_inicio: new Date(form.fecha_inicio).toISOString(),
        fecha_fin: new Date(form.fecha_fin).toISOString(),
        es_excepcion: esExcepcion,
        motivo_excepcion: esExcepcion ? motivoExcepcion : null,
      };

      if (!esSoloAnfitrion) {
        payload.anfitrion = {
          tipo_documento: af.tipo_documento,
          numero_documento: af.numero_documento,
        };
      }

      await api.post('/autorizaciones', payload);
      toast.success('Autorización registrada');
      onCreada?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al registrar');
    } finally { setEnviando(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* DIAGNÓSTICO DE ROLES EN PANTALLA (Para que veas que está pasando) */}
      <div className="rounded-lg border border-red-300 bg-red-50 p-2 text-xs text-red-800 font-mono">
        <b>DIAGNÓSTICO DE USUARIO:</b><br/>
        Roles detectados: {JSON.stringify(rolesUsuario)} <br/>
        ¿Es Operador?: {esOperador ? 'SÍ' : 'NO'} <br/>
        ¿Tiene Persona ID?: {miPersonaId ?? 'NO (Revisar AuthContext)'} <br/>
        ¿AuthContext trae 'persona'?: {usuario?.persona ? 'SÍ' : 'NO'}
      </div>

      <BloqueVisitante valor={visitante} setValor={setVisitante} existe={existeVisitante} setExiste={setExisteVisitante} cfg={cfgSafe} />

      {/* ANFITRIÓN */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-brand-600" />
          <h4 className="text-sm font-semibold text-slate-700">Anfitrión</h4>
        </div>
        
        {esSoloAnfitrion ? (
           <div className="text-sm">Tú eres el anfitrión.</div>
        ) : (
          anfitrionesEfectivos.length === 0 ? (
            <div className="text-sm text-amber-600">No hay anfitriones registrados.</div>
          ) : (
            <>
              {esOperador && miPersonaId && String(idAnfitrion) === String(miPersonaId) && (
                <span className="mb-2 inline-block rounded bg-brand-100 px-2 py-1 text-[10px] text-brand-700">
                  Pre-asignado como tú
                </span>
              )}
              <PersonaCombo
                label="Selecciona al anfitrión *"
                value={idAnfitrion}
                onChange={setIdAnfitrion}
                personas={anfitrionesEfectivos}
                error={errores.id_anfitrion}
              />
            </>
          )
        )}
      </div>

      {/* DETALLES */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="grid gap-3 md:grid-cols-2">
          
          {/* AQUI ESTA EL CAMBIO DEL LUGAR COMBO */}
          <LugarCombo
            label="Lugar de visita *"
            value={form.id_lugar}
            onChange={(v) => setForm({ ...form, id_lugar: v })}
            lugares={lugares}
            placeholder="Buscar lugar por nombre o piso…"
            error={errores.id_lugar}
          />

          <Input label="Motivo *" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} error={errores.motivo} />

          <DatePickerRestringido
            label="Fecha/hora inicio *"
            value={form.fecha_inicio}
            onChange={(v) => setForm({ ...form, fecha_inicio: v })}
            min={ahoraLocal()}
            diasPermitidos={cfgSafe.DIAS_VISITA_PERMITIDOS}
            feriados={cfgSafe.DIAS_FERIADOS}
            horaInicio={cfgSafe.HORARIO_VISITA_INICIO}
            horaFin={cfgSafe.HORARIO_VISITA_FIN}
            pasoMinutos={15}
          />

          <DatePickerRestringido
            label="Fecha/hora fin *"
            value={form.fecha_fin}
            onChange={(v) => setForm({ ...form, fecha_fin: v })}
            min={form.fecha_inicio || ahoraLocal()}
            diasPermitidos={cfgSafe.DIAS_VISITA_PERMITIDOS}
            feriados={cfgSafe.DIAS_FERIADOS}
            horaInicio={cfgSafe.HORARIO_VISITA_INICIO}
            horaFin={cfgSafe.HORARIO_VISITA_FIN}
            pasoMinutos={15}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar y autorizar'}</Button>
      </div>
    </form>
  );
}