import React, { useState } from 'react';

// Types
interface WhatsAppConfig {
  whatsapp_number: string;
  webhook_url: string;
  api_key?: string;
  business_account_id?: string;
  phone_number_id?: string;
  whatsapp_app_secret?: string;
}

interface WhatsAppSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedAgent?: {
    id: string;
    user_id: string;
    user_name: string;
    user_email: string;
  } | null;
  initialConfig?: {
    whatsapp_number: string;
    webhook_url: string;
    api_key?: string;
    business_account_id?: string;
    phone_number_id?: string;
    whatsapp_app_secret?: string;
    is_active: boolean;
  } | null;
}

export const WhatsAppSetupModal: React.FC<WhatsAppSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedAgent,
  initialConfig
}) => {
  // Get token from localStorage
  const getToken = () => localStorage.getItem('auth_token');
  const [formData, setFormData] = useState<WhatsAppConfig>({
    whatsapp_number: "",
    webhook_url: "",
    api_key: "",
    business_account_id: "",
    phone_number_id: "",
    whatsapp_app_secret: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update formData when initialConfig changes (for configure mode)
  React.useEffect(() => {
    if (initialConfig) {
      setFormData({
        whatsapp_number: initialConfig.whatsapp_number || "",
        webhook_url: initialConfig.webhook_url || "",
        api_key: initialConfig.api_key || "",
        business_account_id: initialConfig.business_account_id || "",
        phone_number_id: initialConfig.phone_number_id || "",
        whatsapp_app_secret: initialConfig.whatsapp_app_secret || "",
      });
    } else {
      setFormData({
        whatsapp_number: "",
        webhook_url: "",
        api_key: "",
        business_account_id: "",
        phone_number_id: "",
        whatsapp_app_secret: "",
      });
    }
  }, [initialConfig]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.whatsapp_number.trim()) {
      setError('WhatsApp number is required');
      return false;
    }
    if (!formData.webhook_url.trim()) {
      setError('Webhook URL is required');
      return false;
    }
    // Basic URL validation for webhook
    try {
      new URL(formData.webhook_url);
    } catch {
      setError('Please enter a valid webhook URL');
      return false;
    }
    // WhatsApp number format validation (international format)
    const whatsappRegex = /^\+?[1-9]\d{1,14}$/;
    if (!whatsappRegex.test(formData.whatsapp_number.replace(/\D/g, ''))) {
      setError('Please enter a valid WhatsApp number (international format)');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    if (!selectedAgent) {
      setError('No agent selected for WhatsApp setup');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        user_id: selectedAgent.user_id,
        whatsapp_number: formData.whatsapp_number.trim(),
        webhook_url: formData.webhook_url.trim(),
        api_key: formData.api_key?.trim() || null,
        business_account_id: formData.business_account_id?.trim() || null,
        phone_number_id: formData.phone_number_id?.trim() || null,
        whatsapp_app_secret: formData.whatsapp_app_secret?.trim() || null,
      };

      const response = await fetch('http://localhost:8080/setup-whatsapp-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Failed to setup WhatsApp: ${data.message || 'Unknown error'}`);
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to setup WhatsApp configuration');
      }

      setSuccessMessage('WhatsApp configuration set up successfully!');
      onSuccess(); // Refresh agents list
      // Reset form to initial state
      setFormData({
        whatsapp_number: initialConfig?.whatsapp_number || "",
        webhook_url: initialConfig?.webhook_url || "",
        api_key: initialConfig?.api_key || "",
        business_account_id: initialConfig?.business_account_id || "",
        phone_number_id: initialConfig?.phone_number_id || "",
        whatsapp_app_secret: initialConfig?.whatsapp_app_secret || "",
      });
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error('WhatsApp setup error:', err);
      setError(err.message || 'Failed to setup WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccessMessage(null);
    // Reset to initial state or empty if no initial config
    setFormData({
      whatsapp_number: initialConfig?.whatsapp_number || "",
      webhook_url: initialConfig?.webhook_url || "",
      api_key: initialConfig?.api_key || "",
      business_account_id: initialConfig?.business_account_id || "",
      phone_number_id: initialConfig?.phone_number_id || "",
      whatsapp_app_secret: initialConfig?.whatsapp_app_secret || "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedAgent
              ? `Setup WhatsApp for ${selectedAgent.user_name}`
              : "Setup WhatsApp"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
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

        {/* Body */}
        <div className="p-6">
          {selectedAgent && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Selected Agent</h3>
              <p className="text-sm text-blue-800">
                <strong>Name:</strong> {selectedAgent.user_name}
              </p>
              <p className="text-sm text-blue-800">
                <strong>Email:</strong> {selectedAgent.user_email}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* WhatsApp Number */}
            <div>
              <label
                htmlFor="whatsapp_number"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                WhatsApp Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="whatsapp_number"
                name="whatsapp_number"
                value={formData.whatsapp_number}
                onChange={handleInputChange}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the international phone number (e.g., +1 234 567 8900)
              </p>
            </div>

            {/* Webhook URL */}
            <div>
              <label
                htmlFor="webhook_url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Webhook URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id="webhook_url"
                name="webhook_url"
                value={formData.webhook_url}
                onChange={handleInputChange}
                placeholder="https://yourdomain.com/webhook/whatsapp"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Your webhook endpoint to receive WhatsApp messages
              </p>
            </div>

            {/* Optional API Credentials */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                WhatsApp Business API Credentials (Optional)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                These will be stored securely and used for sending messages. You
                can add them later if needed.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="api_key"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    API Key
                  </label>
                  <input
                    type="password"
                    id="api_key"
                    name="api_key"
                    value={formData.api_key}
                    onChange={handleInputChange}
                    placeholder="Your WhatsApp Business API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="business_account_id"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Business Account ID
                  </label>
                  <input
                    type="text"
                    id="business_account_id"
                    name="business_account_id"
                    value={formData.business_account_id}
                    onChange={handleInputChange}
                    placeholder="Your WhatsApp Business Account ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="phone_number_id"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    id="phone_number_id"
                    name="phone_number_id"
                    value={formData.phone_number_id}
                    onChange={handleInputChange}
                    placeholder="Your WhatsApp Phone Number ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="whatsapp_app_secret"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    WhatsApp App Secret
                  </label>
                  <input
                    type="password"
                    id="whatsapp_app_secret"
                    name="whatsapp_app_secret"
                    value={formData.whatsapp_app_secret}
                    onChange={handleInputChange}
                    placeholder="Your WhatsApp App Secret from Meta Developer Console"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {successMessage}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !selectedAgent}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Setting up..." : "Setup WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );
};