import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Appointment } from '../../../types';
import Portal from '../shared/Portal';

interface DeleteAppointmentModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

const DeleteAppointmentModal: React.FC<DeleteAppointmentModalProps> = ({
  isOpen,
  appointment,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  if (!isOpen || !appointment) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16281D]/65 animate-modal-backdrop">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_20px_50px_rgba(22,40,29,0.15)] overflow-hidden flex flex-col animate-modal-card">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444]">
                <AlertTriangle size={18} />
              </div>
              <h3 className="font-sans text-base font-bold text-[#16281D]">Delete Appointment</h3>
            </div>
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-[#16281D] mb-1 leading-relaxed">
              Are you sure you want to delete <strong className="font-semibold">"{appointment.title}"</strong> for{' '}
              <strong className="font-semibold">{appointment.customer_name}</strong>?
            </p>
            <p className="text-xs text-[#71717A]">
              This action cannot be undone and will permanently remove this appointment.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#EAEAEA] flex items-center justify-end gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-5 py-2.5 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-6 py-2.5 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold shadow-[0_4px_16px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer border-0"
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DeleteAppointmentModal;
