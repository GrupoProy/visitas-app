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
import { DatePickerRestringido } from '../components/ui/DatePickerRestringido';
import {
  validarDocumento,
  validarTelefono,
  validarRangoHorario,
  ahoraLocal,
} from '../utils/validaciones';

const vacioPersona = {
  tipo_documento: 'CI',
  numero_documento: '',
  nombres: '',
  primer_apellido: '',
  segundo_apellido: '',
  telefono: '',
  procedencia: '',
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
    const errDoc = validarDocumento(
      valor.numero_documento,
      cfg.DOCUMENTO_LONGITUD_MIN,
      cfg.DOCUMENTO_LONGITUD_MAX
    );
    if (errDoc) { setErrores({ numero_documento: errDoc }); return; }

    setBuscando(true);
    setNoEncontrado(false);
    setBusco(false);

    try {
      const { data } = await api.get('/personas/buscar', {
        params: { tipo: valor.tipo_documento, numero: valor.numero_documento.trim() },
      });
      const persona = data.data;
      setExiste(persona);
      setBusco(true);

      if (persona) {
        setValor({
          ...valor,
          nombres: persona.nombres || '',
          primer_apellido: persona.primer_apellido || '',
          segundo_apellido: persona.segundo_apellido || '',
          telefono: persona.telefono || '',
          procedencia: persona.procedencia || '',
        });
        setNoEncontrado(false);
      } else {
        setNoEncontrado(true);
        setValor({
          ...valor,
          nombres: '', primer_apellido: '', segundo_apellido: '',
          telefono: '', procedencia: '',
        });
      }
      setErrores({});
    } catch (e) {
      setErrores({ numero_documento: e.response?.data?.message || 'Error al buscar' });
    } finally {
      setBuscando(false);
    }
  };

  const esAnfitrion = existe?.es_anfitrion === true;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="mb-3 flex items-center gap-2">
        <UserPlus size={16} className="text-brand-600 dark:text-brand-400" />
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Visitante</h4>
        {modoCreacion && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <UserPlus2 size={10} /> Nueva persona
          </span>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <Select
            label="Tipo doc."
            value={valor.tipo_documento}
            onChange={(e) => {
              setCampo('tipo_documento', e.target.value);
              setExiste(null); setBusco(false); setNoEncontrado(false);
            }}
          >
            <option>CI</option>
            <option>PASAPORTE</option>
          </Select>
        </div>

        <div className="md:col-span-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              N° documento
            </span>
            <div className="relative">
              <input
                className={`block w-full rounded-lg border bg-white px-3 py-2 pr-20 text-sm shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                  errores.numero_documento || esAnfitrion
                    ? 'border-red-400 dark:border-red-500' : 'border-slate-300 focus:border-brand-500 dark:border-slate-700'
                }`}
                placeholder={`${cfg.DOCUMENTO_LONGITUD_MIN}–${cfg.DOCUMENTO_LONGITUD_MAX} caracteres`}
                maxLength={cfg.DOCUMENTO_LONGITUD_MAX}
                value={valor.numero_documento}
                onChange={(e) => {
                  setCampo('numero_documento', e.target.value.toUpperCase());
                  setExiste(null); setBusco(false); setNoEncontrado(false);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscar(); } }}
              />
              <button
                type="button"
                onClick={buscar}
                disabled={buscando || !valor.numero_documento.trim()}
                className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {buscando ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                Buscar
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
              <div>
                <b>No puede ser visitante.</b>
                <p className="mt-0.5">"{nombreCompleto(existe)}" está marcada como <b>anfitrión</b>.</p>
              </div>
            </div>
          )}
          {existe && !esAnfitrion && (
            <div className="flex h-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <CheckCircle2 size={16} className="shrink-0" />
              <span><b>Persona ya registrada.</b> Se reutilizará.</span>
            </div>
          )}
          {noEncontrado && !existe && (
            <div className="flex h-full items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <UserX size={16} className="mt-0.5 shrink-0" />
              <div>
                <b>Persona no registrada.</b>
                <p className="mt-0.5">Completa los datos para registrarla al autorizar.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Input label="Nombres *" value={valor.nombres} disabled={!modoCreacion}
               error={errores.nombres}
               onChange={(e) => setCampo('nombres', e.target.value.toUpperCase())} />
        <Input label="Primer apellido *" value={valor.primer_apellido} disabled={!modoCreacion}
               error={errores.primer_apellido}
               onChange={(e) => setCampo('primer_apellido', e.target.value.toUpperCase())} />
        <Input label="Segundo apellido" value={valor.segundo_apellido} disabled={!modoCreacion}
               onChange={(e) => setCampo('segundo_apellido', e.target.value.toUpperCase())} />
        <Input label={`Teléfono (${cfg.TELEFONO_LONGITUD} dígitos)`}
               value={valor.telefono} disabled={!modoCreacion}
               error={errores.telefono}
               maxLength={cfg.TELEFONO_LONGITUD}
               inputMode="numeric"
               placeholder={`${cfg.TELEFONO_LONGITUD} dígitos`}
               onChange={(e) => {
                 const limpio = e.target.value.replace(/\D/g, '').slice(0, cfg.TELEFONO_LONGITUD);
                 setCampo('telefono', limpio);
               }} />
        <Input label="Procedencia" value={valor.procedencia} disabled={!modoCreacion}
               onChange={(e) => setCampo('procedencia', e.target.value)} />
      </div>

      {!modoCreacion && !existe && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Ingresa el número de documento y presiona <b>Buscar</b> para verificar si la persona ya existe.
        </p>
      )}
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

  // ⭐ ¿Es un usuario con rol EXCLUSIVO ANFITRION?
  const esSoloAnfitrion =
    usuario?.roles?.length === 1 && usuario.roles.includes('ANFITRION');

  const [visitante, setVisitante] = useState(vacioPersona);
  const [existeVisitante, setExisteVisitante] = useState(null);

  const [anfitriones, setAnfitriones] = useState([]);
  const [idAnfitrion, setIdAnfitrion] = useState('');
  const [anfitrionAutoAsignado, setAnfitrionAutoAsignado] = useState(null);

  const [lugares, setLugares] = useState([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);

  const [form, setForm] = useState({
    id_lugar: '',
    motivo: '',
    fecha_inicio: '',
    fecha_fin: '',
    observaciones: '',
  });

  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [conflicto, setConflicto] = useState(null);

  const cfgSafe = useMemo(
    () => ({
      HORARIO_VISITA_INICIO: cfg.HORARIO_VISITA_INICIO || '08:30',
      HORARIO_VISITA_FIN: cfg.HORARIO_VISITA_FIN || '16:30',
      DIAS_VISITA_PERMITIDOS: cfg.DIAS_VISITA_PERMITIDOS || [1, 2, 3, 4, 5],
      DIAS_FERIADOS: cfg.DIAS_FERIADOS || [],
      TELEFONO_LONGITUD: cfg.TELEFONO_LONGITUD || 7,
      DOCUMENTO_LONGITUD_MIN: cfg.DOCUMENTO_LONGITUD_MIN || 5,
      DOCUMENTO_LONGITUD_MAX: cfg.DOCUMENTO_LONGITUD_MAX || 10,
    }),
    [cfg]
  );

  // ---------------------------------------------------------------------
  // Cargar catálogos (lugares + anfitriones)
  // ---------------------------------------------------------------------
  useEffect(() => {
    setCargandoCatalogos(true);
    Promise.all([
      api.get('/lugares', { params: { limit: 100 } }),
      esSoloAnfitrion
        ? Promise.resolve({ data: { data: [] } })
        : api.get('/personas/anfitriones'),
    ])
      .then(([rLugares, rAnfitriones]) => {
        const activos = rLugares.data.data.items.filter((l) => l.estado === 'ACTIVO');
        setLugares(activos);
        setAnfitriones(rAnfitriones.data.data || []);
        if (activos.length > 0) {
          setForm((f) => (f.id_lugar ? f : { ...f, id_lugar: String(activos[0].id) }));
        }
      })
      .catch(() => toast.error('No se pudieron cargar los catálogos'))
      .finally(() => setCargandoCatalogos(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------
  // Auto-asignar anfitrión cuando el usuario es solo ANFITRION
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (!esSoloAnfitrion) return;

    const persona = usuario?.persona;
    if (!persona) {
      toast.error('Tu usuario no está vinculado a una persona. Contacta al administrador.');
      return;
    }

    setIdAnfitrion(String(persona.id));
    setAnfitrionAutoAsignado({
      id: persona.id,
      nombre: nombreCompleto(persona),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esSoloAnfitrion, usuario?.persona]);

  // ---------------------------------------------------------------------
  // Verificar solapamiento
  // ---------------------------------------------------------------------
  useEffect(() => {
    let cancelado = false;
    const verificar = async () => {
      if (!form.fecha_inicio || !form.fecha_fin) { setConflicto(null); return; }
      if (!existeVisitante?.id) { setConflicto(null); return; }
      try {
        const idPersona = existeVisitante?.id || null;

        const { data } = await api.post('/autorizaciones/verificar-disponibilidad', {
          id_persona: idPersona,
          fecha_inicio: new Date(form.fecha_inicio).toISOString(),
          fecha_fin: new Date(form.fecha_fin).toISOString(),
        });

        if (cancelado) return;

        if (!data.data.disponible) {
          setConflicto({
            mensaje: data.data.motivo || 'Ya existe una programación en ese horario.',
            conflictos: data.data.conflictos || [],
          });
        } else {
          setConflicto(null);
        }
      } catch {
        if (!cancelado) setConflicto(null);
      }
    };
    verificar();
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fecha_inicio, form.fecha_fin, existeVisitante?.id]);

  // ---------------------------------------------------------------------
  // Validación
  // ---------------------------------------------------------------------
  const validar = () => {
    const errs = {};

    const errDoc = validarDocumento(
      visitante.numero_documento,
      cfgSafe.DOCUMENTO_LONGITUD_MIN,
      cfgSafe.DOCUMENTO_LONGITUD_MAX
    );
    if (errDoc) errs.visitante_numero_documento = errDoc;

    if (!existeVisitante) {
      if (!visitante.nombres.trim()) errs.visitante_nombres = 'Requerido';
      if (!visitante.primer_apellido.trim()) errs.visitante_primer_apellido = 'Requerido';
      const errTel = validarTelefono(visitante.telefono, cfgSafe.TELEFONO_LONGITUD);
      if (errTel) errs.visitante_telefono = errTel;
    }

    if (existeVisitante?.es_anfitrion) {
      errs.visitante = 'El visitante está marcado como anfitrión.';
    }

    if (!idAnfitrion) errs.id_anfitrion = 'Selecciona un anfitrión';
    if (!form.id_lugar) errs.id_lugar = 'Selecciona un lugar';
    if (!form.motivo.trim()) errs.motivo = 'El motivo es obligatorio';

    const errHorario = validarRangoHorario(form.fecha_inicio, form.fecha_fin, {
      inicio: cfgSafe.HORARIO_VISITA_INICIO,
      fin: cfgSafe.HORARIO_VISITA_FIN,
      diasPermitidos: cfgSafe.DIAS_VISITA_PERMITIDOS,
      diasFeriados: cfgSafe.DIAS_FERIADOS,
    });
    if (errHorario) errs.fecha_inicio = errHorario;

    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  // ---------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------
  const submit = async (e) => {
    e.preventDefault();

    if (conflicto) {
      toast.error('Existe una programación en ese horario. Ajusta las fechas.');
      return;
    }
    if (!validar()) {
      toast.error('Revisa los campos marcados');
      return;
    }

    // Validación defensiva
    if (!visitante.tipo_documento) {
      toast.error('Selecciona el tipo de documento del visitante');
      return;
    }
    if (!visitante.numero_documento?.trim()) {
      toast.error('Falta el número de documento del visitante');
      return;
    }
    if (!existeVisitante) {
      if (!visitante.nombres?.trim()) {
        toast.error('Falta el nombre del visitante');
        return;
      }
      if (!visitante.primer_apellido?.trim()) {
        toast.error('Falta el primer apellido del visitante');
        return;
      }
    }

    // Resolver anfitrión
    let af;
    if (esSoloAnfitrion) {
      af = usuario?.persona;
    } else {
      af = anfitriones.find((a) => String(a.id) === String(idAnfitrion));
    }

    if (!af) {
      toast.error('No se encontró el anfitrión seleccionado');
      return;
    }

    const faltantes = [];
    if (!af.tipo_documento)    faltantes.push('tipo de documento');
    if (!af.numero_documento)  faltantes.push('número de documento');
    if (!af.nombres)           faltantes.push('nombres');
    if (!af.primer_apellido)   faltantes.push('primer apellido');

    if (faltantes.length > 0) {
      toast.error(`Faltan en el anfitrión: ${faltantes.join(', ')}`);
      console.error('❌ Anfitrión incompleto:', af);
      return;
    }
    if (!form.fecha_inicio || !form.fecha_fin) {
      toast.error('Selecciona las fechas de inicio y fin');
      return;
    }

    setEnviando(true);
    try {
      const datosVisitante = existeVisitante
        ? {
            tipo_documento: existeVisitante.tipo_documento,
            numero_documento: existeVisitante.numero_documento,
            nombres: existeVisitante.nombres,
            primer_apellido: existeVisitante.primer_apellido,
            segundo_apellido: existeVisitante.segundo_apellido || null,
            telefono: existeVisitante.telefono || null,
            procedencia: existeVisitante.procedencia || null,
          }
        : {
            tipo_documento: visitante.tipo_documento,
            numero_documento: visitante.numero_documento.trim().toUpperCase(),
            nombres: visitante.nombres.trim(),
            primer_apellido: visitante.primer_apellido.trim(),
            segundo_apellido: visitante.segundo_apellido?.trim() || null,
            telefono: visitante.telefono?.trim() || null,
            procedencia: visitante.procedencia?.trim() || null,
          };

      const payload = {
  visitante: datosVisitante,
  id_lugar: Number(form.id_lugar),
  motivo: form.motivo.trim(),
  fecha_inicio: new Date(form.fecha_inicio).toISOString(),
  fecha_fin: new Date(form.fecha_fin).toISOString(),
  observaciones: form.observaciones.trim() || null,
};

// Solo si NO es solo anfitrión: enviar los datos del anfitrión
// (admin/operador seleccionan a quién asignar la visita)
if (!esSoloAnfitrion) {
  if (!af) {
    toast.error('Seleccioná un anfitrión');
    return;
  }
  payload.anfitrion = {
    tipo_documento: af.tipo_documento,
    numero_documento: af.numero_documento,
    nombres: af.nombres,
    primer_apellido: af.primer_apellido,
    segundo_apellido: af.segundo_apellido || null,
    email: af.email || null,
    procedencia: af.procedencia || null,
    es_anfitrion: true,
  };
}

      console.log('📤 Payload a enviar:', payload);

      await api.post('/autorizaciones', payload);
      toast.success('Autorización registrada correctamente');
      reset();
      onCreada?.();
    } catch (err) {
      console.error('❌ Error:', err.response?.data);
      toast.error(err.response?.data?.message || 'Error al registrar la autorización');
    } finally {
      setEnviando(false);
    }
  };

  const reset = () => {
    setVisitante(vacioPersona);
    setExisteVisitante(null);
    if (!esSoloAnfitrion) setIdAnfitrion('');
    setConflicto(null);
    setForm({
      id_lugar: lugares[0] ? String(lugares[0].id) : '',
      motivo: '',
      fecha_inicio: '',
      fecha_fin: '',
      observaciones: '',
    });
    setErrores({});
  };

  const diasTexto = cfgSafe.DIAS_VISITA_PERMITIDOS.map((d) => DIAS_NOMBRE[d]).join(', ');

  const visitanteValido = (() => {
    if (!visitante.numero_documento.trim()) return false;
    if (existeVisitante?.es_anfitrion) return false;
    if (existeVisitante) return true;
    return !!visitante.nombres.trim() && !!visitante.primer_apellido.trim();
  })();

  return (
    <form onSubmit={submit} className="space-y-5">
      <BloqueVisitante
        valor={visitante}
        setValor={setVisitante}
        existe={existeVisitante}
        setExiste={setExisteVisitante}
        cfg={cfgSafe}
      />

      {errores.visitante && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
          {errores.visitante}
        </div>
      )}

      {/* ANFITRIÓN */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mb-3 flex items-center gap-2">
          <UserPlus size={16} className="text-brand-600 dark:text-brand-400" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Anfitrión</h4>
          {esSoloAnfitrion && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              <Lock size={10} /> Autoasignado
            </span>
          )}
        </div>

        {esSoloAnfitrion ? (
          <>
            {anfitrionAutoAsignado ? (
              <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 dark:border-brand-800 dark:bg-brand-900/20">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {anfitrionAutoAsignado.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-brand-900 dark:text-brand-200">
                    {anfitrionAutoAsignado.nombre}
                  </p>
                  <p className="text-xs text-brand-700 dark:text-brand-300">
                    Tú serás el anfitrión de esta visita
                  </p>
                </div>
                <Info size={16} className="mt-1 shrink-0 text-brand-600 dark:text-brand-400" />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
                <AlertTriangle size={16} />
                <span>
                  Tu usuario no tiene una <b>persona vinculada</b>. Contacta al administrador
                  para que asigne tu perfil de anfitrión.
                </span>
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Como anfitrión, solo puedes crear visitas donde tú seas quien recibe al visitante.
            </p>
          </>
        ) : (
          anfitriones.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              No hay anfitriones registrados. Ve a <b>Personas</b> y marca al menos uno con
              la casilla <b>Es anfitrión</b>.
            </div>
          ) : (
            <PersonaCombo
              label="Selecciona al anfitrión que recibe la visita *"
              value={idAnfitrion}
              onChange={setIdAnfitrion}
              personas={anfitriones}
              placeholder="Buscar anfitrión por nombre, documento o procedencia…"
              error={errores.id_anfitrion}
            />
          )
        )}
      </div>

      {/* DETALLES DE LA VISITA */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="mb-3 flex items-center gap-2">
          <MapPin size={16} className="text-brand-600 dark:text-brand-400" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Detalles de la visita</h4>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300">
          <Clock size={14} className="mt-0.5 shrink-0" />
          <span>
            <b>Horario permitido:</b> {cfgSafe.HORARIO_VISITA_INICIO} a {cfgSafe.HORARIO_VISITA_FIN},
            {' '}días: <b>{diasTexto}</b>. Feriados excluidos.
          </span>
        </div>

        {conflicto && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div>
              <b>Conflicto:</b> {conflicto.mensaje}
              {conflicto.conflictos.length > 0 && (
                <ul className="mt-1 list-disc pl-4">
                  {conflicto.conflictos.map((c) => (
                    <li key={c.id}>
                      {new Date(c.fecha_inicio).toLocaleString('es-BO')} →{' '}
                      {new Date(c.fecha_fin).toLocaleString('es-BO')} ({c.estado})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Select
            label="Lugar de visita *"
            value={form.id_lugar}
            onChange={(e) => setForm({ ...form, id_lugar: e.target.value })}
            error={errores.id_lugar}
            disabled={cargandoCatalogos || lugares.length === 0}
          >
            {cargandoCatalogos && <option>Cargando lugares…</option>}
            {!cargandoCatalogos && lugares.length === 0 && (
              <option value="">No hay lugares activos</option>
            )}
            {!cargandoCatalogos && lugares.length > 0 && (
              <>
                <option value="">— Seleccionar —</option>
                {lugares.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}{l.piso ? ` (Piso ${l.piso})` : ''}
                  </option>
                ))}
              </>
            )}
          </Select>

          <Input
            label="Motivo *"
            placeholder="Ej. Reunión de proyecto"
            value={form.motivo}
            error={errores.motivo}
            onChange={(e) => setForm({ ...form, motivo: e.target.value })}
          />

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
            error={errores.fecha_inicio}
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
            error={errores.fecha_fin}
          />

          <div className="md:col-span-2">
            <Textarea
              label="Observaciones (opcional)"
              rows={3}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <CalendarClock size={14} className="mt-0.5 shrink-0" />
          <span>La autorización solo será válida dentro de la ventana horaria indicada.</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={enviando}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            enviando ||
            !!conflicto ||
            !visitanteValido ||
            !idAnfitrion ||
            (esSoloAnfitrion && !anfitrionAutoAsignado) ||
            cargandoCatalogos ||
            lugares.length === 0
          }
        >
          {enviando && <Loader2 size={16} className="animate-spin" />}
          {enviando ? 'Guardando…' : 'Registrar y autorizar'}
        </Button>
      </div>
    </form>
  );
}