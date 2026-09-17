import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { MetaTemplate } from './types';
import CustomDropdown from '../shared/CustomDropdown';

interface ComposerStepProps {
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
}

const ComposerStep: React.FC<ComposerStepProps> = ({
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
}) => {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-[#16281D] mb-2">
          Message Format
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMessageType('template')}
            className={`py-2 px-3 rounded-full text-xs font-semibold border transition-all text-center ${
              messageType === 'template'
                ? 'bg-[#16281D] text-[#9FE870] border-[#16281D]'
                : 'bg-white text-[#71717A] border-[#EAEAEA] hover:border-[#71717A]'
            }`}
          >
            Approved Template
          </button>
          <button
            type="button"
            onClick={() => setMessageType('text')}
            className={`py-2 px-3 rounded-full text-xs font-semibold border transition-all text-center ${
              messageType === 'text'
                ? 'bg-[#16281D] text-[#9FE870] border-[#16281D]'
                : 'bg-white text-[#71717A] border-[#EAEAEA] hover:border-[#71717A]'
            }`}
          >
            Free-Form Text
          </button>
        </div>
      </div>

      {messageType === 'text' ? (
        <div className="space-y-3">
          <div className="p-3.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-2xl flex items-start gap-2.5 text-xs text-[#D97706]">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">WhatsApp 24-Hour Policy Notice:</strong>
              Free-text messages are restricted to contacts who messaged you in the last 24 hours. Messages to outside recipients will fail to deliver.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
              Message Content
            </label>
            <textarea
              rows={6}
              placeholder="Compose your broadcast message..."
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
              className="w-full p-3.5 bg-white border border-[#EAEAEA] rounded-2xl text-xs text-[#16281D] placeholder-[#71717A] outline-none focus:ring-2 focus:ring-[#9FE870]/20 focus:border-[#9FE870] transition-all"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
              Select Template
            </label>
            <CustomDropdown
              value={selectedTemplateName}
              onChange={(val) => setSelectedTemplateName(val)}
              options={[
                { value: '', label: '-- Choose a template --' },
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
                  Template Body Preview
                </span>
                <div className="p-3.5 bg-white rounded-xl border border-[#EAEAEA] text-xs text-[#16281D] whitespace-pre-wrap">
                  {selectedTemplate.components.find((c) => c.type === 'BODY')?.text}
                </div>
              </div>

              {templateParams.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider block mb-2">
                    Dynamic Variables
                  </span>
                  <div className="space-y-2">
                    {templateParams.map((param, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#16281D] w-14">
                          {`{{${index + 1}}}`}
                        </span>
                        <input
                          type="text"
                          placeholder={`Value for {{${index + 1}}}`}
                          value={param}
                          onChange={(e) => onTemplateParamChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] outline-none focus:border-[#9FE870]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComposerStep;
