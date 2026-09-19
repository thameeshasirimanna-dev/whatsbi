import React, { useState, useEffect } from 'react';
import { getCurrentAgent } from '../../../lib/agent';
import { getToken } from '../../../lib/auth';
import {
  getCustomers,
  getBroadcasts,
  getBroadcastDetails,
  createBroadcast,
  deleteBroadcast,
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
import type { WhatsAppConfig, MetaTemplate } from './types';
import CustomDropdown from '../shared/CustomDropdown';
import { useBroadcastWizard } from './useBroadcastWizard';

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
        const userResp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userResp.json();

        if (userData.success && userData.user) {
          const configResp = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${userData.user.id}`,
            {
              method: 'GET',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (configResp.ok) {
            const configData = await configResp.json();
            if (configData.success && configData.whatsapp_config) {
              const whatsappConfig = configData.whatsapp_config[0] || configData.whatsapp_config;
              setConfig(whatsappConfig);

              try {
                const metaResp = await fetch(
                  `https://graph.facebook.com/v20.0/${whatsappConfig.business_account_id}/message_templates`,
                  {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${whatsappConfig.api_key}` },
                  }
                );
                if (metaResp.ok) {
                  const metaData = await metaResp.json();
                  const approvedTemplates = metaData.data.filter(
                    (t: any) => t.status === 'APPROVED'
                  );
                  setMetaTemplates(approvedTemplates);
                }
              } catch (metaErr) {
                console.error('Failed to load Meta templates:', metaErr);
              }
            }
          }
        }
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
    onSuccess: loadData,
    isOpen: showCreateModal,
    onOpenModal: () => setShowCreateModal(true),
    onCloseModal: () => setShowCreateModal(false),
  });

  const handleRefresh = async () => {
    try {
      const bData = await getBroadcasts();
      setBroadcasts(bData);

      const currentAgent = await getCurrentAgent();
      setAgent(currentAgent);
      toast('Broadcasts refreshed', 'success');
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

    if (
      broadcast.message_type === 'template' &&
      agent &&
      agent.credits < broadcast.failed_count * 0.01
    ) {
      toast('Insufficient credits to resend to failed recipients!', 'error');
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
    const matchesType = typeFilter === 'all' || b.message_type.toLowerCase() === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

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
              className="flex-1 sm:flex-initial justify-center h-9 sm:h-10 rounded-full px-4 sm:px-5 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 cursor-pointer border-0"
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
                { value: 'all', label: 'All Types' },
                { value: 'template', label: 'Meta Template' },
                { value: 'text', label: 'Direct Text' },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <BroadcastTable
        broadcasts={filteredBroadcasts}
        onViewDetails={handleViewDetails}
        onResendFailed={handleResendFailed}
        onDelete={handleDeleteBroadcast}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
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
        {...wizard}
      />
    </div>
  );
};

export default BroadcastsPage;
