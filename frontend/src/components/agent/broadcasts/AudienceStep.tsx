import React from 'react';
import { Search, Users } from 'lucide-react';
import type { Customer } from '../../../lib/api';
import CustomDropdown from '../shared/CustomDropdown';
import { RoundCheckbox } from '../shared/RoundCheckbox';
import { isCustomerWithin24Hours, formatHoursSinceLastMessage } from './broadcastHelpers';

interface AudienceStepProps {
  campaignName: string;
  setCampaignName: (name: string) => void;
  targetAudienceType: 'all' | 'filtered' | 'group' | 'manual';
  setTargetAudienceType: (type: 'all' | 'filtered' | 'group' | 'manual') => void;
  filterLeadStage: string;
  setFilterLeadStage: (stage: string) => void;
  filterInterestStage: string;
  setFilterInterestStage: (stage: string) => void;
  filterConversionStage: string;
  setFilterConversionStage: (stage: string) => void;
  filterLanguage: string;
  setFilterLanguage: (lang: string) => void;
  selectedGroupId: string;
  setSelectedGroupId: (id: string) => void;
  customerGroups: { id: number; name: string; member_count?: number; color?: string }[];
  customers: Customer[];
  selectedCustomerIds: number[];
  customerSearch: string;
  setCustomerSearch: (q: string) => void;
  onToggleCustomerSelection: (id: number) => void;
  onSelectAllManualCustomers: () => void;
  onClearManualSelection: () => void;
  targetRecipientsCount: number;
  channel?: 'whatsapp' | 'sms';
  messageType?: 'text' | 'template';
  setMessageType?: (t: 'text' | 'template') => void;
}

