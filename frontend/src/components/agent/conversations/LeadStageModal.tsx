import React, { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export type LeadStage = 'New Lead' | 'Contacted' | 'Not Responding' | 'Follow-up Needed';

export type InterestStage = 'Interested' | 'Quotation Sent' | 'Asked for More Info';

export type ConversionStage = 'Payment Pending' | 'Paid' | 'Order Confirmed';

interface LeadStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerPhone: string | null;
  customerName: string;
  agentPrefix: string | null;
  agentId: number | null;
  onStageUpdate?: (newStages: { lead_stage: LeadStage; interest_stage: InterestStage | null; conversion_stage: ConversionStage | null }) => void;
}

const LeadStageModal: React.FC<LeadStageModalProps> = ({
  isOpen,
  onClose,
  customerPhone,
  customerName,
  agentPrefix,
  agentId,
  onStageUpdate,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [currentLeadStage, setCurrentLeadStage] = useState<LeadStage | null>(null);
  const [currentInterestStage, setCurrentInterestStage] = useState<InterestStage | null>(null);
  const [currentConversionStage, setCurrentConversionStage] = useState<ConversionStage | null>(null);
  const [selectedLeadStage, setSelectedLeadStage] = useState<LeadStage | null>(null);
  const [selectedInterestStage, setSelectedInterestStage] = useState<InterestStage | null>(null);
  const [selectedConversionStage, setSelectedConversionStage] = useState<ConversionStage | null>(null);
  const [updating, setUpdating] = useState(false);

  const leadStages: LeadStage[] = [
    'New Lead',
    'Contacted',
    'Not Responding',
    'Follow-up Needed',
  ];

  const interestStages: InterestStage[] = [
    'Interested',
    'Quotation Sent',
    'Asked for More Info',
  ];

  const conversionStages: ConversionStage[] = [
    'Payment Pending',
    'Paid',
    'Order Confirmed',
  ];
  
  const currentColor = currentConversionStage ? 'green' : currentInterestStage ? 'yellow' : 'blue';
  
  // Handle cascading stage logic
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
      if (!value) {
        setSelectedConversionStage(null);
      }
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
      // Find customer_id by phone
      const customersTable = `${agentPrefix}_customers`;
      const { data: customerData, error: customerError } = await supabase
        .from(customersTable)
        .select("id, lead_stage, interest_stage, conversion_stage")
        .eq("phone", customerPhone)
        .eq("agent_id", agentId)
        .single();

      if (customerError || !customerData) {
        setError("Customer not found");
        setLoading(false);
        return;
      }

      const customerId = customerData.id;
      setCustomerId(customerId);

      setCurrentLeadStage(customerData.lead_stage || 'New Lead');
      setCurrentInterestStage(customerData.interest_stage || null);
      setCurrentConversionStage(customerData.conversion_stage || null);
      setSelectedLeadStage(customerData.lead_stage || 'New Lead');
      setSelectedInterestStage(customerData.interest_stage || null);
      setSelectedConversionStage(customerData.conversion_stage || null);
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
      const customersTable = `${agentPrefix}_customers`;
      const { error } = await supabase
        .from(customersTable)
        .update({
          lead_stage: selectedLeadStage,
          interest_stage: selectedInterestStage || null,
          conversion_stage: selectedConversionStage || null
        })
        .eq("id", customerId)
        .eq("agent_id", agentId);

      if (error) throw error;

      // Update local state
      setCurrentLeadStage(selectedLeadStage);
      setCurrentInterestStage(selectedInterestStage);
      setCurrentConversionStage(selectedConversionStage);

      // Notify parent
      if (onStageUpdate) {
        onStageUpdate({
          lead_stage: selectedLeadStage,
          interest_stage: selectedInterestStage,
          conversion_stage: selectedConversionStage
        });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {customerName ? `${customerName}'s Lead Stage` : "Lead Stage"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">{error}</div>
          ) : (
            <>
              {/* Current Progress */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Current Progress</h3>
                <div className="space-y-1">
                  {currentConversionStage ? (
                    <span className="text-sm font-medium text-green-600">
                      🟢 {currentConversionStage}
                    </span>
                  ) : currentInterestStage ? (
                    <span className="text-sm font-medium text-yellow-600">
                      🟡 {currentInterestStage}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-blue-600">
                      🔵 {currentLeadStage || "New Lead"}
                    </span>
                  )}
                </div>
              </div>

              {/* Customer Progress Stages */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Customer Progress Stages
                </h4>
                <div className="space-y-3">
                  {/* Lead Stage */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Lead Stage 🔵
                    </label>
                    <select
                      value={selectedLeadStage || ""}
                      onChange={(e) => handleStageChange("lead_stage", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={loading || updating}
                    >
                      {leadStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Interest Stage */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Interest Stage 🟡
                    </label>
                    <select
                      value={selectedInterestStage || ""}
                      onChange={(e) => handleStageChange("interest_stage", e.target.value)}
                      disabled={selectedLeadStage === "New Lead" || loading || updating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Interest Stage</option>
                      {interestStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Conversion Stage */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Conversion Stage 🟢
                    </label>
                    <select
                      value={selectedConversionStage || ""}
                      onChange={(e) => handleStageChange("conversion_stage", e.target.value)}
                      disabled={!selectedInterestStage || loading || updating}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select Conversion Stage</option>
                      {conversionStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              
              {/* Update Button */}
              <button
                onClick={handleStageUpdate}
                disabled={!selectedLeadStage || updating || loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? "Updating..." : "Update Stages"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadStageModal;