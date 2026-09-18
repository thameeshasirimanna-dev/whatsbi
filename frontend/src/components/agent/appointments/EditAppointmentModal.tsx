import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Appointment } from '../../../types';
import Portal from '../shared/Portal';
import CustomDropdown from '../shared/CustomDropdown';
import { DateTimePicker } from '../shared/DateTimePicker';

interface UpdateAppointmentData {
  title?: string;
  appointment_date?: string;
  duration_minutes?: number;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

interface EditAppointmentModalProps {
  appointment: Appointment;
  updateAppointment: (id: number, data: UpdateAppointmentData) => Promise<void>;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  appointment,
  updateAppointment,
  onClose,
  onSuccess,
}) => {
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [title, setTitle] = useState(appointment.title);
  const [appointmentDate, setAppointmentDate] = useState(
    formatLocalDateTime(new Date(appointment.appointment_date))
  );
  const [durationMinutes, setDurationMinutes] = useState(appointment.duration_minutes);
  const [status, setStatus] = useState(appointment.status);
  const [notes, setNotes] = useState(appointment.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    setTitle(appointment.title);
    setAppointmentDate(formatLocalDateTime(new Date(appointment.appointment_date)));
    setDurationMinutes(appointment.duration_minutes);
    setStatus(appointment.status);
    setNotes(appointment.notes || '');
  }, [appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    const parsedDate = new Date(appointmentDate);
    if (isNaN(parsedDate.getTime()) || parsedDate < new Date()) {
      setError('Appointment date must be a valid future date');
      return;
    }

    if (durationMinutes <= 0 || durationMinutes > 1440) {
      setError('Duration must be between 1 and 1440 minutes');
      return;
    }

    if (!statusOptions.some((opt) => opt.value === status)) {
      setError('Invalid status');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData: UpdateAppointmentData = {
        title: title.trim(),
        appointment_date: parsedDate.toISOString(),
        duration_minutes: durationMinutes,
        status,
        notes: notes.trim() || undefined,
      };

      await updateAppointment(appointment.id, updateData);
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      setError(`Failed to update appointment: ${errorMessage}`);
      console.error('Appointment update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled = loading || !title.trim() || !appointmentDate;

  return (
    <Portal>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#16281D]/65 animate-modal-backdrop">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_20px_50px_rgba(22,40,29,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-modal-card">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between shrink-0 bg-white">
            <div>
              <h3 className="font-sans text-base font-bold text-[#16281D]">Edit Appointment</h3>
              <p className="font-sans text-xs text-[#71717A] mt-0.5">
                <span className="font-medium text-[#16281D]">{appointment.customer_name}</span> · {appointment.customer_phone}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {error && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-medium">
                {error}
              </div>
            )}

            <form id="edit-appointment-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Appointment title"
                  required
                  maxLength={100}
                  className="w-full h-10 px-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Date & Time *
                </label>
                <DateTimePicker
                  value={appointmentDate || null}
                  onChange={(val) => setAppointmentDate(val || '')}
                  placeholder="Select appointment date & time..."
                  className="w-full"
                  variant="mint"
                  outputFormat="datetime-local"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                  placeholder="30"
                  className="w-full h-10 px-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Status
                </label>
                <CustomDropdown
                  value={status}
                  onChange={(val) => setStatus(val as any)}
                  options={statusOptions.map((option) => ({ value: option.value, label: option.label }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full p-3 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all resize-none"
                />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-3 sm:px-6 sm:py-4 border-t border-[#EAEAEA] flex items-center justify-end gap-2.5 shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-appointment-form"
              disabled={submitDisabled}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer border-0"
            >
              {loading ? 'Updating…' : 'Update Appointment'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default EditAppointmentModal;
