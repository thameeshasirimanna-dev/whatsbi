import React, { useState, useEffect } from 'react';
import { getToken } from '../../../lib/auth';
import {
  XMarkIcon,
  CheckIcon,
  PhoneIcon,
  ArrowUpRightIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";

interface WhatsAppConfig {
  business_account_id: string;
  phone_number_id: string;
  api_key: string;
}

interface Button {
  type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY";
  text: string;
  phoneNumber?: string;
  url?: string;
  payload?: string;
}

interface FormData {
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
  mediaUrls?: { [key: string]: { handle: string; url: string } };
  status: string;
  created_time?: string;
}

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (template: WhatsAppTemplate, isUpdate: boolean) => void;
  config: WhatsAppConfig | null;
  agentPrefix: string | null;
  agentId: string | null;
  initialTemplate?: WhatsAppTemplate | null;
  isEdit: boolean;
}

const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  config,
  agentPrefix,
  agentId,
  initialTemplate,
  isEdit,
}) => {
  const [modalError, setModalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "UTILITY",
    language: "en_US",
    header: {
      type: "TEXT",
      text: "",
      mediaType: undefined,
      mediaUrl: "",
      mediaHandle: "",
    },
    body: "",
    footer: "",
    buttons: [],
    examples: {},
  });

  const parseTemplateToFormData = (template: WhatsAppTemplate): FormData => {
    const components = template.components || [];
    const headerComp = components.find(
      (c) => c.type.toLowerCase() === "header"
    );
    const bodyComp = components.find((c) => c.type.toLowerCase() === "body");
    const footerComp = components.find(
      (c) => c.type.toLowerCase() === "footer"
    );
    const buttonsComp = components.find(
      (c) => c.type.toLowerCase() === "buttons"
    );

    let headerType: "TEXT" | "MEDIA" | "LOCATION" = "TEXT";
    let headerText = "";
    let headerMediaType: "IMAGE" | "VIDEO" | "DOCUMENT" | undefined;
    let headerMediaUrl = "";
    let headerMediaHandle = "";

    if (headerComp) {
      if (headerComp.format === "TEXT" && headerComp.text) {
        headerType = "TEXT";
        headerText = headerComp.text;
      } else if (
        headerComp.format &&
        ["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComp.format)
      ) {
        headerType = "MEDIA";
        headerMediaType = headerComp.format as "IMAGE" | "VIDEO" | "DOCUMENT";
        if (template.mediaUrls?.header?.url) {
          headerMediaUrl = template.mediaUrls.header.url;
        }
        const handleObj = headerComp.example?.header_handle?.[0];
        if (typeof handleObj === "string") {
          headerMediaHandle = handleObj;
        } else if (typeof handleObj === "object" && handleObj?.id) {
          headerMediaHandle = handleObj.id;
        } else if (typeof handleObj === "object" && handleObj?.handle) {
          headerMediaHandle = handleObj.handle;
        } else if (template.mediaUrls?.header?.handle) {
          headerMediaHandle = template.mediaUrls.header.handle;
        }
      } else if (headerComp.format === "LOCATION") {
        headerType = "LOCATION";
      }
    }

    const buttons = buttonsComp?.buttons || [];
    const parsedButtons = buttons.map((btn) => ({
      type: btn.type as "PHONE_NUMBER" | "URL" | "QUICK_REPLY",
      text: btn.text || "",
      phoneNumber: btn.phone_number,
      url: btn.url,
      payload: btn.payload,
    }));

    const examples: Record<string, string> = {};

    const parseComponentExamples = (
      text: string,
      exampleKey: string,
      example: any
    ) => {
      if (!text || !example || !example[exampleKey]) return;
      const placeholders = [
        ...text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g),
      ]
        .map((match) => ({
          param: match[1],
          index: match.index!,
        }))
        .sort((a, b) => a.index - b.index);
      const exampleData = example[exampleKey];
      if (!Array.isArray(exampleData)) return;
      let samples: string[];
      const first = exampleData[0];
      if (Array.isArray(first)) {
        samples = first;
      } else {
        samples = exampleData;
      }
      if (!Array.isArray(samples)) return;
      placeholders.forEach((ph, i) => {
        if (i < samples.length && typeof samples[i] === "string") {
          examples[ph.param] = samples[i];
        }
      });
    };

    const parseNamedExamples = (exampleKey: string, example: any) => {
      const namedKey = exampleKey;
      if (example && example[namedKey] && Array.isArray(example[namedKey])) {
        example[namedKey].forEach((item: any) => {
          if (item.param_name && typeof item.example === "string") {
            examples[item.param_name] = item.example;
          }
        });
      }
    };

    // Header text examples
    if (headerComp?.format === "TEXT" && headerComp.text) {
      parseNamedExamples("header_text_named_params", headerComp.example);
    }

    // Body examples
    if (bodyComp?.text) {
      parseComponentExamples(bodyComp.text, "body_text", bodyComp.example);
      parseNamedExamples("body_text_named_params", bodyComp.example);
    }

    // Footer examples - not supported, ignore

    return {
      name: template.name,
      category: template.category as "MARKETING" | "UTILITY" | "AUTHENTICATION",
      language: template.language,
      header: {
        type: headerType,
        text: headerText,
        mediaType: headerMediaType,
        mediaUrl: headerMediaUrl,
        mediaHandle: headerMediaHandle,
      },
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
          header: {
            type: "TEXT" as const,
            text: "",
            mediaType: undefined,
            mediaUrl: "",
            mediaHandle: "",
          },
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
    let allPlaceholders: { param: string; index: number; section: string }[] =
      [];
    Object.entries(texts).forEach(([section, text]) => {
      if (text) {
        const matches = [
          ...text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g),
        ].map((match) => ({
          param: match[1],
          index: match.index!,
          section,
        }));
        allPlaceholders = allPlaceholders.concat(matches);
      }
    });
    const seen = new Set<string>();
    const uniqueParams = allPlaceholders
      .sort((a, b) => a.index - b.index)
      .filter((p) => {
        if (seen.has(p.param)) return false;
        seen.add(p.param);
        return true;
      })
      .map((p) => p.param);
    const newExamples: Record<string, string> = {};
    uniqueParams.forEach((param) => {
      newExamples[param] = formData.examples[param] || "";
    });
    setFormData((prev) => ({ ...prev, examples: newExamples }));
  }, [
    formData.header.type,
    formData.header.text,
    formData.body,
    formData.footer,
  ]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    if (name === "body") {
      setFormData((prev) => ({ ...prev, body: value }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleExampleChange = (param: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      examples: {
        ...prev.examples,
        [param]: value,
      },
    }));
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const transformed = rawValue
      .toLowerCase()
      .replace(/[^a-z\s_]/g, "")
      .replace(/\s+/g, "_");
    setFormData((prev) => ({
      ...prev,
      name: transformed,
    }));
  };

  const getAcceptType = (type: "IMAGE" | "VIDEO" | "DOCUMENT"): string => {
    switch (type) {
      case "IMAGE":
        return "image/*";
      case "VIDEO":
        return "video/*";
      case "DOCUMENT":
        return ".pdf";
      default:
        return "*";
    }
  };

  const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const compressImage = async (
    file: File,
    maxSizeMB: number
  ): Promise<File> => {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size <= maxSize) {
      return file;
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const maxDim = 1280;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.9;
        const getDataUrl = () => canvas.toDataURL("image/jpeg", quality);
        let dataUrl = getDataUrl();
        while ((dataUrl.length * 3) / 4 > maxSize && quality > 0.1) {
          quality -= 0.05;
          dataUrl = getDataUrl();
        }
        if (quality <= 0.1) {
          reject(new Error("Could not compress image sufficiently"));
          return;
        }
        const blob = dataURLtoBlob(dataUrl);
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const compressedFile = new File([blob], `compressed.${ext}`, {
          type: blob.type,
        });
        resolve(compressedFile);
      };
      img.src = URL.createObjectURL(file);
      img.onerror = () => reject(new Error("Failed to load image"));
    });
  };

  const uploadToMeta = async (
    file: File,
    mediaType: "IMAGE" | "VIDEO" | "DOCUMENT"
  ) => {
    if (!config) {
      throw new Error("WhatsApp configuration not available");
    }

    const mediaFormData = new FormData();
    mediaFormData.append("file", file);
    mediaFormData.append("media_type", mediaType);

    const response = await fetch('http://localhost:8080/upload-media-to-meta', {
      method: 'POST',
      body: mediaFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp media upload failed: ${data.error || 'Unknown error'}`);
    }

    if (!data || !data.media_handle) {
      throw new Error("No media handle received from WhatsApp");
    }

    const mediaHandle = data.media_handle;
    if (typeof mediaHandle !== "string" || mediaHandle.length === 0) {
      throw new Error(`Invalid media handle format: ${mediaHandle}`);
    }

    return mediaHandle;
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!formData.header.mediaType) {
      setModalError("Please select a media type first.");
      return;
    }

    if (
      formData.header.mediaType === "DOCUMENT" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setModalError(
        "Documents for WhatsApp templates must be PDF files only (max 100KB)."
      );
      return;
    }

    const mediaLimits: Record<string, number> = {
      IMAGE: 5 * 1024 * 1024,
      VIDEO: 16 * 1024 * 1024,
      DOCUMENT: 100 * 1024,
    };

    const limit = mediaLimits[formData.header.mediaType];
    let processedFile = file;

    if (file.size > limit) {
      if (formData.header.mediaType === "IMAGE") {
        try {
          processedFile = await compressImage(file, limit / (1024 * 1024));
          if (processedFile.size > limit) {
            throw new Error("Compression did not reduce size sufficiently");
          }
        } catch (compressErr) {
          const errorMsg =
            compressErr instanceof Error
              ? compressErr.message
              : "Unknown compression error";
          setModalError(
            `Image too large (${(file.size / (1024 * 1024)).toFixed(
              2
            )}MB). WhatsApp limit: 5MB. Compression failed: ${errorMsg}. Please resize manually.`
          );
          return;
        }
      } else {
        const limitMB = (limit / (1024 * 1024)).toFixed(2);
        setModalError(
          `File too large for ${formData.header.mediaType.toLowerCase()} (${(
            file.size /
            (1024 * 1024)
          ).toFixed(
            2
          )}MB). WhatsApp limit: ${limitMB}MB. Please resize manually and try again.`
        );
        return;
      }
    }

    setUploading(true);
    setModalError(null);

    try {
      const fileExt = processedFile.name.split(".").pop()?.toLowerCase() || "";
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const fileName = `${timestamp}-${randomStr}.${fileExt}`;
      const filePath = `templates/${fileName}`;

      const { data: supabaseData, error: uploadError } = await supabase.storage
        .from("templates-media")
        .upload(filePath, processedFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;
      if (!supabaseData) throw new Error("Supabase upload failed");

      const {
        data: { publicUrl },
      } = supabase.storage.from("templates-media").getPublicUrl(filePath);

      const mediaHandle = await uploadToMeta(
        processedFile,
        formData.header.mediaType
      );

      setFormData((prev) => ({
        ...prev,
        header: {
          ...prev.header,
          mediaUrl: publicUrl,
          mediaHandle,
        },
      }));
    } catch (err: any) {
      setModalError(`Upload failed: ${err.message}`);
      console.error("Media upload error:", err);
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

    const templateName = isEdit
      ? initialTemplate?.name || formData.name
      : formData.name.trim();
    if (!templateName) {
      setModalError("Template name is required");
      return;
    }

    if (!isEdit) {
      const nameRegex = /^[a-z_]+$/;
      if (!nameRegex.test(templateName)) {
        setModalError(
          "Template name must contain only lowercase letters and underscores (e.g., welcome_message)"
        );
        return;
      }
    }

    if (!formData.body.trim()) {
      setModalError("Body text is required");
      return;
    }

    if (formData.footer && formData.footer.length > 60) {
      setModalError("Footer must be 60 characters or less");
      return;
    }

    if (formData.buttons.some((b) => !b.text.trim())) {
      setModalError("All buttons must have text");
      return;
    }

    if (
      formData.header.type === "MEDIA" &&
      (!formData.header.mediaType || !formData.header.mediaHandle.trim())
    ) {
      setModalError("Media header requires type and media upload to WhatsApp");
      return;
    }

    if (formData.buttons.length > 3) {
      setModalError("Maximum 3 buttons allowed");
      return;
    }

    // Validate examples for all components
    const texts = [
      formData.header.type === "TEXT" ? formData.header.text : "",
      formData.body,
    ];
    let allVarsSet = new Set<string>();
    texts.forEach((text) => {
      if (text) {
        const matches = [
          ...text.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g),
        ];
        matches.forEach((match) => {
          allVarsSet.add(match[1]);
        });
      }
    });
    // Check footer for invalid placeholders
    if (formData.footer) {
      const footerMatches = [
        ...formData.footer.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g),
      ];
      if (footerMatches.length > 0) {
        setModalError(
          "Footer text cannot contain variables ({{param}}). Please remove them."
        );
        return;
      }
    }
    const missingVars = Array.from(allVarsSet).filter(
      (param) => !formData.examples[param]?.trim()
    );
    if (missingVars.length > 0) {
      setModalError(
        `Please provide sample values for all variables ({{${missingVars.join(
          ", "
        )}}}).`
      );
      return;
    }

    try {
      const { business_account_id, api_key } = config;
      const metaUrl = `https://graph.facebook.com/v20.0/${business_account_id}/message_templates`;

      const components: WhatsAppTemplate["components"] = [];

      // Header
      if (formData.header.type === "TEXT" && formData.header.text) {
        const headerText = formData.header.text;
        if (headerText.length > 60) {
          setModalError("Text header must be 60 characters or less");
          return;
        }
        const headerPlaceholders = [
          ...headerText.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g),
        ]
          .map((match) => ({ param: match[1], index: match.index! }))
          .sort((a, b) => a.index - b.index);
        if (headerPlaceholders.length > 1) {
          setModalError("Text header supports only 1 parameter");
          return;
        }
        const headerComp: any = {
          type: "header",
          format: "TEXT",
          text: headerText,
        };
        if (headerPlaceholders.length > 0) {
          const headerNamedParams = headerPlaceholders.map((ph) => ({
            param_name: ph.param,
            example: formData.examples[ph.param],
          }));
          headerComp.example = { header_text_named_params: headerNamedParams };
        }
        components.push(headerComp);
      } else if (
        formData.header.type === "MEDIA" &&
        formData.header.mediaType &&
        formData.header.mediaHandle
      ) {
        components.push({
          type: "header",
          format: formData.header.mediaType,
          example: {
            header_handle: [formData.header.mediaHandle],
          },
        });
      } else if (formData.header.type === "LOCATION") {
        components.push({
          type: "header",
          format: "LOCATION",
        });
      }

      // Body
      const bodyText = formData.body;
      const bodyPlaceholders = [
        ...bodyText.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g),
      ]
        .map((match) => ({ param: match[1], index: match.index! }))
        .sort((a, b) => a.index - b.index);
      const bodyComp: any = {
        type: "body",
        text: bodyText,
      };
      if (bodyPlaceholders.length > 0) {
        const bodyNamedParams = bodyPlaceholders.map((ph) => ({
          param_name: ph.param,
          example: formData.examples[ph.param],
        }));
        bodyComp.example = { body_text_named_params: bodyNamedParams };
      }
      components.push(bodyComp);

      // Footer
      if (formData.footer) {
        const footerText = formData.footer.trim();
        const footerPlaceholders = [
          ...footerText.matchAll(/\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g),
        ];
        if (footerPlaceholders.length > 0) {
          setModalError(
            "Footer text cannot contain variables ({{param}}). Please remove them."
          );
          return;
        }
        components.push({
          type: "footer",
          text: footerText,
        });
      }

      // Buttons
      if (formData.buttons.length > 0) {
        const buttons = formData.buttons.map((button) => ({
          type: button.type,
          text: button.text,
          ...(button.type === "PHONE_NUMBER" && button.phoneNumber
            ? { phone_number: button.phoneNumber }
            : {}),
          ...(button.type === "URL" && button.url ? { url: button.url } : {}),
          ...(button.type === "QUICK_REPLY" && button.payload
            ? { payload: button.payload }
            : {}),
        }));
        components.push({
          type: "buttons",
          buttons,
        });
      }

      const templatePayload = {
        name: templateName,
        language: formData.language,
        category: formData.category,
        parameter_format: "named",
        components,
      };

      const response = await fetch(metaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Template submission failed:", errorData);

        let errorMsg = errorData.error?.message || response.statusText;

        if (
          errorData.error?.code === 131009 &&
          errorData.error?.error_subcode === 2494102
        ) {
          errorMsg = `Invalid media handle: ${
            errorData.error?.error_user_msg ||
            "The uploaded media handle is not valid. Please try uploading the media again."
          }`;
        } else if (
          errorData.error?.error_subcode === 2388023 ||
          errorMsg.includes("being deleted")
        ) {
          errorMsg =
            "The English language version of this template is being deleted by Meta. New content can't be added until this process completes in about 4 weeks. Consider creating a new template with a different name.";
        } else if (errorData.error?.error_user_msg) {
          errorMsg = errorData.error.error_user_msg;
        }

        throw new Error(errorMsg);
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

      if (
        formData.header.type === "MEDIA" &&
        formData.header.mediaType &&
        formData.header.mediaHandle &&
        formData.header.mediaUrl
      ) {
        newTemplate.mediaUrls = {
          header: {
            handle: formData.header.mediaHandle,
            url: formData.header.mediaUrl,
          },
        };
      } else if (isEdit && initialTemplate?.mediaUrls?.header) {
        newTemplate.mediaUrls = {
          header: initialTemplate.mediaUrls.header,
        };
      }

      onSuccess(newTemplate, isEdit);

      // Cache in Supabase
      const templatesTable = `${agentPrefix}_templates`;
      const cacheBody: Record<string, any> = {
        name: newTemplate.name,
        language: { code: newTemplate.language },
        components: newTemplate.components,
      };
      if (
        formData.header.type === "MEDIA" &&
        formData.header.mediaType &&
        formData.header.mediaHandle &&
        formData.header.mediaUrl
      ) {
        cacheBody.media_urls = {
          header: {
            handle: formData.header.mediaHandle,
            url: formData.header.mediaUrl,
          },
        };
      } else if (isEdit && initialTemplate?.mediaUrls) {
        cacheBody.media_urls = initialTemplate.mediaUrls;
      }

      if (isEdit) {
        const { error: cacheError } = await supabase
          .from(templatesTable)
          .update({
            category: formData.category.toLowerCase() as
              | "utility"
              | "marketing"
              | "authentication",
            language: formData.language,
            body: cacheBody,
            updated_at: new Date().toISOString(),
          })
          .eq("agent_id", agentId)
          .eq("name", templateName);
        if (cacheError) {
          console.error("Cache update error:", cacheError);
        }
      } else {
        const { error: cacheError } = await supabase
          .from(templatesTable)
          .insert({
            agent_id: agentId,
            name: newTemplate.name,
            category: formData.category.toLowerCase() as
              | "utility"
              | "marketing"
              | "authentication",
            language: newTemplate.language,
            body: cacheBody,
            is_active: true,
            created_at: new Date().toISOString(),
          });
        if (cacheError) {
          console.error("Cache insert error:", cacheError);
        }
      }

      onClose();
    } catch (err: any) {
      setModalError(err.message || "Failed to submit template");
      console.error("Submit template error:", err);
    }
  };

  if (!isOpen) return null;

  const paramRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g;
  const textsForOrder = [
    ...(formData.header.type === "TEXT" && formData.header.text
      ? [formData.header.text]
      : []),
    formData.body,
    ...(formData.footer ? [formData.footer] : []),
  ].join("\n"); // Concat to get global order
  let allPlaceholders: { param: string; index: number }[] = [];
  let globalIndex = 0;
  textsForOrder.split("\n").forEach((text, sectionIndex) => {
    let localIndex = 0;
    [...text.matchAll(paramRegex)].forEach((match) => {
      allPlaceholders.push({
        param: match[1],
        index: globalIndex + localIndex,
      });
      localIndex += match.index! + match[0].length;
    });
    globalIndex += text.length;
  });
  const seen = new Set<string>();
  const orderedVariables = allPlaceholders
    .sort((a, b) => a.index - b.index)
    .filter((p) => {
      if (seen.has(p.param)) return false;
      seen.add(p.param);
      return true;
    })
    .map((p) => p.param);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {isEdit ? "Edit Template" : "Create New Template"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Form */}
          <div className="w-3/5 overflow-y-auto pr-4 space-y-4">
            {modalError && (
              <div className="text-red-500 text-sm mb-4 p-2 bg-red-50 rounded border border-red-200">
                {modalError}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={isEdit ? handleInputChange : handleNameChange}
                  required={!isEdit}
                  disabled={isEdit}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="e.g., welcome_message (lowercase, use _ for spaces)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UTILITY">Utility</option>
                  <option value="MARKETING">Marketing</option>
                  <option value="AUTHENTICATION">Authentication</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en_US">English</option>
                  <option value="si">Sinhala</option>
                  <option value="ta">Tamil</option>
                </select>
              </div>

              {/* Header Section */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Header
                </label>
                <div className="space-y-2">
                  <select
                    value={formData.header.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        header: {
                          ...prev.header,
                          type: e.target.value as "TEXT" | "MEDIA" | "LOCATION",
                        },
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TEXT">Text</option>
                    <option value="MEDIA">Media</option>
                    {(formData.category === "UTILITY" ||
                      formData.category === "MARKETING") && (
                      <option value="LOCATION">Location</option>
                    )}
                  </select>
                  {formData.header.type === "TEXT" ? (
                    <textarea
                      value={formData.header.text}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          header: { ...prev.header, text: e.target.value },
                        }))
                      }
                      placeholder="Header text (optional). Use {{param_name}} for variables."
                      rows={2}
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  ) : formData.header.type === "LOCATION" ? (
                    <div className="p-4 bg-blue-50 rounded border border-blue-200">
                      <p className="text-sm text-blue-700">
                        Location header selected. Location details (latitude,
                        longitude, name, address) will be provided when sending
                        the message via the API.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={formData.header.mediaType || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            header: {
                              ...prev.header,
                              mediaType: e.target.value as
                                | "IMAGE"
                                | "VIDEO"
                                | "DOCUMENT",
                            },
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select media type</option>
                        <option value="IMAGE">Image</option>
                        <option value="VIDEO">Video</option>
                        <option value="DOCUMENT">Document</option>
                      </select>
                      {formData.header.mediaType && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Upload {formData.header.mediaType.toLowerCase()}{" "}
                            file to WhatsApp
                          </label>
                          <input
                            type="file"
                            accept={getAcceptType(formData.header.mediaType)}
                            onChange={handleMediaUpload}
                            disabled={uploading}
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                          {uploading && (
                            <p className="text-sm text-blue-500 mt-1">
                              Uploading to WhatsApp...
                            </p>
                          )}
                          {formData.header.mediaHandle && !uploading && (
                            <p className="text-sm text-green-600 mt-1">
                              Uploaded to WhatsApp (handle:{" "}
                              {formData.header.mediaHandle.substring(0, 8)}
                              ...)
                            </p>
                          )}
                          {formData.header.mediaUrl && (
                            <p className="text-sm text-green-500 mt-1">
                              Preview ready
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Body Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Body Text
                </label>
                <textarea
                  name="body"
                  value={formData.body}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter the template body text. Use {{param_name}} for variables."
                />
              </div>

              {/* Footer Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Footer
                </label>
                <textarea
                  value={formData.footer}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      footer: e.target.value,
                    }))
                  }
                  placeholder="Footer text (optional). Use {{param_name}} for variables."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sample Values for Variables */}
              {orderedVariables.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sample Values for Variables (Header, Body, Footer)
                  </label>
                  <div className="space-y-2">
                    {orderedVariables.map((param) => (
                      <div key={param} className="flex gap-2">
                        <span className="text-sm font-medium text-gray-500 self-center">
                          {`{{${param}}}`}
                        </span>
                        <input
                          type="text"
                          value={formData.examples[param] || ""}
                          onChange={(e) =>
                            handleExampleChange(param, e.target.value)
                          }
                          placeholder={`Sample for {{${param}}}`}
                          className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons Section */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buttons (max 3)
                </label>
                <div className="space-y-3">
                  {formData.buttons.map((button, index) => (
                    <div
                      key={index}
                      className="border p-3 rounded-lg bg-gray-50"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Button {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              buttons: prev.buttons.filter(
                                (_, i) => i !== index
                              ),
                            }))
                          }
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                      <select
                        value={button.type}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            buttons: prev.buttons.map((b, i) =>
                              i === index
                                ? {
                                    ...b,
                                    type: e.target.value as
                                      | "PHONE_NUMBER"
                                      | "URL"
                                      | "QUICK_REPLY",
                                  }
                                : b
                            ),
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 mb-2"
                      >
                        <option value="PHONE_NUMBER">
                          Call to Action (Phone)
                        </option>
                        <option value="URL">URL Button</option>
                        <option value="QUICK_REPLY">Quick Reply</option>
                      </select>
                      <input
                        type="text"
                        value={button.text}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            buttons: prev.buttons.map((b, i) =>
                              i === index ? { ...b, text: e.target.value } : b
                            ),
                          }))
                        }
                        placeholder="Button text"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 mb-2"
                        required
                      />
                      {button.type === "PHONE_NUMBER" && (
                        <input
                          type="tel"
                          value={button.phoneNumber || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              buttons: prev.buttons.map((b, i) =>
                                i === index
                                  ? { ...b, phoneNumber: e.target.value }
                                  : b
                              ),
                            }))
                          }
                          placeholder="Phone number (e.g., +1234567890)"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 mb-2"
                        />
                      )}
                      {button.type === "URL" && (
                        <input
                          type="url"
                          value={button.url || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              buttons: prev.buttons.map((b, i) =>
                                i === index ? { ...b, url: e.target.value } : b
                              ),
                            }))
                          }
                          placeholder="URL (e.g., https://example.com)"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 mb-2"
                        />
                      )}
                      {button.type === "QUICK_REPLY" && (
                        <input
                          type="text"
                          value={button.payload || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              buttons: prev.buttons.map((b, i) =>
                                i === index
                                  ? { ...b, payload: e.target.value }
                                  : b
                              ),
                            }))
                          }
                          placeholder="Payload (for quick reply)"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 mb-2"
                        />
                      )}
                    </div>
                  ))}
                  {formData.buttons.length < 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          buttons: [
                            ...prev.buttons,
                            {
                              type: "QUICK_REPLY" as const,
                              text: "",
                              payload: "",
                            },
                          ],
                        }))
                      }
                      className="w-full p-2 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-500 hover:text-blue-600"
                    >
                      + Add Button
                    </button>
                  )}
                  {formData.buttons.length >= 3 && (
                    <p className="text-sm text-gray-500">
                      Maximum 3 buttons allowed.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
                >
                  <CheckIcon className="h-4 w-4" />
                  {isEdit ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
          {/* Right Panel - Preview */}
          <div className="w-2/5 pl-4 border-l border-gray-200 overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Live Preview</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="max-w-md mx-auto">
                <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center p-3 border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Your template
                    </h4>
                    <span className="text-xs text-gray-500">Template</span>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="bg-white rounded-2xl mb-3 border border-gray-200">
                      {formData.header.type === "LOCATION" ? (
                        <div className="w-full h-32 bg-blue-100 rounded-t-2xl flex items-center justify-center">
                          <span className="text-sm text-blue-600">
                            📍 Location Map
                          </span>
                        </div>
                      ) : formData.header.type === "MEDIA" &&
                        formData.header.mediaType &&
                        formData.header.mediaUrl ? (
                        <>
                          {formData.header.mediaType === "IMAGE" ? (
                            <img
                              src={formData.header.mediaUrl}
                              alt="Header media"
                              className="w-full h-auto object-contain rounded-t-2xl"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : formData.header.mediaType === "VIDEO" ? (
                            <video
                              src={formData.header.mediaUrl}
                              className="w-full h-auto object-contain rounded-t-2xl"
                              muted
                              controls={false}
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-200 rounded-t-2xl flex items-center justify-center border-b border-gray-300">
                              <span className="text-sm text-gray-500">
                                {formData.header.mediaType} preview
                              </span>
                            </div>
                          )}
                        </>
                      ) : formData.header.type === "MEDIA" ? (
                        <div className="p-3 flex items-center justify-center border border-gray-300 bg-gray-100 rounded-t-2xl">
                          <span className="text-sm text-gray-500">
                            Media header (upload required)
                          </span>
                        </div>
                      ) : null}
                      <div className="p-3">
                        {formData.header.type === "TEXT" &&
                          formData.header.text && (
                            <p className="text-sm text-gray-800 font-medium mb-2 leading-relaxed whitespace-pre-wrap text-left">
                              {formData.header.text.replace(
                                /\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g,
                                (match, param) =>
                                  formData.examples[param] || "[Variable]"
                              )}
                            </p>
                          )}
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap mb-2 text-left">
                          {formData.body.replace(
                            /\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g,
                            (match, param) =>
                              formData.examples[param] || "[Variable]"
                          ) || "Enter body text..."}
                        </p>
                        {formData.footer && (
                          <div className="mb-2 text-xs text-gray-600 italic text-left">
                            {formData.footer.replace(
                              /\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g,
                              (match, param) =>
                                formData.examples[param] || "[Variable]"
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 text-right mb-3">
                          13:40
                        </p>
                        {formData.buttons.length > 0 && (
                          <div className="border-t border-gray-200 mb-2"></div>
                        )}
                        {formData.buttons.length > 0 && (
                          <div className="space-y-1">
                            {formData.buttons.map((button, index) => (
                              <div
                                key={index}
                                className="w-full flex items-center justify-center gap-2 py-2 text-blue-500 text-sm font-medium hover:text-blue-600 border-t border-gray-200 first:border-t-0 rounded-b-2xl last:rounded-b-2xl"
                              >
                                {button.type === "PHONE_NUMBER" && (
                                  <PhoneIcon className="h-4 w-4" />
                                )}
                                {button.type === "URL" && (
                                  <ArrowUpRightIcon className="h-4 w-4" />
                                )}
                                {button.type === "QUICK_REPLY" && (
                                  <ChatBubbleLeftIcon className="h-4 w-4" />
                                )}
                                <span>
                                  {button.text || `Button ${index + 1}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTemplateModal;