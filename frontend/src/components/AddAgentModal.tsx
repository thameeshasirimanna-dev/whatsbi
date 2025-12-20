// AddAgentModal.tsx
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void; // Callback for successful agent creation/update
  isEdit?: boolean;
  agentId?: string;
  initialData?: Partial<AgentFormData>;
  supabaseUrl?: string; // Edge Function base URL
  createdByUserId?: string; // Admin's users table ID (UUID)
}

interface AgentFormData {
  agent_name: string;
  email: string;
  business_type: 'product' | 'service';
  temp_password: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;

const AddAgentModal: React.FC<AddAgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isEdit = false,
  agentId,
  initialData = {},
  supabaseUrl = 'https://itvaqysqzdmwhucllktz.supabase.co',
  createdByUserId
}) => {
  const [formData, setFormData] = useState<AgentFormData>({
    agent_name: initialData.agent_name || '',
    email: initialData.email || '',
    business_type: (initialData as any).business_type || 'product',
    temp_password: initialData.temp_password || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Generate random password (8–12 chars)
  const generateTempPassword = (): string => {
    const length = Math.floor(Math.random() * 5) + 8;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = (data: AgentFormData, isEdit: boolean): string[] => {
    const fieldErrors: string[] = [];
    if (!data.agent_name.trim()) fieldErrors.push('Agent Name is required');
    if (!data.email.trim()) fieldErrors.push('Email is required');
    else if (!EMAIL_REGEX.test(data.email)) fieldErrors.push('Invalid email format');
    if (!data.business_type) fieldErrors.push('Business type is required');
    if (!isEdit && !data.temp_password) {
      fieldErrors.push('Password is required for new agents');
    } else if (data.temp_password && !PASSWORD_STRENGTH_REGEX.test(data.temp_password)) {
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
  
    // Prepare submit data (only agent fields)
    const submitData: any = {
      agent_name: formData.agent_name,
      email: formData.email,
      business_type: formData.business_type,
      temp_password: formData.temp_password
    };
    
    if (isEdit) {
      if (agentId) {
        submitData.agent_id = agentId;
      }
      // Don't include password if empty in edit mode
      if (!submitData.temp_password.trim()) {
        delete submitData.temp_password;
      }
    } else {
      submitData.createdBy = createdByUserId;
      if (!submitData.temp_password.trim()) {
        const generated = generateTempPassword();
        submitData.temp_password = generated;
        setGeneratedPassword(generated);
      }
    }
  
    const validationErrors = validateForm(submitData, isEdit);
    if (validationErrors.length > 0) {
      setError(validationErrors.join(', '));
      return;
    }
  
    setIsLoading(true);
  
    try {
      // Get current session token for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Please log in to continue');
        setIsLoading(false);
        return;
      }
      
      const endpoint = isEdit ? 'update-agent' : 'add-agent';
      const method = isEdit ? 'PATCH' : 'POST';
      
      const res = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      const data = await res.json();
  
      if (res.ok && data.success) {
        setSuccessMessage(isEdit ? 'Agent updated successfully!' : 'Agent added successfully!');
        
        // Show WhatsApp setup guidance for new agents
        if (!isEdit && data.whatsapp_config && data.whatsapp_config.info) {
          setSuccessMessage(`${successMessage}\n\n${data.whatsapp_config.info}`);
        }
        
        // Reset form
        if (isEdit) {
          setFormData({
            agent_name: initialData?.agent_name || '',
            email: initialData?.email || '',
            business_type: (initialData as any)?.business_type || 'product',
            temp_password: ''
          });
        } else {
          setFormData({
            agent_name: '',
            email: '',
            business_type: 'product',
            temp_password: ''
          });
        }
        
        setShowSuccess(true);
        
        // Call success callback immediately
        if (onSuccess) {
          onSuccess();
        }
        
        // Close modal after success display
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 3000);
      } else {
        setError(data.message || `Failed to ${isEdit ? 'update' : 'add'} agent`);
        console.error('Edge function failed:', data);
      }
    } catch (err: any) {
      console.error(`${isEdit ? 'Update' : 'Add'} agent error:`, err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !showSuccess) {
      setError('');
      if (isEdit) {
        setFormData({
          agent_name: initialData?.agent_name || '',
          email: initialData?.email || '',
          business_type: (initialData as any)?.business_type || 'product',
          temp_password: ''
        });
      } else {
        setFormData({
          agent_name: '',
          email: '',
          business_type: 'product',
          temp_password: ''
        });
      }
      setGeneratedPassword('');
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
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{successMessage}</h3>
              {generatedPassword && (
                <div className="bg-gray-50 p-3 rounded-md mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Generated Password:</p>
                  <p className="text-lg font-mono text-gray-900 bg-white px-2 py-1 rounded border">{generatedPassword}</p>
                  <p className="text-xs text-gray-500 mt-1">Share this with the agent securely</p>
                </div>
              )}
              {!isEdit && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3 text-sm">
                  <p className="text-blue-800 mb-1">
                    <strong>WhatsApp Setup:</strong> Agent created successfully! 
                    WhatsApp configuration can be set up separately from the agent dashboard.
                  </p>
                </div>
              )}
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
          // Form view - Only agent basic fields
          <>
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEdit ? 'Edit Agent' : 'Add New Agent'}
              </h2>
              {!isEdit && (
                <p className="text-sm text-gray-600 mt-1">
                  Create agent account. WhatsApp configuration can be set up separately later.
                </p>
              )}
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
                    type={isEdit ? 'email' : 'email'}
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
                    Select the type of business this agent will manage
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEdit ? 'New Password (Optional)' : 'Temporary Password *'}
                  </label>
                  <input
                    type="password"
                    name="temp_password"
                    value={formData.temp_password}
                    onChange={handleInputChange}
                    placeholder={isEdit ? 'Leave empty to keep current password' : 'Leave empty to auto-generate secure password'}
                    disabled={isLoading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required={!isEdit}
                  />
                  {!isEdit && (
                    <p className="text-xs text-gray-500 mt-1">
                      Leave empty to automatically generate a secure password
                    </p>
                  )}
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
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
                  }`}
                >
                  {isLoading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Agent' : 'Create Agent')}
                </button>
              </div>

              {!isEdit && (
                <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
                  <p>
                    WhatsApp configuration can be set up separately after agent creation 
                    from the agent management dashboard.
                  </p>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export { AddAgentModal };
export default AddAgentModal;
