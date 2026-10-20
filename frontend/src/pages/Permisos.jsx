import { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, ShieldCheck, Search } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useDebounce } from '../hooks/useDebounce';

export default function Permisos() {
  const toast = useToast();
  const [matriz, setMatriz] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);
  const [q, setQ] = useState('');
  const qDebounced = useDebounce(q, 400);

  const cargar = async () => {
    setLoading(true);
    try {
      const [rMatriz, rRoles] = await Promise.all([
        api.get('/permisos/matriz'),
        api.get('/roles'),
      ]);
      setMatriz(rMatriz.data.data);
      setRoles(rRoles.data.data);
    } catch {
      toast.error('No se pudo cargar la matriz de permisos');
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const toggleRol = (idPermiso, idRol) => {
    setMatriz((prev) =>
      prev.map((p) => {
        if (p.id !== idPermiso) return p;
        const tiene = p.roles.includes(idRol);
        return { ...p, roles: tiene ? p.roles.filter((r) => r !== idRol) : [...p.roles, idRol] };
      })
    );
  };

  const guardar = async (permiso) => {
    setGuardandoId(permiso.id);
    try {
      await api.put(`/permisos/${permiso.id}/roles`, { roles: permiso.roles });
      toast.success(`"${permiso.clave}" actualizado`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    } finally { setGuardandoId(null); }
  };

  const porModulo = useMemo(() => {
    const filtrados = qDebounced
      ? matriz.filter((p) =>
          p.clave.toLowerCase().includes(qDebounced.toLowerCase()) ||
          p.descripcion?.toLowerCase().includes(qDebounced.toLowerCase())
        )
      : matriz;
    return filtrados.reduce((acc, p) => {
      (acc[p.modulo] ||= []).push(p);
      return acc;
    }, {});
  }, [matriz, qDebounced]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Permisos por rol</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Define qué puede hacer cada rol. Cambios aplican en ≤60 s.
          </p>
        </div>
      </div>

      <Card>
        <div className="p-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Buscar por clave o descripción…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {loading && <Card><div className="p-12 text-center"><Loader2 className="mx-auto animate-spin text-slate-400" /></div></Card>}

      {!loading && Object.keys(porModulo).length === 0 && (
        <Card><div className="p-12 text-center text-slate-500">Sin permisos que mostrar.</div></Card>
      )}

      {!loading && Object.entries(porModulo).map(([modulo, permisos]) => (
        <Card key={modulo} className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600">{modulo}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Permiso</th>
                  {roles.map((r) => <th key={r.id} className="px-4 py-3 text-center">{r.nombre}</th>)}
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permisos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-slate-800">{p.clave}</p>
                      {p.descripcion && <p className="mt-0.5 text-xs text-slate-500">{p.descripcion}</p>}
                    </td>
                    {roles.map((r) => (
                      <td key={r.id} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          checked={p.roles.includes(Number(r.id))}
                          onChange={() => toggleRol(p.id, Number(r.id))}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => guardar(p)} disabled={guardandoId === p.id}>
                        {guardandoId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}