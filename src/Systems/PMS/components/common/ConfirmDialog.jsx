import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {isDanger && (
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <p className="text-xs text-slate-600 leading-relaxed pt-1">{message}</p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
