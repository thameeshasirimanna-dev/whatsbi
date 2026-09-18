import React, { useState, useEffect } from 'react';
import { getCurrentAgent } from "../../../lib/agent";
import { getToken } from "../../../lib/auth";
import { Plus, RefreshCw, Eye, Pencil, Trash2, FileText, CheckCircle2, Clock, Layers } from "lucide-react";
import ViewTemplateModal from "./ViewTemplateModal";
import CreateTemplateModal from "./CreateTemplateModal";
import { useDialog } from "../shared/DialogProvider";
import { SkeletonPage } from "../shared/Skeleton";
import { EmptyTableState } from "../shared/EmptyTableState";

const getUser = async () => {
  try {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (response.ok && data.success) return { data: { user: data.user }, error: null };
    return { data: { user: null }, error: data.message || "Failed to get user" };
  } catch (error) {
    return { data: { user: null }, error };
  }
};

interface WhatsAppConfig {
  business_account_id: string;
  phone_number_id: string;
  api_key: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  components: Array<{
    type: string;
    format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
    text?: string;
    example?: any;
    buttons?: Array<{
      type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY";
      text: string;
      phone_number?: string;
      url?: string;
      payload?: string;
    }>;
  }>;
  body?: any;
  mediaUrls?: { [key: string]: { handle: string; url: string } };
  status: string;
  created_time?: string;
}

