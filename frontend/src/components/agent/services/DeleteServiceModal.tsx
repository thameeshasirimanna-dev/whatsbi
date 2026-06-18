import React from "react";
import type { ServiceWithPackages } from "../../../types";
import { X, AlertTriangle } from "lucide-react";
import Portal from "../shared/Portal";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface DeleteServiceModalProps {
  deletingServiceId: string | null;
  services: ServiceWithPackages[];
  onClose: () => void;
  onDelete: (id: string) => void;
}

const DeleteServiceModal: React.FC<DeleteServiceModalProps> = ({
  deletingServiceId,
  services,
  onClose,
  onDelete,
}) => {
  if (!deletingServiceId || !services.length) return null;
  const serviceToDelete = services.find(s => s.id === deletingServiceId);
  if (!serviceToDelete) return null;

  const handleConfirmDelete = () => {
    if (deletingServiceId) onDelete(deletingServiceId);
  };

  return (
    <Portal>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(244,63,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={15} style={{ color: '#f43f5e' }} />
            </div>
            <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#f43f5e' }}>Delete Service</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} style={{ color: '#71717a' }} />
          </button>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          <p style={{ ...DM, fontSize: 14, color: '#3f3f46', marginBottom: 10 }}>
            Delete <strong style={{ color: '#0c1a0e' }}>"{serviceToDelete.service_name}"</strong>?
          </p>
          <p style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 24 }}>
            This permanently deletes the service and all its packages. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="button" onClick={handleConfirmDelete}
              style={{ flex: 1, background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,63,94,0.3)' }}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </Portal>
  );
};

export default DeleteServiceModal;
