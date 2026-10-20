import { ArrowRight } from 'lucide-react';
import clsx from 'clsx';

const PALETAS = {
  purple: {
    border: 'border-t-purple-500',
    iconBg: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 ring-purple-200',
    cta: 'text-purple-700 group-hover:text-purple-800',
    arrow: 'bg-purple-500 group-hover:bg-purple-600',
    blur: 'bg-purple-100/50',
  },
  teal: {
    border: 'border-t-teal-600',
    iconBg: 'bg-teal-600',
    badge: 'bg-teal-50 text-teal-700 ring-teal-200',
    cta: 'text-teal-700 group-hover:text-teal-800',
    arrow: 'bg-teal-600 group-hover:bg-teal-700',
    blur: 'bg-teal-100/50',
  },
  blue: {
    border: 'border-t-blue-600',
    iconBg: 'bg-blue-600',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
    cta: 'text-blue-700 group-hover:text-blue-800',
    arrow: 'bg-blue-600 group-hover:bg-blue-700',
    blur: 'bg-blue-100/50',
  },
  green: {
    border: 'border-t-emerald-600',
    iconBg: 'bg-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cta: 'text-emerald-700 group-hover:text-emerald-800',
    arrow: 'bg-emerald-600 group-hover:bg-emerald-700',
    blur: 'bg-emerald-100/50',
  },
  brand: {
    border: 'border-t-brand-600',
    iconBg: 'bg-brand-600',
    badge: 'bg-brand-50 text-brand-700 ring-brand-200',
    cta: 'text-brand-700 group-hover:text-brand-800',
    arrow: 'bg-brand-600 group-hover:bg-brand-700',
    blur: 'bg-brand-100/50',
  },
};

export const ActionCard = ({
  icon: Icon,
  badge,
  title,
  description,
  ctaLabel = 'Continuar',
  onClick,
  color = 'brand',
  disabled = false,
}) => {
  const p = PALETAS[color] || PALETAS.brand;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'group relative w-full overflow-hidden rounded-2xl border border-slate-200 border-t-4 bg-white p-5 text-left shadow-card transition',
        'hover:-translate-y-0.5 hover:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40',
        disabled && 'cursor-not-allowed opacity-60',
        p.border
      )}
    >
      {/* Ícono + badge */}
      <div className="mb-3 flex items-start justify-between">
        <div className={clsx('grid h-12 w-12 place-items-center rounded-xl text-white shadow-sm', p.iconBg)}>
          <Icon size={22} strokeWidth={2.2} />
        </div>

        {badge && (
          <span className={clsx(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
            p.badge
          )}>
            {badge}
          </span>
        )}
      </div>

      {/* ⭐ TÍTULO — no debe faltar */}
      {title && (
        <h3 className="text-lg font-bold text-slate-900 leading-tight">
          {title}
        </h3>
      )}

      {/* ⭐ DESCRIPCIÓN — no debe faltar */}
      {description && (
        <p className="mt-1.5 text-sm text-slate-500 leading-snug">
          {description}
        </p>
      )}

      {/* Footer: CTA + flecha */}
      <div className="mt-4 flex items-center justify-between">
        <span className={clsx('text-sm font-semibold transition', p.cta)}>
          {ctaLabel}
        </span>
        <span className={clsx(
          'grid h-9 w-9 place-items-center rounded-full text-white shadow-sm transition',
          p.arrow
        )}>
          <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>

      {/* Forma decorativa sutil */}
      <div
        aria-hidden="true"
        className={clsx(
          'pointer-events-none absolute -bottom-12 -right-12 h-32 w-32 rounded-full blur-2xl opacity-70',
          p.blur
        )}
      />
    </button>
  );
};