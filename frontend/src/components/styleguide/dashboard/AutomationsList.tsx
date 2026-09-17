import React from 'react';
import { Plus, Zap, Bot, MessageSquare, Send } from 'lucide-react';
import { WorkflowItem } from '../types';

export interface AutomationsListProps {
  items?: WorkflowItem[];
  onAddClick?: () => void;
}

const DEFAULT_WORKFLOWS: WorkflowItem[] = [
  {
    id: 'flow-1',
    name: 'Order Receipt Bot',
    instructions: 'Trigger: POS Sale • Instant PDF invoice',
  },
  {
    id: 'flow-2',
    name: 'Abandoned Cart AI',
    instructions: 'Trigger: 2h Inactive • 10% promo recovery',
  },
  {
    id: 'flow-3',
    name: 'Lead Nurture Flow',
    instructions: 'Trigger: Webhook • DeepSeek auto-reply',
  },
  {
    id: 'flow-4',
    name: 'Billing Alerts',
    instructions: 'Trigger: Due Date • Automated reminder',
  },
];

const FLOW_ICONS = [MessageSquare, Zap, Bot, Send];

export const AutomationsList: React.FC<AutomationsListProps> = ({
  items = DEFAULT_WORKFLOWS,
  onAddClick,
}) => {
  return (
    <div className="flex flex-col gap-3 font-sans">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base md:text-lg text-[#16281D] m-0">
          Automated workflows & campaigns
        </h2>
        <button
          onClick={onAddClick}
          title="Create automated workflow"
          className="w-8 h-8 rounded-full bg-[#9FE870] text-[#16281D] flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform cursor-pointer border-0"
        >
          <Plus size={16} strokeWidth={2.8} />
        </button>
      </div>

      {/* Horizontal Capsule Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {items.map((flow, idx) => {
          const IconComponent = FLOW_ICONS[idx % FLOW_ICONS.length];

          return (
            <div
              key={flow.id}
              className="bg-white rounded-[20px] p-3 md:px-4 md:py-2.5 border border-[#EAEAEA] shadow-[0_2px_6px_rgba(0,0,0,0.02)] flex items-center gap-3 hover:border-[#9FE870] transition-colors cursor-pointer group"
            >
              {/* Capsule Icon in Soft Green Ring */}
              <div className="w-9 h-9 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors">
                <IconComponent size={16} strokeWidth={2.4} />
              </div>

              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[13px] text-[#16281D] truncate leading-snug">
                  {flow.name}
                </span>
                <span className="text-[11px] text-[#8FA89B] truncate font-medium">
                  {flow.instructions}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
