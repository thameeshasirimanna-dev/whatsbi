import React from 'react';
import { X } from 'lucide-react';
import { Appointment } from '../../../types';
import Portal from '../shared/Portal';

interface ViewAppointmentModalProps {
  appointment: Appointment;
  onClose: () => void;
}

const getStatusBadge = (status: string) => {
  const s = status.toLowerCase();
  let bg = 'bg-[#71717A]/10 text-[#71717A]';
  let dot = 'bg-[#71717A]';
  let label = s.charAt(0).toUpperCase() + s.slice(1);

  if (s === 'pending') {
    bg = 'bg-[#F59E0B]/10 text-[#B45309] border border-[#F59E0B]/20';
    dot = 'bg-[#F59E0B]';
  } else if (s === 'confirmed') {
    bg = 'bg-[#3B82F6]/10 text-[#1D4ED8] border border-[#3B82F6]/20';
    dot = 'bg-[#3B82F6]';
  } else if (s === 'completed') {
    bg = 'bg-[#22C55E]/10 text-[#15803D] border border-[#22C55E]/20';
    dot = 'bg-[#22C55E]';
  } else if (s === 'cancelled') {
    bg = 'bg-[#EF4444]/10 text-[#B91C1C] border border-[#EF4444]/20';
    dot = 'bg-[#EF4444]';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};

const ViewAppointmentModal: React.FC<ViewAppointmentModalProps> = ({ appointment, onClose }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#16281D]/65 animate-modal-backdrop">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_20px_50px_rgba(22,40,29,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-modal-card">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between shrink-0 bg-white">
            <h3 className="font-sans text-base font-bold text-[#16281D]">Appointment Details</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                Appointment ID
              </div>
              <div className="font-mono text-sm font-semibold text-[#16281D]">
                #{appointment.id.toString().padStart(4, '0')}
              </div>
            </div>

            <div className="h-px bg-[#EAEAEA]" />

            <div>
              <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                Customer
              </div>
              <div className="text-sm font-bold text-[#16281D]">{appointment.customer_name}</div>
              <div className="font-mono text-xs text-[#71717A] mt-0.5">{appointment.customer_phone}</div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                Title
              </div>
              <div className="text-sm font-medium text-[#16281D]">{appointment.title}</div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                Date & Time
              </div>
              <div className="font-mono text-sm text-[#16281D]">{formatDate(appointment.appointment_date)}</div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                Duration
              </div>
              <div className="font-mono text-sm text-[#16281D]">{appointment.duration_minutes} minutes</div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1.5">
                Status
              </div>
              {getStatusBadge(appointment.status)}
            </div>

            {appointment.notes && (
              <div>
                <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                  Notes
                </div>
                <div className="text-xs text-[#16281D] p-3 bg-[#F4F7F4] rounded-xl border border-[#EAEAEA] whitespace-pre-wrap">
                  {appointment.notes}
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1">
                Created
              </div>
              <div className="font-mono text-xs text-[#71717A]">
                {new Date(appointment.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#EAEAEA] flex justify-end shrink-0 bg-white">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ViewAppointmentModal;
