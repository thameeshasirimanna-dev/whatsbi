import React, { useState, useEffect } from 'react';
import { getCurrentAgent } from "../../../lib/agent";
import { getToken } from "../../../lib/auth";
import { getCustomers, getBroadcasts, getBroadcastDetails, createBroadcast, deleteBroadcast, Customer, Broadcast, BroadcastRecipient } from "../../../lib/api";
import { Plus, RefreshCw, Eye, Send, CheckCircle, XCircle, AlertCircle, Info, Coins, Users, Calendar, ArrowRight, ArrowLeft, Search, Trash2 } from "lucide-react";
import { useDialog } from "../shared/DialogProvider";
import { SkeletonPage } from "../shared/Skeleton";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
  paddingRight: 24,
};

const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

interface WhatsAppConfig {
  business_account_id: string;
  phone_number_id: string;
  api_key: string;
}

interface MetaTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  components: Array<{
    type: string;
    text?: string;
    format?: string;
  }>;
}

const getStatusStyle = (status: string): React.CSSProperties => {
  const s = status.toLowerCase();
  if (s === 'completed') return { background: 'rgba(34,197,94,0.1)', color: '#059669' };
  if (s === 'processing') return { background: 'rgba(59,130,246,0.1)', color: '#2563eb' };
  if (s === 'pending') return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
  if (s === 'failed') return { background: 'rgba(244,63,94,0.08)', color: '#f43f5e' };
  return { background: '#f4f4f5', color: '#71717a' };
};

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

  // Creator state
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
        // Fetch current user first to get their config
        const userResp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-current-user`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` }
        });
        const userData = await userResp.json();
        
        if (userData.success && userData.user) {
          const configResp = await fetch(
            `${import.meta.env.VITE_BACKEND_URL}/get-whatsapp-config?user_id=${userData.user.id}`,
            {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );
          if (configResp.ok) {
            const configData = await configResp.json();
            if (configData.success && configData.whatsapp_config) {
              const whatsappConfig = configData.whatsapp_config[0] || configData.whatsapp_config;
              setConfig(whatsappConfig);
              
              // Fetch message templates from Meta Graph API
              try {
                const metaResp = await fetch(
                  `https://graph.facebook.com/v20.0/${whatsappConfig.business_account_id}/message_templates`,
                  {
                    method: "GET",
                    headers: { Authorization: `Bearer ${whatsappConfig.api_key}` }
                  }
                );
                if (metaResp.ok) {
                  const metaData = await metaResp.json();
                  const approvedTemplates = metaData.data.filter((t: any) => t.status === 'APPROVED');
                  setMetaTemplates(approvedTemplates);
                }
              } catch (metaErr) {
                console.error("Failed to load Meta templates:", metaErr);
              }
            }
          }
        }
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to load broadcasts data");
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      const bData = await getBroadcasts();
      setBroadcasts(bData);
      
      const currentAgent = await getCurrentAgent();
      setAgent(currentAgent);
    } catch (err: any) {
      console.error("Failed to refresh:", err);
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
      console.error("Failed to fetch broadcast details:", err);
      setLoadingDetails(false);
    }
  };

  const handleResendFailed = async (broadcast: Broadcast) => {
    if (broadcast.failed_count === 0) {
      toast("No failed recipients to resend!", "warning");
      return;
    }

    if (broadcast.message_type === 'template' && agent && agent.credits < broadcast.failed_count * 0.01) {
      toast("Insufficient credits to resend to failed recipients!", "error");
      return;
    }

    if (!await dlgConfirm(`Are you sure you want to resend to the ${broadcast.failed_count} failed recipients in this campaign?`)) {
      return;
    }

    try {
      const res = await createBroadcast({
        action: 'resend',
        broadcast_id: broadcast.id
      });
      if (res.success) {
        if (selectedBroadcast?.id === broadcast.id) {
          setShowDetailsDrawer(false);
          setSelectedBroadcast(null);
        }
        toast("Broadcast resend started successfully!", "success");
        loadData();
      }
    } catch (err: any) {
      toast(err.message || "Failed to resend broadcast", "error");
    }
  };

  const handleDeleteBroadcast = async (broadcast: Broadcast) => {
    if (broadcast.status === 'processing') {
      toast("Cannot delete a campaign that is currently processing messages.", "warning");
      return;
    }

    if (!await dlgConfirm(`Are you sure you want to delete the campaign "${broadcast.name}"? This action cannot be undone and will delete all recipient logs.`, { danger: true, confirmLabel: "Delete" })) {
      return;
    }

    try {
      const res = await deleteBroadcast(broadcast.id);
      if (res.success) {
        if (selectedBroadcast?.id === broadcast.id) {
          setShowDetailsDrawer(false);
          setSelectedBroadcast(null);
        }
        toast("Campaign deleted successfully!", "success");
        loadData();
      }
    } catch (err: any) {
      toast(err.message || "Failed to delete campaign", "error");
    }
  };

  // Filtered customer list based on selection criteria
  const getFilteredCustomers = (): Customer[] => {
    if (targetAudienceType === 'all') {
      return customers;
    }
    
    if (targetAudienceType === 'manual') {
      return customers.filter(c => 
        selectedCustomerIds.includes(c.id) || 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      );
    }

    return customers.filter(c => {
      const leadMatch = filterLeadStage === 'all' || c.lead_stage === filterLeadStage;
      const interestMatch = filterInterestStage === 'all' || c.interest_stage === filterInterestStage;
      const conversionMatch = filterConversionStage === 'all' || c.conversion_stage === filterConversionStage;
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
    return metaTemplates.find(t => t.name === selectedTemplateName);
  };

  // Watch template change and initialize parameter inputs
  useEffect(() => {
    const template = getSelectedTemplate();
    if (template) {
      const bodyComp = template.components.find(c => c.type === 'BODY');
      if (bodyComp?.text) {
        // Find matches of {{1}}, {{2}}...
        const matches = bodyComp.text.match(/\{\{\d+\}\}/g) || [];
        const uniqueCount = new Set(matches).size;
        setTemplateParams(Array(uniqueCount).fill(''));
      } else {
        setTemplateParams([]);
      }

      const headerComp = template.components.find(c => c.type === 'HEADER');
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
    setTemplateParams(prev => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  };

  const handleToggleCustomerSelection = (id: number) => {
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleSelectAllManualCustomers = () => {
    const list = customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
    ).map(c => c.id);
    setSelectedCustomerIds(list);
  };

  const handleClearManualSelection = () => {
    setSelectedCustomerIds([]);
  };

  const handleCreateCampaign = async () => {
    const targetCount = getTargetRecipientsCount();
    if (targetCount === 0) {
      toast("No recipients selected!", "warning");
      return;
    }

    if (messageType === 'template' && !selectedTemplateName) {
      toast("Please select a template!", "warning");
      return;
    }

    if (messageType === 'text' && !textMessage.trim()) {
      toast("Please compose a message!", "warning");
      return;
    }

    if (messageType === 'template' && agent && agent.credits < targetCount * 0.01) {
      toast("Insufficient credits for this broadcast. Please add credits first.", "error");
      return;
    }

    if (!await dlgConfirm(`Are you sure you want to send this broadcast to ${targetCount} customers?`)) {
      return;
    }

    setSubmittingCampaign(true);
    try {
      const recipients = targetAudienceType === 'all' 
        ? customers.map(c => c.id)
        : targetAudienceType === 'manual'
          ? selectedCustomerIds
          : getFilteredCustomers().map(c => c.id);

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
          payload.template_params = templateParams.map(p => ({
            type: 'text',
            text: p
          }));
        }
        if (headerParam) {
          payload.header_params = [{
            type: 'text',
            text: headerParam
          }];
        }
      }

      const res = await createBroadcast(payload);
      if (res.success) {
        setShowCreateModal(false);
        // Reset state
        setCampaignName('');
        setWizardStep(1);
        setTargetAudienceType('all');
        setSelectedCustomerIds([]);
        setTextMessage('');
        setSelectedTemplateName('');
        setTemplateParams([]);
        setHeaderParam('');
        
        // Refresh list
        loadData();
      }
    } catch (err: any) {
      toast(err.message || "Failed to launch campaign", "error");
    } finally {
      setSubmittingCampaign(false);
    }
  };

  // Summary Metrics calculations
  const totalCampaigns = broadcasts.length;
  const totalSent = broadcasts.reduce((acc, curr) => acc + curr.sent_count, 0);
  const totalFailed = broadcasts.reduce((acc, curr) => acc + curr.failed_count, 0);
  const overallDeliveryRate = totalSent + totalFailed > 0 
    ? Math.round((totalSent / (totalSent + totalFailed)) * 100) 
    : 100;

  const filteredBroadcasts = broadcasts.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status.toLowerCase() === statusFilter;
    const matchesType = typeFilter === 'all' || b.message_type.toLowerCase() === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Summary Cards at the top */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #ebebeb', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#71717a' }}>
            <span style={{ ...DM, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Campaigns</span>
            <Send size={15} />
          </div>
          <div style={{ ...SYNE, fontSize: 24, fontWeight: 800, color: '#0c1a0e', marginTop: 8 }}>{totalCampaigns}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #ebebeb', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#22c55e' }}>
            <span style={{ ...DM, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a' }}>Total Sent</span>
            <CheckCircle size={15} />
          </div>
          <div style={{ ...SYNE, fontSize: 24, fontWeight: 800, color: '#0c1a0e', marginTop: 8 }}>{totalSent}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #ebebeb', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#f43f5e' }}>
            <span style={{ ...DM, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a' }}>Total Failed</span>
            <XCircle size={15} />
          </div>
          <div style={{ ...SYNE, fontSize: 24, fontWeight: 800, color: '#0c1a0e', marginTop: 8 }}>{totalFailed}</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #ebebeb', padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#22c55e' }}>
            <span style={{ ...DM, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a' }}>Delivery Rate</span>
            <Info size={15} />
          </div>
          <div style={{ ...SYNE, fontSize: 24, fontWeight: 800, color: '#0c1a0e', marginTop: 8 }}>{overallDeliveryRate}%</div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e' }}>
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '14px 18px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search campaign by name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 32 }}
            onFocus={onFocusG} onBlur={onBlurG}
          />
        </div>

        {/* Status Filter */}
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 140 }} onFocus={onFocusG} onBlur={onBlurG}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        {/* Message Type Filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...selectStyle, width: 'auto', minWidth: 140 }} onFocus={onFocusG} onBlur={onBlurG}>
          <option value="all">All Types</option>
          <option value="text">Text</option>
          <option value="template">Template</option>
        </select>

        {/* Refresh */}
        <button onClick={handleRefresh}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#3f3f46', border: '1px solid #ebebeb', borderRadius: 9, padding: '9px 14px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
          <RefreshCw size={13} /> Refresh
        </button>

        {/* Create Broadcast */}
        <button onClick={() => { setWizardStep(1); setShowCreateModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 14px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.2)' }}>
          <Plus size={14} /> Create Broadcast
        </button>
      </div>

      {/* Campaigns Table Card */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        {filteredBroadcasts.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? <Search size={20} style={{ color: '#a1a1aa' }} /> : <Send size={20} style={{ color: '#a1a1aa' }} />}
            </div>
            <div style={{ ...SYNE, fontSize: 15, fontWeight: 600, color: '#0c1a0e', marginBottom: 6 }}>
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? "No campaigns found" : "No broadcasts sent yet"}
            </div>
            <div style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 20 }}>
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? "Try adjusting your search query or filters." : "Launch your first broadcast campaign to reach your customers."}
            </div>
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' ? (
              <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#3f3f46', border: '1px solid #ebebeb', borderRadius: 9, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Clear Filters
              </button>
            ) : (
              <button onClick={() => { setWizardStep(1); setShowCreateModal(true); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.2)' }}>
                <Plus size={14} /> Create Broadcast
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', ...DM }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #ebebeb' }}>
                  {['Campaign Name', 'Date', 'Type', 'Recipients', 'Delivery Progress', 'Status', 'Actions'].map((h, i) => (
                    <th key={h} style={{ padding: '12px 16px', fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i === 6 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredBroadcasts.map((b) => {
                  const deliveryRate = b.total_recipients > 0 ? Math.round((b.sent_count / b.total_recipients) * 100) : 0;
                  return (
                    <tr key={b.id} style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.01)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '16px', fontWeight: 600, color: '#0c1a0e' }}>{b.name}</td>
                      <td style={{ padding: '16px', color: '#71717a', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={13} />
                          <span>{new Date(b.created_at).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px', textTransform: 'capitalize', fontSize: 13 }}>
                        <span style={{ background: b.message_type === 'template' ? 'rgba(124,58,237,0.1)' : 'rgba(8,145,178,0.1)', color: b.message_type === 'template' ? '#7c3aed' : '#0891b2', padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                          {b.message_type}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontWeight: 500 }}>{b.total_recipients}</td>
                      <td style={{ padding: '16px', minWidth: 150 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#71717a' }}>
                          <div style={{ flex: 1, height: 6, background: '#f4f4f5', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${deliveryRate}%`, height: '100%', background: b.status === 'failed' ? '#ef4444' : '#22c55e', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{b.sent_count}/{b.total_recipients}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 20, ...getStatusStyle(b.status) }}>
                          {b.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {b.failed_count > 0 && (b.status === 'completed' || b.status === 'failed') && (
                            <button onClick={() => handleResendFailed(b)} title="Resend Failed"
                              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                            >
                              <RefreshCw size={14} style={{ color: '#ef4444' }} />
                            </button>
                          )}
                          <button onClick={() => handleViewDetails(b)} title="View Details"
                            style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.15)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.08)')}
                          >
                            <Eye size={14} style={{ color: '#22c55e' }} />
                          </button>
                          {b.status !== 'processing' && (
                            <button onClick={() => handleDeleteBroadcast(b)} title="Delete Campaign"
                              style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.04)', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.12)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.04)')}
                            >
                              <Trash2 size={14} style={{ color: '#ef4444' }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-out details drawer */}
      {showDetailsDrawer && selectedBroadcast && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 90 }} onClick={() => setShowDetailsDrawer(false)} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 500, background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', zIndex: 100, display: 'flex', flexDirection: 'column', ...DM }}>
            {/* Drawer Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campaign details</span>
                <h2 style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e', margin: '4px 0 0' }}>{selectedBroadcast.name}</h2>
              </div>
              <button onClick={() => setShowDetailsDrawer(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#71717a', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, background: '#fafafa', padding: 16, borderRadius: 10 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#71717a' }}>Status</span>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, ...getStatusStyle(selectedBroadcast.status) }}>
                      {selectedBroadcast.status}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#71717a' }}>Type</span>
                  <div style={{ marginTop: 4, textTransform: 'capitalize', fontSize: 13, fontWeight: 600 }}>{selectedBroadcast.message_type}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#71717a' }}>Sent count</span>
                  <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: '#22c55e' }}>{selectedBroadcast.sent_count} / {selectedBroadcast.total_recipients}</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#71717a' }}>Failed count</span>
                  <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: '#f43f5e' }}>{selectedBroadcast.failed_count}</div>
                </div>
              </div>

              {selectedBroadcast.failed_count > 0 && (selectedBroadcast.status === 'completed' || selectedBroadcast.status === 'failed') && (
                <button onClick={() => handleResendFailed(selectedBroadcast)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 14px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(239,68,68,0.2)' }}>
                  <RefreshCw size={13} /> Resend Failed Messages
                </button>
              )}

              {selectedBroadcast.status !== 'processing' && (
                <button onClick={() => handleDeleteBroadcast(selectedBroadcast)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: 9, padding: '10px 14px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s', marginTop: selectedBroadcast.failed_count > 0 ? 8 : 0 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  <Trash2 size={13} /> Delete Broadcast Campaign
                </button>
              )}

              {selectedBroadcast.message_type === 'template' ? (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#71717a' }}>WhatsApp Template Name</span>
                  <div style={{ marginTop: 6, padding: '8px 12px', background: '#f4f4f5', borderRadius: 8, fontSize: 13, fontFamily: 'monospace' }}>{selectedBroadcast.template_name}</div>
                </div>
              ) : (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#71717a' }}>Message body</span>
                  <div style={{ marginTop: 6, padding: 12, background: '#f4f4f5', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap' }}>{selectedBroadcast.message}</div>
                </div>
              )}

              {/* Recipient list */}
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#71717a', display: 'block', marginBottom: 10 }}>Recipient Delivery Log</span>
                {loadingDetails ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#71717a' }}>Loading recipients log...</div>
                ) : !selectedBroadcast.recipients || selectedBroadcast.recipients.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#71717a', fontStyle: 'italic' }}>No log details found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedBroadcast.recipients.map((rec) => (
                      <div key={rec.id} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, fontSize: 13 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0c1a0e' }}>{rec.customer_name || 'Unknown Contact'}</div>
                          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{rec.phone}</div>
                          {rec.error_message && (
                            <div style={{ fontSize: 11, color: '#f43f5e', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <AlertCircle size={10} />
                              <span>{rec.error_message}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 12, ...getStatusStyle(rec.status) }}>
                            {rec.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Creation Wizard Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, ...DM }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} onClick={() => setShowCreateModal(false)} />
          <div style={{ position: 'relative', background: '#fff', borderRadius: 16, width: '90%', maxWidth: 650, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e', margin: 0 }}>Create WhatsApp Broadcast</h2>
                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, fontWeight: 600, color: '#a1a1aa' }}>
                  <span style={{ color: wizardStep === 1 ? '#22c55e' : undefined }}>1. Audience Selection</span>
                  <span style={{ color: wizardStep === 2 ? '#22c55e' : undefined }}>2. Message Composer</span>
                  <span style={{ color: wizardStep === 3 ? '#22c55e' : undefined }}>3. Confirm & Preview</span>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#71717a', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {/* STEP 1 */}
              {wizardStep === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#71717a', display: 'block', marginBottom: 6 }}>Campaign Name</label>
                    <input type="text" placeholder="e.g. June Promotional Offer" value={campaignName} onChange={e => setCampaignName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d4d4d8', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#71717a', display: 'block', marginBottom: 8 }}>Target Audience Selection</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {['all', 'filtered', 'manual'].map((type) => (
                        <button key={type} onClick={() => setTargetAudienceType(type as any)}
                          style={{ flex: 1, padding: 10, background: targetAudienceType === type ? 'rgba(34,197,94,0.08)' : '#fff', border: targetAudienceType === type ? '2px solid #22c55e' : '1px solid #d4d4d8', borderRadius: 8, fontSize: 13, fontWeight: 600, color: targetAudienceType === type ? '#059669' : '#3f3f46', cursor: 'pointer', textTransform: 'capitalize' }}>
                          {type === 'all' ? 'All Customers' : type === 'filtered' ? 'By Segments' : 'Manual Pick'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {targetAudienceType === 'filtered' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#fafafa', padding: 16, borderRadius: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }}>Lead Stage</label>
                        <select value={filterLeadStage} onChange={e => setFilterLeadStage(e.target.value)}
                          style={{ width: '100%', padding: 8, border: '1px solid #d4d4d8', borderRadius: 6, fontSize: 12 }}>
                          <option value="all">All Stages</option>
                          <option value="New Lead">New Lead</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Not Responding">Not Responding</option>
                          <option value="Follow-up Needed">Follow-up Needed</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }}>Conversion Stage</label>
                        <select value={filterConversionStage} onChange={e => setFilterConversionStage(e.target.value)}
                          style={{ width: '100%', padding: 8, border: '1px solid #d4d4d8', borderRadius: 6, fontSize: 12 }}>
                          <option value="all">All Stages</option>
                          <option value="Payment Pending">Payment Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Order Confirmed">Order Confirmed</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }}>Interest Stage</label>
                        <select value={filterInterestStage} onChange={e => setFilterInterestStage(e.target.value)}
                          style={{ width: '100%', padding: 8, border: '1px solid #d4d4d8', borderRadius: 6, fontSize: 12 }}>
                          <option value="all">All Stages</option>
                          <option value="Interested">Interested</option>
                          <option value="Quotation Sent">Quotation Sent</option>
                          <option value="Asked for More Info">Asked for More Info</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: '#71717a', display: 'block', marginBottom: 4 }}>Language</label>
                        <select value={filterLanguage} onChange={e => setFilterLanguage(e.target.value)}
                          style={{ width: '100%', padding: 8, border: '1px solid #d4d4d8', borderRadius: 6, fontSize: 12 }}>
                          <option value="all">All Languages</option>
                          <option value="en">English</option>
                          <option value="si">Sinhala</option>
                          <option value="ta">Tamil</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {targetAudienceType === 'manual' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#fafafa', padding: 16, borderRadius: 10 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="text" placeholder="Search customer by name or phone..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)}
                          style={{ flex: 1, padding: 8, border: '1px solid #d4d4d8', borderRadius: 6, fontSize: 12 }} />
                        <button onClick={handleSelectAllManualCustomers} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d4d4d8', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Select All</button>
                        <button onClick={handleClearManualSelection} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d4d4d8', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Clear</button>
                      </div>
                      
                      <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #ebebeb', borderRadius: 6, background: '#fff', padding: 4 }}>
                        {customers.filter(c => 
                          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.phone.includes(customerSearch)
                        ).map((c) => (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderBottom: '1px solid #f4f4f5' }}>
                            <input type="checkbox" checked={selectedCustomerIds.includes(c.id)} onChange={() => handleToggleCustomerSelection(c.id)} style={{ cursor: 'pointer' }} />
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{c.name} ({c.phone})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', padding: 12, borderRadius: 10, fontSize: 13, color: '#059669' }}>
                    <Users size={16} />
                    <span style={{ fontWeight: 600 }}>{getTargetRecipientsCount()} recipients currently selected.</span>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {wizardStep === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#71717a', display: 'block', marginBottom: 8 }}>Message Format Type</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setMessageType('template')}
                        style={{ flex: 1, padding: 10, background: messageType === 'template' ? 'rgba(34,197,94,0.08)' : '#fff', border: messageType === 'template' ? '2px solid #22c55e' : '1px solid #d4d4d8', borderRadius: 8, fontSize: 13, fontWeight: 600, color: messageType === 'template' ? '#059669' : '#3f3f46', cursor: 'pointer' }}>
                        Approved WhatsApp Template
                      </button>
                      <button onClick={() => setMessageType('text')}
                        style={{ flex: 1, padding: 10, background: messageType === 'text' ? 'rgba(34,197,94,0.08)' : '#fff', border: messageType === 'text' ? '2px solid #22c55e' : '1px solid #d4d4d8', borderRadius: 8, fontSize: 13, fontWeight: 600, color: messageType === 'text' ? '#059669' : '#3f3f46', cursor: 'pointer' }}>
                        Free Form Text Message
                      </button>
                    </div>
                  </div>

                  {messageType === 'text' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.15)', padding: 12, borderRadius: 10, fontSize: 12, color: '#d97706', marginBottom: 12 }}>
                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        <span><strong>Warning:</strong> WhatsApp restricts free-text messages to customers who have messaged you in the last 24 hours. Messages to other recipients will fail to deliver.</span>
                      </div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#71717a', display: 'block', marginBottom: 6 }}>Message Body</label>
                      <textarea rows={6} placeholder="Compose your text broadcast here..." value={textMessage} onChange={e => setTextMessage(e.target.value)}
                        style={{ width: '100%', padding: 12, border: '1px solid #d4d4d8', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical' }} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#71717a', display: 'block', marginBottom: 6 }}>Select Template</label>
                        <select value={selectedTemplateName} onChange={e => setSelectedTemplateName(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d4d4d8', borderRadius: 8, fontSize: 13 }}>
                          <option value="">-- Choose a template --</option>
                          {metaTemplates.map(t => (
                            <option key={t.name} value={t.name}>{t.name} ({t.category})</option>
                          ))}
                        </select>
                      </div>

                      {selectedTemplateName && getSelectedTemplate() && (
                        <div style={{ background: '#fafafa', padding: 16, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Template Body Preview</span>
                            <div style={{ marginTop: 6, padding: 12, background: '#fff', border: '1px solid #ebebeb', borderRadius: 8, fontSize: 13, color: '#0c1a0e', whiteSpace: 'pre-wrap' }}>
                              {getSelectedTemplate()?.components.find(c => c.type === 'BODY')?.text}
                            </div>
                          </div>

                          {/* Dynamic variables inputs */}
                          {templateParams.length > 0 && (
                            <div>
                              <span style={{ fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Template Variable Inputs</span>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {templateParams.map((param, index) => (
                                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, width: 60 }}>{"{{" + (index + 1) + "}}"}</span>
                                    <input type="text" placeholder={`Value for variable ${index + 1}`} value={param} onChange={e => handleTemplateParamChange(index, e.target.value)}
                                      style={{ flex: 1, padding: 8, border: '1px solid #d4d4d8', borderRadius: 6, fontSize: 12 }} />
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
              )}

              {/* STEP 3 */}
              {wizardStep === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ background: '#fafafa', padding: 20, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ borderBottom: '1px solid #ebebeb', paddingBottom: 10 }}>
                      <span style={{ fontSize: 11, color: '#71717a' }}>Campaign Name</span>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0c1a0e', marginTop: 2 }}>{campaignName || 'Unnamed Campaign'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#71717a' }}>Target Audience size</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0c1a0e', marginTop: 2 }}>{getTargetRecipientsCount()} recipients</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#71717a' }}>Message Format Type</span>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0c1a0e', marginTop: 2, textTransform: 'capitalize' }}>{messageType}</div>
                    </div>

                    {messageType === 'template' ? (
                      <>
                        <div>
                          <span style={{ fontSize: 11, color: '#71717a' }}>WhatsApp Template</span>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0c1a0e', marginTop: 2 }}>{selectedTemplateName}</div>
                        </div>
                        {templateParams.length > 0 && (
                          <div>
                            <span style={{ fontSize: 11, color: '#71717a' }}>Variables values</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                              {templateParams.map((p, i) => (
                                <div key={i} style={{ fontSize: 12, color: '#3f3f46' }}>
                                  <strong style={{ fontFamily: 'monospace' }}>{"{{" + (i + 1) + "}}"}:</strong> {p || <span style={{ color: '#ef4444' }}>Empty</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <span style={{ fontSize: 11, color: '#71717a' }}>Message Body</span>
                        <div style={{ fontSize: 13, background: '#fff', border: '1px solid #ebebeb', borderRadius: 8, padding: 12, whiteSpace: 'pre-wrap', marginTop: 4 }}>{textMessage}</div>
                      </div>
                    )}
                  </div>

                  {/* Credit Check Card */}
                  {messageType === 'template' && agent && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #ebebeb', borderRadius: 12, padding: 16, background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Coins size={20} style={{ color: '#d97706' }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>Credit Estimation</div>
                          <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>Est. Cost: ${(getTargetRecipientsCount() * 0.01).toFixed(2)} ($0.01/template)</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>Your Balance</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: agent.credits >= getTargetRecipientsCount() * 0.01 ? '#22c55e' : '#f43f5e', marginTop: 2 }}>${parseFloat(agent.credits).toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #ebebeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
              <div>
                {wizardStep > 1 ? (
                  <button onClick={() => setWizardStep(prev => prev - 1)} disabled={submittingCampaign}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#3f3f46', border: '1px solid #d4d4d8', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <ArrowLeft size={14} /> Back
                  </button>
                ) : (
                  <div />
                )}
              </div>
              <div>
                {wizardStep < 3 ? (
                  <button onClick={() => setWizardStep(prev => prev + 1)} disabled={wizardStep === 1 && !campaignName.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (wizardStep === 1 && !campaignName.trim()) ? 0.6 : 1 }}>
                    Next <ArrowRight size={14} />
                  </button>
                ) : (
                  <button onClick={handleCreateCampaign} disabled={submittingCampaign}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)' }}>
                    <Send size={14} /> {submittingCampaign ? 'Launching...' : 'Send Broadcast'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BroadcastsPage;
