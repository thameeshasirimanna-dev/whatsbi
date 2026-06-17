import React, { useState, useEffect } from "react";
import { X, TrendingUp } from "lucide-react";
import { getCustomers, updateCustomer } from "../../../lib/api";

export type LeadStage =
  | "New Lead"
  | "Contacted"
  | "Not Responding"
  | "Follow-up Needed";

export type InterestStage =
  | "Interested"
  | "Quotation Sent"
  | "Asked for More Info";

export type ConversionStage = "Payment Pending" | "Paid" | "Order Confirmed";

interface LeadStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerPhone: string | null;
  customerName: string;
  agentPrefix: string | null;
  agentId: number | null;
  onStageUpdate?: (newStages: {
    lead_stage: LeadStage;
    interest_stage: InterestStage | null;
    conversion_stage: ConversionStage | null;
  }) => void;
  onRefreshConversations?: () => void;
}

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const selectStyle: React.CSSProperties = {
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
  appearance: 'none',
  cursor: 'pointer',
};

const disabledSelectStyle: React.CSSProperties = {
  ...selectStyle,
  background: '#f4f4f5',
  color: '#a1a1aa',
  cursor: 'not-allowed',
};

const onFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

const getProgressStyle = (type: 'conversion' | 'interest' | 'lead'): React.CSSProperties => {
  if (type === 'conversion') return { background: 'rgba(34,197,94,0.1)', color: '#059669', border: '1px solid rgba(34,197,94,0.2)' };
  if (type === 'interest') return { background: 'rgba(217,119,6,0.1)', color: '#d97706', border: '1px solid rgba(217,119,6,0.2)' };
  return { background: 'rgba(8,145,178,0.1)', color: '#0891b2', border: '1px solid rgba(8,145,178,0.2)' };
};

