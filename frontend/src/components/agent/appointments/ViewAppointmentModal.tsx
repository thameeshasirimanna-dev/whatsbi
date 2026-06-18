import React from 'react';
import { X } from 'lucide-react';
import { Appointment } from '../../../types';
import Portal from '../shared/Portal';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const getStatusStyle = (status: string): React.CSSProperties => {
  const s = status.toLowerCase();
  if (s === 'pending') return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  if (s === 'confirmed') return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
  if (s === 'completed') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'cancelled') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

interface ViewAppointmentModalProps {
  appointment: Appointment;
  onClose: () => void;
}

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
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
  
          {/* Header */}
          <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...SYNE, fontSize: 17, fontWeight: 700, color: '#0c1a0e' }}>Appointment Details</span>
            <button onClick={onClose} style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} style={{ color: '#71717a' }} />
            </button>
          </div>
  
          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
  
              <div>
                <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Appointment #</div>
                <div style={{ ...DM, fontSize: 14, color: '#0c1a0e', fontWeight: 600 }}>#{appointment.id.toString().padStart(4, '0')}</div>
              </div>
  
              <div style={{ height: 1, background: '#f4f4f5' }} />
  
              <div>
                <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Customer</div>
                <div style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: '#0c1a0e' }}>{appointment.customer_name}</div>
                <div style={{ ...DM, fontSize: 12, color: '#71717a', marginTop: 2 }}>{appointment.customer_phone}</div>
              </div>
  
              <div>
                <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Title</div>
                <div style={{ ...DM, fontSize: 14, color: '#0c1a0e' }}>{appointment.title}</div>
              </div>
  
              <div>
                <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Date & Time</div>
                <div style={{ ...DM, fontSize: 14, color: '#0c1a0e' }}>{formatDate(appointment.appointment_date)}</div>
              </div>
  
              <div>
                <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Duration</div>
                <div style={{ ...DM, fontSize: 14, color: '#0c1a0e' }}>{appointment.duration_minutes} minutes</div>
              </div>
  
              <div>
                <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Status</div>
                <span style={{ ...DM, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 9999, ...getStatusStyle(appointment.status) }}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </span>
              </div>
  
              {appointment.notes && (
                <div>
                  <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</div>
                  <div style={{ ...DM, fontSize: 13, color: '#3f3f46', padding: '10px 12px', background: '#f9f9f9', borderRadius: 9, border: '1px solid #ebebeb' }}>{appointment.notes}</div>
                </div>
              )}
  
              <div>
                <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Created</div>
                <div style={{ ...DM, fontSize: 13, color: '#71717a' }}>{new Date(appointment.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          </div>
  
          {/* Footer */}
          <div style={{ flexShrink: 0, padding: '16px 24px', borderTop: '1px solid #ebebeb', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ViewAppointmentModal;
