import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createBroadcast, Customer } from '../../../lib/api';
import { getToken } from '../../../lib/auth';
import { useDialog } from '../shared/DialogProvider';
import type { MetaTemplate } from './types';
import type { BroadcastMediaHeader } from './BroadcastMediaUploader';
import { fetchCustomerGroups } from '../customers/groups/customerGroupsApi';
import {
  calculateSmsParts,
  isValidPhoneNumber,
  isCustomerWithin24Hours,
  uploadBroadcastMedia,
  filterBroadcastCustomers,
} from './broadcastHelpers';

interface UseBroadcastWizardProps {
  customers: Customer[];
  agent: any;
  metaTemplates: MetaTemplate[];
  smsSenderId?: string;
  smsApiToken?: string;
  onSuccess: () => void;
  isOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
}

export function useBroadcastWizard({
  customers,
  agent,
  metaTemplates,
  smsSenderId,
  smsApiToken,
  onSuccess,
  onOpenModal,
  onCloseModal,
}: UseBroadcastWizardProps) {
  const { confirm: dlgConfirm, toast } = useDialog();
  const location = useLocation();

  const [wizardStep, setWizardStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [targetAudienceType, setTargetAudienceType] = useState<'all' | 'filtered' | 'group' | 'manual'>('all');

  // Channel selection: 'whatsapp' or 'sms'
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [smsMessage, setSmsMessage] = useState('Hello {first_name}, check out our latest offers today!');

  // Group targeting
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [customerGroups, setCustomerGroups] = useState<{ id: number; name: string; member_count?: number; color?: string }[]>([]);

  // Filter targeting
  const [filterLeadStage, setFilterLeadStage] = useState<string>('all');
  const [filterInterestStage, setFilterInterestStage] = useState<string>('all');
  const [filterConversionStage, setFilterConversionStage] = useState<string>('all');
  const [filterLanguage, setFilterLanguage] = useState<string>('all');

  // Manual Selection
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Message body
  const [messageType, setMessageType] = useState<'text' | 'template'>('template');
  const [textMessage, setTextMessage] = useState('Hello {first_name}, thank you for staying with us!');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [headerParam, setHeaderParam] = useState('');
  const [mediaHeader, setMediaHeader] = useState<BroadcastMediaHeader | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submittingCampaign, setSubmittingCampaign] = useState(false);

  const handleUploadMedia = async (file: File) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    setUploadingMedia(true);
    try {
      const uploaded = await uploadBroadcastMedia(file, token);
      setMediaHeader({
        type: 'image',
        id: uploaded.id,
        link: uploaded.link,
        filename: uploaded.filename,
      });
      toast('Poster image attached successfully!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to upload poster', 'error');
      throw err;
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSetMediaLink = (link: string) => {
    setMediaHeader({
      type: 'image',
      link,
      filename: link.split('/').pop() || 'Poster URL',
    });
    toast('Poster link attached successfully!', 'success');
  };

  const handleRemoveMedia = () => {
    setMediaHeader(null);
  };

  // Load customer groups
  useEffect(() => {
    fetchCustomerGroups()
      .then((res) => {
        if (res.groups) {
          setCustomerGroups(res.groups);
          const group24h = res.groups.find(
            (g: any) => g.name.toLowerCase() === 'within 24h active'
          );
          if (messageType === 'text' && channel === 'whatsapp' && group24h) {
            setSelectedGroupId(String(group24h.id));
            setTargetAudienceType('group');
          } else if (res.groups.length > 0 && !selectedGroupId) {
            setSelectedGroupId(String(res.groups[0].id));
          }
        }
      })
      .catch(() => {});
  }, [messageType, channel]);

  // When selecting free-form text on WhatsApp, automatically lock target audience to Within 24h Active group
  const handleSelectMessageType = (type: 'text' | 'template') => {
    setMessageType(type);
    if (type === 'text' && channel === 'whatsapp') {
      setTargetAudienceType('group');
      const group24h = customerGroups.find((g) => g.name.toLowerCase() === 'within 24h active');
      if (group24h) setSelectedGroupId(String(group24h.id));
      if (!campaignName.trim()) setCampaignName('WhatsApp Marketing (Within 24h Active)');
    }
  };

  const handleSetTargetAudienceType = (type: 'all' | 'filtered' | 'group' | 'manual') => {
    setTargetAudienceType(type);
    if (channel === 'whatsapp' && messageType === 'text' && type !== 'group') {
      setMessageType('template');
      toast('Switched to Meta Template: free-form messages require Within 24h Active group.', 'info');
    }
  };

  const handleSetSelectedGroupId = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (channel === 'whatsapp' && messageType === 'text') {
      const selected = customerGroups.find((g) => String(g.id) === groupId);
      if (selected && selected.name.toLowerCase() !== 'within 24h active') {
        setMessageType('template');
        toast('Switched to Meta Template: free-form messages require Within 24h Active group.', 'info');
      }
    }
  };

  const handleSetChannel = (newChannel: 'whatsapp' | 'sms') => {
    setChannel(newChannel);
    if (newChannel === 'whatsapp' && messageType === 'text') {
      setTargetAudienceType('group');
      const group24h = customerGroups.find((g) => g.name.toLowerCase() === 'within 24h active');
      if (group24h) setSelectedGroupId(String(group24h.id));
    }
  };

  // Handle incoming routing state (from Customers Page bulk selection or Customer Groups page)
  useEffect(() => {
    const incomingIds = (location.state as any)?.selectedCustomerIds;
    const incomingGroupId = (location.state as any)?.selectedGroupId;
    const groupName = (location.state as any)?.groupName;

    if (Array.isArray(incomingIds) && incomingIds.length > 0) {
      setSelectedCustomerIds(incomingIds);
      setTargetAudienceType('manual');
      onOpenModal();
      setWizardStep(1);
    } else if (incomingGroupId) {
      setSelectedGroupId(String(incomingGroupId));
      setTargetAudienceType('group');
      if (groupName) {
        setCampaignName(`Broadcast to ${groupName}`);
        if (groupName.toLowerCase() === 'within 24h active') setMessageType('text');
      }
      onOpenModal();
      setWizardStep(1);
    }
  }, [location.state]);

  const getSelectedTemplate = (): MetaTemplate | undefined => {
    return metaTemplates.find((t) => t.name === selectedTemplateName);
  };

  useEffect(() => {
    const template = getSelectedTemplate();
    const bodyText = template?.components?.find((c) => c.type === 'BODY')?.text;
    if (bodyText) {
      const matches = bodyText.match(/\{\{\d+\}\}/g) || [];
      setTemplateParams(Array(new Set(matches).size).fill(''));
    } else {
      setTemplateParams([]);
    }
    setHeaderParam('');
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

  const eligibleCustomers = useMemo(
    () =>
      filterBroadcastCustomers(customers, {
        channel,
        messageType,
        targetAudienceType,
        selectedGroupId,
        selectedCustomerIds,
        customerGroups,
        filterLeadStage,
        filterInterestStage,
        filterConversionStage,
        filterLanguage,
      }),
    [
      customers,
      channel,
      messageType,
      targetAudienceType,
      selectedGroupId,
      selectedCustomerIds,
      customerGroups,
      filterLeadStage,
      filterInterestStage,
      filterConversionStage,
      filterLanguage,
    ]
  );

  const validSmsRecipients = useMemo(() => {
    return eligibleCustomers.filter((c) => isValidPhoneNumber(c.phone || ''));
  }, [eligibleCustomers]);

  const invalidPhoneCount = eligibleCustomers.length - validSmsRecipients.length;

  // 24-Hour WhatsApp Service Window Partitioning
  const within24hRecipients = useMemo(() => {
    return eligibleCustomers.filter((c) => isCustomerWithin24Hours(c.last_user_message_time));
  }, [eligibleCustomers]);

  const blockedOutside24hRecipients = useMemo(() => {
    return eligibleCustomers.filter((c) => !isCustomerWithin24Hours(c.last_user_message_time));
  }, [eligibleCustomers]);

  const getTargetRecipientsCount = (): number => {
    if (channel === 'sms') {
      return validSmsRecipients.length;
    }
    if (messageType === 'text') {
      // WhatsApp Free-Form Text strictly delivers only to customers within 24h window
      return within24hRecipients.length;
    }
    return eligibleCustomers.length;
  };

  const smsPartsInfo = useMemo(() => calculateSmsParts(smsMessage), [smsMessage]);

  const estimatedCredits = useMemo(() => {
    const count = getTargetRecipientsCount();
    if (channel === 'sms') {
      return Number((count * Math.max(1, smsPartsInfo.parts) * 1.00).toFixed(2));
    }
    if (messageType === 'template') {
      return Number((count * 30.00).toFixed(2));
    }
    return 0;
  }, [channel, messageType, eligibleCustomers.length, validSmsRecipients.length, within24hRecipients.length, smsPartsInfo.parts]);

  const handleCreateCampaign = async () => {
    const targetCount = getTargetRecipientsCount();
    if (targetCount === 0) {
      if (channel === 'whatsapp' && messageType === 'text' && blockedOutside24hRecipients.length > 0) {
        toast('All selected customers are outside the 24-hour WhatsApp service window. Please switch to an Approved Meta Template or Normal SMS.', 'error');
      } else {
        toast('No eligible recipients selected!', 'warning');
      }
      return;
    }

    if (channel === 'sms') {
      if (!smsSenderId || !smsApiToken) {
        toast('Text.lk SMS Sender ID or API Token is not configured. Configure credentials in Super Admin.', 'error');
        return;
      }

      if (!smsMessage.trim()) {
        toast('Please compose an SMS message body!', 'warning');
        return;
      }

      const agentSmsCredits = Number(agent?.sms_credits || 0);
      if (agent && agentSmsCredits < estimatedCredits) {
        toast(`Insufficient SMS credits. Required: Rs. ${Math.round(estimatedCredits)}, Balance: Rs. ${Math.round(agentSmsCredits)}`, 'error');
        return;
      }
    } else {
      if (messageType === 'template' && !selectedTemplateName) {
        toast('Please select an approved Meta template!', 'warning');
        return;
      }

      if (messageType === 'text' && !textMessage.trim()) {
        toast('Please compose your message content!', 'warning');
        return;
      }

      const agentWaCredits = Number(agent?.credits || 0);
      if (messageType === 'template' && agent && agentWaCredits < estimatedCredits) {
        toast(`Insufficient WhatsApp credits. Required: Rs. ${Math.round(estimatedCredits)}, Balance: Rs. ${Math.round(agentWaCredits)}`, 'error');
        return;
      }
    }

    const confirmMessage =
      channel === 'whatsapp' && messageType === 'text' && blockedOutside24hRecipients.length > 0
        ? `Are you sure you want to send this WhatsApp free-text broadcast to ${targetCount} customer(s)? Note: ${blockedOutside24hRecipients.length} customer(s) outside 24h will be blocked.`
        : `Are you sure you want to send this ${channel === 'sms' ? 'SMS' : 'WhatsApp'} broadcast to ${targetCount} customers?`;

    if (!(await dlgConfirm(confirmMessage))) {
      return;
    }

    setSubmittingCampaign(true);
    try {
      const recipientIds =
        channel === 'sms'
          ? validSmsRecipients.map((c) => c.id)
          : messageType === 'text'
          ? within24hRecipients.map((c) => c.id)
          : eligibleCustomers.map((c) => c.id);

      const payload: any = {
        name: campaignName.trim(),
        channel,
        recipient_ids: recipientIds,
      };

      if (channel === 'sms') {
        payload.message_type = 'sms';
        payload.message = smsMessage.trim();
      } else {
        payload.message_type = messageType;
        if (messageType === 'text') {
          payload.message = textMessage.trim();
          if (mediaHeader) {
            payload.media_header = mediaHeader;
          }
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
      }

      const res = await createBroadcast(payload);
      if (res.success) {
        onCloseModal();
        setCampaignName('');
        setWizardStep(1);
        setTargetAudienceType('all');
        setSelectedCustomerIds([]);
        setTextMessage('Hello {first_name}, thank you for staying with us!');
        setSmsMessage('Hello {first_name}, check out our latest offers today!');
        setChannel('whatsapp');
        setSelectedTemplateName('');
        setTemplateParams([]);
        setHeaderParam('');
        setMediaHeader(null);

        toast(`${channel === 'sms' ? 'SMS' : 'WhatsApp'} broadcast campaign launched successfully!`, 'success');
        onSuccess();
      } else {
        toast(res.message || 'Failed to launch campaign', 'error');
      }
    } catch (err: any) {
      toast(err.message || 'Failed to launch campaign', 'error');
    } finally {
      setSubmittingCampaign(false);
    }
  };

  return {
    wizardStep,
    setWizardStep,
    campaignName,
    setCampaignName,
    targetAudienceType,
    setTargetAudienceType: handleSetTargetAudienceType,
    channel,
    setChannel: handleSetChannel,
    smsSenderId,
    smsApiToken,
    smsMessage,
    setSmsMessage,
    selectedGroupId,
    setSelectedGroupId: handleSetSelectedGroupId,
    customerGroups,
    filterLeadStage,
    setFilterLeadStage,
    filterInterestStage,
    setFilterInterestStage,
    filterConversionStage,
    setFilterConversionStage,
    filterLanguage,
    setFilterLanguage,
    selectedCustomerIds,
    customerSearch,
    setCustomerSearch,
    messageType,
    setMessageType: handleSelectMessageType,
    textMessage,
    setTextMessage,
    selectedTemplateName,
    setSelectedTemplateName,
    templateParams,
    mediaHeader,
    setMediaHeader,
    uploadingMedia,
    handleUploadMedia,
    handleSetMediaLink,
    handleRemoveMedia,
    submittingCampaign,
    eligibleCustomers,
    validSmsRecipients,
    invalidPhoneCount,
    within24hRecipients,
    blockedOutside24hRecipients,
    smsPartsInfo,
    estimatedCredits,
    getSelectedTemplate,
    handleTemplateParamChange,
    handleToggleCustomerSelection,
    handleSelectAllManualCustomers,
    handleClearManualSelection,
    getTargetRecipientsCount,
    handleCreateCampaign,
  };
}