const LeadStageModal: React.FC<LeadStageModalProps> = ({
  isOpen,
  onClose,
  customerPhone,
  customerName,
  agentPrefix,
  agentId,
  onStageUpdate,
  onRefreshConversations,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [currentLeadStage, setCurrentLeadStage] = useState<LeadStage | null>(null);
  const [currentInterestStage, setCurrentInterestStage] = useState<InterestStage | null>(null);
  const [currentConversionStage, setCurrentConversionStage] = useState<ConversionStage | null>(null);
  const [selectedLeadStage, setSelectedLeadStage] = useState<LeadStage>("New Lead");
  const [selectedInterestStage, setSelectedInterestStage] = useState<InterestStage | null>(null);
  const [selectedConversionStage, setSelectedConversionStage] = useState<ConversionStage | null>(null);
  const [leadStageNote, setLeadStageNote] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const leadStages: LeadStage[] = ["New Lead", "Contacted", "Not Responding", "Follow-up Needed"];
  const interestStages: InterestStage[] = ["Interested", "Quotation Sent", "Asked for More Info"];
  const conversionStages: ConversionStage[] = ["Payment Pending", "Paid", "Order Confirmed"];

  const handleStageChange = (
    field: "lead_stage" | "interest_stage" | "conversion_stage",
    value: string
  ) => {
    if (field === "lead_stage") {
      setSelectedLeadStage(value as LeadStage);
      if (value === "New Lead") {
        setSelectedInterestStage(null);
        setSelectedConversionStage(null);
      }
    } else if (field === "interest_stage") {
      setSelectedInterestStage(value ? (value as InterestStage) : null);
      if (!value) setSelectedConversionStage(null);
    } else if (field === "conversion_stage") {
      setSelectedConversionStage(value ? (value as ConversionStage) : null);
    }
  };

  useEffect(() => {
    if (isOpen && customerPhone && agentPrefix && agentId) {
      fetchCustomerData();
    }
  }, [isOpen, customerPhone, agentPrefix, agentId]);

  const fetchCustomerData = async () => {
    if (!customerPhone || !agentPrefix || !agentId) return;

    setLoading(true);
    setError(null);

    try {
      const cleanPhoneQuery = customerPhone.replace(/\D/g, "");
      const customers = await getCustomers({ search: cleanPhoneQuery });
      const customerData = customers.find((c) => {
        const cleanPhone = c.phone ? c.phone.replace(/\D/g, "") : "";
        return cleanPhone === cleanPhoneQuery;
      });

      if (!customerData) {
        setError("Customer not found");
        setLoading(false);
        return;
      }

      setCustomerId(customerData.id);
      setCurrentLeadStage((customerData.lead_stage as LeadStage) || "New Lead");
      setCurrentInterestStage((customerData.interest_stage as InterestStage) || null);
      setCurrentConversionStage((customerData.conversion_stage as ConversionStage) || null);
      setSelectedLeadStage((customerData.lead_stage as LeadStage) || "New Lead");
      setSelectedInterestStage((customerData.interest_stage as InterestStage) || null);
      setSelectedConversionStage((customerData.conversion_stage as ConversionStage) || null);
      setLeadStageNote(customerData.lead_stage_note || "");
    } catch (err: any) {
      setError("Failed to fetch customer data: " + err.message);
      console.error("Error fetching customer data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStageUpdate = async () => {
    if (!customerId || !agentPrefix || !selectedLeadStage || !agentId) return;

    setUpdating(true);
    setError(null);

    try {
      await updateCustomer({
        id: customerId,
        lead_stage: selectedLeadStage,
        interest_stage: selectedInterestStage,
        conversion_stage: selectedConversionStage,
        lead_stage_note: leadStageNote.trim() || null,
      });

      setCurrentLeadStage(selectedLeadStage);
      setCurrentInterestStage(selectedInterestStage);
      setCurrentConversionStage(selectedConversionStage);

      if (onStageUpdate) {
        onStageUpdate({
          lead_stage: selectedLeadStage,
          interest_stage: selectedInterestStage,
          conversion_stage: selectedConversionStage,
        });
      }

      if (onRefreshConversations) {
        onRefreshConversations();
      }

      onClose();
    } catch (err: any) {
      setError("Failed to update stages: " + err.message);
      console.error("Error updating stages:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  const submitDisabled = !selectedLeadStage || updating || loading;

  const progressType = currentConversionStage ? 'conversion' : currentInterestStage ? 'interest' : 'lead';
  const progressLabel = currentConversionStage || currentInterestStage || currentLeadStage || 'New Lead';

  return (
    <>
      <style>{`@keyframes lsm-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 440, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={16} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', display: 'block' }}>
                  {customerName ? `${customerName}'s Stage` : 'Lead Stage'}
                </span>
                <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>Update customer progression</span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}
            >
              <X size={15} style={{ color: '#71717a' }} />
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #ebebeb', borderTopColor: '#22c55e', animation: 'lsm-spin 0.7s linear infinite' }} />
              </div>
            ) : error ? (
              <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e', marginBottom: 16 }}>
                {error}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Current Progress */}
                <div style={{ background: '#f9f9f9', borderRadius: 12, border: '1px solid #ebebeb', padding: '14px 16px' }}>
                  <span style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Current Progress</span>
                  <span style={{ ...DM, fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 20, display: 'inline-block', ...getProgressStyle(progressType) }}>
                    {progressLabel}
                  </span>
                </div>

                {/* Stage Selects */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Lead Stage */}
                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>
                      Lead Stage
                      <span style={{ marginLeft: 6, fontSize: 11, padding: '2px 7px', borderRadius: 20, ...getProgressStyle('lead') }}>Initial</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedLeadStage || ""}
                        onChange={(e) => handleStageChange("lead_stage", e.target.value)}
                        disabled={loading || updating}
                        style={loading || updating ? disabledSelectStyle : selectStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      >
                        {leadStages.map((stage) => (
                          <option key={stage} value={stage}>{stage}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Interest Stage */}
                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>
                      Interest Stage
                      <span style={{ marginLeft: 6, fontSize: 11, padding: '2px 7px', borderRadius: 20, ...getProgressStyle('interest') }}>Optional</span>
                    </label>
                    <select
                      value={selectedInterestStage || ""}
                      onChange={(e) => handleStageChange("interest_stage", e.target.value)}
                      disabled={selectedLeadStage === "New Lead" || loading || updating}
                      style={(selectedLeadStage === "New Lead" || loading || updating) ? disabledSelectStyle : selectStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    >
                      <option value="">No interest stage</option>
                      {interestStages.map((stage) => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  </div>

                  {/* Conversion Stage */}
                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>
                      Conversion Stage
                      <span style={{ marginLeft: 6, fontSize: 11, padding: '2px 7px', borderRadius: 20, ...getProgressStyle('conversion') }}>Optional</span>
                    </label>
                    <select
                      value={selectedConversionStage || ""}
                      onChange={(e) => handleStageChange("conversion_stage", e.target.value)}
                      disabled={!selectedInterestStage || loading || updating}
                      style={(!selectedInterestStage || loading || updating) ? disabledSelectStyle : selectStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    >
                      <option value="">No conversion stage</option>
                      {conversionStages.map((stage) => (
                        <option key={stage} value={stage}>{stage}</option>
                      ))}
                    </select>
                  </div>

                  {/* Note */}
                  <div>
                    <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>
                      Note
                      <span style={{ marginLeft: 6, fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'rgba(113,113,122,0.08)', color: '#71717a', border: '1px solid rgba(113,113,122,0.15)' }}>Optional</span>
                    </label>
                    <textarea
                      value={leadStageNote}
                      onChange={(e) => setLeadStageNote(e.target.value)}
                      disabled={loading || updating}
                      placeholder="Add a note about this lead's current stage…"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: loading || updating ? '#a1a1aa' : '#3f3f46',
                        background: loading || updating ? '#f4f4f5' : '#f9f9f9',
                        border: '1px solid #ebebeb',
                        borderRadius: 9,
                        outline: 'none',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        cursor: loading || updating ? 'not-allowed' : 'text',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                        lineHeight: 1.5,
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStageUpdate}
                    disabled={submitDisabled}
                    style={{ flex: 1, background: submitDisabled ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: submitDisabled ? 'not-allowed' : 'pointer', boxShadow: submitDisabled ? 'none' : '0 4px 14px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    {updating ? (
                      <>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'lsm-spin 0.7s linear infinite' }} />
                        Updating…
                      </>
                    ) : 'Update Stages'}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LeadStageModal;
