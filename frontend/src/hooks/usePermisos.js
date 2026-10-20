import { useAuth } from '../context/AuthContext';

export const usePermisos = () => {
  const { usuario } = useAuth();
  const permisos = usuario?.permisos || [];

  return {
    permisos,
    tienePermiso: (clave) => permisos.includes(clave),
    tieneAlguno: (...claves) => claves.some((c) => permisos.includes(c)),
    tieneTodos: (...claves) => claves.every((c) => permisos.includes(c)),
  };
};