import clsx from 'clsx';

const variants = {
  primary:   'bg-emerald-600 hover:bg-emerald-800 text-white shadow-sm',
  secondary: 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
  ghost:     'bg-transparent hover:bg-slate-100 text-slate-700',
  success:   'bg-emerald-600 hover:bg-emerald-700 text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export const Button = ({
  children, variant = 'primary', size = 'md',
  className, ...props
}) => (
  <button
    className={clsx(
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition',
      'focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60 disabled:cursor-not-allowed',
      variants[variant], sizes[size], className
    )}
    {...props}
  >
    {children}
  </button>
);