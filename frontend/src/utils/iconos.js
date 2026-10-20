import {
  LayoutDashboard, ShieldCheck, Building2, Users, UserCog,
  Settings2, BarChart3,
} from 'lucide-react';

export const ICONOS = {
  dashboard:       BarChart3,
  autorizaciones:  LayoutDashboard,
  verificacion:    ShieldCheck,
  personas:        Users,
  lugares:         Building2,
  usuarios:        UserCog,
  parametros:      Settings2,
    shield: ShieldCheck,
      'bar-chart': BarChart3,
};

export const obtenerIcono = (clave) => ICONOS[clave] || ShieldCheck;