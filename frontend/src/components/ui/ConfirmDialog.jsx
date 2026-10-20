import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export const ConfirmDialog = ({
  open, onClose, onConfirm,
  title = 'Confirmar acción',
  message = '¿Estás seguro?',
  confirmLabel = 'Confirmar',
  variant = 'danger',
  loading = false,
}) => (
  <Modal open={open} onClose={onClose} title={title} size="sm">
    <div className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle size={20} />
      </div>
      <p className="pt-2 text-sm text-slate-700">{message}</p>
    </div>
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
      <Button variant={variant} onClick={onConfirm} disabled={loading}>
        {confirmLabel}
      </Button>
    </div>
  </Modal>
);