const AudienceStep: React.FC<AudienceStepProps> = ({
  campaignName,
  setCampaignName,
  targetAudienceType,
  setTargetAudienceType,
  filterLeadStage,
  setFilterLeadStage,
  filterInterestStage,
  setFilterInterestStage,
  filterConversionStage,
  setFilterConversionStage,
  filterLanguage,
  setFilterLanguage,
  selectedGroupId,
  setSelectedGroupId,
  customerGroups,
  customers,
  selectedCustomerIds,
  customerSearch,
  setCustomerSearch,
  onToggleCustomerSelection,
  onSelectAllManualCustomers,
  onClearManualSelection,
  targetRecipientsCount,
  channel = 'whatsapp',
  messageType = 'template',
  setMessageType,
}) => {
  const isFreeTextRestricted = channel === 'whatsapp' && messageType === 'text';

  return (
    <div className="space-y-5 font-sans">
      <div>
        <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
          Campaign Name
        </label>
        <input
          type="text"
          placeholder="e.g. Summer Seasonal Offer"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] outline-none focus:ring-2 focus:ring-[#9FE870]/20 focus:border-[#9FE870] transition-all"
        />
      </div>

      {/* Free-Form 24h Policy Notice */}
      {isFreeTextRestricted && (
        <div className="p-3.5 bg-[#E8F8EE] border border-[#BBF7D0] rounded-2xl flex items-center justify-between gap-3 text-xs text-[#15803D]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shrink-0 animate-pulse" />
            <div className="min-w-0">
              <span className="font-bold">Free-form WhatsApp messages can only target the "Within 24h Active" group.</span>
              <p className="text-[11px] text-[#15803D]/80 truncate">
                Meta policy requires an Approved Template or SMS to message contacts outside 24 hours.
              </p>
            </div>
          </div>
          {setMessageType && (
            <button
              type="button"
              onClick={() => setMessageType('template')}
              className="shrink-0 px-3 py-1.5 rounded-full bg-white border border-[#BBF7D0] text-xs font-bold text-[#15803D] hover:bg-[#DCFCE7] transition-colors cursor-pointer shadow-xs"
            >
              Switch to Template
            </button>
          )}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[#16281D] mb-2">
          Target Audience
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['all', 'group', 'filtered', 'manual'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTargetAudienceType(type)}
              className={`py-2 px-3 rounded-full text-xs font-semibold border transition-all text-center cursor-pointer ${
                targetAudienceType === type
                  ? 'bg-[#16281D] text-[#9FE870] border-[#16281D] shadow-sm'
                  : 'bg-white text-[#71717A] border-[#EAEAEA] hover:border-[#71717A]'
              }`}
            >
              {type === 'all'
                ? isFreeTextRestricted
                  ? 'All (Template)'
                  : 'All Customers'
                : type === 'group'
                ? isFreeTextRestricted
                  ? 'Within 24h Active'
                  : 'By Group'
                : type === 'filtered'
                ? isFreeTextRestricted
                  ? 'Segments (Template)'
                  : 'By Segments'
                : isFreeTextRestricted
                ? 'Manual (Template)'
                : 'Manual Pick'}
            </button>
          ))}
        </div>
      </div>

      {targetAudienceType === 'group' && (
        <div className="p-4 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#71717A] mb-1.5">
              Select Customer Group
            </label>
            {customerGroups.length === 0 ? (
              <div className="p-3 bg-white rounded-xl border border-[#EAEAEA] text-xs text-[#71717A] text-center">
                No customer groups available yet. Create groups from the Customer Groups page.
              </div>
            ) : (
              <CustomDropdown
                value={selectedGroupId}
                onChange={(val) => setSelectedGroupId(val)}
                options={customerGroups.map((g) => ({
                  value: String(g.id),
                  label: isFreeTextRestricted
                    ? g.name.toLowerCase() === 'within 24h active'
                      ? `${g.name} (${g.member_count ?? 0} members) - Free Text Eligible`
                      : `${g.name} (${g.member_count ?? 0} members) - Switches to Template`
                    : `${g.name} (${g.member_count ?? 0} members)`,
                }))}
                variant="white"
                className="w-full"
              />
            )}
          </div>
        </div>
      )}

      {targetAudienceType === 'filtered' && (
        <div className="p-4 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#71717A] mb-1">
              Lead Stage
            </label>
            <CustomDropdown
              value={filterLeadStage}
              onChange={(val) => setFilterLeadStage(val)}
              options={[
                { value: 'all', label: 'All Stages' },
                { value: 'New Lead', label: 'New Lead' },
                { value: 'Contacted', label: 'Contacted' },
                { value: 'Not Responding', label: 'Not Responding' },
                { value: 'Follow-up Needed', label: 'Follow-up Needed' },
              ]}
              variant="white"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#71717A] mb-1">
              Conversion Stage
            </label>
            <CustomDropdown
              value={filterConversionStage}
              onChange={(val) => setFilterConversionStage(val)}
              options={[
                { value: 'all', label: 'All Stages' },
                { value: 'Payment Pending', label: 'Payment Pending' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Order Confirmed', label: 'Order Confirmed' },
              ]}
              variant="white"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#71717A] mb-1">
              Interest Stage
            </label>
            <CustomDropdown
              value={filterInterestStage}
              onChange={(val) => setFilterInterestStage(val)}
              options={[
                { value: 'all', label: 'All Stages' },
                { value: 'Interested', label: 'Interested' },
                { value: 'Quotation Sent', label: 'Quotation Sent' },
                { value: 'Asked for More Info', label: 'Asked for More Info' },
              ]}
              variant="white"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#71717A] mb-1">
              Language
            </label>
            <CustomDropdown
              value={filterLanguage}
              onChange={(val) => setFilterLanguage(val)}
              options={[
                { value: 'all', label: 'All Languages' },
                { value: 'en', label: 'English' },
                { value: 'si', label: 'Sinhala' },
                { value: 'ta', label: 'Tamil' },
              ]}
              variant="white"
              className="w-full"
            />
          </div>
        </div>
      )}

      {targetAudienceType === 'manual' && (
        <div className="p-4 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]"
              />
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-white border border-[#EAEAEA] rounded-full text-xs text-[#16281D] outline-none focus:border-[#9FE870]"
              />
            </div>
            <button
              type="button"
              onClick={onSelectAllManualCustomers}
              className="px-3 py-2 rounded-full bg-white border border-[#EAEAEA] hover:border-[#71717A] text-xs font-medium text-[#16281D] transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={onClearManualSelection}
              className="px-3 py-2 rounded-full bg-white border border-[#EAEAEA] hover:border-[#71717A] text-xs font-medium text-[#71717A] transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto bg-white rounded-xl border border-[#EAEAEA] divide-y divide-[#EAEAEA]">
            {customers
              .filter(
                (c) =>
                  c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  c.phone.includes(customerSearch)
              )
              .map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F4F7F4] cursor-pointer transition-colors"
                >
                  <RoundCheckbox
                    checked={selectedCustomerIds.includes(c.id)}
                    onChange={() => onToggleCustomerSelection(c.id)}
                    aria-label={`Select customer ${c.name}`}
                  />
                  <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-[#16281D] truncate block">{c.name}</span>
                      <span className="text-[11px] font-mono text-[#71717A]">{c.phone}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      {isCustomerWithin24Hours(c.last_user_message_time) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22C55E]/15 text-[#15803D]">
                          ● Active 24h
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono text-[#71717A] bg-[#F4F7F4] border border-[#EAEAEA]">
                          {formatHoursSinceLastMessage(c.last_user_message_time)}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
          </div>
        </div>
      )}

      <div className="p-3.5 bg-[#9FE870]/15 border border-[#9FE870]/30 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-[#16281D]">
        <Users size={16} className="text-[#16281D]" />
        <span>
          <span className="font-mono font-bold">{targetRecipientsCount}</span> recipients currently selected.
        </span>
      </div>
    </div>
  );
};

export default AudienceStep;