const TemplatesPage: React.FC = () => {
  const { confirm: dlgConfirm } = useDialog();
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [agentPrefix, setAgentPrefix] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mediaPreviews, setMediaPreviews] = useState<Record<string, string>>({});
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      const agent = await getCurrentAgent();
      if (agent) {
        setAgentPrefix(agent.agent_prefix);
        if (agent.id) setAgentId(String(agent.id));
      } else {
        setError("Agent not found. Please contact admin or log in as an agent.");
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    if (agentPrefix) fetchTemplates();
  }, [agentPrefix]);

  const fetchTemplates = async (_forceRefetch = false) => {
    if (!agentPrefix) {
      setError("Agent not found");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const userResult = await getUser();
      if (userResult.error || !userResult.data.user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      const user = userResult.data.user;
      const token = getToken();
      if (!token) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${user.id}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setError("No WhatsApp configuration found. Please set up WhatsApp first.");
        setLoading(false);
        return;
      }
      const configData = await response.json();
      if (!configData.success || !configData.whatsapp_config) {
        setError("No WhatsApp configuration found. Please set up WhatsApp first.");
        setLoading(false);
        return;
      }
      const whatsappConfig = configData.whatsapp_config[0] || configData.whatsapp_config;
      setConfig(whatsappConfig as WhatsAppConfig);
      const { business_account_id, api_key } = whatsappConfig;
      const metaResponse = await fetch(`https://graph.facebook.com/v20.0/${business_account_id}/message_templates`, {
        method: "GET",
        headers: { Authorization: `Bearer ${api_key}` },
      });
      if (!metaResponse.ok) {
        const errorData = await metaResponse.json();
        throw new Error(`Meta API error: ${errorData.error?.message || metaResponse.statusText}`);
      }
      const metaData = await metaResponse.json();
      const fetchedTemplates = metaData.data.map((t: any) => ({
        ...t,
        id: t.name,
        body: { name: t.name, language: { code: t.language }, components: t.components },
      })) as WhatsAppTemplate[];
      setTemplates(fetchedTemplates);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to fetch templates");
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!await dlgConfirm("Are you sure you want to delete this template? This action is permanent.", { danger: true })) return;
    if (!config || !agentPrefix || !agentId) {
      setError("No WhatsApp configuration or agent found");
      return;
    }
    try {
      const { business_account_id, api_key } = config;
      const response = await fetch(`https://graph.facebook.com/v20.0/${business_account_id}/message_templates?name=${templateId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${api_key}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Meta API error: ${errorData.error?.message || response.statusText}`);
      }
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err: any) {
      setError(err.message || "Failed to delete template");
    }
  };

  const handleViewTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
  };

  const handleEditTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleSuccess = (newTemplate: WhatsAppTemplate, isUpdate: boolean) => {
    if (isUpdate) setTemplates(prev => prev.map(t => t.id === editingTemplate?.id ? newTemplate : t));
    else setTemplates(prev => [...prev, newTemplate]);
    setEditingTemplate(null);
    setShowCreateModal(false);
  };

  const getMediaPreviewUrl = async (handle: string): Promise<string> => {
    if (!config) return "";
    if (handle.startsWith("http")) return handle;
    try {
      const { api_key, phone_number_id } = config;
      const url = new URL(`https://graph.facebook.com/v20.0/${phone_number_id}/media/${handle}`);
      url.searchParams.append("access_token", api_key);
      const response = await fetch(url.toString(), { method: "GET" });
      if (!response.ok) return "";
      const data = await response.json();
      return data.url || "";
    } catch {
      return "";
    }
  };

  const loadMediaPreview = async (templateId: string, handle: string, _mediaType?: string) => {
    if (mediaPreviews[templateId]) return;
    const url = await getMediaPreviewUrl(handle);
    if (url) setMediaPreviews(prev => ({ ...prev, [templateId]: url }));
  };

  useEffect(() => {
    if (templates.length > 0 && config) {
      templates.forEach(template => {
        const headerComp = template.components.find(c => c.type.toLowerCase() === "header");
        if (headerComp?.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format) && !template.mediaUrls?.header?.url) {
          const handleObj = headerComp.example?.header_handle?.[0];
          let handle = "";
          if (typeof handleObj === "string") handle = handleObj;
          else if (typeof handleObj === "object") handle = handleObj.handle || handleObj.id || "";
          if (handle && !mediaPreviews[template.id]) loadMediaPreview(template.id, handle);
        }
      });
    }
  }, [templates, config]);

  const approvedCount = templates.filter(t => t.status?.toUpperCase() === 'APPROVED').length;
  const pendingCount = templates.filter(t => t.status?.toUpperCase() === 'PENDING').length;

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {[
          {
            label: "Total Templates",
            value: templates.length,
            icon: Layers,
            iconColor: "text-[#16281D]",
            bgColor: "bg-[#9FE870]/25",
          },
          {
            label: "Approved & Ready",
            value: approvedCount,
            icon: CheckCircle2,
            iconColor: "text-[#15803D]",
            bgColor: "bg-[#22C55E]/10",
          },
          {
            label: "Pending Review",
            value: pendingCount,
            icon: Clock,
            iconColor: "text-[#D97706]",
            bgColor: "bg-[#F59E0B]/10",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex items-center justify-between col-span-1 last:col-span-2 sm:last:col-span-1 min-w-0"
            >
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-[11px] sm:text-xs font-medium text-[#71717A] truncate">{card.label}</p>
                <h3 className="font-mono text-xl sm:text-2xl font-extrabold text-[#16281D] mt-0.5 sm:mt-1 tracking-tight truncate">
                  {card.value}
                </h3>
              </div>
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${card.bgColor} ${card.iconColor} flex items-center justify-center shrink-0`}>
                <Icon size={18} className="sm:w-5 sm:h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-[20px] p-3 sm:p-3.5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#16281D]">
          <FileText size={16} className="text-[#16281D] shrink-0" />
          <span className="truncate">Meta WhatsApp Message Templates</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
          <button
            onClick={() => fetchTemplates(true)}
            className="flex-1 sm:flex-initial justify-center px-3.5 py-2 h-9 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#EAEAEA]"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => { setEditingTemplate(null); setShowCreateModal(true); }}
            className="flex-1 sm:flex-initial justify-center px-4 py-2 h-9 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.3)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.4)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center gap-1.5 cursor-pointer border-0"
          >
            <Plus size={14} /> Create Template
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-medium">
          {error}
        </div>
      )}

      {/* Table Container */}
      <div
        className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden"
      >
        {!config ? (
          <EmptyTableState
            icon={FileText}
            title="No WhatsApp Configuration Found"
            description="Please connect your Meta WhatsApp Business API credentials in Agent Settings first."
          />
        ) : templates.length === 0 ? (
          <EmptyTableState
            icon={FileText}
            title="No Templates Found"
            description="Create message templates for automated alerts, notifications, and broadcast marketing."
            actionLabel="Create Template"
            onAction={() => {
              setEditingTemplate(null);
              setShowCreateModal(true);
            }}
          />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="block lg:hidden divide-y divide-[#F4F7F4]">
              {templates.map((template) => {
                const s = template.status?.toUpperCase();
                const isApproved = s === 'APPROVED';
                const isPending = s === 'PENDING';

                return (
                  <div key={template.id} className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#9FE870]/20 text-[#16281D] flex items-center justify-center shrink-0">
                          <FileText size={14} />
                        </div>
                        <span className="text-xs font-bold text-[#16281D] font-mono truncate">{template.name}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${
                        isApproved
                          ? "bg-[#22C55E]/10 text-[#15803D]"
                          : isPending
                          ? "bg-[#F59E0B]/10 text-[#D97706]"
                          : "bg-[#EF4444]/10 text-[#EF4444]"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isApproved ? "bg-[#22C55E]" : isPending ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                        }`} />
                        {template.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-[#F4F7F4] p-2.5 rounded-xl text-xs">
                      <div>
                        <span className="text-[#71717A] text-[11px] block">Category</span>
                        <span className="font-semibold text-[#16281D]">{template.category}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[#71717A] text-[11px] block">Language</span>
                        <span className="font-mono text-[#16281D]">{template.language}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#F4F7F4]">
                      <button
                        onClick={() => handleViewTemplate(template)}
                        className="flex-1 py-1.5 min-h-[34px] rounded-full bg-[#0891B2]/10 text-[#0891B2] hover:bg-[#0891B2]/20 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => handleEditTemplate(template.id)}
                        className="flex-1 py-1.5 min-h-[34px] rounded-full bg-[#22C55E]/10 text-[#15803D] hover:bg-[#22C55E]/20 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      {template.name !== "hello_world" && (
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="flex-1 py-1.5 min-h-[34px] rounded-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
                    <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Template Name
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Category
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Language
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Status
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F7F4]">
                  {templates.map((template) => {
                    const s = template.status?.toUpperCase();
                    const isApproved = s === 'APPROVED';
                    const isPending = s === 'PENDING';

                    return (
                      <tr key={template.id} className="hover:bg-[#F4F7F4]/40 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#9FE870]/20 text-[#16281D] flex items-center justify-center shrink-0">
                              <FileText size={15} />
                            </div>
                            <span className="font-mono text-xs font-bold text-[#16281D]">{template.name}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#F4F7F4] border border-[#EAEAEA] text-[11px] font-medium text-[#71717A]">
                            {template.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs text-[#71717A]">{template.language}</span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            isApproved
                              ? "bg-[#22C55E]/10 text-[#15803D]"
                              : isPending
                              ? "bg-[#F59E0B]/10 text-[#D97706]"
                              : "bg-[#EF4444]/10 text-[#EF4444]"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isApproved ? "bg-[#22C55E]" : isPending ? "bg-[#F59E0B]" : "bg-[#EF4444]"
                            }`} />
                            {template.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewTemplate(template)}
                              title="View"
                              className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#0891B2]/15 text-[#71717A] hover:text-[#0891B2] flex items-center justify-center transition-colors"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => handleEditTemplate(template.id)}
                              title="Edit"
                              className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#22C55E]/15 text-[#71717A] hover:text-[#15803D] flex items-center justify-center transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            {template.name !== "hello_world" && (
                              <button
                                onClick={() => handleDeleteTemplate(template.id)}
                                title="Delete"
                                className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#EF4444]/15 text-[#71717A] hover:text-[#EF4444] flex items-center justify-center transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <CreateTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSuccess}
        config={config}
        agentPrefix={agentPrefix}
        agentId={agentId}
        initialTemplate={editingTemplate}
        isEdit={!!editingTemplate}
      />

      {showViewModal && (
        <ViewTemplateModal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          template={selectedTemplate}
          mediaPreviews={mediaPreviews}
          loadMediaPreview={loadMediaPreview}
        />
      )}
    </div>
  );
};

export default TemplatesPage;

