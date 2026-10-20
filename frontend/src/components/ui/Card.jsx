import clsx from 'clsx';

export const Card = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white shadow-card dark:border-slate-800 dark:bg-slate-900 ${className}`}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, actions }) => (
  <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
    <div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions}
  </div>
);

export const CardBody = ({ className, children }) => (
  <div className={clsx('p-5', className)}>{children}</div>
);