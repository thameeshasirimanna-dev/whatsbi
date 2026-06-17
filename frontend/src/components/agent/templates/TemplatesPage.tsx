import React, { useState, useEffect } from 'react';
import { getCurrentAgent } from "../../../lib/agent";
import { getToken } from "../../../lib/auth";
import { Plus, RefreshCw, Eye, Pencil, Trash2, FileText } from "lucide-react";
import ViewTemplateModal from "./ViewTemplateModal";
import CreateTemplateModal from "./CreateTemplateModal";
import { useDialog } from "../shared/DialogProvider";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const getUser = async () => {
  try {
    const token = getToken();
    if (!token) return { data: { user: null }, error: null };
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, { method: "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const data = await response.json();
    if (response.ok && data.success) return { data: { user: data.user }, error: null };
    return { data: { user: null }, error: data.message || "Failed to get user" };
  } catch (error) { return { data: { user: null }, error }; }
};

interface WhatsAppConfig { business_account_id: string; phone_number_id: string; api_key: string; }
interface WhatsAppTemplate {
  id: string; name: string; language: string; category: string;
  components: Array<{ type: string; format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION"; text?: string; example?: any; buttons?: Array<{ type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY"; text: string; phone_number?: string; url?: string; payload?: string; }>; }>;
  body?: any; mediaUrls?: { [key: string]: { handle: string; url: string } }; status: string; created_time?: string;
}

const getStatusStyle = (status: string): React.CSSProperties => {
  const s = status.toUpperCase();
  if (s === 'APPROVED') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'PENDING') return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  if (s === 'REJECTED' || s === 'PAUSED' || s === 'DISABLED') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

const getCategoryStyle = (category: string): React.CSSProperties => {
  const c = category.toUpperCase();
  if (c === 'MARKETING') return { background: 'rgba(124,58,237,0.1)', color: '#7c3aed' };
  if (c === 'AUTHENTICATION') return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  return { background: 'rgba(8,145,178,0.1)', color: '#0891b2' };
};

