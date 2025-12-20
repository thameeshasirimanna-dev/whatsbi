import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Callback for successful agent update
  agentId: string;
  initialData: {
    agent_name: string;
    email: string;
    business_type?: "product" | "service";
  };
  supabaseUrl?: string; // Edge Function base URL
  createdByUserId?: string; // Admin's users table ID (UUID)
}

interface AgentFormData {
  agent_name: string;
  email: string;
  business_type: "product" | "service";
  temp_password?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

const EditAgentModal: React.FC<EditAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  agentId,
  initialData,
  supabaseUrl = 'https://itvaqysqzdmwhucllktz.supabase.co',
  createdByUserId
}) => {
  const [formData, setFormData] = useState<AgentFormData>({
    agent_name: initialData.agent_name,
    email: initialData.email,
    business_type: initialData.business_type || "product",
    temp_password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Update form data when initialData changes
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        agent_name: initialData.agent_name,
        email: initialData.email,
        business_type: initialData.business_type || "product",
        temp_password: "",
      });
      setError('');
    }
  }, [isOpen, initialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (data: AgentFormData): string[] => {
    const fieldErrors: string[] = [];
    if (!data.agent_name.trim()) fieldErrors.push('Agent Name is required');
    if (!data.email.trim()) fieldErrors.push('Email is required');
    else if (!EMAIL_REGEX.test(data.email)) fieldErrors.push('Invalid email format');
    if (!data.business_type) fieldErrors.push("Business type is required");
    if (data.temp_password && !PASSWORD_STRENGTH_REGEX.test(data.temp_password)) {
      fieldErrors.push('Password must be at least 8 chars, with uppercase, lowercase, and number');
    }
    return fieldErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowSuccess(false);

    if (!createdByUserId) {
      setError('Admin user ID not available. Please refresh and try again.');
      return;
    }

    const submitData: any = {
      agent_name: formData.agent_name,
      email: formData.email,
      business_type: formData.business_type,
      agent_id: agentId,
      updated_by: createdByUserId,
    };
    
    // Only include password if provided
    if (formData.temp_password && formData.temp_password.trim()) {
      submitData.temp_password = formData.temp_password;
    }

    const validationErrors = validateForm(submitData);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }

    setIsLoading(true);

    try {
      // Get current user session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('User not authenticated. Please log in again.');
        setIsLoading(false);
        return;
      }

      const res = await fetch(`${backendUrl}/update-agent`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage('Agent updated successfully!');
        setShowSuccess(true);
        
        // Call success callback immediately
        if (onSuccess) {
          onSuccess();
        }
        
        // Close modal after success display
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 2000);
      } else {
        setError(data.message || 'Failed to update agent');
        console.error('Edge function failed:', data);
      }
    } catch (err: any) {
      console.error('Update agent error:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !showSuccess) {
      setError('');
      setFormData({
        agent_name: initialData.agent_name,
        email: initialData.email,
        business_type: initialData.business_type || "product",
        temp_password: "",
      });
      setShowSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          // Success popup view
          <div className="p-6 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {successMessage}
              </h3>
            </div>
            <div className="text-sm text-gray-500 mb-6">
              You will be redirected to the agents list shortly...
            </div>
            <div className="flex justify-center space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          // Form view - Only original agent fields
          <>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Agent
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Update agent basic information. WhatsApp configuration managed
                separately.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Agent Basic Information */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3 border-b border-gray-200 pb-2">
                  Agent Information
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    name="agent_name"
                    value={formData.agent_name}
                    onChange={handleInputChange}
                    placeholder="Enter agent full name"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="agent@example.com"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Type *
                  </label>
                  <select
                    name="business_type"
                    value={formData.business_type}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="service">Service</option>
                    <option value="product">Product</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select the type of business this agent manages
                  </p>
                </div>

                {/* Optional Password Field */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password (Optional)
                  </label>
                  <input
                    type="password"
                    name="temp_password"
                    value={formData.temp_password}
                    onChange={handleInputChange}
                    placeholder="Leave empty to keep current password"
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a new password to reset the agent's password. Leave
                    empty to keep current password.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isLoading
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
                  }`}
                >
                  {isLoading ? "Updating..." : "Update Agent"}
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
                <p>
                  WhatsApp configuration is managed separately from agent basic
                  information.
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export { EditAgentModal };
export default EditAgentModal;