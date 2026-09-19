import React, { useRef } from 'react';
import {
  MessageSquare,
  Radio,
  Sparkles,
  Tag,
  AlertCircle,
  ShieldCheck,
  Info,
} from 'lucide-react';
import type { MetaTemplate } from './types';
import type { Customer } from '../../../lib/api';
import CustomDropdown from '../shared/CustomDropdown';
import { calculateSmsParts } from './broadcastHelpers';
import { BroadcastMobilePreview } from './BroadcastMobilePreview';
import { WhatsApp24hWindowNotice } from './WhatsApp24hWindowNotice';
import { BroadcastMediaUploader, type BroadcastMediaHeader } from './BroadcastMediaUploader';

export interface ComposerStepProps {
  channel: 'whatsapp' | 'sms';
  setChannel: (c: 'whatsapp' | 'sms') => void;
  smsSenderId?: string;
  smsMessage: string;
  setSmsMessage: (msg: string) => void;
  messageType: 'text' | 'template';
  setMessageType: (t: 'text' | 'template') => void;
  textMessage: string;
  setTextMessage: (msg: string) => void;
  selectedTemplateName: string;
  setSelectedTemplateName: (name: string) => void;
  metaTemplates: MetaTemplate[];
  selectedTemplate?: MetaTemplate;
  templateParams: string[];
  onTemplateParamChange: (idx: number, val: string) => void;
  mediaHeader?: BroadcastMediaHeader | null;
  uploadingMedia?: boolean;
  onUploadMedia?: (file: File) => Promise<void>;
  onSetMediaLink?: (link: string) => void;
  onRemoveMedia?: () => void;
  within24hCount?: number;
  blockedCustomers?: Customer[];
}

const PRESETS = [
  { title: 'Flash Sale', text: 'Hey {first_name}, enjoy 20% off all orders this weekend only! Shop now and save.' },
  { title: 'Customer VIP', text: 'Dear {name}, thank you for being a valued customer. Use code VIP10 for 10% off your next booking!' },
  { title: 'Friendly Reminder', text: 'Hello {first_name}, your upcoming session is scheduled for tomorrow. Looking forward to seeing you!' },
];

const VARIABLE_TAGS = [
  { label: 'First Name', tag: '{first_name}' },
  { label: 'Full Name', tag: '{name}' },
  { label: 'Phone', tag: '{phone}' },
];

