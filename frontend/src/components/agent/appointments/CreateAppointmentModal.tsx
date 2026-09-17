import React, { useState } from 'react';
import { X } from 'lucide-react';
import Portal from '../shared/Portal';
import CustomDropdown from '../shared/CustomDropdown';
import { DateTimePicker } from '../shared/DateTimePicker';

const PJS: React.CSSProperties = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13,
  color: '#16281D',
  background: '#F4F7F4',
  border: '1px solid #EAEAEA',
  borderRadius: 12,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#9FE870';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(159,232,112,0.25)';
};
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#EAEAEA';
  e.currentTarget.style.boxShadow = 'none';
};

interface CreateAppointmentData {
  customer_id: number;
  title: string;
  appointment_date: string;
  duration_minutes?: number;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

interface CreateAppointmentModalProps {
  customer: {
    id: number;
    name: string;
    phone: string;
  };
  createAppointment: (data: CreateAppointmentData) => Promise<number | void>;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  customer,
  createAppointment,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

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

    if (!statusOptions.some(opt => opt.value === status)) {
      setError('Invalid status');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const appointmentData = {
        customer_id: customer.id,
        title: title.trim(),
        appointment_date: parsedDate.toISOString(),
        duration_minutes: durationMinutes,
        status: 'pending' as const,
        notes: notes.trim() || undefined
      };

      await createAppointment(appointmentData);
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error';
      setError(`Failed to create appointment: ${errorMessage}`);
      console.error('Appointment creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 110, background: 'rgba(22, 40, 29, 0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #EAEAEA', boxShadow: '0 24px 64px rgba(22,40,29,0.18)', width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
  
          {/* Header */}
          <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #EAEAEA', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ ...PJS, fontSize: 17, fontWeight: 700, color: '#16281D', display: 'block', marginBottom: 4 }}>
                Create Appointment
              </span>
              <span style={{ ...PJS, fontSize: 12, color: '#71717A' }}>
                For <strong style={{ color: '#16281D' }}>{customer.name}</strong> · {customer.phone}
              </span>
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, background: '#F4F7F4', border: '1px solid #EAEAEA', borderRadius: 9999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
              <X size={15} style={{ color: '#71717A' }} />
            </button>
          </div>
  
          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {error && (
              <div style={{ padding: '10px 14px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 12, ...PJS, fontSize: 13, color: '#EF4444', marginBottom: 16 }}>
                {error}
              </div>
            )}
  
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Appointment title" required maxLength={100} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
  
              <div>
                <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Date & Time *</label>
                <DateTimePicker
                  value={appointmentDate || null}
                  onChange={(val) => setAppointmentDate(val || '')}
                  placeholder="Select appointment date & time..."
                  className="w-full"
                  variant="mint"
                  outputFormat="datetime-local"
                  minDate={new Date().toISOString().split('T')[0]}
                />
              </div>
  
              <div>
                <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Duration (minutes)</label>
                <input type="number" min="1" max="1440" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)} placeholder="30" style={{ ...inputStyle, ...MONO }} onFocus={onFocus} onBlur={onBlur} />
              </div>
  
              <div>
                <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Status</label>
                <CustomDropdown
                  value={status}
                  onChange={(val) => setStatus(val)}
                  options={statusOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                  className="w-full"
                />
              </div>
  
              <div>
                <label style={{ ...PJS, fontSize: 12, fontWeight: 600, color: '#16281D', display: 'block', marginBottom: 6 }}>Notes (Optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional notes..." style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur} />
              </div>
  
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-full bg-white border border-[#EAEAEA] hover:bg-[#F4F7F4] font-sans text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !appointmentDate}
                  className="flex-1 py-2.5 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer border-0"
                >
                  {loading ? 'Creating…' : 'Create Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default CreateAppointmentModal;
