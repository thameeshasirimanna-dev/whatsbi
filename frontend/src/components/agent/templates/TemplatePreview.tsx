import React from 'react';
import {
  PhoneIcon,
  ArrowUpRightIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";

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
    // Add other component fields as needed
  }>;
  body?: any;
  mediaUrls?: { [key: string]: { handle: string; url: string } };
  status: string;
  created_time?: string;
}

type LoadMediaPreview = (templateId: string, handle: string, mediaType: string) => Promise<void>;

interface TemplatePreviewProps {
  template: WhatsAppTemplate;
  mediaPreviews: Record<string, string>;
  loadMediaPreview: LoadMediaPreview;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, mediaPreviews, loadMediaPreview }) => {
  return (
    <div className="mt-2 border border-gray-200 rounded-lg p-4 max-w-md bg-gray-50 shadow-sm">
      {/* Title */}
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-900">
          Your template
        </h4>
        <span className="text-xs text-gray-500">
          Template
        </span>
      </div>

      {/* Container for bubble and buttons */}
      <div className="bg-gray-50 rounded-lg p-3">
        {/* WhatsApp-like chat bubble for body, buttons (integrate header text if present) */}
        <div className="bg-white rounded-2xl mb-3 border border-gray-200">
          {/* Media header if present - full width no padding */}
          {(() => {
            const headerComp = template.components.find(
              (c) => c.type.toLowerCase() === "header"
            );
            if (
              headerComp?.format &&
              ["IMAGE", "VIDEO", "DOCUMENT"].includes(
                headerComp.format
              )
            ) {
              let mediaUrl =
                template.mediaUrls?.header?.url ||
                mediaPreviews[template.id] ||
                "";
              let handle =
                template.mediaUrls?.header?.handle || "";
              if (!handle) {
                const handleObj =
                  headerComp.example?.header_handle?.[0];
                if (typeof handleObj === "string") {
                  handle = handleObj;
                } else if (typeof handleObj === "object") {
                  handle =
                    handleObj.handle || handleObj.id || "";
                }
              }
              if (!mediaUrl && handle) {
                loadMediaPreview(
                  template.id,
                  handle,
                  headerComp.format
                );
                mediaUrl = mediaPreviews[template.id] || "";
              }
              if (mediaUrl) {
                if (headerComp.format === "IMAGE") {
                  return (
                    <img
                      key="header-img"
                      src={mediaUrl}
                      alt="Header media"
                      className="w-full h-auto object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display =
                          "none";
                      }}
                    />
                  );
                } else if (headerComp.format === "VIDEO") {
                  return (
                    <video
                      key="header-video"
                      src={mediaUrl}
                      className="w-full h-auto object-contain"
                      muted
                    />
                  );
                } else {
                  return (
                    <div
                      key="header-doc"
                      className="w-full h-32 bg-gray-200 rounded flex items-center justify-center border border-gray-300"
                    >
                      <span className="text-sm text-gray-500">
                        Document Header
                      </span>
                    </div>
                  );
                }
              } else if (handle) {
                return (
                  <div className="p-3 flex items-center justify-center border border-gray-300 bg-gray-100 rounded">
                    <span className="text-sm text-gray-500">
                      {headerComp.format} Header (loading
                      media...)
                    </span>
                  </div>
                );
              } else {
                return (
                  <div className="p-3 flex items-center justify-center border border-gray-300 bg-gray-100 rounded">
                    <span className="text-sm text-gray-500">
                      {headerComp.format} Header (no media)
                    </span>
                  </div>
                );
              }
            } else if (headerComp?.format === "LOCATION") {
              return (
                <div className="w-full h-32 bg-blue-100 rounded flex items-center justify-center">
                  <span className="text-sm text-blue-600">📍 Location</span>
                </div>
              );
            }
            return null;
          })()}

          {/* Padded content */}
          <div className="p-2">
            {/* Header text integration if TEXT - left aligned */}
            {template.components.some(
              (c) =>
                c.type.toLowerCase() === "header" &&
                c.format === "TEXT" &&
                c.text
            ) && (
              <p className="text-sm text-gray-800 font-medium mb-2 leading-relaxed whitespace-pre-wrap text-left">
                {template.components
                  .filter(
                    (c) =>
                      c.type.toLowerCase() === "header" &&
                      c.format === "TEXT"
                  )
                  .map(
                    (c) =>
                      c.text?.replace(
                        /\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g,
                        "[Variable]"
                      ) || ""
                  )
                  .join("\n")}
              </p>
            )}
            {/* Body text - left aligned */}
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap mb-1 text-left">
              {template.components
                .filter((c) => c.type.toLowerCase() === "body")
                .map(
                  (c) =>
                    c.text?.replace(
                      /\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g,
                      "[Variable]"
                    ) || "Enter body text..."
                )
                .join("\n")}
            </p>

            {/* Footer if present, before buttons - left aligned */}
            {template.components.some(
              (c) => c.type.toLowerCase() === "footer"
            ) && (
              <div className="mb-1 text-xs text-gray-600 italic text-left">
                {template.components
                  .filter((c) => c.type.toLowerCase() === "footer")
                  .map(
                    (c) =>
                      c.text?.replace(
                        /\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g,
                        "[Variable]"
                      ) || ""
                  )
                  .join("\n")}
              </div>
            )}

            {/* Timestamp before buttons */}
            <p className="text-xs text-gray-400 text-right mb-2">
              13:40
            </p>

            {/* Horizontal divider before buttons */}
            {template.components.some(
              (c) =>
                c.type.toLowerCase() === "buttons" &&
                c.buttons &&
                c.buttons.length > 0
            ) && (
              <div className="border-t border-gray-200 mb-2"></div>
            )}

            {/* Buttons inside bubble: full-width rows with dividers - centered */}
            {template.components.some(
              (c) =>
                c.type.toLowerCase() === "buttons" &&
                c.buttons &&
                c.buttons.length > 0
            ) && (
              <div className="space-y-1 mb-3">
                {template.components
                  .filter((c) => c.type.toLowerCase() === "buttons")
                  .flatMap((c) =>
                    (c.buttons || []).map((btn, btnIndex) => {
                      const button = {
                        type: btn.type,
                        text:
                          btn.text?.replace(
                            /\{\{([a-zA-Z_][a-zA-Z0-9_]*|\d+)\}\}/g,
                            "[Variable]"
                          ) ||
                          btn.text ||
                          "",
                      };
                      return (
                        <div
                          key={btnIndex}
                          className="w-full flex items-center justify-center gap-2 py-2 text-blue-500 text-sm font-medium hover:text-blue-600 border-t border-gray-200 first:border-t-0"
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
                            {button.text ||
                              `Button ${btnIndex + 1}`}
                          </span>
                        </div>
                      );
                    })
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;