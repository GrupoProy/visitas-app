/**
 * Metadata visual de cada estado: label, badge, punto y acciones.
 * Los VALORES válidos se leen de la BD (parametro_sistema).
 */

// ─── Usuarios ───────────────────────────────────────────────────────
export const META_USUARIO = {
  ACTIVO: {
    label: 'Activo',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    punto: 'bg-emerald-500',
    acciones: ['editar', 'resetear_password', 'toggle', 'eliminar'],
  },
  INACTIVO: {
    label: 'Inactivo',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    punto: 'bg-slate-400',
    acciones: ['reactivar', 'eliminar'],
  },
  BLOQUEADO: {
    label: 'Bloqueado',
    badge: 'bg-red-100 text-red-800 ring-red-200',
    punto: 'bg-red-500',
    acciones: ['reactivar', 'eliminar'],
  },
  ELIMINADO: {
    label: 'Eliminado',
    badge: 'bg-slate-200 text-slate-700 ring-slate-300',
    punto: 'bg-slate-400',
    acciones: [],
  },
};

// ─── Personas ───────────────────────────────────────────────────────
export const META_PERSONA = {
  ACTIVO: {
    label: 'Activo',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    punto: 'bg-emerald-500',
    acciones: ['editar', 'toggle', 'eliminar'],
  },
  INACTIVO: {
    label: 'Inactivo',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    punto: 'bg-slate-400',
    acciones: ['reactivar', 'eliminar'],
  },
  ELIMINADO: {
    label: 'Eliminado',
    badge: 'bg-slate-200 text-slate-700 ring-slate-300',
    punto: 'bg-slate-400',
    acciones: [],
  },
};

// ─── Lugares ────────────────────────────────────────────────────────
export const META_LUGAR = {
  ACTIVO: {
    label: 'Activo',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    punto: 'bg-emerald-500',
    acciones: ['editar', 'toggle', 'eliminar'],
  },
  INACTIVO: {
    label: 'Inactivo',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    punto: 'bg-slate-400',
    acciones: ['reactivar', 'eliminar'],
  },
  ELIMINADO: {
    label: 'Eliminado',
    badge: 'bg-slate-200 text-slate-700 ring-slate-300',
    punto: 'bg-slate-400',
    acciones: [],
  },
};

// ─── Autorizaciones ─────────────────────────────────────────────────
export const META_AUTORIZACION = {
  PENDIENTE: {
    label: 'Pendiente',
    badge: 'bg-amber-100 text-amber-800 ring-amber-200',
    punto: 'bg-amber-500',
    acciones: ['aprobar', 'rechazar', 'editar', 'cancelar'],
  },
  APROBADA: {
    label: 'Aprobada',
    badge: 'bg-blue-100 text-blue-800 ring-blue-200',
    punto: 'bg-blue-500',
    acciones: ['rechazar', 'editar', 'cancelar', 'bitacora'],
  },
  EN_CURSO: {
    label: 'En curso',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    punto: 'bg-emerald-500',
    acciones: ['finalizar', 'cancelar', 'bitacora'],
  },
  FINALIZADA: {
    label: 'Finalizada',
    badge: 'bg-slate-100 text-slate-700 ring-slate-200',
    punto: 'bg-slate-400',
    acciones: ['bitacora'],
  },
  RECHAZADA: {
    label: 'Rechazada',
    badge: 'bg-red-100 text-red-800 ring-red-200',
    punto: 'bg-red-500',
    acciones: ['reactivar'],
  },
  CANCELADA: {
    label: 'Cancelada',
    badge: 'bg-slate-200 text-slate-700 ring-slate-300',
    punto: 'bg-slate-400',
    acciones: ['reactivar'],
  },
  EXPIRADA: {
    label: 'Expirada',
    badge: 'bg-violet-100 text-violet-800 ring-violet-200',
    punto: 'bg-violet-500',
    acciones: ['bitacora'],
  },
};

// ─── Parámetros ─────────────────────────────────────────────────────
export const META_PARAMETRO = {
  ACTIVO: {
    label: 'Activo',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    punto: 'bg-emerald-500',
    acciones: ['editar', 'toggle', 'eliminar'],
  },
  INACTIVO: {
    label: 'Inactivo',
    badge: 'bg-slate-100 text-slate-600 ring-slate-200',
    punto: 'bg-slate-400',
    acciones: ['reactivar', 'eliminar'],
  },
  ELIMINADO: {
    label: 'Eliminado',
    badge: 'bg-slate-200 text-slate-700 ring-slate-300',
    punto: 'bg-slate-400',
    acciones: [],
  },
};

// ─── Estados especiales (verificación) ──────────────────────────────
export const META_VERIFICACION = {
  PERMITIDO: {
    label: 'Permitido',
    badge: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    punto: 'bg-emerald-500',
  },
  DENEGADO: {
    label: 'Denegado',
    badge: 'bg-red-100 text-red-800 ring-red-200',
    punto: 'bg-red-500',
  },
};

// ─── Mapa por módulo ────────────────────────────────────────────────
export const META_POR_MODULO = {
  usuario:      META_USUARIO,
  persona:      META_PERSONA,
  lugar:        META_LUGAR,
  autorizacion: META_AUTORIZACION,
  parametro:    META_PARAMETRO,
};

export const metaDe = (modulo, estado) => {
  const mapa = META_POR_MODULO[modulo] || {};
  return mapa[estado] || {
    label: estado,
    badge: 'bg-slate-100 text-slate-700 ring-slate-200',
    punto: 'bg-slate-400',
    acciones: [],
  };
};

export const accionesDe = (modulo, estado) => {
  return metaDe(modulo, estado).acciones || [];
};