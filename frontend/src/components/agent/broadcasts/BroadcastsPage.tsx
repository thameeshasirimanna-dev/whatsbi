import React, { useState, useEffect, useMemo } from 'react';
import { getCurrentAgent } from '../../../lib/agent';
import { getToken } from '../../../lib/auth';
import {
  getCustomers,
  getBroadcasts,
  getBroadcastDetails,
  createBroadcast,
  deleteBroadcast,
  deleteBroadcasts,
  Customer,
  Broadcast,
} from '../../../lib/api';
import { Plus, RefreshCw, Search, Send, X } from 'lucide-react';
import { useDialog } from '../shared/DialogProvider';
import { SkeletonPage } from '../shared/Skeleton';
import BroadcastSummaryCards from './BroadcastSummaryCards';
import BroadcastTable from './BroadcastTable';
import BroadcastDetailsDrawer from './BroadcastDetailsDrawer';
import CreateBroadcastModal from './CreateBroadcastModal';
import { BroadcastBulkActionsBar } from './BroadcastBulkActionsBar';
import { useTableSelection } from '../shared/useTableSelection';
import { fetchWhatsAppConfigAndTemplates } from './broadcastHelpers';
import type { WhatsAppConfig, MetaTemplate } from './types';
import CustomDropdown from '../shared/CustomDropdown';
import { useBroadcastWizard } from './useBroadcastWizard';
import { useBroadcastProgressSync } from './useBroadcastProgressSync';

