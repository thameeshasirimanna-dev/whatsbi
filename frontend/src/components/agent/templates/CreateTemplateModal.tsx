import React, { useState, useEffect } from 'react';
import { getToken } from '../../../lib/auth';
import { getCurrentAgent } from '../../../lib/agent';
import { X, Check, Phone, ExternalLink, MessageCircle, Plus, Trash2 } from 'lucide-react';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

const label: React.CSSProperties = { ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 };

interface WhatsAppConfig { business_account_id: string; phone_number_id: string; api_key: string; }
interface Button { type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY"; text: string; phoneNumber?: string; url?: string; payload?: string; }
interface FormData {
  name: string; category: "MARKETING" | "UTILITY" | "AUTHENTICATION"; language: string;
  header: { type: "TEXT" | "MEDIA" | "LOCATION"; text: string; mediaType?: "IMAGE" | "VIDEO" | "DOCUMENT"; mediaUrl: string; mediaHandle: string; };
  body: string; footer: string; buttons: Button[]; examples: Record<string, string>;
}
interface WhatsAppTemplate {
  id: string; name: string; language: string; category: string;
  components: Array<{ type: string; format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION"; text?: string; example?: any; buttons?: Array<{ type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY"; text: string; phone_number?: string; url?: string; payload?: string; }>; }>;
  mediaUrls?: { [key: string]: { handle: string; url: string } }; status: string; created_time?: string;
}
interface CreateTemplateModalProps {
  isOpen: boolean; onClose: () => void; onSuccess: (template: WhatsAppTemplate, isUpdate: boolean) => void;
  config: WhatsAppConfig | null; agentPrefix: string | null; agentId: string | null;
  initialTemplate?: WhatsAppTemplate | null; isEdit: boolean;
}

