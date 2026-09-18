import React, { useState, useEffect } from "react";
import { X, TrendingUp, Check } from "lucide-react";
import { getCustomers, updateCustomer } from "../../../lib/api";
import Portal from "../shared/Portal";
import CustomDropdown from "../shared/CustomDropdown";

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
  const progressLabel = currentConversionStage || currentInterestStage || currentLeadStage || 'New Lead';

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-[#16281D]/65 flex items-center justify-center p-2.5 sm:p-4 animate-modal-backdrop">
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-2xl w-full max-w-[min(28rem,95vw)] sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-modal-card">
          {/* Header */}
          <div className="shrink-0 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0 mr-2">
              <div className="w-8 h-8 rounded-xl bg-[#16281D] text-[#9FE870] flex items-center justify-center shrink-0">
                <TrendingUp size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="font-sans text-sm sm:text-base font-bold text-[#16281D] truncate">
                  {customerName ? `${customerName}'s Stage` : 'Lead Stage'}
                </h3>
                <p className="font-sans text-[11px] sm:text-xs text-[#71717A] truncate">
                  Update customer progression & status
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717A] hover:text-[#16281D] transition-colors border-0 cursor-pointer shrink-0"
              aria-label="Close modal"
            >
              <X size={15} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-7 h-7 rounded-full border-2 border-[#16281D]/20 border-t-[#16281D] animate-spin" />
              </div>
            ) : error ? (
              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2] font-sans text-xs text-[#EF4444] mb-4">
                {error}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Current Stage Capsule Card */}
                <div className="p-4 rounded-2xl bg-[#F4F7F4] border border-[#EAEAEA]">
                  <span className="block text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-1.5">
                    Current Progress
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-sans bg-[#16281D] text-[#9FE870]">
                    <Check size={12} />
                    <span>{progressLabel}</span>
                  </span>
                </div>

                {/* Stage Select Fields */}
                <div className="space-y-4">
                  {/* Lead Stage */}
                  <div>
                    <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                      Lead Stage <span className="text-[10px] font-medium text-[#71717A]">(Initial)</span>
                    </label>
                    <CustomDropdown
                      value={selectedLeadStage || ""}
                      onChange={(val) => handleStageChange("lead_stage", val)}
                      disabled={loading || updating}
                      options={leadStages.map((stage) => ({ value: stage, label: stage }))}
                      className="w-full"
                    />
                  </div>

                  {/* Interest Stage */}
                  <div>
                    <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                      Interest Stage <span className="text-[10px] font-medium text-[#71717A]">(Optional)</span>
                    </label>
                    <CustomDropdown
                      value={selectedInterestStage || ""}
                      onChange={(val) => handleStageChange("interest_stage", val)}
                      disabled={selectedLeadStage === "New Lead" || loading || updating}
                      options={[
                        { value: "", label: "No interest stage" },
                        ...interestStages.map((stage) => ({ value: stage, label: stage })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Conversion Stage */}
                  <div>
                    <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                      Conversion Stage <span className="text-[10px] font-medium text-[#71717A]">(Optional)</span>
                    </label>
                    <CustomDropdown
                      value={selectedConversionStage || ""}
                      onChange={(val) => handleStageChange("conversion_stage", val)}
                      disabled={!selectedInterestStage || loading || updating}
                      options={[
                        { value: "", label: "No conversion stage" },
                        ...conversionStages.map((stage) => ({ value: stage, label: stage })),
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                      Note <span className="text-[10px] font-medium text-[#71717A]">(Optional)</span>
                    </label>
                    <textarea
                      value={leadStageNote}
                      onChange={(e) => setLeadStageNote(e.target.value)}
                      disabled={loading || updating}
                      placeholder="Add a note about this lead's current stage..."
                      rows={3}
                      className="w-full px-3.5 py-2.5 text-sm font-sans text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 outline-none transition-all resize-none disabled:opacity-50 placeholder:text-[#A1A1AA]"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:flex-1 h-10 px-4 rounded-full bg-white border border-[#E4E4E7] hover:bg-[#F4F7F4] active:scale-[0.98] font-sans text-xs font-bold text-[#52525B] transition-all cursor-pointer flex items-center justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleStageUpdate}
                    disabled={submitDisabled}
                    className="w-full sm:flex-1 h-10 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_14px_rgba(159,232,112,0.35)] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer border-0"
                  >
                    {updating ? (
                      <span className="inline-block w-4 h-4 border-2 border-[#16281D]/20 border-t-[#16281D] rounded-full animate-spin" />
                    ) : (
                      'Update Stages'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default LeadStageModal;