const BroadcastsPage: React.FC = () => {
  const { confirm: dlgConfirm, toast } = useDialog();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Meta Configuration
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);

  // Selection/Details state
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Creator modal visibility state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Table row selection state & bulk actions
  const selection = useTableSelection<number>();
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentAgent = await getCurrentAgent();
      setAgent(currentAgent);

      const bData = await getBroadcasts();
      setBroadcasts(bData);

      const cData = await getCustomers();
      setCustomers(cData);

      // Fetch WhatsApp Configuration to get templates
      const token = getToken();
      if (token && currentAgent) {
        const { config: waConfig, templates } = await fetchWhatsAppConfigAndTemplates(token);
        if (waConfig) setConfig(waConfig);
        if (templates) setMetaTemplates(templates);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load broadcasts data');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const wizard = useBroadcastWizard({
    customers,
    agent,
    metaTemplates,
    smsSenderId: config?.sms_sender_id,
    smsApiToken: config?.sms_api_token,
    onSuccess: loadData,
    isOpen: showCreateModal,
    onOpenModal: () => setShowCreateModal(true),
    onCloseModal: () => setShowCreateModal(false),
  });

  // Real-time synchronization of delivery progress and agent credits
  useBroadcastProgressSync({
    broadcasts,
    setBroadcasts,
    setSelectedBroadcast,
    setAgent,
  });

  const handleRefresh = async () => {
    try {
      const bData = await getBroadcasts();
      setBroadcasts(bData);

      const currentAgent = await getCurrentAgent();
      setAgent(currentAgent);
      toast('Campaigns refreshed', 'success');
    } catch (err: any) {
      console.error('Failed to refresh:', err);
    }
  };

  const handleViewDetails = async (broadcast: Broadcast) => {
    setSelectedBroadcast(broadcast);
    setShowDetailsDrawer(true);
    setLoadingDetails(true);
    try {
      const details = await getBroadcastDetails(broadcast.id);
      setSelectedBroadcast(details);
      setLoadingDetails(false);
    } catch (err: any) {
      console.error('Failed to fetch broadcast details:', err);
      setLoadingDetails(false);
    }
  };

  const handleResendFailed = async (broadcast: Broadcast) => {
    if (broadcast.failed_count === 0) {
      toast('No failed recipients to resend!', 'warning');
      return;
    }

    if (broadcast.channel === 'sms' && agent && (agent.sms_credits ?? 0) < broadcast.failed_count * 1) {
      toast('Insufficient SMS credits to resend to failed recipients!', 'error');
      return;
    }

    if (
      broadcast.channel !== 'sms' &&
      broadcast.message_type === 'template' &&
      agent &&
      (agent.credits ?? 0) < broadcast.failed_count * 30
    ) {
      toast('Insufficient WhatsApp credits to resend to failed recipients!', 'error');
      return;
    }

    if (
      !(await dlgConfirm(
        `Are you sure you want to resend to the ${broadcast.failed_count} failed recipients in this campaign?`
      ))
    ) {
      return;
    }

    try {
      const res = await createBroadcast({
        action: 'resend',
        broadcast_id: broadcast.id,
      });
      if (res.success) {
        if (selectedBroadcast?.id === broadcast.id) {
          setShowDetailsDrawer(false);
          setSelectedBroadcast(null);
        }
        toast('Broadcast resend started successfully!', 'success');
        loadData();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to resend broadcast', 'error');
    }
  };

  const handleDeleteBroadcast = async (broadcast: Broadcast) => {
    if (broadcast.status === 'processing') {
      toast('Cannot delete a campaign that is currently processing messages.', 'warning');
      return;
    }

    if (
      !(await dlgConfirm(
        `Are you sure you want to delete the campaign "${broadcast.name}"? This action cannot be undone and will delete all recipient logs.`,
        { danger: true, confirmLabel: 'Delete' }
      ))
    ) {
      return;
    }

    try {
      const res = await deleteBroadcast(broadcast.id);
      if (res.success) {
        if (selectedBroadcast?.id === broadcast.id) {
          setShowDetailsDrawer(false);
          setSelectedBroadcast(null);
        }
        if (selection.isSelected(broadcast.id)) {
          selection.toggleSelect(broadcast.id);
        }
        toast('Campaign deleted successfully!', 'success');
        loadData();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to delete campaign', 'error');
    }
  };

  const filteredBroadcasts = broadcasts.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status.toLowerCase() === statusFilter;
    const matchesType =
      typeFilter === 'all' ||
      b.message_type.toLowerCase() === typeFilter ||
      (b.channel && b.channel.toLowerCase() === typeFilter);
    return matchesSearch && matchesStatus && matchesType;
  });

  const filteredBroadcastIds = useMemo(
    () => filteredBroadcasts.map((b) => b.id),
    [filteredBroadcasts]
  );

  const selectedCampaigns = useMemo(
    () => broadcasts.filter((b) => selection.isSelected(b.id)),
    [broadcasts, selection]
  );

  const totalFailedInSelection = useMemo(
    () => selectedCampaigns.reduce((acc, b) => acc + (b.failed_count || 0), 0),
    [selectedCampaigns]
  );

  const handleBulkDelete = async () => {
    if (selection.selectedCount === 0) return;

    const hasProcessing = selectedCampaigns.some((b) => b.status === 'processing');
    if (hasProcessing) {
      toast('Cannot delete campaigns that are currently processing.', 'warning');
      return;
    }

    const confirmed = await dlgConfirm(
      `Are you sure you want to delete ${selection.selectedCount} selected campaign(s)? This will permanently remove them and all recipient logs.`,
      { danger: true, confirmLabel: 'Delete Selected' }
    );
    if (!confirmed) return;

    try {
      setBulkProcessing(true);
      const res = await deleteBroadcasts(selection.selectedIds);
      if (res.success) {
        toast(`Successfully deleted ${selection.selectedCount} campaign(s)`, 'success');
        selection.clearSelection();
        loadData();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to delete selected campaigns', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkResendFailed = async () => {
    const eligible = selectedCampaigns.filter((b) => (b.failed_count || 0) > 0);
    if (eligible.length === 0) {
      toast('No failed recipients in selected campaigns.', 'warning');
      return;
    }

    const totalFailed = eligible.reduce((acc, b) => acc + (b.failed_count || 0), 0);

    const confirmed = await dlgConfirm(
      `Are you sure you want to resend to ${totalFailed} failed recipient(s) across ${eligible.length} campaign(s)?`
    );
    if (!confirmed) return;

    try {
      setBulkProcessing(true);
      let successCount = 0;
      for (const b of eligible) {
        try {
          await createBroadcast({ action: 'resend', broadcast_id: b.id });
          successCount++;
        } catch (err) {
          console.error(`Failed to resend broadcast ${b.id}:`, err);
        }
      }
      toast(`Triggered resend for ${successCount} campaign(s)!`, 'success');
      selection.clearSelection();
      loadData();
    } catch (err: any) {
      toast(err.message || 'Failed to resend some campaigns', 'error');
    } finally {
      setBulkProcessing(false);
    }
  };

  const hasActiveFilters =
    searchTerm !== '' || statusFilter !== 'all' || typeFilter !== 'all';

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      {/* Top Metrics Cards */}
      <BroadcastSummaryCards broadcasts={broadcasts} />

      {/* Error state */}
      {error && (
        <div className="p-3 sm:p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Responsive 2-Row Toolbar */}
      <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
        {/* Row 1: Search and Primary Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          <div className="relative flex-1 min-w-0 flex items-center">
            <Search
              size={14}
              className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
            />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-9 sm:h-10 pl-9 pr-9 rounded-full bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 w-5 h-5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end shrink-0">
            <button
              onClick={handleRefresh}
              className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-bold border border-[#EAEAEA] flex items-center gap-2 transition-colors cursor-pointer"
              title="Refresh campaigns"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => {
                setShowCreateModal(true);
                wizard.setWizardStep(1);
              }}
              className="flex-1 sm:flex-initial justify-center h-9 sm:h-10 rounded-full px-3.5 sm:px-5 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 cursor-pointer border-0 whitespace-nowrap"
            >
              <Plus size={14} /> New Campaign
            </button>
          </div>
        </div>

        {/* Row 2: Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-2.5 w-full">
          <div className="col-span-1 w-full min-w-0">
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'draft', label: 'Draft' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'failed', label: 'Failed' },
              ]}
              className="w-full"
            />
          </div>

          <div className="col-span-1 w-full min-w-0">
            <CustomDropdown
              value={typeFilter}
              onChange={(val) => setTypeFilter(val)}
              options={[
                { value: 'all', label: 'All Channels & Types' },
                { value: 'sms', label: 'Normal SMS (Text.lk)' },
                { value: 'template', label: 'Meta Template' },
                { value: 'text', label: 'Direct Text' },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Floating Capsule Bar */}
      <BroadcastBulkActionsBar
        selectedCount={selection.selectedCount}
        totalFailedInSelection={totalFailedInSelection}
        onBulkResendFailed={handleBulkResendFailed}
        onBulkDelete={handleBulkDelete}
        onClearSelection={selection.clearSelection}
        isProcessing={bulkProcessing}
      />

      {/* Campaigns Table */}
      <BroadcastTable
        broadcasts={filteredBroadcasts}
        onViewDetails={handleViewDetails}
        onResendFailed={handleResendFailed}
        onDelete={handleDeleteBroadcast}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        selectedIds={selection.selectedIds}
        onToggleSelect={selection.toggleSelect}
        onSelectAll={() => selection.selectAll(filteredBroadcastIds)}
        isAllSelected={selection.isAllSelected(filteredBroadcastIds)}
        isIndeterminate={selection.isIndeterminate(filteredBroadcastIds)}
        onCreateClick={() => {
          setShowCreateModal(true);
          wizard.setWizardStep(1);
        }}
      />

      {/* Details slide-out drawer */}
      <BroadcastDetailsDrawer
        isOpen={showDetailsDrawer}
        broadcast={selectedBroadcast}
        loadingDetails={loadingDetails}
        onClose={() => {
          setShowDetailsDrawer(false);
          setSelectedBroadcast(null);
        }}
        onResendFailed={handleResendFailed}
        onDelete={handleDeleteBroadcast}
      />

      {/* Create Broadcast Wizard Modal */}
      <CreateBroadcastModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        customers={customers}
        agent={agent}
        metaTemplates={metaTemplates}
        selectedTemplate={wizard.getSelectedTemplate()}
        onSubmit={wizard.handleCreateCampaign}
        targetRecipientsCount={wizard.getTargetRecipientsCount()}
        onToggleCustomerSelection={wizard.handleToggleCustomerSelection}
        onSelectAllManualCustomers={wizard.handleSelectAllManualCustomers}
        onClearManualSelection={wizard.handleClearManualSelection}
        onTemplateParamChange={wizard.handleTemplateParamChange}
        smsPartsInfo={wizard.smsPartsInfo}
        estimatedCredits={wizard.estimatedCredits}
        {...wizard}
      />
    </div>
  );
};

export default BroadcastsPage;
