import React from 'react';
import { Wifi, Battery, Signal, ShieldCheck } from 'lucide-react';
import { calculateSmsParts, interpolateSmsPreview } from '../smsHelpers';

interface SmsMobilePreviewProps {
  message: string;
  senderId?: string;
  sampleCustomer?: {
    first_name?: string;
    name?: string;
    phone?: string;
  };
}

export const SmsMobilePreview: React.FC<SmsMobilePreviewProps> = ({
  message,
  senderId = 'TextLKDemo',
  sampleCustomer = {
    first_name: 'Alex',
    name: 'Alex Perera',
    phone: '+94 77 123 4567',
  },
}) => {
  const partsInfo = calculateSmsParts(message);
  const interpolatedText = interpolateSmsPreview(message, sampleCustomer);

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

          {/* SMS App Header */}
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
            <span className="text-[9px] text-[#71717A]">Direct SMS Notification</span>
          </div>

          {/* Conversation Chat Body */}
          <div className="flex-1 p-3 overflow-y-auto flex flex-col justify-end space-y-2">
            {/* Timestamp */}
            <div className="text-center">
              <span className="text-[9px] font-medium text-[#71717A] bg-black/5 px-2 py-0.5 rounded-full">
                Today 9:41 AM
              </span>
            </div>

            {/* Incoming SMS Bubble */}
            <div className="max-w-[90%] self-start bg-white text-[#16281D] rounded-2xl rounded-tl-xs px-3 py-2.5 shadow-sm border border-[#EAEAEA] text-xs leading-relaxed break-words">
              {interpolatedText ? (
                <p className="whitespace-pre-wrap">{interpolatedText}</p>
              ) : (
                <p className="text-[#71717A] italic text-[11px]">
                  Type your message to see live recipient preview...
                </p>
              )}
            </div>

            <span className="text-[9px] text-[#71717A] self-start ml-1">
              Text Message • SMS
            </span>
          </div>

          {/* Fake Bottom Message Bar */}
          <div className="p-2 bg-white border-t border-[#EAEAEA] flex items-center gap-2">
            <div className="flex-1 bg-[#F4F7F4] rounded-full px-3 py-1 text-[9px] text-[#71717A]">
              Automated message
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Pill Below Phone */}
      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#71717A] bg-[#F4F7F4] border border-[#EAEAEA] rounded-full px-3 py-1">
        <span className="font-bold text-[#16281D]">
          {partsInfo.parts} {partsInfo.parts === 1 ? 'Part' : 'Parts'}
        </span>
        <span>•</span>
        <span>{partsInfo.length} chars</span>
        <span>•</span>
        <span>{partsInfo.isUnicode ? 'Unicode' : 'GSM 7-bit'}</span>
      </div>
    </div>
  );
};
