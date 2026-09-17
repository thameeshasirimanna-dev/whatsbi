import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, X } from 'lucide-react';
import Portal from '../shared/Portal';
import CustomDropdown from '../shared/CustomDropdown';
import StageSelects from './StageSelects';
import {
  modalVariants, inputStyle, selectStyle, onFocusG, onBlurG,
  countryCodes, PJS, MONO
} from './CustomerTypes';

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    name: string;
    phone: string;
    lead_stage: string;
    interest_stage: string;
    conversion_stage: string;
  };
  selectedCountryCode: string;
  onFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCountryChange: (code: string) => void;
  onStageChange: (field: "lead_stage" | "interest_stage" | "conversion_stage", value: string) => void;
  onSubmit: () => void;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  form,
  selectedCountryCode,
  onFormChange,
  onCountryChange,
  onStageChange,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
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
                maxWidth: 460,
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
                      background: 'rgba(159,232,112,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UserPlus size={16} style={{ color: '#16281D' }} />
                  </div>
                  <span style={{ ...PJS, fontSize: 16, fontWeight: 700, color: '#16281D' }}>
                    Add New Customer
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

              {/* Form Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div>
                  <label
                    style={{
                      ...PJS,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#16281D',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={onFormChange}
                    placeholder="Full name"
                    style={inputStyle}
                    onFocus={onFocusG}
                    onBlur={onBlurG}
                  />
                </div>

                <div>
                  <label
                    style={{
                      ...PJS,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#16281D',
                      display: 'block',
                      marginBottom: 5,
                    }}
                  >
                    Phone Number *
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <CustomDropdown
                      value={selectedCountryCode}
                      onChange={(val) => onCountryChange(val)}
                      options={countryCodes.map((c) => ({ value: c.value, label: c.label }))}
                      minWidth={110}
                      maxWidth={120}
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={onFormChange}
                      placeholder="Phone number"
                      style={inputStyle}
                      onFocus={onFocusG}
                      onBlur={onBlurG}
                    />
                  </div>
                  <div style={{ ...MONO, fontSize: 11, color: '#71717A', marginTop: 4 }}>
                    Full: {selectedCountryCode} {form.phone}
                  </div>
                </div>

                <StageSelects
                  leadStage={form.lead_stage}
                  interestStage={form.interest_stage}
                  conversionStage={form.conversion_stage}
                  onLeadChange={(v) => onStageChange("lead_stage", v)}
                  onInterestChange={(v) => onStageChange("interest_stage", v)}
                  onConversionChange={(v) => onStageChange("conversion_stage", v)}
                />
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
                  onClick={onSubmit}
                  disabled={!form.name.trim() || !form.phone.trim()}
                  style={{
                    flex: 1,
                    background: !form.name.trim() || !form.phone.trim() ? '#EAEAEA' : '#9FE870',
                    color: '#16281D',
                    border: 'none',
                    borderRadius: 9999,
                    padding: '10px 16px',
                    ...PJS,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: !form.name.trim() || !form.phone.trim() ? 'not-allowed' : 'pointer',
                    boxShadow:
                      !form.name.trim() || !form.phone.trim()
                        ? 'none'
                        : '0 4px 16px rgba(159,232,112,0.35)',
                  }}
                >
                  Create Customer
                </button>
              </div>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
};

export default CreateCustomerModal;
