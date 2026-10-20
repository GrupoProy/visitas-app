// pages/CambiarPassword.jsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// ---------------------------------------------------------------------------
// Política (sincronizada con el backend)
// ---------------------------------------------------------------------------
const SIMBOLO_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

const REQUISITOS = [
  { key: 'longitud',  texto: 'Mínimo 8 caracteres',        test: (p) => p.length >= 8 },
  { key: 'mayuscula', texto: 'Al menos una mayúscula',     test: (p) => /[A-Z]/.test(p) },
  { key: 'minuscula', texto: 'Al menos una minúscula',     test: (p) => /[a-z]/.test(p) },
  { key: 'numero',    texto: 'Al menos un número',         test: (p) => /\d/.test(p) },
  { key: 'simbolo',   texto: 'Al menos un símbolo',        test: (p) => SIMBOLO_REGEX.test(p) },
];

export default function CambiarPassword() {
  const { usuario, changePassword, logout } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    passwordActual: '',
    passwordNueva: '',
    passwordConfirmar: '',
  });
  const [ver, setVer] = useState({ actual: false, nueva: false, confirmar: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const toggleVer = (campo) => setVer((v) => ({ ...v, [campo]: !v[campo] }));

  // Evaluación en vivo
  const checks = useMemo(
    () => Object.fromEntries(REQUISITOS.map((r) => [r.key, r.test(form.passwordNueva)])),
    [form.passwordNueva]
  );
  const passOk = Object.values(checks).every(Boolean);
  const coinciden = form.passwordNueva === form.passwordConfirmar;
  const distintaDeActual =
    form.passwordNueva.length > 0 &&
    form.passwordNueva !== form.passwordActual;

  const puedeEnviar =
    !loading &&
    form.passwordActual.length > 0 &&
    passOk &&
    coinciden &&
    distintaDeActual;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    // Validaciones locales
    if (!coinciden) {
      setError('La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (!distintaDeActual) {
      setError('La nueva contraseña no puede ser igual a la actual.');
      return;
    }
    if (!passOk) {
      setError('La contraseña no cumple la política de seguridad.');
      return;
    }

    setLoading(true);
    try {
      await changePassword({
        passwordActual: form.passwordActual,
        passwordNueva: form.passwordNueva,
      });
      setInfo('Contraseña actualizada. Redirigiendo al login…');
      setTimeout(() => nav('/login', { replace: true }), 1200);
    } catch (err) {
      const detalles = err.response?.data?.detalles;
      setError(
        Array.isArray(detalles) && detalles.length > 0
          ? detalles
          : err.response?.data?.message ||
              err.message ||
              'No se pudo cambiar la contraseña'
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelar = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  const nombreCompleto =
    [usuario?.nombres, usuario?.primer_apellido].filter(Boolean).join(' ') ||
    usuario?.username ||
    '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldCheck size={26} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Cambio de contraseña obligatorio
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {nombreCompleto ? `Hola ${nombreCompleto}, ` : ''}
            por seguridad debe establecer una nueva contraseña antes de continuar.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl border border-slate-300 bg-white p-6 shadow-card"
        >
          {/* Contraseña actual */}
          <div className="relative">
            <Input
              label="Contraseña actual"
              type={ver.actual ? 'text' : 'password'}
              placeholder="••••••••"
              autoFocus
              value={form.passwordActual}
              onChange={(e) => setForm({ ...form, passwordActual: e.target.value })}
            />
            <button
              type="button"
              onClick={() => toggleVer('actual')}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {ver.actual ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Nueva contraseña */}
          <div className="relative">
            <Input
              label="Nueva contraseña"
              type={ver.nueva ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.passwordNueva}
              onChange={(e) => setForm({ ...form, passwordNueva: e.target.value })}
            />
            <button
              type="button"
              onClick={() => toggleVer('nueva')}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {ver.nueva ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Requisitos en vivo */}
          <ul className="rounded-lg bg-slate-50 px-3 py-2 text-xs space-y-0.5">
            {REQUISITOS.map((r) => {
              const ok = checks[r.key];
              return (
                <li
                  key={r.key}
                  className={ok ? 'text-emerald-700' : 'text-slate-600'}
                >
                  {ok ? '✓' : '○'} {r.texto}
                </li>
              );
            })}
          </ul>

          {/* Confirmar */}
          <div className="relative">
            <Input
              label="Confirmar nueva contraseña"
              type={ver.confirmar ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.passwordConfirmar}
              onChange={(e) => setForm({ ...form, passwordConfirmar: e.target.value })}
              error={
                form.passwordConfirmar.length > 0 && !coinciden
                  ? 'No coincide con la nueva contraseña'
                  : undefined
              }
            />
            <button
              type="button"
              onClick={() => toggleVer('confirmar')}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
              tabIndex={-1}
            >
              {ver.confirmar ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Error (string o lista) */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {Array.isArray(error) ? (
                <ul className="list-disc space-y-0.5 pl-5">
                  {error.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              ) : (
                error
              )}
            </div>
          )}

          {/* Info */}
          {info && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {info}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-1/3"
              onClick={cancelar}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="lg"
              className="w-2/3"
              disabled={!puedeEnviar}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Guardando…' : 'Cambiar contraseña'}
            </Button>
          </div>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1 text-center text-xs text-slate-400">
          <KeyRound size={12} />
          Cámara de Senadores — Sistema de Visitas
        </p>
      </div>
    </div>
  );
}