export const ComposerStep: React.FC<ComposerStepProps> = ({
  channel,
  setChannel,
  smsSenderId,
  smsMessage,
  setSmsMessage,
  messageType,
  setMessageType,
  textMessage,
  setTextMessage,
  selectedTemplateName,
  setSelectedTemplateName,
  metaTemplates,
  selectedTemplate,
  templateParams,
  onTemplateParamChange,
  mediaHeader,
  uploadingMedia,
  onUploadMedia,
  onSetMediaLink,
  onRemoveMedia,
  within24hCount = 0,
  blockedCustomers = [],
}) => {
  const smsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const waTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertTag = (tag: string, target: 'sms' | 'wa') => {
    const isSms = target === 'sms';
    const ref = isSms ? smsTextareaRef : waTextareaRef;
    const currentVal = isSms ? smsMessage : textMessage;
    const setter = isSms ? setSmsMessage : setTextMessage;

    if (!ref.current) {
      setter(currentVal + tag);
      return;
    }
    const start = ref.current.selectionStart;
    const end = ref.current.selectionEnd;
    const nextText = currentVal.substring(0, start) + tag + currentVal.substring(end);
    setter(nextText);
    setTimeout(() => {
      if (ref.current) {
        ref.current.focus();
        ref.current.setSelectionRange(start + tag.length, start + tag.length);
      }
    }, 0);
  };

  const smsStats = calculateSmsParts(smsMessage);
  const templateBodyText = selectedTemplate?.components.find((c) => c.type === 'BODY')?.text;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start font-sans">
      {/* Left Column: Form & Composer */}
      <div className="lg:col-span-7 space-y-4">
        {/* Channel Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
            Marketing Channel <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChannel('whatsapp')}
              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                channel === 'whatsapp'
                  ? 'bg-[#16281D] text-[#9FE870] border-[#16281D] shadow-sm'
                  : 'bg-white text-[#71717A] border-[#EAEAEA] hover:border-[#16281D]/30'
              }`}
            >
              <MessageSquare size={14} strokeWidth={2.4} />
              <span>WhatsApp Broadcast</span>
            </button>
            <button
              type="button"
              onClick={() => setChannel('sms')}
              className={`py-2.5 px-3 rounded-2xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                channel === 'sms'
                  ? 'bg-[#16281D] text-[#9FE870] border-[#16281D] shadow-sm'
                  : 'bg-white text-[#71717A] border-[#EAEAEA] hover:border-[#16281D]/30'
              }`}
            >
              <Radio size={14} strokeWidth={2.4} />
              <span>Normal SMS (Text.lk)</span>
            </button>
          </div>
        </div>

        {channel === 'sms' ? (
          /* Normal SMS Section */
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#16281D]">
                  SMS Message Text <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1 text-[11px] text-[#71717A]">
                  <Tag size={12} />
                  <span>Insert Variable:</span>
                </div>
              </div>

              {/* Variable Insertion Pills */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {VARIABLE_TAGS.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => insertTag(v.tag, 'sms')}
                    className="px-2.5 py-1 bg-[#F4F7F4] hover:bg-[#EAEAEA] border border-[#EAEAEA] rounded-full text-xs font-mono font-medium text-[#16281D] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>+</span>
                    <span>{v.tag}</span>
                  </button>
                ))}
              </div>

              <textarea
                ref={smsTextareaRef}
                rows={5}
                placeholder="Type your SMS broadcast message here..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="w-full p-3.5 bg-white border border-[#EAEAEA] rounded-2xl text-xs text-[#16281D] placeholder-[#71717A] outline-none focus:ring-2 focus:ring-[#9FE870]/20 focus:border-[#9FE870] transition-all resize-none leading-relaxed font-sans"
              />
            </div>

            {/* Real-time Telemetry & GSM Counter */}
            <div className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                    smsStats.parts > 1
                      ? 'bg-[#FEF3C7] text-[#B45309]'
                      : 'bg-[#22C55E]/15 text-[#15803D]'
                  }`}
                >
                  {smsStats.parts} SMS {smsStats.parts === 1 ? 'Part' : 'Parts'}
                </span>
                <span className="text-[#71717A] text-[11px]">
                  {smsStats.length} chars ({smsStats.charsLeftInCurrentPart} left in part)
                </span>
              </div>
              <span className="text-[11px] text-[#71717A] font-medium">
                {smsStats.isUnicode ? 'UCS-2 Unicode' : 'Standard GSM 7-bit'}
              </span>
            </div>

            {/* Unicode Alert if present */}
            {smsStats.isUnicode && (
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

            {/* Quick Starters */}
            <div>
              <label className="text-xs font-semibold text-[#16281D] mb-1.5 flex items-center gap-1.5">
                <Sparkles size={13} className="text-[#15803D]" />
                <span>Quick Starters</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() => setSmsMessage(preset.text)}
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
            <div className="flex items-center justify-between text-xs text-[#71717A] bg-white border border-[#EAEAEA] rounded-xl p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#15803D] shrink-0" />
                <span>
                  Delivered with Sender ID: <strong className="text-[#16281D] font-mono">{smsSenderId || 'TextLKDemo'}</strong>
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#15803D] bg-[#22C55E]/15 px-2 py-0.5 rounded-full">
                Carrier Direct
              </span>
            </div>
          </div>
        ) : (
          /* WhatsApp Broadcast Section */
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                WhatsApp Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMessageType('template')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    messageType === 'template'
                      ? 'bg-[#16281D] text-[#9FE870] border-[#16281D]'
                      : 'bg-white text-[#71717A] border-[#EAEAEA] hover:border-[#16281D]/30'
                  }`}
                >
                  Approved Meta Template
                </button>
                <button
                  type="button"
                  onClick={() => setMessageType('text')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                    messageType === 'text'
                      ? 'bg-[#16281D] text-[#9FE870] border-[#16281D]'
                      : 'bg-white text-[#71717A] border-[#EAEAEA] hover:border-[#16281D]/30'
                  }`}
                >
                  Free-Form Text
                </button>
              </div>

              {messageType === 'text' && (
                <div className="mt-2 p-2.5 bg-[#E8F8EE] border border-[#BBF7D0] rounded-xl flex items-center justify-between gap-2 text-xs text-[#15803D]">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck size={15} className="text-[#22C55E] shrink-0" />
                    <span className="truncate">
                      Audience auto-set to <strong>Within 24h Active</strong> group ({within24hCount} contacts).
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#22C55E]/15 text-[#15803D] px-2 py-0.5 rounded-full shrink-0">
                    24h Window
                  </span>
                </div>
              )}
            </div>

            {messageType === 'text' ? (
              <div className="space-y-3.5">
                <WhatsApp24hWindowNotice
                  within24hCount={within24hCount}
                  blockedCustomers={blockedCustomers}
                  onSwitchToTemplate={() => setMessageType('template')}
                  onSwitchToSms={() => setChannel('sms')}
                />

                <BroadcastMediaUploader
                  mediaHeader={mediaHeader || null}
                  onUpload={onUploadMedia || (async () => {})}
                  onSetLink={onSetMediaLink || (() => {})}
                  onRemove={onRemoveMedia || (() => {})}
                  uploading={Boolean(uploadingMedia)}
                />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#16281D]">
                      {mediaHeader ? 'Poster Caption Text' : 'Message Content'}{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1 text-[11px] text-[#71717A]">
                      <Tag size={12} />
                      <span>Insert Variable:</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {VARIABLE_TAGS.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertTag(v.tag, 'wa')}
                        className="px-2.5 py-1 bg-[#F4F7F4] hover:bg-[#EAEAEA] border border-[#EAEAEA] rounded-full text-xs font-mono font-medium text-[#16281D] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>+</span>
                        <span>{v.tag}</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={waTextareaRef}
                    rows={5}
                    placeholder="Compose your broadcast message..."
                    value={textMessage}
                    onChange={(e) => setTextMessage(e.target.value)}
                    className="w-full p-3.5 bg-white border border-[#EAEAEA] rounded-2xl text-xs text-[#16281D] placeholder-[#71717A] outline-none focus:ring-2 focus:ring-[#9FE870]/20 focus:border-[#9FE870] transition-all resize-none leading-relaxed font-sans"
                  />
                </div>

                {/* Quick Starters for WhatsApp Text */}
                <div>
                  <label className="text-xs font-semibold text-[#16281D] mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-[#15803D]" />
                    <span>Quick Starters</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => setTextMessage(preset.text)}
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
              </div>
            ) : (
              /* Approved Template Mode */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                    Select Template <span className="text-red-500">*</span>
                  </label>
                  <CustomDropdown
                    value={selectedTemplateName}
                    onChange={(val) => setSelectedTemplateName(val)}
                    options={[
                      { value: '', label: '-- Choose a Meta approved template --' },
                      ...metaTemplates.map((t) => ({
                        value: t.name,
                        label: `${t.name} (${t.category})`,
                      })),
                    ]}
                    variant="white"
                    className="w-full"
                  />
                </div>

                {selectedTemplateName && selectedTemplate && (
                  <div className="p-4 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block mb-1">
                        Template Body Structure
                      </span>
                      <div className="p-3.5 bg-white rounded-xl border border-[#EAEAEA] text-xs text-[#16281D] whitespace-pre-wrap leading-relaxed">
                        {templateBodyText || '(No text body in template)'}
                      </div>
                    </div>

                    {templateParams.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">
                            Dynamic Variables ({templateParams.length})
                          </span>
                          <span className="text-[10px] text-[#71717A]">
                            Tip: Insert variables like {'{first_name}'}
                          </span>
                        </div>

                        {templateParams.map((param, index) => (
                          <div key={index} className="space-y-1 bg-white p-2.5 rounded-xl border border-[#EAEAEA]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-[#16281D]">
                                {`{{${index + 1}}}`} Parameter
                              </span>
                              <div className="flex items-center gap-1">
                                {VARIABLE_TAGS.map((v) => (
                                  <button
                                    key={v.tag}
                                    type="button"
                                    onClick={() => onTemplateParamChange(index, v.tag)}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] cursor-pointer"
                                  >
                                    +{v.tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="text"
                              placeholder={`Value for {{${index + 1}}} (e.g. {first_name})`}
                              value={param}
                              onChange={(e) => onTemplateParamChange(index, e.target.value)}
                              className="w-full px-3 py-1.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-lg text-xs text-[#16281D] outline-none focus:border-[#9FE870] font-sans"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Live Smartphone Preview */}
      <div className="lg:col-span-5 flex justify-center sticky top-2">
        <BroadcastMobilePreview
          channel={channel}
          message={channel === 'sms' ? smsMessage : textMessage}
          senderId={smsSenderId}
          templateName={selectedTemplateName}
          templateParams={templateParams}
          templateBody={templateBodyText}
          mediaHeader={mediaHeader}
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

export default ComposerStep;
