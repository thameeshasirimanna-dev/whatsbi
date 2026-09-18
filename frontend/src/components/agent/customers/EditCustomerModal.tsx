import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, X, Trash2 } from 'lucide-react';
import Portal from '../shared/Portal';
import CustomDropdown from '../shared/CustomDropdown';
import StageSelects from './StageSelects';
import {
  Customer, modalVariants, inputStyle, selectStyle, onFocusG, onBlurG,
  countryCodes, PJS, MONO
} from './CustomerTypes';

interface EditCustomerModalProps {
  editingCustomer: Customer | null;
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
  onDeleteTrigger: (customer: Customer) => void;
  onSubmit: () => void;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  editingCustomer,
  onClose,
  form,
  selectedCountryCode,
  onFormChange,
  onCountryChange,
  onStageChange,
  onDeleteTrigger,
  onSubmit,
}) => {
  return (
    <AnimatePresence>
      {editingCustomer && (
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
                className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#EAEAEA] flex items-center justify-between shrink-0"
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
                    <Pencil size={15} style={{ color: '#16281D' }} />
                  </div>
                  <div>
                    <span style={{ ...PJS, fontSize: 16, fontWeight: 700, color: '#16281D', display: 'block' }}>
                      Edit Customer
                    </span>
                    <span style={{ ...PJS, fontSize: 12, color: '#71717A' }}>
                      {editingCustomer.name}
                    </span>
                  </div>
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
                className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-3.5"
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
                    value={form.name || editingCustomer.name}
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <CustomDropdown
                      value={selectedCountryCode}
                      onChange={(val) => onCountryChange(val)}
                      options={countryCodes.map((c) => ({ value: c.value, label: c.label }))}
                      minWidth={110}
                      maxWidth={120}
                      className="w-full sm:w-auto"
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
                      className="flex-1"
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
                className="p-3 sm:px-6 sm:py-4 border-t border-[#EAEAEA] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0"
              >
                <button
                  onClick={() => onDeleteTrigger(editingCustomer)}
                  className="rounded-full px-4 py-2.5 bg-[#FEE2E2] hover:bg-[#FECACA] text-[#EF4444] font-sans text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0 w-full sm:w-auto"
                >
                  <Trash2 size={13} /> Delete
                </button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={onClose}
                    className="flex-1 sm:flex-none rounded-full px-4 py-2.5 bg-white border border-[#EAEAEA] text-[#71717A] hover:text-[#16281D] hover:bg-[#F4F7F4] font-sans text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSubmit}
                    disabled={!form.name.trim() || !form.phone.trim()}
                    className="flex-1 sm:flex-none rounded-full px-5 py-2.5 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] disabled:bg-[#EAEAEA] disabled:text-[#A1A1AA] disabled:shadow-none disabled:cursor-not-allowed transition-all cursor-pointer border-0"
                  >
                    Update Customer
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
};

export default EditCustomerModal;
