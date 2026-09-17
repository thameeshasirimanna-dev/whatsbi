import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import Portal from '../shared/Portal';
import { Customer, modalVariants, PJS } from './CustomerTypes';

interface DeleteCustomerModalProps {
  deletingCustomer: Customer | null;
  onClose: () => void;
  onConfirmDelete: (id: number) => void;
}

export const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  deletingCustomer,
  onClose,
  onConfirmDelete,
}) => {
  return (
    <AnimatePresence>
      {deletingCustomer && (
        <Portal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 18, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: 16,
            }}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                background: '#fff',
                borderRadius: 24,
                border: '1px solid #EAEAEA',
                boxShadow: '0 24px 64px rgba(22,40,29,0.18)',
                width: '100%',
                maxWidth: 420,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Header */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '20px 24px 16px',
                  borderBottom: '1px solid #EAEAEA',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: '#FEE2E2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={16} style={{ color: '#EF4444' }} />
                  </div>
                  <span style={{ ...PJS, fontSize: 16, fontWeight: 700, color: '#16281D' }}>
                    Delete Customer
                  </span>
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    background: '#F4F7F4',
                    border: '1px solid #EAEAEA',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={15} style={{ color: '#71717A' }} />
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ ...PJS, fontSize: 13, color: '#16281D', lineHeight: 1.5 }}>
                  Are you sure you want to delete <strong style={{ color: '#16281D' }}>{deletingCustomer.name}</strong>?
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <AlertTriangle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ ...PJS, fontSize: 12, color: '#B91C1C', lineHeight: 1.4 }}>
                    This action is permanent and cannot be undone. All orders, message history, and appointments associated with this customer will also be deleted.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  flexShrink: 0,
                  padding: '16px 24px',
                  borderTop: '1px solid #EAEAEA',
                  display: 'flex',
                  gap: 10,
                }}
              >
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    background: '#fff',
                    color: '#71717A',
                    border: '1px solid #EAEAEA',
                    borderRadius: 9999,
                    padding: '10px 16px',
                    ...PJS,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => onConfirmDelete(deletingCustomer.id)}
                  style={{
                    flex: 1,
                    background: '#EF4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '10px 16px',
                    ...PJS,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
                  }}
                >
                  Delete Customer
                </button>
              </div>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
};

export default DeleteCustomerModal;
