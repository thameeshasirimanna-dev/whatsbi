import React, { useState } from 'react';
import { X } from 'lucide-react';
import Portal from '../shared/Portal';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: '#3f3f46',
  background: '#f9f9f9',
  border: '1px solid #ebebeb',
  borderRadius: 9,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 480, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
  
          {/* Header */}
          <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <span style={{ ...SYNE, fontSize: 17, fontWeight: 700, color: '#0c1a0e', display: 'block', marginBottom: 4 }}>
                Create Appointment
              </span>
              <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>
                For <strong style={{ color: '#3f3f46' }}>{customer.name}</strong> · {customer.phone}
              </span>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
              <X size={15} style={{ color: '#71717a' }} />
            </button>
          </div>
  
          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e', marginBottom: 16 }}>
                {error}
              </div>
            )}
  
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Title *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Appointment title" required maxLength={100} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
  
              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Date & Time *</label>
                <input type="datetime-local" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
  
              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Duration (minutes)</label>
                <input type="number" min="1" max="1440" value={durationMinutes} onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)} placeholder="30" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              </div>
  
              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
  
              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Notes (Optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Additional notes..." style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur} />
              </div>
  
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading || !title.trim() || !appointmentDate}
                  style={{ flex: 1, background: (loading || !title.trim() || !appointmentDate) ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: (loading || !title.trim() || !appointmentDate) ? 'not-allowed' : 'pointer', boxShadow: (loading || !title.trim() || !appointmentDate) ? 'none' : '0 4px 14px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
