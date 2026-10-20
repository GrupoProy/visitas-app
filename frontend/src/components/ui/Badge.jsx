import clsx from 'clsx';
import { metaDe, META_VERIFICACION } from '../../utils/estadosMeta';

/**
 * @param {Object} props
 * @param {string} props.estado   Valor del estado (ej. 'ACTIVO')
 * @param {string} [props.modulo] 'usuario' | 'persona' | 'lugar' | 'autorizacion'
 * @param {string} [props.tipo]   'verificacion' para estados de puerta
 */
export const Badge = ({ estado, modulo, tipo, children }) => {
  // Estados de verificación usan su propia metadata
  const meta = tipo === 'verificacion'
    ? (META_VERIFICACION[estado] || null)
    : (modulo ? metaDe(modulo, estado) : null);

  const badgeClass =
    meta?.badge ||
    'bg-slate-100 text-slate-700 ring-slate-200';

  const puntoClass = meta?.punto;

  return (
    <span className={clsx(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      badgeClass
    )}>
      {puntoClass && <span className={clsx('h-1.5 w-1.5 rounded-full', puntoClass)} />}
      {children ?? meta?.label ?? estado}
    </span>
  );
};