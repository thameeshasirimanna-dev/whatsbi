import React, { useState, useEffect, useMemo } from 'react';
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
import {
  Plus,
  RefreshCw,
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useDialog } from '../shared/DialogProvider';
import { SkeletonPage } from '../shared/Skeleton';
import CustomDropdown from '../shared/CustomDropdown';
import SmsMarketingSummaryCards from './SmsMarketingSummaryCards';
import { SmsCampaignsTable } from './SmsCampaignsTable';
import { SmsCampaignDrawer } from './SmsCampaignDrawer';
import { CreateSmsCampaignModal } from './CreateSmsModal/CreateSmsCampaignModal';

const SmsMarketingPage: React.FC = () => {
  const { confirm: dlgConfirm, toast } = useDialog();

  const [campaigns, setCampaigns] = useState<Broadcast[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SMS Gateway Config (from agent/whatsapp_config)
  const [smsSenderId, setSmsSenderId] = useState<string>('');
  const [smsApiToken, setSmsApiToken] = useState<string>('');

  // Drawer details state
  const [selectedCampaign, setSelectedCampaign] = useState<Broadcast | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Toolbar filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);

      const currentAgent = await getCurrentAgent();
      const cData = await getCustomers();
      setCustomers(cData);

      // Fetch SMS channel broadcasts
      const bData = await getBroadcasts('sms');
      setCampaigns(bData);

      // Fetch SMS Gateway credentials
      const token = getToken();
      if (token && currentAgent) {
        const userResp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
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
              const cfg = configData.whatsapp_config[0] || configData.whatsapp_config;
              if (cfg.sms_sender_id) setSmsSenderId(cfg.sms_sender_id);
              if (cfg.sms_api_token) setSmsApiToken(cfg.sms_api_token);
            }
          }
        }
      }

      if (!silent) setLoading(false);
    } catch (err: any) {
      console.error('Failed to load SMS marketing data:', err);
      setError(err.message || 'Failed to load SMS data');
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh when any campaign is currently sending
  useEffect(() => {
    const hasSending = campaigns.some(
      (c) => c.status === 'processing' || c.status === 'pending'
    );
    if (!hasSending) return;

    const timer = setInterval(() => {
      loadData(true);
    }, 4000);

    return () => clearInterval(timer);
  }, [campaigns]);

  // View details in drawer
  const handleViewDetails = async (campaign: Broadcast) => {
    setSelectedCampaign(campaign);
    setShowDetailsDrawer(true);
    setLoadingDetails(true);
    try {
      const fullDetails = await getBroadcastDetails(campaign.id);
      setSelectedCampaign(fullDetails);
    } catch (err) {
      console.error('Failed to fetch campaign details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Resend to failed recipients
  const handleResendFailed = async (campaign: Broadcast) => {
    const ok = await dlgConfirm(
      `Are you sure you want to retry sending SMS to ${campaign.failed_count} failed recipient(s)?`,
      {
        title: 'Resend Failed SMS Messages?',
        confirmLabel: 'Retry Sending',
      }
    );

    if (!ok) return;

    try {
      const res = await createBroadcast({
        action: 'resend',
        broadcast_id: campaign.id,
      });

      if (res.success) {
        toast('Retrying delivery to failed recipients.', 'success');
        loadData(true);
        if (selectedCampaign?.id === campaign.id) {
          handleViewDetails(campaign);
        }
      } else {
        toast(res.message || 'Failed to retry delivery', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to resend SMS', 'error');
    }
  };

  // Delete campaign
  const handleDeleteCampaign = async (campaign: Broadcast) => {
    const ok = await dlgConfirm(
      `Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`,
      {
        title: 'Delete SMS Campaign?',
        confirmLabel: 'Delete Campaign',
        danger: true,
      }
    );

    if (!ok) return;

    try {
      const res = await deleteBroadcast(campaign.id);
      if (res.success) {
        toast('SMS Campaign deleted.', 'success');
        if (selectedCampaign?.id === campaign.id) {
          setShowDetailsDrawer(false);
          setSelectedCampaign(null);
        }
        loadData(true);
      } else {
        toast(res.message || 'Failed to delete campaign', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to delete campaign', 'error');
    }
  };

  // Filtered & Sorted campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => {
        if (statusFilter !== 'all' && c.status.toLowerCase() !== statusFilter) return false;
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matchName = c.name && c.name.toLowerCase().includes(q);
          const matchMsg = c.message && c.message.toLowerCase().includes(q);
          if (!matchName && !matchMsg) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'recipients') return (b.total_recipients || 0) - (a.total_recipients || 0);
        return 0;
      });
  }, [campaigns, statusFilter, searchTerm, sortBy]);

  const hasActiveFilters = statusFilter !== 'all' || Boolean(searchTerm);

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setSortBy('newest');
  };

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      {/* Metrics Cards */}
      <SmsMarketingSummaryCards campaigns={campaigns} />

      {/* Error state */}
      {error && (
        <div className="p-3 sm:p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Gateway Missing Notice Banner */}
      {!smsSenderId && (
        <div className="p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-[#D97706] shrink-0" />
            <div>
              <h4 className="font-bold text-[#92400E]">SMS Gateway Configuration Required</h4>
              <p className="mt-0.5 text-[11px] text-[#B45309]">
                To dispatch SMS campaigns, configure your Text.lk <strong>Sender ID</strong> and <strong>API Token</strong> in Workspace Settings or contact your Super Admin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Responsive 2-Row Toolbar (Rule 7 & Style Guide Section 23) */}
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
              placeholder="Search SMS campaigns..."
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
              onClick={() => loadData(true)}
              className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-bold border border-[#EAEAEA] flex items-center gap-2 transition-colors cursor-pointer"
              title="Refresh campaigns"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              disabled={!smsSenderId}
              className="flex-1 sm:flex-initial justify-center h-9 sm:h-10 rounded-full px-4 sm:px-5 bg-[#9FE870] hover:bg-[#8CE05A] disabled:opacity-40 disabled:cursor-not-allowed text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 cursor-pointer border-0"
            >
              <Plus size={14} />
              <span>New SMS Campaign</span>
            </button>
          </div>
        </div>

        {/* Row 2: Dedicated Filters Grid (Rule 7) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 w-full items-center">
          {/* Status Dropdown */}
          <div className="col-span-1 w-full min-w-0">
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'completed', label: 'Completed' },
                { value: 'processing', label: 'Processing' },
                { value: 'failed', label: 'Failed' },
              ]}
              className="w-full"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="col-span-1 w-full min-w-0">
            <CustomDropdown
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              options={[
                { value: 'newest', label: 'Sort: Newest First' },
                { value: 'oldest', label: 'Sort: Oldest First' },
                { value: 'recipients', label: 'Sort: Most Recipients' },
              ]}
              className="w-full"
            />
          </div>

          {/* Slot 3: Sender ID Pill / Clear Filters */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-1 w-full min-w-0 flex items-center justify-between sm:justify-end gap-2">
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="w-full h-9 sm:h-10 px-3.5 sm:px-4 rounded-full border border-[#EF4444]/30 bg-[#EF4444]/10 hover:bg-[#EF4444]/15 text-[#EF4444] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X size={13} />
                <span>Clear Filters</span>
              </button>
            ) : smsSenderId ? (
              <div className="w-full h-9 sm:h-10 px-4 rounded-full border border-[#EAEAEA] bg-[#F4F7F4] text-[#16281D] text-xs font-medium flex items-center justify-between">
                <span className="text-[#71717A] text-[11px]">Active Gateway:</span>
                <span className="inline-flex items-center gap-1.5 font-bold font-mono text-[11px] text-[#15803D]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  {smsSenderId}
                </span>
              </div>
            ) : (
              <div className="w-full h-9 sm:h-10 px-4 rounded-full border border-[#EAEAEA] bg-[#F4F7F4] text-[#71717A] text-xs font-medium flex items-center justify-center">
                <span>Showing {filteredCampaigns.length} Campaigns</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <SmsCampaignsTable
        campaigns={filteredCampaigns}
        onViewDetails={handleViewDetails}
        onResendFailed={handleResendFailed}
        onDelete={handleDeleteCampaign}
        onCreateClick={() => setShowCreateModal(true)}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Details Slide-out Drawer */}
      <SmsCampaignDrawer
        isOpen={showDetailsDrawer}
        campaign={selectedCampaign}
        loadingDetails={loadingDetails}
        smsSenderId={smsSenderId}
        onClose={() => {
          setShowDetailsDrawer(false);
          setSelectedCampaign(null);
        }}
        onResendFailed={handleResendFailed}
        onDelete={handleDeleteCampaign}
      />

      {/* Create SMS Campaign Modal Wizard */}
      <CreateSmsCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => loadData(true)}
        customers={customers}
        smsSenderId={smsSenderId}
        smsApiToken={smsApiToken}
      />
    </div>
  );
};

export default SmsMarketingPage;
