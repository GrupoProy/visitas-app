import { useEffect, useState } from 'react';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import { useToast } from '../components/ui/Toast';
import { useMenus } from '../hooks/useMenus';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Menus() {
  const toast = useToast();
  const { invalidar } = useMenus();
  const { usuario } = useAuth();

  const [matriz, setMatriz] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const [rMatriz, rRoles] = await Promise.all([
        api.get('/menus/matriz'),
        api.get('/roles'),
      ]);
      setMatriz(rMatriz.data.data);
      setRoles(rRoles.data.data);
    } catch {
      toast.error('No se pudo cargar la matriz de menús');
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  const toggleRol = (idMenu, idRol) => {
    setMatriz((prev) =>
      prev.map((m) => {
        if (m.id !== idMenu) return m;
        const tiene = m.roles.includes(idRol);
        return {
          ...m,
          roles: tiene
            ? m.roles.filter((r) => r !== idRol)
            : [...m.roles, idRol],
        };
      })
    );
  };

  const guardar = async (menu) => {
    setGuardandoId(menu.id);
    try {
      await api.put(`/menus/${menu.id}/roles`, { roles: menu.roles });
      toast.success(`"${menu.etiqueta}" actualizado`);
      invalidar();  // limpia caché de menús para que se recarguen
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error al guardar');
    } finally { setGuardandoId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Menús por rol</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Define qué ve cada rol en el sidebar. Los cambios se aplican al recargar.
          </p>
        </div>
      </div>

      {loading ? (
        <Card><div className="p-12 text-center"><Loader2 className="mx-auto animate-spin text-slate-400" /></div></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Menú</th>
                  <th className="px-4 py-3">Ruta</th>
                  {roles.map((r) => (
                    <th key={r.id} className="px-4 py-3 text-center">{r.nombre}</th>
                  ))}
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matriz.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{m.etiqueta}</p>
                      <p className="text-xs text-slate-500">{m.grupo}</p>
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">{m.ruta}</code>
                    </td>
                    {roles.map((r) => (
                      <td key={r.id} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          checked={m.roles.includes(Number(r.id))}
                          onChange={() => toggleRol(m.id, Number(r.id))}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => guardar(m)}
                        disabled={guardandoId === m.id}
                      >
                        {guardandoId === m.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Save size={14} />}
                        Guardar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-xs text-slate-500">
        Sesión actual: <b>{usuario?.username}</b>. Si modificas el menú del rol de tu propio usuario,
        recarga el navegador para ver el cambio reflejado.
      </p>
    </div>
  );
}