import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
import { Plus, RefreshCw, Search, Send } from 'lucide-react';
import { useDialog } from '../shared/DialogProvider';
import { SkeletonPage } from '../shared/Skeleton';
import BroadcastSummaryCards from './BroadcastSummaryCards';
import BroadcastTable from './BroadcastTable';
import BroadcastDetailsDrawer from './BroadcastDetailsDrawer';
import CreateBroadcastModal from './CreateBroadcastModal';
import type { WhatsAppConfig, MetaTemplate } from './types';
import CustomDropdown from '../shared/CustomDropdown';

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

  // Creator modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [targetAudienceType, setTargetAudienceType] = useState<'all' | 'filtered' | 'manual'>('all');

  // Audience Filters
  const [filterLeadStage, setFilterLeadStage] = useState<string>('all');
  const [filterInterestStage, setFilterInterestStage] = useState<string>('all');
  const [filterConversionStage, setFilterConversionStage] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  // Manual Selection
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Message body state
  const [messageType, setMessageType] = useState<'text' | 'template'>('template');
  const [textMessage, setTextMessage] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [headerParam, setHeaderParam] = useState('');

  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const location = useLocation();

  useEffect(() => {
    const incomingIds = (location.state as any)?.selectedCustomerIds;
    if (Array.isArray(incomingIds) && incomingIds.length > 0) {
      setSelectedCustomerIds(incomingIds);
      setTargetAudienceType('manual');
      setShowCreateModal(true);
      setWizardStep(1);
    }
  }, [location.state]);

  useEffect(() => {
    loadData();
  }, []);

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

  // Filtered customer list based on selection criteria
  const getFilteredCustomers = (): Customer[] => {
    if (targetAudienceType === 'all') {
      return customers;
    }

    if (targetAudienceType === 'manual') {
      return customers.filter(
        (c) =>
          selectedCustomerIds.includes(c.id) ||
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)
      );
    }

    return customers.filter((c) => {
      const leadMatch = filterLeadStage === 'all' || c.lead_stage === filterLeadStage;
      const interestMatch = filterInterestStage === 'all' || c.interest_stage === filterInterestStage;
      const conversionMatch =
        filterConversionStage === 'all' || c.conversion_stage === filterConversionStage;
      const langMatch = filterLanguage === 'all' || c.language === filterLanguage;
      return leadMatch && interestMatch && conversionMatch && langMatch;
    });
  };

  const getTargetRecipientsCount = (): number => {
    if (targetAudienceType === 'all') return customers.length;
    if (targetAudienceType === 'manual') return selectedCustomerIds.length;
    return getFilteredCustomers().length;
  };

  const getSelectedTemplate = (): MetaTemplate | undefined => {
    return metaTemplates.find((t) => t.name === selectedTemplateName);
  };

  // Watch template change and initialize parameter inputs
  useEffect(() => {
    const template = getSelectedTemplate();
    if (template) {
      const bodyComp = template.components.find((c) => c.type === 'BODY');
      if (bodyComp?.text) {
        const matches = bodyComp.text.match(/\{\{\d+\}\}/g) || [];
        const uniqueCount = new Set(matches).size;
        setTemplateParams(Array(uniqueCount).fill(''));
      } else {
        setTemplateParams([]);
      }

      const headerComp = template.components.find((c) => c.type === 'HEADER');
      if (headerComp?.text && headerComp.text.includes('{{1}}')) {
        setHeaderParam('');
      } else {
        setHeaderParam('');
      }
    } else {
      setTemplateParams([]);
      setHeaderParam('');
    }
  }, [selectedTemplateName]);

  const handleTemplateParamChange = (index: number, val: string) => {
    setTemplateParams((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleToggleCustomerSelection = (id: number) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSelectAllManualCustomers = () => {
    const list = customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch)
      )
      .map((c) => c.id);
    setSelectedCustomerIds(list);
  };

  const handleClearManualSelection = () => {
    setSelectedCustomerIds([]);
  };

  const handleCreateCampaign = async () => {
    const targetCount = getTargetRecipientsCount();
    if (targetCount === 0) {
      toast('No recipients selected!', 'warning');
      return;
    }

    if (messageType === 'template' && !selectedTemplateName) {
      toast('Please select a template!', 'warning');
      return;
    }

    if (messageType === 'text' && !textMessage.trim()) {
      toast('Please compose a message!', 'warning');
      return;
    }

    if (messageType === 'template' && agent && agent.credits < targetCount * 0.01) {
      toast('Insufficient credits for this broadcast. Please add credits first.', 'error');
      return;
    }

    if (
      !(await dlgConfirm(
        `Are you sure you want to send this broadcast to ${targetCount} customers?`
      ))
    ) {
      return;
    }

    setSubmittingCampaign(true);
    try {
      const recipients =
        targetAudienceType === 'all'
          ? customers.map((c) => c.id)
          : targetAudienceType === 'manual'
          ? selectedCustomerIds
          : getFilteredCustomers().map((c) => c.id);

      const payload: any = {
        name: campaignName,
        message_type: messageType,
        recipient_ids: recipients,
      };

      if (messageType === 'text') {
        payload.message = textMessage.trim();
      } else {
        payload.template_name = selectedTemplateName;
        const selectedTemplate = getSelectedTemplate();
        if (selectedTemplate) {
          payload.template_language = selectedTemplate.language;
        }
        if (templateParams.length > 0) {
          payload.template_params = templateParams.map((p) => ({
            type: 'text',
            text: p,
          }));
        }
        if (headerParam) {
          payload.header_params = [
            {
              type: 'text',
              text: headerParam,
            },
          ];
        }
      }

      const res = await createBroadcast(payload);
      if (res.success) {
        setShowCreateModal(false);
        setCampaignName('');
        setWizardStep(1);
        setTargetAudienceType('all');
        setSelectedCustomerIds([]);
        setTextMessage('');
        setSelectedTemplateName('');
        setTemplateParams([]);
        setHeaderParam('');

        toast('Broadcast campaign launched successfully!', 'success');
        loadData();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to launch campaign', 'error');
    } finally {
      setSubmittingCampaign(false);
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
      {error && (
        <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl text-xs text-[#EF4444]">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      <BroadcastSummaryCards broadcasts={broadcasts} />

      {/* Toolbar */}
      <div className="bg-white rounded-[20px] p-3.5 sm:p-4 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]"
          />
          <input
            type="text"
            placeholder="Search campaigns by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[#F4F7F4] border border-transparent rounded-full text-xs text-[#16281D] placeholder-[#71717A] outline-none focus:border-[#9FE870] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <CustomDropdown
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: "all", label: "All Statuses" },
              { value: "pending", label: "Pending" },
              { value: "processing", label: "Processing" },
              { value: "completed", label: "Completed" },
              { value: "failed", label: "Failed" },
            ]}
            minWidth={130}
          />

          <CustomDropdown
            value={typeFilter}
            onChange={(val) => setTypeFilter(val)}
            options={[
              { value: "all", label: "All Types" },
              { value: "text", label: "Text" },
              { value: "template", label: "Template" },
            ]}
            minWidth={120}
          />

          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-semibold text-[#16281D] transition-colors cursor-pointer border border-[#EAEAEA]"
            title="Refresh Broadcasts"
          >
            <RefreshCw size={13} /> Refresh
          </button>

          <button
            onClick={() => {
              setWizardStep(1);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-xs font-bold text-[#16281D] shadow-[0_4px_16px_rgba(159,232,112,0.3)] transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border-0"
          >
            <Plus size={14} /> Create Broadcast
          </button>
        </div>
      </div>

      {/* Main Table */}
      <BroadcastTable
        broadcasts={filteredBroadcasts}
        onViewDetails={handleViewDetails}
        onResendFailed={handleResendFailed}
        onDelete={handleDeleteBroadcast}
        onCreateClick={() => {
          setWizardStep(1);
          setShowCreateModal(true);
        }}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
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
        wizardStep={wizardStep}
        setWizardStep={setWizardStep}
        campaignName={campaignName}
        setCampaignName={setCampaignName}
        targetAudienceType={targetAudienceType}
        setTargetAudienceType={setTargetAudienceType}
        filterLeadStage={filterLeadStage}
        setFilterLeadStage={setFilterLeadStage}
        filterInterestStage={filterInterestStage}
        setFilterInterestStage={setFilterInterestStage}
        filterConversionStage={filterConversionStage}
        setFilterConversionStage={setFilterConversionStage}
        filterLanguage={filterLanguage}
        setFilterLanguage={setFilterLanguage}
        customers={customers}
        selectedCustomerIds={selectedCustomerIds}
        customerSearch={customerSearch}
        setCustomerSearch={setCustomerSearch}
        onToggleCustomerSelection={handleToggleCustomerSelection}
        onSelectAllManualCustomers={handleSelectAllManualCustomers}
        onClearManualSelection={handleClearManualSelection}
        targetRecipientsCount={getTargetRecipientsCount()}
        messageType={messageType}
        setMessageType={setMessageType}
        textMessage={textMessage}
        setTextMessage={setTextMessage}
        selectedTemplateName={selectedTemplateName}
        setSelectedTemplateName={setSelectedTemplateName}
        metaTemplates={metaTemplates}
        selectedTemplate={getSelectedTemplate()}
        templateParams={templateParams}
        onTemplateParamChange={handleTemplateParamChange}
        agent={agent}
        submittingCampaign={submittingCampaign}
        onSubmit={handleCreateCampaign}
      />
    </div>
  );
};

export default BroadcastsPage;
