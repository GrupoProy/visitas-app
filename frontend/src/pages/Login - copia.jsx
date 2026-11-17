// pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { homePorRol } from '../utils/homePorRol';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const usuario = await login(form.username, form.password);

      if (usuario?.debe_cambiar_password) {
        nav('/cambiar-password', { replace: true });
      } else {
        nav(homePorRol(usuario), { replace: true });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Error al iniciar sesión';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/1w.png')" }}
    >
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-950/60 via-red-900/30 to-transparent" />

      {/* Card (izquierda) */}
      <div className="relative z-10 ml-8 sm:ml-16 lg:ml-24 xl:ml-32">
        <div className="w-full max-w-[520px]">
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-red-950/85 to-red-950/95 px-8 py-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-xl">

            {/* ============================================== */}
            {/* IMAGEN BANNER HORIZONTAL                        */}
            {/* ============================================== */}
            <div className="mb-5 flex justify-center">
              <img
                src="/22rrhh.png"
                alt="Cámara de Senadores"
                className="h-32 w-auto max-w-[280px] object-contain"
              />
            </div>

            {/* ============================================== */}
            {/* TÍTULO COMPACTO                                 */}
            {/* ============================================== */}
            <div className="mb-5 text-center">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Sistema de Visitas
              </h1>
              <p className="mt-1 text-xs text-amber-100/70 leading-snug">
                Cámara de Senadores · Estado Plurinacional de Bolivia
              </p>
            </div>

            {/* ============================================== */}
            {/* FORMULARIO                                      */}
            {/* ============================================== */}
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-amber-100/80">
                  Usuario
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-200/60"
                  />
                  <input
                    type="text"
                    autoFocus
                    placeholder="admin"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    className="w-full rounded-lg border border-amber-500/20 bg-red-900/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-amber-200/40 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-amber-100/80">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-200/60"
                  />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-lg border border-amber-500/20 bg-red-900/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-amber-200/40 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-1.5 text-xs text-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-amber-400 to-amber-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:from-amber-500 hover:to-amber-700 hover:shadow-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Ingresando…
                  </>
                ) : (
                  <>
                    Ingresar
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-4 border-t border-amber-500/15 pt-3 text-center">
              <p className="text-[10px] text-amber-100/60">
                © {new Date().getFullYear()} Senado de Bolivia · v1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden flex-1 lg:block" />
    </div>
  );
}