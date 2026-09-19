import React, { useRef } from 'react';
import { Tag, Sparkles, AlertCircle, Info } from 'lucide-react';
import { SmsMobilePreview } from './SmsMobilePreview';
import type { SmsPartsInfo } from '../smsHelpers';

interface SmsComposerStepProps {
  message: string;
  setMessage: (text: string) => void;
  partsInfo: SmsPartsInfo;
  smsSenderId?: string;
}

export const SmsComposerStep: React.FC<SmsComposerStepProps> = ({
  message,
  setMessage,
  partsInfo,
  smsSenderId = 'TextLKDemo',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (tag: string) => {
    if (!textareaRef.current) {
      setMessage(message + tag);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const nextText = message.substring(0, start) + tag + message.substring(end);
    setMessage(nextText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + tag.length, start + tag.length);
      }
    }, 0);
  };

  const PRESETS = [
    {
      title: 'Flash Sale',
      text: 'Hey {first_name}, enjoy 20% off all orders this weekend only! Shop now and save.',
    },
    {
      title: 'Customer VIP',
      text: 'Dear {name}, thank you for being a valued customer. Use code VIP10 for 10% off your next booking!',
    },
    {
      title: 'Friendly Reminder',
      text: 'Hello {first_name}, your upcoming session is scheduled for tomorrow. Looking forward to seeing you!',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start font-sans">
      {/* Left Column: Message Composer */}
      <div className="lg:col-span-7 space-y-4">
        {/* Dynamic Variable Insertion */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-[#16281D]">
              SMS Message Text <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
              <Tag size={12} />
              <span>Insert Variable:</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {[
              { label: 'First Name', tag: '{first_name}' },
              { label: 'Full Name', tag: '{name}' },
              { label: 'Phone', tag: '{phone}' },
            ].map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => insertTag(v.tag)}
                className="px-2.5 py-1 bg-[#F4F7F4] hover:bg-[#EAEAEA] border border-[#EAEAEA] rounded-full text-xs font-mono font-medium text-[#16281D] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>+</span>
                <span>{v.tag}</span>
              </button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your SMS message here..."
            className="w-full p-3.5 bg-white border border-[#EAEAEA] rounded-xl text-xs sm:text-sm text-[#16281D] placeholder-[#71717A] outline-none focus:ring-2 focus:ring-[#9FE870]/20 focus:border-[#9FE870] transition-all resize-none leading-relaxed font-sans"
          />
        </div>

        {/* Real-time Telemetry & GSM Counter */}
        <div className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                partsInfo.parts > 1
                  ? 'bg-[#FEF3C7] text-[#B45309]'
                  : 'bg-[#22C55E]/15 text-[#15803D]'
              }`}
            >
              {partsInfo.parts} SMS {partsInfo.parts === 1 ? 'Part' : 'Parts'}
            </span>
            <span className="text-[#71717A] text-[11px]">
              {partsInfo.length} characters ({partsInfo.charsLeftInCurrentPart} left in part)
            </span>
          </div>

          <span className="text-[11px] text-[#71717A] font-medium">
            {partsInfo.isUnicode ? 'UCS-2 Unicode' : 'Standard GSM 7-bit'}
          </span>
        </div>

        {/* Unicode Warning notice if non-GSM characters detected */}
        {partsInfo.isUnicode && (
          <div className="flex items-start gap-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3 text-xs text-[#92400E]">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-[#D97706]" />
            <div>
              <p className="font-bold">Unicode characters detected</p>
              <p className="text-[11px] text-[#B45309] mt-0.5">
                Emojis or Sinhala/Tamil characters reduce the single SMS limit from 160 to 70 characters per part.
              </p>
            </div>
          </div>
        )}

        {/* Quick Starter Presets */}
        <div>
          <label className="block text-xs font-semibold text-[#16281D] mb-1.5 flex items-center gap-1.5">
            <Sparkles size={13} className="text-[#15803D]" />
            <span>Quick Starters</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => setMessage(preset.text)}
                className="p-3 rounded-xl border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] hover:border-[#16281D]/30 text-left transition-all cursor-pointer group"
              >
                <p className="text-xs font-bold text-[#16281D] group-hover:text-black">
                  {preset.title}
                </p>
                <p className="text-[10px] text-[#71717A] line-clamp-2 mt-0.5 leading-relaxed">
                  {preset.text}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Sender ID Verification Note */}
        <div className="flex items-center gap-2 text-xs text-[#71717A] bg-white border border-[#EAEAEA] rounded-xl p-3">
          <Info size={14} className="text-[#3B82F6] shrink-0" />
          <span>
            Delivered with registered Sender ID: <strong className="text-[#16281D] font-mono">{smsSenderId || 'TextLKDemo'}</strong>
          </span>
        </div>
      </div>

      {/* Right Column: Live Smartphone Preview */}
      <div className="lg:col-span-5 flex justify-center sticky top-2">
        <SmsMobilePreview
          message={message}
          senderId={smsSenderId}
          sampleCustomer={{
            first_name: 'Alex',
            name: 'Alex Perera',
            phone: '+94 77 123 4567',
          }}
        />
      </div>
    </div>
  );
};
