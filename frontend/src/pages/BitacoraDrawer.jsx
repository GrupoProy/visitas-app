import { useEffect, useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Loader2 } from 'lucide-react';
import { api } from '../api/client';

export default function BitacoraDrawer({ autorizacion, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!autorizacion) return;
    setLoading(true);
    api.get(`/autorizaciones/${autorizacion.id}/bitacora`)
      .then((r) => setItems(r.data.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [autorizacion]);

  if (!autorizacion) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-pop">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-rose-900">
              Bitácora de accesos
            </h2>
            <p className="text-xs text-rose-950">Código: {autorizacion.codigo}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="grid h-full place-items-center text-slate-500">
              <Loader2 className="animate-spin" />
            </div>
          )}
          {!loading && items.length === 0 && (
            <p className="text-center text-sm text-slate-500">
              Aún no hay movimientos registrados.
            </p>
          )}
          {!loading && items.length > 0 && (
            <ol className="relative border-l border-slate-200 pl-6">
              {items.map((b) => (
                <li key={b.id} className="mb-6 last:mb-0">
                  <span className="absolute -left-3 grid h-6 w-6 place-items-center rounded-full bg-white ring-1 ring-slate-200">
                    {b.tipo_movimiento === 'INGRESO' ? (
                      <ArrowDownRight size={14} className="text-emerald-600" />
                    ) : (
                      <ArrowUpRight size={14} className="text-amber-600" />
                    )}
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    {b.tipo_movimiento}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(b.fecha_creacion).toLocaleString('es-BO')}
                  </p>
                  {b.punto_acceso && (
                    <p className="text-xs text-slate-500">Punto: {b.punto_acceso}</p>
                  )}
                  {b.registrado_por && (
                    <p className="text-xs text-slate-500">Por: {b.registrado_por}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}