const thCell: React.CSSProperties = {
  padding: '10px 16px', ...DM, fontSize: 11, fontWeight: 600, color: '#71717a',
  textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left',
  background: '#fafafa', borderBottom: '1px solid #ebebeb',
};

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
      if (agent) { setAgentPrefix(agent.agent_prefix); if (agent.id) setAgentId(String(agent.id)); }
      else { setError("Agent not found. Please contact admin or log in as an agent."); setLoading(false); }
    };
    loadTemplates();
  }, []);

  useEffect(() => { if (agentPrefix) fetchTemplates(); }, [agentPrefix]);

  const fetchTemplates = async (forceRefetch = false) => {
    if (!agentPrefix) { setError("Agent not found"); setLoading(false); return; }
    try {
      setLoading(true); setError(null);
      const userResult = await getUser();
      if (userResult.error || !userResult.data.user) { setError("User not authenticated"); setLoading(false); return; }
      const user = userResult.data.user;
      const token = getToken();
      if (!token) { setError("User not authenticated"); setLoading(false); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${user.id}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!response.ok) { setError("No WhatsApp configuration found. Please set up WhatsApp first."); setLoading(false); return; }
      const configData = await response.json();
      if (!configData.success || !configData.whatsapp_config) { setError("No WhatsApp configuration found. Please set up WhatsApp first."); setLoading(false); return; }
      const whatsappConfig = configData.whatsapp_config[0] || configData.whatsapp_config;
      setConfig(whatsappConfig as WhatsAppConfig);
      const { business_account_id, api_key } = whatsappConfig;
      const metaResponse = await fetch(`https://graph.facebook.com/v20.0/${business_account_id}/message_templates`, { method: "GET", headers: { Authorization: `Bearer ${api_key}` } });
      if (!metaResponse.ok) { const errorData = await metaResponse.json(); throw new Error(`Meta API error: ${errorData.error?.message || metaResponse.statusText}`); }
      const metaData = await metaResponse.json();
      const fetchedTemplates = metaData.data.map((t: any) => ({ ...t, id: t.name, body: { name: t.name, language: { code: t.language }, components: t.components } })) as WhatsAppTemplate[];
      setTemplates(fetchedTemplates);
      setLoading(false);
    } catch (err: any) { setError(err.message || "Failed to fetch templates"); setLoading(false); console.error("Templates fetch error:", err); }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!await dlgConfirm("Are you sure you want to delete this template? This action is permanent.", { danger: true })) return;
    if (!config || !agentPrefix || !agentId) { setError("No WhatsApp configuration or agent found"); return; }
    try {
      const { business_account_id, api_key } = config;
      const response = await fetch(`https://graph.facebook.com/v20.0/${business_account_id}/message_templates?name=${templateId}`, { method: "DELETE", headers: { Authorization: `Bearer ${api_key}` } });
      if (!response.ok) { const errorData = await response.json(); throw new Error(`Meta API error: ${errorData.error?.message || response.statusText}`); }
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    } catch (err: any) { setError(err.message || "Failed to delete template"); console.error("Delete template error:", err); }
  };

  const handleViewTemplate = (template: WhatsAppTemplate) => { setSelectedTemplate(template); setShowViewModal(true); };
  const handleEditTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    setEditingTemplate(template); setShowCreateModal(true);
  };
  const handleSuccess = (newTemplate: WhatsAppTemplate, isUpdate: boolean) => {
    if (isUpdate) setTemplates(prev => prev.map(t => t.id === editingTemplate?.id ? newTemplate : t));
    else setTemplates(prev => [...prev, newTemplate]);
    setEditingTemplate(null); setShowCreateModal(false);
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
    } catch { return ""; }
  };

  const loadMediaPreview = async (templateId: string, handle: string, mediaType?: string) => {
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

  const getBodyPreview = (template: WhatsAppTemplate): string => {
    const bodyComp = template.components.find(c => c.type.toLowerCase() === "body");
    if (!bodyComp?.text) return "—";
    const text = bodyComp.text.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, "[…]");
    return text.length > 80 ? text.substring(0, 80) + "…" : text;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 320 }}>
        <style>{`@keyframes tp-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(34,197,94,0.15)', borderTopColor: '#22c55e', animation: 'tp-spin 0.8s linear infinite' }} />
          <span style={{ ...DM, fontSize: 13, color: '#71717a' }}>Loading templates…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes tp-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={() => fetchTemplates(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 9, padding: '9px 14px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <RefreshCw size={13} /> Refresh
        </button>
        <button onClick={() => { setEditingTemplate(null); setShowCreateModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)' }}>
          <Plus size={13} /> Create New
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {!config ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <FileText size={22} style={{ color: '#d4d4d8' }} />
            </div>
            <div style={{ ...SYNE, fontSize: 15, fontWeight: 600, color: '#0c1a0e', marginBottom: 6 }}>No WhatsApp configuration</div>
            <div style={{ ...DM, fontSize: 13, color: '#71717a' }}>Please set up WhatsApp in settings first.</div>
          </div>
        ) : templates.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <FileText size={22} style={{ color: '#d4d4d8' }} />
            </div>
            <div style={{ ...SYNE, fontSize: 15, fontWeight: 600, color: '#0c1a0e', marginBottom: 6 }}>No templates found</div>
            <div style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 20 }}>Create some in your Meta WhatsApp Manager or create one here.</div>
            <button onClick={() => { setEditingTemplate(null); setShowCreateModal(true); }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)' }}>
              <Plus size={14} /> Create Template
            </button>
          </div>
        ) : (
          <>
            {/* Mobile/Tablet Card Layout */}
            <div className="block lg:hidden">
              <div className="flex flex-col divide-y divide-[#f4f4f5]">
                {templates.map((template) => (
                  <div key={template.id} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={14} style={{ color: '#22c55e' }} />
                        </div>
                        <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{template.name}</span>
                      </div>
                      <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, ...getStatusStyle(template.status), flexShrink: 0 }}>
                        {template.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', padding: '8px 12px', borderRadius: 8 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Category</span>
                        <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, ...getCategoryStyle(template.category), display: 'inline-block', marginTop: 2 }}>
                          {template.category}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>Language</span>
                        <span style={{ ...DM, fontSize: 12, color: '#0c1a0e', fontWeight: 500, marginTop: 2 }}>{template.language}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, paddingTop: 4 }}>
                      <button onClick={() => handleViewTemplate(template)} title="View"
                        style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(34,197,94,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.15)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.08)'}
                      >
                        <Eye size={13} style={{ color: '#22c55e' }} />
                      </button>
                      <button onClick={() => handleEditTemplate(template.id)} title="Edit"
                        style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(217,119,6,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(217,119,6,0.15)'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(217,119,6,0.08)'}
                      >
                        <Pencil size={13} style={{ color: '#d97706' }} />
                      </button>
                      {template.name !== "hello_world" && (
                        <button onClick={() => handleDeleteTemplate(template.id)} title="Delete"
                          style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(244,63,94,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.12)'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.06)'}
                        >
                          <Trash2 size={13} style={{ color: '#f43f5e' }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block overflow-x-auto">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Name', 'Category', 'Language', 'Status', 'Actions'].map((h, i) => (
                      <th key={h} style={{ ...thCell, textAlign: i === 4 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template, index) => (
                    <tr key={template.id}
                      style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(34,197,94,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      {/* Name */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText size={14} style={{ color: '#22c55e' }} />
                          </div>
                          <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>{template.name}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, ...getCategoryStyle(template.category) }}>
                          {template.category}
                        </span>
                      </td>

                      {/* Language */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 12, color: '#71717a' }}>{template.language}</span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...DM, fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, ...getStatusStyle(template.status) }}>
                          {template.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
                          <button onClick={() => handleViewTemplate(template)} title="View"
                            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(34,197,94,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.15)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.08)'}
                          >
                            <Eye size={13} style={{ color: '#22c55e' }} />
                          </button>
                          <button onClick={() => handleEditTemplate(template.id)} title="Edit"
                            style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(217,119,6,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(217,119,6,0.15)'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(217,119,6,0.08)'}
                          >
                            <Pencil size={13} style={{ color: '#d97706' }} />
                          </button>
                          {template.name !== "hello_world" && (
                            <button onClick={() => handleDeleteTemplate(template.id)} title="Delete"
                              style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(244,63,94,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.12)'}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(244,63,94,0.06)'}
                            >
                              <Trash2 size={13} style={{ color: '#f43f5e' }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
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
