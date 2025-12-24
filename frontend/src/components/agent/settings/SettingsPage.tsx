import React, { useState, useEffect } from "react";
import { getToken } from "../../../lib/auth";
import jsPDF from "jspdf";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const SettingsContent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [agent, setAgent] = useState<{
    id: number;
    name: string;
    whatsapp_number: string;
    address?: string;
    business_email?: string;
    contact_number?: string;
    website?: string;
    invoice_template_path?: string;
    credits?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [editingBusinessEmail, setEditingBusinessEmail] = useState(false);
  const [newBusinessEmail, setNewBusinessEmail] = useState("");
  const [editingContactNumber, setEditingContactNumber] = useState(false);
  const [newContactNumber, setNewContactNumber] = useState("");
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [newWebsite, setNewWebsite] = useState("");
  const [editingCredits, setEditingCredits] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [creditsMessage, setCreditsMessage] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [editingTemplate, setEditingTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentTemplate, setCurrentTemplate] = useState<string | null>(null);

  const [editingDocument, setEditingDocument] = useState(false);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState<File | null>(null);
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Get token for API calls
        const token = getToken();

        if (!token) {
          setError("User not authenticated");
          return;
        }

        // Fetch agent profile data from backend
        const response = await fetch(`${backendUrl}/get-agent-profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Failed to fetch agent profile");
          console.error(data);
          return;
        }

        const agentData = data.agent;
        setUser({
          id: agentData.id,
          email: agentData.email,
        });

        setAgent({
          ...agentData,
          credits: parseFloat(agentData.credits) || 0,
        });
        setNewName(agentData.name);
        setNewAddress(agentData.address || "");
        setNewBusinessEmail(agentData.business_email || "");
        setNewContactNumber(agentData.contact_number || "");
        setNewWebsite(agentData.website || "");
        setCurrentTemplate(agentData.invoice_template_path || null);
      } catch (err) {
        setError("Failed to load user data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleNameUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateMessage("");
    setError(null);

    if (!agent || !user) {
      setUpdateMessage("Error: Agent data not loaded");
      return;
    }

    if (newName.trim().length < 2) {
      setUpdateMessage("Name must be at least 2 characters");
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setUpdateMessage("Authentication required");
        return;
      }

      const response = await fetch(`${backendUrl}/update-agent-details`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agent.id,
          user_updates: { name: newName.trim() },
          agent_updates: {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUpdateMessage(`Error: ${data.message || "Update failed"}`);
        console.error(data);
      } else if (data.success) {
        setAgent({ ...agent, name: newName.trim() });
        setUpdateMessage("Name updated successfully!");
        setEditingName(false);
      } else {
        setUpdateMessage(data.message || "Update failed");
      }
    } catch (err) {
      setUpdateMessage("Failed to update name");
      console.error(err);
    }
  };

  const handleAgentDetailUpdate = async (
    field: "address" | "business_email" | "contact_number" | "website",
    value: string
  ) => {
    setUpdateMessage("");
    setError(null);

    if (!agent || !user) {
      setUpdateMessage("Error: Agent data not loaded");
      return;
    }

    if (value.trim().length === 0) {
      setUpdateMessage("Field cannot be empty");
      return;
    }

    if (field === "business_email" && !value.includes("@")) {
      setUpdateMessage("Please enter a valid email");
      return;
    }

    if (field === "contact_number" && !/^\+?[\d\s-()]{10,}$/.test(value)) {
      setUpdateMessage("Please enter a valid contact number");
      return;
    }

    if (field === "website" && !/^https?:\/\/.+/.test(value)) {
      setUpdateMessage(
        "Please enter a valid website URL starting with http:// or https://"
      );
      return;
    }

    const updates: any = {};
    updates[field] = value.trim();

    try {
      const token = getToken();
      if (!token) {
        setUpdateMessage("Authentication required");
        return;
      }

      const response = await fetch(`${backendUrl}/update-agent-details`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agent.id,
          user_updates: {},
          agent_updates: updates,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUpdateMessage(`Error: ${data.message || "Update failed"}`);
        console.error(data);
      } else if (data.success) {
        setAgent({ ...agent, [field]: value.trim() });
        const fieldName =
          field.charAt(0).toUpperCase() + field.slice(1).replace("_", " ");
        setUpdateMessage(`${fieldName} updated successfully!`);
        // Close editing for this field
        if (field === "address") setEditingAddress(false);
        if (field === "business_email") setEditingBusinessEmail(false);
        if (field === "contact_number") setEditingContactNumber(false);
        if (field === "website") setEditingWebsite(false);
      } else {
        setUpdateMessage(data.message || "Update failed");
      }
    } catch (err) {
      setUpdateMessage(`Failed to update ${field}`);
      console.error(err);
    }
  };

  const handleAddCredits = async () => {
    if (!agent || !user) {
      setCreditsMessage("Error: Agent data not loaded");
      return;
    }

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      setCreditsMessage("Please enter a valid positive amount");
      return;
    }

    try {
      setCreditsMessage("");
      const token = getToken();

      if (!token) {
        setCreditsMessage("Please log in to continue");
        return;
      }

      const response = await fetch(`${backendUrl}/add-credits`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agent.id,
          amount: amount,
        }),
      });

      const data = await response.json();

      if (response.ok && data.message === "Credits added successfully") {
        setAgent({ ...agent, credits: parseFloat(data.credits) });
        setCreditsMessage(
          `Added ${amount} credits successfully! New balance: ${data.credits}`
        );
        setNewAmount("");
        setEditingCredits(false);
      } else {
        setCreditsMessage(data?.error || "Failed to add credits");
      }
    } catch (err: any) {
      setCreditsMessage(`Failed to add credits: ${err.message}`);
      console.error(err);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    setPasswordMessage("");
    setError(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match");
      setChangingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage("New password must be at least 8 characters");
      setChangingPassword(false);
      return;
    }

    try {
      // Get token for API call
      const token = getToken();

      if (!token) {
        setPasswordMessage("Please log in to continue");
        setChangingPassword(false);
        return;
      }

      const response = await fetch(`${backendUrl}/update-password`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordMessage(data.message || "Failed to update password");
        console.error(data);
      } else {
        setPasswordMessage("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPasswordMessage(`Failed to update password: ${err.message}`);
      console.error(err);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTemplateUpload = async () => {
    if (!selectedFile || !agent || !user) {
      setUpdateMessage("Error: File or agent data not available");
      return;
    }

    const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !["png", "jpg", "jpeg"].includes(fileExt)) {
      setUpdateMessage("Please select a valid image file (PNG, JPG, JPEG)");
      return;
    }

    const fileName = `invoice-template.${fileExt}`;
    const filePath = `agents/${agent.id}/${fileName}`;

    try {
      setUpdateMessage("");

      // Read file as base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(selectedFile);
      });

      const fileBase64 = (base64 as string).split(",")[1];
      const fileType = selectedFile.type;

      // Create form data
      const formData = new FormData();
      formData.append("agentId", agent.id.toString());
      formData.append("file", selectedFile);

      // Call backend
      const response = await fetch(`${backendUrl}/upload-invoice-template`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (data && data.success) {
        setAgent({ ...agent, invoice_template_path: filePath });
        setCurrentTemplate(filePath);
        setSelectedFile(null);
        setEditingTemplate(false);
        setUpdateMessage("Invoice template uploaded successfully!");
      } else {
        setUpdateMessage("Upload failed: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      setUpdateMessage(`Upload failed: ${err.message}`);
      console.error(err);
    }
  };

  const handleTemplateRemove = async () => {
    if (!currentTemplate || !agent) return;

    try {
      const token = getToken();
      if (!token) {
        setUpdateMessage("Authentication required");
        return;
      }

      const response = await fetch(`${backendUrl}/update-agent-template-path`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agent.id,
          template_path: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setUpdateMessage(`Error: ${data.message || "Removal failed"}`);
        console.error(data);
      } else if (data.success) {
        setAgent({ ...agent, invoice_template_path: undefined });
        setUpdateMessage("Invoice template removed successfully!");
        setCurrentTemplate(null);
      } else {
        setUpdateMessage(data.message || "Removal failed");
      }
    } catch (err: any) {
      setUpdateMessage(`Removal failed: ${err.message}`);
      console.error(err);
    }
  };

  const handleDocumentUpload = async () => {
    if (!selectedDocumentFile || !agent || !user) {
      setUpdateMessage("Error: File or agent data not available");
      return;
    }

    const filePath = `${agent.id}/document.txt`;

    try {
      setUpdateMessage("");

      // Create form data
      const formData = new FormData();
      formData.append("agentId", agent.id.toString());
      formData.append("file", selectedDocumentFile);

      // Call backend
      const response = await fetch(
        "http://localhost:8080/upload-company-overview",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (data && data.success) {
        setCurrentDocument(filePath);
        setSelectedDocumentFile(null);
        setEditingDocument(false);
        setUpdateMessage("Company overview document uploaded successfully!");
      } else {
        setUpdateMessage("Upload failed: " + (data?.error || "Unknown error"));
      }
    } catch (err: any) {
      setUpdateMessage(`Upload failed: ${err.message}`);
      console.error(err);
    }
  };

  const handleDocumentRemove = async () => {
    if (!currentDocument || !agent) return;

    // Since no backend route for removing document, just set to null
    setCurrentDocument(null);
    setUpdateMessage("Company overview document removed successfully!");
  };

  const handleDownloadMarginGuide = async () => {
    try {
      const response = await fetch(`${backendUrl}/get-invoice-template`);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "IDesign_Invoice_Template.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback to direct link if fetch fails
      const fallbackLink = document.createElement("a");
      fallbackLink.href = `${backendUrl}/get-invoice-template`;
      fallbackLink.download = "IDesign_Invoice_Template.png";
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      document.body.removeChild(fallbackLink);
    }
  };
  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Settings</h1>
          <p className="text-gray-600">Configure your account</p>
        </div>
        <div className="bg-white rounded-2xl p-6 px-4 shadow-lg border border-gray-100">
          <p className="text-center text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Account Information */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Account Information
          </h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          {user && agent ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                {editingName ? (
                  <form onSubmit={handleNameUpdate} className="space-y-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your name"
                      required
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingName(false);
                          setNewName(agent.name);
                          setUpdateMessage("");
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 py-1 px-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900">
                      {agent.name}
                    </p>
                    <button
                      onClick={() => {
                        setEditingName(true);
                        setUpdateMessage("");
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-lg font-medium text-gray-900">
                  {user.email}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number
                </label>
                <p className="text-lg font-medium text-gray-900">
                  {agent.whatsapp_number || "Not set"}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                {editingAddress ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAgentDetailUpdate("address", newAddress);
                    }}
                    className="space-y-2"
                  >
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your address"
                      required
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddress(false);
                          setNewAddress(agent?.address || "");
                          setUpdateMessage("");
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 py-1 px-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900">
                      {agent?.address || "Not set"}
                    </p>
                    <button
                      onClick={() => {
                        setEditingAddress(true);
                        setUpdateMessage("");
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Email
                </label>
                {editingBusinessEmail ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAgentDetailUpdate(
                        "business_email",
                        newBusinessEmail
                      );
                    }}
                    className="space-y-2"
                  >
                    <input
                      type="email"
                      value={newBusinessEmail}
                      onChange={(e) => setNewBusinessEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter business email"
                      required
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBusinessEmail(false);
                          setNewBusinessEmail(agent?.business_email || "");
                          setUpdateMessage("");
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 py-1 px-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900">
                      {agent?.business_email || "Not set"}
                    </p>
                    <button
                      onClick={() => {
                        setEditingBusinessEmail(true);
                        setUpdateMessage("");
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                {editingContactNumber ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAgentDetailUpdate(
                        "contact_number",
                        newContactNumber
                      );
                    }}
                    className="space-y-2"
                  >
                    <input
                      type="tel"
                      value={newContactNumber}
                      onChange={(e) => setNewContactNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter contact number"
                      required
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingContactNumber(false);
                          setNewContactNumber(agent?.contact_number || "");
                          setUpdateMessage("");
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 py-1 px-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900">
                      {agent?.contact_number || "Not set"}
                    </p>
                    <button
                      onClick={() => {
                        setEditingContactNumber(true);
                        setUpdateMessage("");
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                {editingWebsite ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAgentDetailUpdate("website", newWebsite);
                    }}
                    className="space-y-2"
                  >
                    <input
                      type="url"
                      value={newWebsite}
                      onChange={(e) => setNewWebsite(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter website URL (e.g., https://example.com)"
                      required
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingWebsite(false);
                          setNewWebsite(agent?.website || "");
                          setUpdateMessage("");
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 py-1 px-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900">
                      {agent?.website || "Not set"}
                    </p>
                    <button
                      onClick={() => {
                        setEditingWebsite(true);
                        setUpdateMessage("");
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Credits */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credits Balance
                </label>
                {editingCredits ? (
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter amount to add (e.g., 10.00)"
                      required
                    />
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleAddCredits}
                        disabled={!newAmount || parseFloat(newAmount) <= 0}
                        className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                      >
                        Add Credits
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCredits(false);
                          setNewAmount("");
                          setCreditsMessage("");
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 py-1 px-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900">
                      {agent?.credits ? `${agent.credits.toFixed(2)} credits` : "0.00 credits"}
                    </p>
                    <button
                      onClick={() => {
                        setEditingCredits(true);
                        setCreditsMessage("");
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Add Credits
                    </button>
                  </div>
                )}
                {creditsMessage && (
                  <div
                    className={`p-3 rounded-lg mt-2 ${
                      creditsMessage.includes("successfully")
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {creditsMessage}
                  </div>
                )}
              </div>

              {/* Invoice Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Template
                </label>
                {editingTemplate ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={(e) =>
                        setSelectedFile(e.target.files?.[0] || null)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleTemplateUpload}
                        disabled={!selectedFile}
                        className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                      >
                        Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplate(false);
                          setSelectedFile(null);
                          setUpdateMessage("");
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 py-1 px-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : currentTemplate ? (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900">
                      Template uploaded
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingTemplate(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Change
                      </button>
                      <button
                        onClick={handleTemplateRemove}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                      <button
                        onClick={handleDownloadMarginGuide}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Download Margin Guide
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-gray-900">
                      No template set
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingTemplate(true)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Upload Template
                      </button>
                      <button
                        onClick={handleDownloadMarginGuide}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Download Margin Guide
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Unable to load account information</p>
          )}
        </div>
        {updateMessage && (
          <div
            className={`p-3 rounded-lg mt-4 ${
              updateMessage.includes("successfully")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {updateMessage}
          </div>
        )}

        {/* Password Change */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter current password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password (min 8 characters)"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                required
              />
            </div>
            {passwordMessage && (
              <div
                className={`p-3 rounded-lg ${
                  passwordMessage.includes("successfully")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {passwordMessage}
              </div>
            )}
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>

      {/* Company Overview Document */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Company Overview Document
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document
          </label>
          {editingDocument ? (
            <div className="space-y-2">
              <input
                type="file"
                accept=".txt,.pdf,.doc,.docx"
                onChange={(e) =>
                  setSelectedDocumentFile(e.target.files?.[0] || null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleDocumentUpload}
                  disabled={!selectedDocumentFile}
                  className="flex-1 bg-blue-600 text-white py-1 px-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingDocument(false);
                    setSelectedDocumentFile(null);
                    setUpdateMessage("");
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-1 px-3 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : currentDocument ? (
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium text-gray-900">
                Document uploaded
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditingDocument(true)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Change
                </button>
                <button
                  onClick={handleDocumentRemove}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium text-gray-900">
                No document set
              </p>
              <button
                onClick={() => setEditingDocument(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Upload Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto py-12 px-8 sm:px-10 lg:px-12">
      <SettingsContent />
    </div>
  );
};

export default SettingsPage;
