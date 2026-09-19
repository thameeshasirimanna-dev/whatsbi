import React from 'react';
import { Search, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Customer } from '../../../../lib/api';
import CustomDropdown from '../../shared/CustomDropdown';
import { RoundCheckbox } from '../../shared/RoundCheckbox';

interface SmsAudienceStepProps {
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
  filteredSearchCustomers: Customer[];
  toggleCustomerSelection: (id: number) => void;
  selectAllManualCustomers: () => void;
  clearManualSelection: () => void;
  validRecipientsCount: number;
  invalidPhoneCount: number;
}

export const SmsAudienceStep: React.FC<SmsAudienceStepProps> = ({
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
  selectedCustomerIds,
  customerSearch,
  setCustomerSearch,
  filteredSearchCustomers,
  toggleCustomerSelection,
  selectAllManualCustomers,
  clearManualSelection,
  validRecipientsCount,
  invalidPhoneCount,
}) => {
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
                ? 'All Customers'
                : type === 'group'
                ? 'By Group'
                : type === 'filtered'
                ? 'By Segments'
                : 'Manual Pick'}
            </button>
          ))}
        </div>
      </div>

      {/* Target Group Selector */}
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
                  label: `${g.name} (${g.member_count ?? 0} members)`,
                }))}
                variant="white"
                className="w-full"
              />
            )}
          </div>
        </div>
      )}

      {/* Targeted Stage Filters */}
      {targetAudienceType === 'filtered' && (
        <div className="p-4 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                { value: 'Customer', label: 'Customer' },
                { value: 'Prospect', label: 'Prospect' },
                { value: 'Lost Lead', label: 'Lost Lead' },
              ]}
              variant="white"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#71717A] mb-1">
              Interest Level
            </label>
            <CustomDropdown
              value={filterInterestStage}
              onChange={(val) => setFilterInterestStage(val)}
              options={[
                { value: 'all', label: 'All Levels' },
                { value: 'High', label: 'High Interest' },
                { value: 'Medium', label: 'Medium Interest' },
                { value: 'Low', label: 'Low Interest' },
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

      {/* Manual Selection Table */}
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
              onClick={selectAllManualCustomers}
              className="px-3 py-2 rounded-full bg-white border border-[#EAEAEA] hover:border-[#71717A] text-xs font-medium text-[#16281D] transition-colors cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearManualSelection}
              className="px-3 py-2 rounded-full bg-white border border-[#EAEAEA] hover:border-[#71717A] text-xs font-medium text-[#71717A] transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto bg-white rounded-xl border border-[#EAEAEA] divide-y divide-[#EAEAEA]">
            {filteredSearchCustomers.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#F4F7F4] cursor-pointer transition-colors"
              >
                <RoundCheckbox
                  checked={selectedCustomerIds.includes(c.id)}
                  onChange={() => toggleCustomerSelection(c.id)}
                  aria-label={`Select customer ${c.name}`}
                />
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-medium text-[#16281D] truncate">{c.name}</p>
                    <p className="text-[11px] font-mono text-[#71717A]">{c.phone || 'No phone'}</p>
                  </div>
                  {c.lead_stage && (
                    <span className="text-[10px] font-medium text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full capitalize shrink-0">
                      {c.lead_stage}
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Target Recipient Telemetry */}
      <div className="p-4 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#22C55E]/15 text-[#15803D] flex items-center justify-center shrink-0">
            <Users size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#16281D]">
                {validRecipientsCount} Recipients Selected
              </span>
              <CheckCircle2 size={13} className="text-[#22C55E]" />
            </div>
            <p className="text-[11px] text-[#71717A]">
              Valid mobile numbers ready for direct SMS delivery.
            </p>
          </div>
        </div>

        {invalidPhoneCount > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#D97706] bg-[#FEF3C7] border border-[#FCD34D] px-2.5 py-1 rounded-full shrink-0">
            <AlertCircle size={13} />
            <span>{invalidPhoneCount} contacts excluded (invalid phone)</span>
          </div>
        )}
      </div>
    </div>
  );
};
