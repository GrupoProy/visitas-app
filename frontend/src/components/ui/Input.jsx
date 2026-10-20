import clsx from 'clsx';

export const Input = ({ label, error, className, ...props }) => (
  <label className="block">
    {label && (
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    )}
    <input
      className={clsx(
        'block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40',
        error ? 'border-red-400' : 'border-slate-300 focus:border-brand-500',
        className
      )}
      {...props}
    />
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);

export const Select = ({ label, error, className, children, ...props }) => (
  <label className="block">
    {label && (
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    )}
    <select
      className={clsx(
        'block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm',
        'focus:outline-none focus:ring-2 focus:ring-brand-500/40',
        error ? 'border-red-400' : 'border-slate-300 focus:border-brand-500',
        className
      )}
      {...props}
    >
      {children}
    </select>
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);

export const Textarea = ({ label, error, className, ...props }) => (
  <label className="block">
    {label && (
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    )}
    <textarea
      className={clsx(
        'block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40',
        error ? 'border-red-400' : 'border-slate-300 focus:border-brand-500',
        className
      )}
      {...props}
    />
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);