import { useState, useEffect } from 'react';
import { getToken } from '../../../lib/auth';

export interface WhatsAppConfig {
  business_account_id: string;
  phone_number_id: string;
  api_key: string;
}

export interface Button {
  type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY";
  text: string;
  phoneNumber?: string;
  url?: string;
  payload?: string;
}

export interface FormData {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  header: {
    type: "TEXT" | "MEDIA" | "LOCATION";
    text: string;
    mediaType?: "IMAGE" | "VIDEO" | "DOCUMENT";
    mediaUrl: string;
    mediaHandle: string;
  };
  body: string;
  footer: string;
  buttons: Button[];
  examples: Record<string, string>;
}

export interface WhatsAppTemplate {
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
  mediaUrls?: { [key: string]: { handle: string; url: string } };
  status: string;
  created_time?: string;
}

interface UseTemplateFormProps {
  isOpen: boolean;
  isEdit: boolean;
  initialTemplate?: WhatsAppTemplate | null;
  config: WhatsAppConfig | null;
  agentPrefix: string | null;
  agentId: string | null;
  onSuccess: (template: WhatsAppTemplate, isUpdate: boolean) => void;
  onClose: () => void;
}

export const useTemplateForm = ({
  isOpen,
  isEdit,
  initialTemplate,
  config,
  agentPrefix,
  agentId,
  onSuccess,
  onClose,
}: UseTemplateFormProps) => {
  const [modalError, setModalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "UTILITY",
    language: "en_US",
    header: { type: "TEXT", text: "", mediaType: undefined, mediaUrl: "", mediaHandle: "" },
    body: "",
    footer: "",
    buttons: [],
    examples: {},
  });

  const parseTemplateToFormData = (template: WhatsAppTemplate): FormData => {
    const components = template.components || [];
    const headerComp = components.find(c => c.type.toLowerCase() === "header");
    const bodyComp = components.find(c => c.type.toLowerCase() === "body");
    const footerComp = components.find(c => c.type.toLowerCase() === "footer");
    const buttonsComp = components.find(c => c.type.toLowerCase() === "buttons");

    let headerType: "TEXT" | "MEDIA" | "LOCATION" = "TEXT";
    let headerText = "";
    let headerMediaType: "IMAGE" | "VIDEO" | "DOCUMENT" | undefined;
    let headerMediaUrl = "";
    let headerMediaHandle = "";

    if (headerComp) {
      if (headerComp.format === "TEXT" && headerComp.text) {
        headerType = "TEXT";
        headerText = headerComp.text;
      } else if (headerComp.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format)) {
        headerType = "MEDIA";
        headerMediaType = headerComp.format as "IMAGE" | "VIDEO" | "DOCUMENT";
        if (template.mediaUrls?.header?.url) headerMediaUrl = template.mediaUrls.header.url;
        const handleObj = headerComp.example?.header_handle?.[0];
        if (typeof handleObj === "string") headerMediaHandle = handleObj;
        else if (typeof handleObj === "object" && handleObj?.id) headerMediaHandle = handleObj.id;
        else if (typeof handleObj === "object" && handleObj?.handle) headerMediaHandle = handleObj.handle;
        else if (template.mediaUrls?.header?.handle) headerMediaHandle = template.mediaUrls.header.handle;
      } else if (headerComp.format === "LOCATION") {
        headerType = "LOCATION";
      }
    }

    const buttons = buttonsComp?.buttons || [];
    const parsedButtons = buttons.map(btn => ({
      type: btn.type as "PHONE_NUMBER" | "URL" | "QUICK_REPLY",
      text: btn.text || "",
      phoneNumber: btn.phone_number,
      url: btn.url,
      payload: btn.payload,
    }));

    const examples: Record<string, string> = {};
    const parseComponentExamples = (text: string, exampleKey: string, example: any) => {
      if (!text || !example || !example[exampleKey]) return;
      const placeholders = [...text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)].map(m => ({
        param: m[1],
        index: m.index!,
      })).sort((a, b) => a.index - b.index);
      const exampleData = example[exampleKey];
      if (!Array.isArray(exampleData)) return;
      let samples: string[] = Array.isArray(exampleData[0]) ? exampleData[0] : exampleData;
      if (!Array.isArray(samples)) return;
      placeholders.forEach((ph, i) => {
        if (i < samples.length && typeof samples[i] === "string") examples[ph.param] = samples[i];
      });
    };
    const parseNamedExamples = (exampleKey: string, example: any) => {
      if (example && example[exampleKey] && Array.isArray(example[exampleKey])) {
        example[exampleKey].forEach((item: any) => {
          if (item.param_name && typeof item.example === "string") examples[item.param_name] = item.example;
        });
      }
    };
    if (headerComp?.format === "TEXT" && headerComp.text) parseNamedExamples("header_text_named_params", headerComp.example);
    if (bodyComp?.text) {
      parseComponentExamples(bodyComp.text, "body_text", bodyComp.example);
      parseNamedExamples("body_text_named_params", bodyComp.example);
    }

    return {
      name: template.name,
      category: template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION",
      language: template.language,
      header: { type: headerType, text: headerText, mediaType: headerMediaType, mediaUrl: headerMediaUrl, mediaHandle: headerMediaHandle },
      body: bodyComp?.text || "",
      footer: footerComp?.text || "",
      buttons: parsedButtons,
      examples,
    };
  };

  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialTemplate) {
        setFormData(parseTemplateToFormData(initialTemplate));
      } else {
        setFormData({
          name: "",
          category: "UTILITY",
          language: "en_US",
          header: { type: "TEXT", text: "", mediaType: undefined, mediaUrl: "", mediaHandle: "" },
          body: "",
          footer: "",
          buttons: [],
          examples: {},
        });
      }
      setModalError(null);
    }
  }, [isOpen, isEdit, initialTemplate]);

  useEffect(() => {
    const texts = {
      header: formData.header.type === "TEXT" ? formData.header.text : "",
      body: formData.body,
      footer: formData.footer,
    };
    let allPlaceholders: { param: string; index: number; section: string }[] = [];
    Object.entries(texts).forEach(([section, text]) => {
      if (text) {
        allPlaceholders = allPlaceholders.concat(
          [...text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)].map(m => ({ param: m[1], index: m.index!, section }))
        );
      }
    });
    const seen = new Set<string>();
    const uniqueParams = allPlaceholders
      .sort((a, b) => a.index - b.index)
      .filter(p => {
        if (seen.has(p.param)) return false;
        seen.add(p.param);
        return true;
      })
      .map(p => p.param);
    const newExamples: Record<string, string> = {};
    uniqueParams.forEach(param => {
      newExamples[param] = formData.examples[param] || "";
    });
    setFormData(prev => ({ ...prev, examples: newExamples }));
  }, [formData.header.type, formData.header.text, formData.body, formData.footer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleExampleChange = (param: string, value: string) => {
    setFormData(prev => ({ ...prev, examples: { ...prev.examples, [param]: value } }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const transformed = e.target.value.toLowerCase().replace(/[^a-z\s_]/g, "").replace(/\s+/g, "_");
    setFormData(prev => ({ ...prev, name: transformed }));
  };

  const getAcceptType = (type: "IMAGE" | "VIDEO" | "DOCUMENT"): string =>
    ({ IMAGE: "image/*", VIDEO: "video/*", DOCUMENT: ".pdf" })[type] || "*";

  const uploadToMeta = async (file: File, mediaType: "IMAGE" | "VIDEO" | "DOCUMENT") => {
    if (!config) throw new Error("WhatsApp configuration not available");
    const mediaFormData = new FormData();
    mediaFormData.append("file", file);
    mediaFormData.append("media_type", mediaType);
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-media-to-meta`, {
      method: 'POST',
      body: mediaFormData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(`WhatsApp media upload failed: ${data.error || 'Unknown error'}`);
    if (!data || !data.media_handle) throw new Error("No media handle received from WhatsApp");
    return data.media_handle;
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!formData.header.mediaType) {
      setModalError("Please select a media type first.");
      return;
    }
    setUploading(true);
    setModalError(null);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "";
      const filePath = `templates/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('filePath', filePath);
      const uploadResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-template-media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: uploadFormData,
      });
      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');
      const publicUrl = uploadData.publicUrl;
      const mediaHandle = await uploadToMeta(file, formData.header.mediaType);
      setFormData(prev => ({ ...prev, header: { ...prev.header, mediaUrl: publicUrl, mediaHandle } }));
    } catch (err: any) {
      setModalError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!config || !agentPrefix || !agentId) {
      setModalError("No WhatsApp configuration or agent found");
      return;
    }
    const templateName = isEdit ? initialTemplate?.name || formData.name : formData.name.trim();
    if (!templateName) {
      setModalError("Template name is required");
      return;
    }
    if (!isEdit && !/^[a-z_]+$/.test(templateName)) {
      setModalError("Template name must contain only lowercase letters and underscores");
      return;
    }
    if (!formData.body.trim()) {
      setModalError("Body text is required");
      return;
    }

    try {
      const { business_account_id, api_key } = config;
      const metaUrl = `https://graph.facebook.com/v20.0/${business_account_id}/message_templates`;
      const components: WhatsAppTemplate["components"] = [];

      if (formData.header.type === "TEXT" && formData.header.text) {
        const headerPlaceholders = [...formData.header.text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)]
          .map(m => ({ param: m[1], index: m.index! }))
          .sort((a, b) => a.index - b.index);
        const headerComp: any = { type: "header", format: "TEXT", text: formData.header.text };
        if (headerPlaceholders.length > 0) {
          headerComp.example = {
            header_text_named_params: headerPlaceholders.map(ph => ({
              param_name: ph.param,
              example: formData.examples[ph.param] || "Sample",
            })),
          };
        }
        components.push(headerComp);
      } else if (formData.header.type === "MEDIA" && formData.header.mediaType && formData.header.mediaHandle) {
        components.push({
          type: "header",
          format: formData.header.mediaType,
          example: { header_handle: [formData.header.mediaHandle] },
        });
      } else if (formData.header.type === "LOCATION") {
        components.push({ type: "header", format: "LOCATION" });
      }

      const bodyPlaceholders = [...formData.body.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)]
        .map(m => ({ param: m[1], index: m.index! }))
        .sort((a, b) => a.index - b.index);
      const bodyComp: any = { type: "body", text: formData.body };
      if (bodyPlaceholders.length > 0) {
        bodyComp.example = {
          body_text_named_params: bodyPlaceholders.map(ph => ({
            param_name: ph.param,
            example: formData.examples[ph.param] || "Sample",
          })),
        };
      }
      components.push(bodyComp);

      if (formData.footer) {
        components.push({ type: "footer", text: formData.footer.trim() });
      }

      if (formData.buttons.length > 0) {
        components.push({
          type: "buttons",
          buttons: formData.buttons.map(b => ({
            type: b.type,
            text: b.text,
            ...(b.type === "PHONE_NUMBER" && b.phoneNumber ? { phone_number: b.phoneNumber } : {}),
            ...(b.type === "URL" && b.url ? { url: b.url } : {}),
            ...(b.type === "QUICK_REPLY" && b.payload ? { payload: b.payload } : {}),
          })),
        });
      }

      const response = await fetch(metaUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          language: formData.language,
          category: formData.category,
          parameter_format: "named",
          components,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to submit template to Meta");
      }

      const newTemplate: WhatsAppTemplate = {
        id: templateName,
        name: templateName,
        language: formData.language,
        category: formData.category,
        components,
        status: "PENDING",
        created_time: new Date().toISOString(),
      };

      if (formData.header.type === "MEDIA" && formData.header.mediaType && formData.header.mediaHandle && formData.header.mediaUrl) {
        newTemplate.mediaUrls = { header: { handle: formData.header.mediaHandle, url: formData.header.mediaUrl } };
      }

      onSuccess(newTemplate, isEdit);
      onClose();
    } catch (err: any) {
      setModalError(err.message || "Failed to submit template");
    }
  };

  return {
    formData,
    setFormData,
    modalError,
    uploading,
    handleInputChange,
    handleExampleChange,
    handleNameChange,
    getAcceptType,
    handleMediaUpload,
    handleSubmit,
    orderedVariables: Object.keys(formData.examples),
  };
};
