import React, { useState, useEffect } from 'react';
import { supabase, getCurrentAgent } from "../../../lib/supabase";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

import ViewTemplateModal from "./ViewTemplateModal";
import CreateTemplateModal from "./CreateTemplateModal";

interface WhatsAppConfig {
  business_account_id: string;
  phone_number_id: string;
  api_key: string; // This is the Meta access token
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
        if (agent.id) {
          setAgentId(String(agent.id));
        }
      } else {
        setError(
          "Agent not found. Please contact admin or log in as an agent."
        );
        setLoading(false);
      }
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    if (agentPrefix) {
      fetchTemplates();
    }
  }, [agentPrefix]);

  const fetchTemplates = async (forceRefetch = false) => {
    if (!agentPrefix) {
      setError("Agent not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Step 1: Get current user's WhatsApp configuration
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      const { data: whatsappConfig, error: configError } = await supabase
        .from("whatsapp_configuration")
        .select("business_account_id, phone_number_id, api_key")
        .eq("user_id", session.user.id)
        .single();

      if (configError || !whatsappConfig) {
        setError(
          "No WhatsApp configuration found. Please set up WhatsApp first."
        );
        setLoading(false);
        return;
      }

      setConfig(whatsappConfig as WhatsAppConfig);

      const templatesTable = `${agentPrefix}_templates`;

      if (!forceRefetch) {
        // Step 2: Check cache first (dynamic templates table)
        const { data: cachedTemplates, error: cacheError } = await supabase
          .from(templatesTable)
          .select("*")
          .eq("is_active", true);

        if (!cacheError && cachedTemplates && cachedTemplates.length > 0) {
          const parsedTemplates = cachedTemplates.map((t: any) => {
            const mediaUrls = t.body?.media_urls || {};
            return {
              id: t.name, // Use name as id for consistency with Meta
              name: t.name,
              language: t.language,
              category: t.category,
              body: t.body,
              components: t.body?.components || [],
              mediaUrls,
              status: t.status || "APPROVED",
              created_time: t.created_at,
            };
          }) as WhatsAppTemplate[];
          setTemplates(parsedTemplates);
          setLoading(false);
          return;
        }
      }

      // Step 3: Fetch from Meta API if no cache or cache empty
      const { business_account_id, api_key } = whatsappConfig;
      const metaUrl = `https://graph.facebook.com/v20.0/${business_account_id}/message_templates`;
      const response = await fetch(metaUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${api_key}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Meta API error: ${errorData.error?.message || response.statusText}`
        );
      }

      const metaData = await response.json();
      const apiData = metaData.data;
      const fetchedTemplates = apiData.map((t: any) => ({
        ...t,
        id: t.name,
        body: {
          name: t.name,
          language: { code: t.language },
          components: t.components,
        },
      })) as WhatsAppTemplate[];

      if (fetchedTemplates.length === 0) {
        setTemplates([]);
        setLoading(false);
        return;
      }

      // Step 4: Sync in Supabase dynamic table (deactivate old, upsert current)
      if (agentId) {
        if (forceRefetch) {
          const { error: deactivateError } = await supabase
            .from(templatesTable)
            .update({ is_active: false })
            .eq("agent_id", agentId);

          if (deactivateError) {
            console.error("Deactivate templates error:", deactivateError);
          }
        }

        const upserts = fetchedTemplates.map((template) => ({
          agent_id: agentId,
          name: template.name,
          category: template.category.toLowerCase() as
            | "utility"
            | "marketing"
            | "authentication",
          language: template.language,
          body: template.body,
          is_active: true,
          updated_at: new Date().toISOString(),
        }));

        const { error: upsertError } = await supabase
          .from(templatesTable)
          .upsert(upserts, { onConflict: "agent_id,name" });

        if (upsertError) {
          console.error("Caching upsert error:", upsertError);
          // Don't fail the whole operation, just log
        }
      } else {
        console.warn("Skipping cache upsert due to missing agentId");
      }

      setTemplates(fetchedTemplates);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to fetch templates");
      setLoading(false);
      console.error("Templates fetch error:", err);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this template? This action is permanent."
      )
    )
      return;

    if (!config || !agentPrefix || !agentId) {
      setError("No WhatsApp configuration or agent found");
      return;
    }

    try {
      const { business_account_id, api_key } = config;
      const metaUrl = `https://graph.facebook.com/v20.0/${business_account_id}/message_templates?name=${templateId}`;
      const response = await fetch(metaUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${api_key}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Meta API error: ${errorData.error?.message || response.statusText}`
        );
      }

      // Delete from local state
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));

      // Delete from Supabase dynamic table
      const templatesTable = `${agentPrefix}_templates`;
      if (agentId) {
        const { error: deleteError } = await supabase
          .from(templatesTable)
          .delete()
          .eq("agent_id", agentId)
          .eq("name", templateId);
        if (deleteError) {
          console.error("Cache delete error:", deleteError);
        }
      } else {
        console.warn("Skipping cache delete due to missing agentId");
      }

      // TODO: Add toast notification for success
    } catch (err: any) {
      setError(err.message || "Failed to delete template");
      console.error("Delete template error:", err);
      // TODO: Add toast for error
    }
  };

  const handleViewTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
  };

  const handleEditTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleSuccess = (newTemplate: WhatsAppTemplate, isUpdate: boolean) => {
    if (isUpdate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === editingTemplate?.id ? newTemplate : t))
      );
    } else {
      setTemplates((prev) => [...prev, newTemplate]);
    }
    setEditingTemplate(null);
    setShowCreateModal(false);
  };

  const getMediaPreviewUrl = async (handle: string): Promise<string> => {
    if (!config) return "";
    // If handle is already a direct URL (e.g., sample from Meta), use it directly
    if (handle.startsWith("http")) {
      return handle;
    }
    try {
      const { api_key, phone_number_id } = config;
      const url = new URL(
        `https://graph.facebook.com/v20.0/${phone_number_id}/media/${handle}`
      );
      url.searchParams.append("access_token", api_key);
      const response = await fetch(url.toString(), {
        method: "GET",
      });
      if (!response.ok) {
        return "";
      }
      const data = await response.json();
      return data.url || "";
    } catch (err) {
      return "";
    }
  };

  const loadMediaPreview = async (
    templateId: string,
    handle: string,
    mediaType?: string
  ) => {
    if (mediaPreviews[templateId]) return;
    const url = await getMediaPreviewUrl(handle);
    if (url) {
      setMediaPreviews((prev) => ({ ...prev, [templateId]: url }));
    }
  };

  // Load previews for list view templates on load
  useEffect(() => {
    if (templates.length > 0 && config) {
      templates.forEach((template) => {
        const headerComp = template.components.find((c) => c.type.toLowerCase() === "header");
        if (
          headerComp?.format &&
          ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format) &&
          !template.mediaUrls?.header?.url
        ) {
          let handle = "";
          const handleObj = headerComp.example?.header_handle?.[0];
          if (typeof handleObj === "string") {
            handle = handleObj;
          } else if (typeof handleObj === "object") {
            handle = handleObj.handle || handleObj.id || "";
          }
          if (handle && !mediaPreviews[template.id]) {
            loadMediaPreview(template.id, handle);
          }
        }
      });
    }
  }, [templates, config]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading templates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => fetchTemplates(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp Templates</h1>
        <div className="flex gap-2">
          <button
            onClick={() => fetchTemplates(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Refresh Templates
          </button>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Create New
          </button>
        </div>
      </div>

      {config ? (
        templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white p-4 rounded-lg shadow border"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Category: {template.category} | Language: {template.language} | Status: {template.status}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleViewTemplate(template)}
                      className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                      title="View template"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditTemplate(template.id)}
                      className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded"
                      title="Edit template"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {template.name !== "hello_world" && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Delete template"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            No templates found. Create some in your Meta WhatsApp Manager and refresh.
          </div>
        )
      ) : (
        <div className="text-center text-gray-500">
          No WhatsApp configuration found. Please set up WhatsApp in settings.
        </div>
      )}

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