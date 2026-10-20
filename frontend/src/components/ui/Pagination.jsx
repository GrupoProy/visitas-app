import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export const Pagination = ({ page, limit, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const desde = total === 0 ? 0 : (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
      <span>
        Mostrando <b>{desde}</b>–<b>{hasta}</b> de <b>{total}</b>
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary" size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={14} /> Anterior
        </Button>
        <span className="px-2 text-xs text-slate-500">
          Página {page} de {totalPages}
        </span>
        <Button
          variant="secondary" size="sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Siguiente <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
};