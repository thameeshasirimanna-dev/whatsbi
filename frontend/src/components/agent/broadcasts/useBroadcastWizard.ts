import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { createBroadcast, Customer } from '../../../lib/api';
import { useDialog } from '../shared/DialogProvider';
import type { MetaTemplate } from './types';
import { fetchCustomerGroups } from '../customers/groups/customerGroupsApi';

interface UseBroadcastWizardProps {
  customers: Customer[];
  agent: any;
  metaTemplates: MetaTemplate[];
  onSuccess: () => void;
  isOpen: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
}

export function useBroadcastWizard({
  customers,
  agent,
  metaTemplates,
  onSuccess,
  onOpenModal,
  onCloseModal,
}: UseBroadcastWizardProps) {
  const { confirm: dlgConfirm, toast } = useDialog();
  const location = useLocation();

  const [wizardStep, setWizardStep] = useState(1);
  const [campaignName, setCampaignName] = useState('');
  const [targetAudienceType, setTargetAudienceType] = useState<'all' | 'filtered' | 'group' | 'manual'>('all');

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
  const [textMessage, setTextMessage] = useState('');
  const [selectedTemplateName, setSelectedTemplateName] = useState('');
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [headerParam, setHeaderParam] = useState('');
  const [submittingCampaign, setSubmittingCampaign] = useState(false);

  // Load customer groups
  useEffect(() => {
    fetchCustomerGroups()
      .then((res) => {
        if (res.groups) {
          setCustomerGroups(res.groups);
          if (res.groups.length > 0 && !selectedGroupId) {
            setSelectedGroupId(String(res.groups[0].id));
          }
        }
      })
      .catch(() => {});
  }, []);

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
    if (template) {
      const bodyComp = template.components.find((c) => c.type === 'BODY');
      if (bodyComp?.text) {
        const matches = bodyComp.text.match(/\{\{\d+\}\}/g) || [];
        const uniqueCount = new Set(matches).size;
        setTemplateParams(Array(uniqueCount).fill(''));
      } else {
        setTemplateParams([]);
      }
      setHeaderParam('');
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

  const getFilteredCustomers = (): Customer[] => {
    if (targetAudienceType === 'all') {
      return customers;
    }

    if (targetAudienceType === 'group') {
      return customers.filter((c: any) =>
        c.groups?.some((g: any) => String(g.id) === String(selectedGroupId))
      );
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
        onCloseModal();
        setCampaignName('');
        setWizardStep(1);
        setTargetAudienceType('all');
        setSelectedCustomerIds([]);
        setTextMessage('');
        setSelectedTemplateName('');
        setTemplateParams([]);
        setHeaderParam('');

        toast('Broadcast campaign launched successfully!', 'success');
        onSuccess();
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
    setTargetAudienceType,
    selectedGroupId,
    setSelectedGroupId,
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
    setMessageType,
    textMessage,
    setTextMessage,
    selectedTemplateName,
    setSelectedTemplateName,
    templateParams,
    submittingCampaign,
    getSelectedTemplate,
    handleTemplateParamChange,
    handleToggleCustomerSelection,
    handleSelectAllManualCustomers,
    handleClearManualSelection,
    getTargetRecipientsCount,
    handleCreateCampaign,
  };
}