const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  isOpen, onClose, onSuccess, config, agentPrefix, agentId, initialTemplate, isEdit,
}) => {
  const [modalError, setModalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "", category: "UTILITY", language: "en_US",
    header: { type: "TEXT", text: "", mediaType: undefined, mediaUrl: "", mediaHandle: "" },
    body: "", footer: "", buttons: [], examples: {},
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
      if (headerComp.format === "TEXT" && headerComp.text) { headerType = "TEXT"; headerText = headerComp.text; }
      else if (headerComp.format && ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format)) {
        headerType = "MEDIA"; headerMediaType = headerComp.format as "IMAGE" | "VIDEO" | "DOCUMENT";
        if (template.mediaUrls?.header?.url) headerMediaUrl = template.mediaUrls.header.url;
        const handleObj = headerComp.example?.header_handle?.[0];
        if (typeof handleObj === "string") headerMediaHandle = handleObj;
        else if (typeof handleObj === "object" && handleObj?.id) headerMediaHandle = handleObj.id;
        else if (typeof handleObj === "object" && handleObj?.handle) headerMediaHandle = handleObj.handle;
        else if (template.mediaUrls?.header?.handle) headerMediaHandle = template.mediaUrls.header.handle;
      } else if (headerComp.format === "LOCATION") { headerType = "LOCATION"; }
    }

    const buttons = buttonsComp?.buttons || [];
    const parsedButtons = buttons.map(btn => ({ type: btn.type as "PHONE_NUMBER" | "URL" | "QUICK_REPLY", text: btn.text || "", phoneNumber: btn.phone_number, url: btn.url, payload: btn.payload }));

    const examples: Record<string, string> = {};
    const parseComponentExamples = (text: string, exampleKey: string, example: any) => {
      if (!text || !example || !example[exampleKey]) return;
      const placeholders = [...text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)].map(m => ({ param: m[1], index: m.index! })).sort((a, b) => a.index - b.index);
      const exampleData = example[exampleKey];
      if (!Array.isArray(exampleData)) return;
      let samples: string[] = Array.isArray(exampleData[0]) ? exampleData[0] : exampleData;
      if (!Array.isArray(samples)) return;
      placeholders.forEach((ph, i) => { if (i < samples.length && typeof samples[i] === "string") examples[ph.param] = samples[i]; });
    };
    const parseNamedExamples = (exampleKey: string, example: any) => {
      if (example && example[exampleKey] && Array.isArray(example[exampleKey])) {
        example[exampleKey].forEach((item: any) => { if (item.param_name && typeof item.example === "string") examples[item.param_name] = item.example; });
      }
    };
    if (headerComp?.format === "TEXT" && headerComp.text) parseNamedExamples("header_text_named_params", headerComp.example);
    if (bodyComp?.text) { parseComponentExamples(bodyComp.text, "body_text", bodyComp.example); parseNamedExamples("body_text_named_params", bodyComp.example); }

    return { name: template.name, category: template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION", language: template.language, header: { type: headerType, text: headerText, mediaType: headerMediaType, mediaUrl: headerMediaUrl, mediaHandle: headerMediaHandle }, body: bodyComp?.text || "", footer: footerComp?.text || "", buttons: parsedButtons, examples };
  };

  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialTemplate) setFormData(parseTemplateToFormData(initialTemplate));
      else setFormData({ name: "", category: "UTILITY", language: "en_US", header: { type: "TEXT", text: "", mediaType: undefined, mediaUrl: "", mediaHandle: "" }, body: "", footer: "", buttons: [], examples: {} });
      setModalError(null);
    }
  }, [isOpen, isEdit, initialTemplate]);

  useEffect(() => {
    const texts = { header: formData.header.type === "TEXT" ? formData.header.text : "", body: formData.body, footer: formData.footer };
    let allPlaceholders: { param: string; index: number; section: string }[] = [];
    Object.entries(texts).forEach(([section, text]) => {
      if (text) allPlaceholders = allPlaceholders.concat([...text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)].map(m => ({ param: m[1], index: m.index!, section })));
    });
    const seen = new Set<string>();
    const uniqueParams = allPlaceholders.sort((a, b) => a.index - b.index).filter(p => { if (seen.has(p.param)) return false; seen.add(p.param); return true; }).map(p => p.param);
    const newExamples: Record<string, string> = {};
    uniqueParams.forEach(param => { newExamples[param] = formData.examples[param] || ""; });
    setFormData(prev => ({ ...prev, examples: newExamples }));
  }, [formData.header.type, formData.header.text, formData.body, formData.footer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleExampleChange = (param: string, value: string) => setFormData(prev => ({ ...prev, examples: { ...prev.examples, [param]: value } }));
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const transformed = e.target.value.toLowerCase().replace(/[^a-z\s_]/g, "").replace(/\s+/g, "_");
    setFormData(prev => ({ ...prev, name: transformed }));
  };
  const getAcceptType = (type: "IMAGE" | "VIDEO" | "DOCUMENT"): string => ({ IMAGE: "image/*", VIDEO: "video/*", DOCUMENT: ".pdf" })[type] || "*";

  const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(","); const mime = arr[0].match(/:(.*?);/)![1]; const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  };

  const compressImage = async (file: File, maxSizeMB: number): Promise<File> => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size <= maxSize) return file;
    return new Promise((resolve, reject) => {
      const img = new Image(); const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      img.onload = () => {
        let { width, height } = img; const maxDim = 1280;
        if (width > maxDim || height > maxDim) { const ratio = Math.min(maxDim / width, maxDim / height); width *= ratio; height *= ratio; }
        canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.9; const getDataUrl = () => canvas.toDataURL("image/jpeg", quality); let dataUrl = getDataUrl();
        while ((dataUrl.length * 3) / 4 > maxSize && quality > 0.1) { quality -= 0.05; dataUrl = getDataUrl(); }
        if (quality <= 0.1) { reject(new Error("Could not compress image sufficiently")); return; }
        const blob = dataURLtoBlob(dataUrl); const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        resolve(new File([blob], `compressed.${ext}`, { type: blob.type }));
      };
      img.src = URL.createObjectURL(file); img.onerror = () => reject(new Error("Failed to load image"));
    });
  };

  const uploadToMeta = async (file: File, mediaType: "IMAGE" | "VIDEO" | "DOCUMENT") => {
    if (!config) throw new Error("WhatsApp configuration not available");
    const mediaFormData = new FormData(); mediaFormData.append("file", file); mediaFormData.append("media_type", mediaType);
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-media-to-meta`, { method: 'POST', body: mediaFormData });
    const data = await response.json();
    if (!response.ok) throw new Error(`WhatsApp media upload failed: ${data.error || 'Unknown error'}`);
    if (!data || !data.media_handle) throw new Error("No media handle received from WhatsApp");
    const mediaHandle = data.media_handle;
    if (typeof mediaHandle !== "string" || mediaHandle.length === 0) throw new Error(`Invalid media handle format: ${mediaHandle}`);
    return mediaHandle;
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!formData.header.mediaType) { setModalError("Please select a media type first."); return; }
    if (formData.header.mediaType === "DOCUMENT" && !file.name.toLowerCase().endsWith(".pdf")) { setModalError("Documents for WhatsApp templates must be PDF files only (max 100KB)."); return; }
    const mediaLimits: Record<string, number> = { IMAGE: 5 * 1024 * 1024, VIDEO: 16 * 1024 * 1024, DOCUMENT: 100 * 1024 };
    const limit = mediaLimits[formData.header.mediaType];
    let processedFile = file;
    if (file.size > limit) {
      if (formData.header.mediaType === "IMAGE") {
        try { processedFile = await compressImage(file, limit / (1024 * 1024)); if (processedFile.size > limit) throw new Error("Compression did not reduce size sufficiently"); }
        catch (compressErr) { setModalError(`Image too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Compression failed: ${compressErr instanceof Error ? compressErr.message : "Unknown error"}. Please resize manually.`); return; }
      } else { setModalError(`File too large for ${formData.header.mediaType.toLowerCase()} (${(file.size / (1024 * 1024)).toFixed(2)}MB). Limit: ${(limit / (1024 * 1024)).toFixed(2)}MB.`); return; }
    }
    setUploading(true); setModalError(null);
    try {
      const fileExt = processedFile.name.split(".").pop()?.toLowerCase() || "";
      const filePath = `templates/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const uploadFormData = new FormData(); uploadFormData.append('file', processedFile); uploadFormData.append('filePath', filePath);
      const uploadResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-template-media`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: uploadFormData });
      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json();
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');
      const publicUrl = uploadData.publicUrl;
      const mediaHandle = await uploadToMeta(processedFile, formData.header.mediaType);
      setFormData(prev => ({ ...prev, header: { ...prev.header, mediaUrl: publicUrl, mediaHandle } }));
    } catch (err: any) { setModalError(`Upload failed: ${err.message}`); console.error("Media upload error:", err); }
    finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setModalError(null);
    if (!config || !agentPrefix || !agentId) { setModalError("No WhatsApp configuration or agent found"); return; }
    const templateName = isEdit ? initialTemplate?.name || formData.name : formData.name.trim();
    if (!templateName) { setModalError("Template name is required"); return; }
    if (!isEdit && !/^[a-z_]+$/.test(templateName)) { setModalError("Template name must contain only lowercase letters and underscores"); return; }
    if (!formData.body.trim()) { setModalError("Body text is required"); return; }
    if (formData.footer && formData.footer.length > 60) { setModalError("Footer must be 60 characters or less"); return; }
    if (formData.buttons.some(b => !b.text.trim())) { setModalError("All buttons must have text"); return; }
    if (formData.header.type === "MEDIA" && (!formData.header.mediaType || !formData.header.mediaHandle.trim())) { setModalError("Media header requires type and media upload to WhatsApp"); return; }
    if (formData.buttons.length > 3) { setModalError("Maximum 3 buttons allowed"); return; }
    const texts = [formData.header.type === "TEXT" ? formData.header.text : "", formData.body];
    let allVarsSet = new Set<string>();
    texts.forEach(text => { if (text) [...text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)].forEach(m => allVarsSet.add(m[1])); });
    if (formData.footer) { if ([...formData.footer.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)].length > 0) { setModalError("Footer text cannot contain variables ({{param}}). Please remove them."); return; } }
    const missingVars = Array.from(allVarsSet).filter(p => !formData.examples[p]?.trim());
    if (missingVars.length > 0) { setModalError(`Please provide sample values for all variables ({{${missingVars.join(", ")}}}).`); return; }

    try {
      const { business_account_id, api_key } = config;
      const metaUrl = `https://graph.facebook.com/v20.0/${business_account_id}/message_templates`;
      const components: WhatsAppTemplate["components"] = [];

      if (formData.header.type === "TEXT" && formData.header.text) {
        const headerText = formData.header.text;
        if (headerText.length > 60) { setModalError("Text header must be 60 characters or less"); return; }
        const headerPlaceholders = [...headerText.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)].map(m => ({ param: m[1], index: m.index! })).sort((a, b) => a.index - b.index);
        if (headerPlaceholders.length > 1) { setModalError("Text header supports only 1 parameter"); return; }
        const headerComp: any = { type: "header", format: "TEXT", text: headerText };
        if (headerPlaceholders.length > 0) headerComp.example = { header_text_named_params: headerPlaceholders.map(ph => ({ param_name: ph.param, example: formData.examples[ph.param] })) };
        components.push(headerComp);
      } else if (formData.header.type === "MEDIA" && formData.header.mediaType && formData.header.mediaHandle) {
        components.push({ type: "header", format: formData.header.mediaType, example: { header_handle: [formData.header.mediaHandle] } });
      } else if (formData.header.type === "LOCATION") {
        components.push({ type: "header", format: "LOCATION" });
      }

      const bodyText = formData.body;
      const bodyPlaceholders = [...bodyText.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)].map(m => ({ param: m[1], index: m.index! })).sort((a, b) => a.index - b.index);
      const bodyComp: any = { type: "body", text: bodyText };
      if (bodyPlaceholders.length > 0) bodyComp.example = { body_text_named_params: bodyPlaceholders.map(ph => ({ param_name: ph.param, example: formData.examples[ph.param] })) };
      components.push(bodyComp);

      if (formData.footer) {
        const footerText = formData.footer.trim();
        if ([...footerText.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g)].length > 0) { setModalError("Footer text cannot contain variables ({{param}}). Please remove them."); return; }
        components.push({ type: "footer", text: footerText });
      }

      if (formData.buttons.length > 0) {
        components.push({ type: "buttons", buttons: formData.buttons.map(b => ({ type: b.type, text: b.text, ...(b.type === "PHONE_NUMBER" && b.phoneNumber ? { phone_number: b.phoneNumber } : {}), ...(b.type === "URL" && b.url ? { url: b.url } : {}), ...(b.type === "QUICK_REPLY" && b.payload ? { payload: b.payload } : {}) })) });
      }

      const response = await fetch(metaUrl, { method: "POST", headers: { Authorization: `Bearer ${api_key}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: templateName, language: formData.language, category: formData.category, parameter_format: "named", components }) });
      if (!response.ok) {
        const errorData = await response.json(); let errorMsg = errorData.error?.message || response.statusText;
        if (errorData.error?.code === 131009 && errorData.error?.error_subcode === 2494102) errorMsg = `Invalid media handle: ${errorData.error?.error_user_msg || "The uploaded media handle is not valid. Please try uploading the media again."}`;
        else if (errorData.error?.error_subcode === 2388023 || errorMsg.includes("being deleted")) errorMsg = "The English language version of this template is being deleted by Meta. New content can't be added until this process completes in about 4 weeks. Consider creating a new template with a different name.";
        else if (errorData.error?.error_user_msg) errorMsg = errorData.error.error_user_msg;
        throw new Error(errorMsg);
      }

      const newTemplate: WhatsAppTemplate = { id: templateName, name: templateName, language: formData.language, category: formData.category, components, status: "PENDING", created_time: new Date().toISOString() };
      if (formData.header.type === "MEDIA" && formData.header.mediaType && formData.header.mediaHandle && formData.header.mediaUrl) {
        newTemplate.mediaUrls = { header: { handle: formData.header.mediaHandle, url: formData.header.mediaUrl } };
      } else if (isEdit && initialTemplate?.mediaUrls?.header) {
        newTemplate.mediaUrls = { header: initialTemplate.mediaUrls.header };
      }

      onSuccess(newTemplate, isEdit);

      const cacheBody: Record<string, any> = { name: newTemplate.name, language: { code: newTemplate.language }, components: newTemplate.components };
      if (formData.header.type === "MEDIA" && formData.header.mediaType && formData.header.mediaHandle && formData.header.mediaUrl) cacheBody.media_urls = { header: { handle: formData.header.mediaHandle, url: formData.header.mediaUrl } };
      else if (isEdit && initialTemplate?.mediaUrls) cacheBody.media_urls = initialTemplate.mediaUrls;
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-templates`, { method: isEdit ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...(isEdit ? { id: templateName, update: true } : {}), name: newTemplate.name, category: formData.category.toLowerCase(), language: formData.language, body: cacheBody, is_active: true, ...(isEdit ? { updated_at: new Date().toISOString() } : { created_at: new Date().toISOString() }) }) });

      onClose();
    } catch (err: any) { setModalError(err.message || "Failed to submit template"); console.error("Submit template error:", err); }
  };

  if (!isOpen) return null;

  const paramRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g;
  const textsForOrder = [...(formData.header.type === "TEXT" && formData.header.text ? [formData.header.text] : []), formData.body, ...(formData.footer ? [formData.footer] : [])].join("\n");
  let allPlaceholders: { param: string; index: number }[] = [];
  let globalIndex = 0;
  textsForOrder.split("\n").forEach(text => {
    let localIndex = 0;
    [...text.matchAll(paramRegex)].forEach(match => { allPlaceholders.push({ param: match[1], index: globalIndex + localIndex }); localIndex += match.index! + match[0].length; });
    globalIndex += text.length;
  });
  const seen = new Set<string>();
  const orderedVariables = allPlaceholders.sort((a, b) => a.index - b.index).filter(p => { if (seen.has(p.param)) return false; seen.add(p.param); return true; }).map(p => p.param);

  return (
    <>
      <style>{`@keyframes ctm-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 900, maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ flexShrink: 0, padding: '18px 24px 14px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e' }}>{isEdit ? "Edit Template" : "Create New Template"}</span>
            <button onClick={onClose} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} style={{ color: '#71717a' }} />
            </button>
          </div>

          {/* Body: left form + right preview */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* Left — Form */}
            <div style={{ width: '60%', overflowY: 'auto', padding: 24, borderRight: '1px solid #ebebeb' }}>
              {modalError && (
                <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e', marginBottom: 16 }}>
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={label}>Template Name</label>
                  <input type="text" name="name" value={formData.name} onChange={isEdit ? handleInputChange : handleNameChange} required={!isEdit} disabled={isEdit} placeholder="e.g. welcome_message (lowercase, underscores)" style={{ ...inputStyle, background: isEdit ? '#f4f4f5' : '#f9f9f9' }} onFocus={onFocus} onBlur={onBlur} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={label}>Category</label>
                    <select name="category" value={formData.category} onChange={handleInputChange} required style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="UTILITY">Utility</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>
                  <div>
                    <label style={label}>Language</label>
                    <select name="language" value={formData.language} onChange={handleInputChange} required style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                      <option value="en_US">English</option>
                      <option value="si">Sinhala</option>
                      <option value="ta">Tamil</option>
                    </select>
                  </div>
                </div>

                {/* Header */}
                <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 14 }}>
                  <label style={label}>Header</label>
                  <select value={formData.header.type} onChange={e => setFormData(prev => ({ ...prev, header: { ...prev.header, type: e.target.value as "TEXT" | "MEDIA" | "LOCATION" } }))} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer', marginBottom: 10 }} onFocus={onFocus} onBlur={onBlur}>
                    <option value="TEXT">Text</option>
                    <option value="MEDIA">Media</option>
                    {(formData.category === "UTILITY" || formData.category === "MARKETING") && <option value="LOCATION">Location</option>}
                  </select>
                  {formData.header.type === "TEXT" ? (
                    <textarea value={formData.header.text} onChange={e => setFormData(prev => ({ ...prev, header: { ...prev.header, text: e.target.value } }))} placeholder="Header text (optional). Use {{param_name}} for variables." rows={2} style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur} />
                  ) : formData.header.type === "LOCATION" ? (
                    <div style={{ padding: '10px 14px', background: 'rgba(8,145,178,0.06)', border: '1px solid rgba(8,145,178,0.2)', borderRadius: 9, ...DM, fontSize: 12, color: '#0891b2' }}>
                      Location header selected. Coordinates will be provided when sending via the API.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <select value={formData.header.mediaType || ""} onChange={e => setFormData(prev => ({ ...prev, header: { ...prev.header, mediaType: e.target.value as "IMAGE" | "VIDEO" | "DOCUMENT" } }))} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                        <option value="">Select media type</option>
                        <option value="IMAGE">Image</option>
                        <option value="VIDEO">Video</option>
                        <option value="DOCUMENT">Document</option>
                      </select>
                      {formData.header.mediaType && (
                        <div>
                          <label style={{ ...label, marginBottom: 4 }}>Upload {formData.header.mediaType.toLowerCase()} to WhatsApp</label>
                          <input type="file" accept={getAcceptType(formData.header.mediaType)} onChange={handleMediaUpload} disabled={uploading} style={{ ...DM, fontSize: 12, color: '#71717a', width: '100%' }} />
                          {uploading && <div style={{ ...DM, fontSize: 12, color: '#0891b2', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(8,145,178,0.2)', borderTopColor: '#0891b2', animation: 'ctm-spin 0.7s linear infinite' }} />Uploading…</div>}
                          {formData.header.mediaHandle && !uploading && <div style={{ ...DM, fontSize: 12, color: '#059669', marginTop: 4 }}>✓ Uploaded (handle: {formData.header.mediaHandle.substring(0, 8)}…)</div>}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div>
                  <label style={label}>Body Text *</label>
                  <textarea name="body" value={formData.body} onChange={handleInputChange} required rows={4} placeholder="Enter the template body text. Use {{param_name}} for variables." style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur} />
                </div>

                {/* Footer */}
                <div>
                  <label style={label}>Footer <span style={{ color: '#a1a1aa', fontWeight: 400 }}>(optional, max 60 chars)</span></label>
                  <textarea value={formData.footer} onChange={e => setFormData(prev => ({ ...prev, footer: e.target.value }))} placeholder="Footer text (no variables allowed)" rows={2} style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur} />
                </div>

                {/* Variable examples */}
                {orderedVariables.length > 0 && (
                  <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 14 }}>
                    <label style={label}>Sample Values for Variables</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {orderedVariables.map(param => (
                        <div key={param} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <code style={{ ...DM, fontSize: 12, color: '#059669', background: 'rgba(34,197,94,0.08)', padding: '3px 8px', borderRadius: 6, flexShrink: 0 }}>{`{{${param}}}`}</code>
                          <input type="text" value={formData.examples[param] || ""} onChange={e => handleExampleChange(param, e.target.value)} placeholder={`Sample for {{${param}}}`} style={{ ...inputStyle, flex: 1 }} onFocus={onFocus} onBlur={onBlur} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: 14 }}>
                  <label style={label}>Buttons <span style={{ color: '#a1a1aa', fontWeight: 400 }}>(max 3)</span></label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {formData.buttons.map((button, index) => (
                      <div key={index} style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#71717a' }}>Button {index + 1}</span>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, buttons: prev.buttons.filter((_, i) => i !== index) }))}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(244,63,94,0.06)', border: 'none', borderRadius: 7, padding: '3px 8px', cursor: 'pointer', ...DM, fontSize: 11, fontWeight: 600, color: '#f43f5e' }}>
                            <Trash2 size={11} /> Remove
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <select value={button.type} onChange={e => setFormData(prev => ({ ...prev, buttons: prev.buttons.map((b, i) => i === index ? { ...b, type: e.target.value as "PHONE_NUMBER" | "URL" | "QUICK_REPLY" } : b) }))} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }} onFocus={onFocus} onBlur={onBlur}>
                            <option value="PHONE_NUMBER">Call to Action (Phone)</option>
                            <option value="URL">URL Button</option>
                            <option value="QUICK_REPLY">Quick Reply</option>
                          </select>
                          <input type="text" value={button.text} onChange={e => setFormData(prev => ({ ...prev, buttons: prev.buttons.map((b, i) => i === index ? { ...b, text: e.target.value } : b) }))} placeholder="Button text" required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                          {button.type === "PHONE_NUMBER" && <input type="tel" value={button.phoneNumber || ""} onChange={e => setFormData(prev => ({ ...prev, buttons: prev.buttons.map((b, i) => i === index ? { ...b, phoneNumber: e.target.value } : b) }))} placeholder="Phone number (e.g. +1234567890)" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />}
                          {button.type === "URL" && <input type="url" value={button.url || ""} onChange={e => setFormData(prev => ({ ...prev, buttons: prev.buttons.map((b, i) => i === index ? { ...b, url: e.target.value } : b) }))} placeholder="URL (e.g. https://example.com)" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />}
                          {button.type === "QUICK_REPLY" && <input type="text" value={button.payload || ""} onChange={e => setFormData(prev => ({ ...prev, buttons: prev.buttons.map((b, i) => i === index ? { ...b, payload: e.target.value } : b) }))} placeholder="Payload (for quick reply)" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />}
                        </div>
                      </div>
                    ))}
                    {formData.buttons.length < 3 && (
                      <button type="button" onClick={() => setFormData(prev => ({ ...prev, buttons: [...prev.buttons, { type: "QUICK_REPLY" as const, text: "", payload: "" }] }))}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '9px', border: '2px dashed #ebebeb', borderRadius: 9, background: 'transparent', cursor: 'pointer', ...DM, fontSize: 12, fontWeight: 600, color: '#71717a', transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#22c55e'}
                        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#ebebeb'}
                      >
                        <Plus size={13} /> Add Button
                      </button>
                    )}
                    {formData.buttons.length >= 3 && <div style={{ ...DM, fontSize: 12, color: '#a1a1aa' }}>Maximum 3 buttons allowed.</div>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 6 }}>
                  <button type="button" onClick={onClose} style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" style={{ flex: 1, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Check size={15} />{isEdit ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>

            {/* Right — Live Preview */}
            <div style={{ width: '40%', overflowY: 'auto', padding: 24, background: '#f8faf8' }}>
              <div style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e', marginBottom: 14 }}>Live Preview</div>
              <div style={{ border: '1px solid #ebebeb', borderRadius: 12, padding: 14, background: '#f0f2f5', maxWidth: 320 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', ...DM }}>Your template</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', ...DM }}>Template</span>
                </div>
                <div style={{ background: '#f0f2f5', borderRadius: 8, padding: 8 }}>
                  <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {formData.header.type === "LOCATION" ? (
                      <div style={{ width: '100%', height: 80, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 12, color: '#2563eb' }}>📍 Location Map</span></div>
                    ) : formData.header.type === "MEDIA" && formData.header.mediaType && formData.header.mediaUrl ? (
                      formData.header.mediaType === "IMAGE" ? <img src={formData.header.mediaUrl} alt="Header" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} onError={e => { e.currentTarget.style.display = "none"; }} />
                      : formData.header.mediaType === "VIDEO" ? <video src={formData.header.mediaUrl} style={{ width: '100%', height: 'auto', objectFit: 'contain' }} muted controls={false} />
                      : <div style={{ width: '100%', height: 64, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 12, color: '#6b7280' }}>{formData.header.mediaType} preview</span></div>
                    ) : formData.header.type === "MEDIA" ? (
                      <div style={{ padding: 10, textAlign: 'center', background: '#f3f4f6' }}><span style={{ fontSize: 12, color: '#6b7280' }}>Media header (upload required)</span></div>
                    ) : null}
                    <div style={{ padding: '10px 12px' }}>
                      {formData.header.type === "TEXT" && formData.header.text && (
                        <p style={{ fontSize: 13, color: '#111827', fontWeight: 600, marginBottom: 6, whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                          {formData.header.text.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, (_, p) => formData.examples[p] || "[Variable]")}
                        </p>
                      )}
                      <p style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 4, textAlign: 'left' }}>
                        {formData.body.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, (_, p) => formData.examples[p] || "[Variable]") || "Enter body text..."}
                      </p>
                      {formData.footer && <div style={{ marginBottom: 4, fontSize: 11, color: '#6b7280', fontStyle: 'italic', textAlign: 'left' }}>{formData.footer.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g, (_, p) => formData.examples[p] || "[Variable]")}</div>}
                      <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginBottom: formData.buttons.length > 0 ? 6 : 0 }}>13:40</p>
                      {formData.buttons.length > 0 && <div style={{ borderTop: '1px solid #e5e7eb', marginBottom: 4 }} />}
                      {formData.buttons.map((button, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', color: '#3b82f6', fontSize: 13, fontWeight: 500, borderTop: i > 0 ? '1px solid #e5e7eb' : 'none' }}>
                          {button.type === "PHONE_NUMBER" && <Phone size={13} />}
                          {button.type === "URL" && <ExternalLink size={13} />}
                          {button.type === "QUICK_REPLY" && <MessageCircle size={13} />}
                          <span>{button.text || `Button ${i + 1}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateTemplateModal;
