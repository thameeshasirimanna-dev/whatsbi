import React, { useState } from 'react';
import { getToken } from '../../../lib/auth';
import { Customer } from './CustomerTypes';

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

interface UseCustomerMutationsProps {
  onSuccess: () => Promise<void> | void;
}

export function useCustomerMutations({ onSuccess }: UseCustomerMutationsProps) {
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
  const [selectedEditCountryCode, setSelectedEditCountryCode] = useState("+94");

  // Create State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
  const [selectedCountryCode, setSelectedCountryCode] = useState("+94");

  // Delete State
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "name") setEditForm(prev => ({ ...prev, name: value }));
    else if (name === "phone") setEditForm(prev => ({ ...prev, phone: value.replace(/\D/g, "") }));
  };

  const handleStageChange = (field: "lead_stage" | "interest_stage" | "conversion_stage", value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (field === "lead_stage" && value === "New Lead") {
      setEditForm((prev) => ({ ...prev, interest_stage: "", conversion_stage: "" }));
    }
    if (field === "interest_stage" && !value) {
      setEditForm((prev) => ({ ...prev, conversion_stage: "" }));
    }
  };

  const handleEditCountryChange = (code: string) => {
    setSelectedEditCountryCode(code);
    if (editForm.phone.startsWith(code.replace("+", ""))) return;
    setEditForm(prev => ({ ...prev, phone: "" }));
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "name") setCreateForm(prev => ({ ...prev, name: value }));
    else if (name === "phone") setCreateForm(prev => ({ ...prev, phone: value.replace(/\D/g, "") }));
  };

  const handleCreateCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    if (createForm.phone.startsWith(code.replace("+", ""))) return;
    setCreateForm(prev => ({ ...prev, phone: "" }));
  };

  const handleCreateStageChange = (field: "lead_stage" | "interest_stage" | "conversion_stage", value: string) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
    if (field === "lead_stage" && value === "New Lead") {
      setCreateForm((prev) => ({ ...prev, interest_stage: "", conversion_stage: "" }));
    }
    if (field === "interest_stage" && !value) {
      setCreateForm((prev) => ({ ...prev, conversion_stage: "" }));
    }
  };

  const handleCreateCustomer = async () => {
    if (!createForm.name.trim() || !createForm.phone.trim()) return;
    const fullPhone = `${selectedCountryCode}${createForm.phone}`.replace("+", "");
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${backendUrl}/manage-customers`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          phone: fullPhone,
          lead_stage: createForm.lead_stage || "New Lead",
          interest_stage: createForm.interest_stage || null,
          conversion_stage: createForm.conversion_stage || null
        }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to create customer"); }
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to create customer");
      setShowCreateModal(false);
      setCreateForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
      setSelectedCountryCode("+94");
      await onSuccess();
      setError(null);
    } catch (err: any) {
      console.error("Create customer error:", err);
      setError(err.message || "Failed to create customer");
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !editForm.name.trim() || !editForm.phone.trim()) return;
    const fullPhone = `${selectedEditCountryCode}${editForm.phone}`.replace("+", "");
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${backendUrl}/manage-customers`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCustomer.id,
          name: editForm.name.trim(),
          phone: fullPhone,
          lead_stage: editForm.lead_stage || "New Lead",
          interest_stage: editForm.interest_stage || null,
          conversion_stage: editForm.conversion_stage || null
        }),
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to update customer"); }
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to update customer");
      setEditingCustomer(null);
      setEditForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
      setSelectedEditCountryCode("+94");
      await onSuccess();
      setError(null);
    } catch (err: any) {
      console.error("Update error:", err);
      setError(err.message || "Failed to update customer");
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
      const token = getToken();
      if (!token) { setError("User not authenticated"); return; }
      const response = await fetch(`${backendUrl}/manage-customers?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || "Failed to delete customer"); }
      const data = await response.json();
      if (!data.success) throw new Error(data.message || "Failed to delete customer");
      setDeletingCustomer(null);
      await onSuccess();
      setError(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete customer");
    }
  };

  return {
    error,
    setError,
    showCreateModal,
    setShowCreateModal,
    createForm,
    setCreateForm,
    selectedCountryCode,
    setSelectedCountryCode,
    handleCreateChange,
    handleCreateCountryChange,
    handleCreateStageChange,
    handleCreateCustomer,
    editingCustomer,
    setEditingCustomer,
    editForm,
    setEditForm,
    selectedEditCountryCode,
    setSelectedEditCountryCode,
    handleEditChange,
    handleEditCountryChange,
    handleStageChange,
    handleUpdateCustomer,
    deletingCustomer,
    setDeletingCustomer,
    handleDeleteCustomer,
  };
}
