import React from 'react';
import { Wifi, Battery, Signal, ShieldCheck, CheckCheck } from 'lucide-react';
import { calculateSmsParts, interpolateBroadcastPreview } from './broadcastHelpers';

interface BroadcastMobilePreviewProps {
  channel: 'whatsapp' | 'sms';
  message: string;
  senderId?: string;
  templateName?: string;
  templateParams?: string[];
  templateBody?: string;
  mediaUrl?: string;
  mediaHeader?: { type: string; link?: string; url?: string; id?: string } | null;
  sampleCustomer?: {
    first_name?: string;
    name?: string;
    phone?: string;
  };
}

export const BroadcastMobilePreview: React.FC<BroadcastMobilePreviewProps> = ({
  channel,
  message,
  senderId = 'TextLKDemo',
  templateName,
  templateParams = [],
  templateBody,
  mediaUrl,
  mediaHeader,
  sampleCustomer = {
    first_name: 'Alex',
    name: 'Alex Perera',
    phone: '+94 77 123 4567',
  },
}) => {
  const activeMediaUrl = mediaUrl || mediaHeader?.link || mediaHeader?.url;

  // Compute text to preview
  let previewText = '';
  if (channel === 'sms') {
    previewText = interpolateBroadcastPreview(message, sampleCustomer);
  } else if (templateBody) {
    // Template mode: replace {{1}}, {{2}} with parameter values, then interpolate variables
    let body = templateBody;
    templateParams.forEach((param, index) => {
      const val = param ? interpolateBroadcastPreview(param, sampleCustomer) : `{{${index + 1}}}`;
      body = body.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), val);
    });
    previewText = interpolateBroadcastPreview(body, sampleCustomer);
  } else {
    // WhatsApp free-text mode
    previewText = interpolateBroadcastPreview(message, sampleCustomer);
  }

  const partsInfo = calculateSmsParts(message || '');

  return (
    <div className="flex flex-col items-center select-none font-sans">
      {/* Smartphone Shell */}
      <div className="w-[260px] sm:w-[275px] h-[450px] bg-[#16281D] rounded-[38px] p-2.5 shadow-[0_20px_50px_rgba(22,40,29,0.22)] border-[3px] border-[#2A4433] relative flex flex-col justify-between overflow-hidden">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-black rounded-full z-20 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#1F2937] ml-auto mr-2.5" />
        </div>

        {/* Screen Area */}
        <div className="w-full h-full bg-[#F4F7F4] rounded-[30px] overflow-hidden flex flex-col relative text-[#16281D]">
          {/* Status Bar */}
          <div className="pt-2 px-4 pb-1 flex justify-between items-center text-[10px] font-semibold text-[#71717A] z-10">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <Signal size={10} />
              <Wifi size={10} />
              <Battery size={12} />
            </div>
          </div>

          {/* App Header (Channel-Specific) */}
          {channel === 'sms' ? (
            <div className="px-3 py-2 bg-white/95 backdrop-blur-sm border-b border-[#EAEAEA] flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-7 h-7 rounded-full bg-[#16281D] text-[#9FE870] font-bold text-[11px] flex items-center justify-center uppercase tracking-wider mb-0.5">
                {senderId ? senderId.substring(0, 2).toUpperCase() : 'TX'}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-[#16281D] truncate max-w-[150px]">
                  {senderId || 'SMS Gateway'}
                </span>
                <ShieldCheck size={12} className="text-[#15803D] shrink-0" />
              </div>
              <span className="text-[9px] text-[#71717A]">Normal SMS Carrier Notification</span>
            </div>
          ) : (
            <div className="px-3 py-2 bg-[#075E54] text-white flex items-center gap-2 shadow-xs">
              <div className="w-7 h-7 rounded-full bg-[#25D366]/20 border border-white/30 text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                WA
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold truncate">Official Agent</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                </div>
                <span className="text-[9px] text-white/80 block truncate">
                  {templateName ? `Template: ${templateName}` : 'WhatsApp Business'}
                </span>
              </div>
            </div>
          )}

          {/* Conversation Chat Body */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end space-y-2">
            <div className="text-center">
              <span className="text-[9px] font-medium text-[#71717A] bg-black/5 px-2 py-0.5 rounded-full">
                Today 9:41 AM
              </span>
            </div>

            {/* Incoming Bubble */}
            <div
              className={`max-w-[92%] self-start rounded-2xl shadow-sm text-xs leading-relaxed break-words overflow-hidden ${
                channel === 'sms'
                  ? 'bg-white text-[#16281D] rounded-tl-xs border border-[#EAEAEA] p-3'
                  : 'bg-white text-[#16281D] rounded-tl-xs border border-[#E2E8F0] p-2.5'
              }`}
            >
              {channel === 'whatsapp' && activeMediaUrl && (
                <div className="mb-2 rounded-xl overflow-hidden bg-black/5 border border-black/5 max-h-[140px] w-full flex items-center justify-center">
                  <img
                    src={activeMediaUrl}
                    alt="Broadcast poster"
                    className="w-full h-full object-cover max-h-[140px]"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {previewText ? (
                <p className="whitespace-pre-wrap">{previewText}</p>
              ) : activeMediaUrl ? (
                <p className="text-[#71717A] italic text-[11px]">(Poster with no caption)</p>
              ) : (
                <p className="text-[#71717A] italic text-[11px]">
                  Compose message to view live simulated recipient delivery...
                </p>
              )}

              {channel === 'whatsapp' && (
                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#71717A]">
                  <span>9:41 AM</span>
                  <CheckCheck size={11} className="text-[#3B82F6]" />
                </div>
              )}
            </div>

            <span className="text-[9px] text-[#71717A] self-start ml-1">
              {channel === 'sms' ? 'Text Message • SMS' : 'WhatsApp • Official Channel'}
            </span>
          </div>

          {/* Bottom Bar */}
          <div className="p-2 bg-white border-t border-[#EAEAEA] flex items-center gap-2">
            <div className="flex-1 bg-[#F4F7F4] rounded-full px-3 py-1 text-[9px] text-[#71717A]">
              Automated broadcast
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Pill Below Phone */}
      {channel === 'sms' ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#71717A] bg-[#F4F7F4] border border-[#EAEAEA] rounded-full px-3 py-1">
          <span className="font-bold text-[#16281D]">
            {partsInfo.parts} {partsInfo.parts === 1 ? 'Part' : 'Parts'}
          </span>
          <span>•</span>
          <span>{partsInfo.length} chars</span>
          <span>•</span>
          <span>{partsInfo.isUnicode ? 'Unicode' : 'GSM 7-bit'}</span>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#71717A] bg-[#F4F7F4] border border-[#EAEAEA] rounded-full px-3 py-1">
          <span className="font-bold text-[#16281D]">
            {templateName ? 'Approved Meta Template' : activeMediaUrl ? 'Poster + Free-Form Text' : 'Free-Form Text'}
          </span>
          <span>•</span>
          <span>WhatsApp Cloud API</span>
        </div>
      )}
    </div>
  );
};
