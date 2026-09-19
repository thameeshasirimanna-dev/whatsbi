import { useState, useEffect, useMemo } from 'react';
import { createBroadcast, Customer } from '../../../../lib/api';
import { useDialog } from '../../shared/DialogProvider';
import { fetchCustomerGroups } from '../../customers/groups/customerGroupsApi';
import { calculateSmsParts, calculateEstimatedCredits, isValidSmsPhone } from '../smsHelpers';

interface UseSmsWizardProps {
  customers: Customer[];
  smsSenderId?: string;
  smsApiToken?: string;
  isOpen: boolean;
  onSuccess: () => void;
  onCloseModal: () => void;
}

export function useSmsWizard({
  customers,
  smsSenderId,
  smsApiToken,
  isOpen,
  onSuccess,
  onCloseModal,
}: UseSmsWizardProps) {
  const { toast } = useDialog();

  const [step, setStep] = useState<1 | 2 | 3>(1);
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
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      .catch((err) => console.error('Failed to load customer groups for SMS:', err));
  }, []);

  // Reset wizard when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCampaignName('');
      setTargetAudienceType('all');
      setSelectedCustomerIds([]);
      setCustomerSearch('');
      setMessage('Hello {first_name}, check out our latest offers today!');
    }
  }, [isOpen]);

  // Compute eligible customers based on target audience selection
  const eligibleCustomers = useMemo(() => {
    if (targetAudienceType === 'all') {
      return customers;
    }

    if (targetAudienceType === 'manual') {
      return customers.filter((c) => selectedCustomerIds.includes(c.id));
    }

    if (targetAudienceType === 'group') {
      if (!selectedGroupId) return [];
      const gid = Number(selectedGroupId);
      return customers.filter((c: any) => {
        if (Array.isArray(c.group_ids)) return c.group_ids.includes(gid);
        if (Array.isArray(c.groups)) return c.groups.some((g: any) => g.id === gid || g === gid);
        return false;
      });
    }

    // Filtered by stage/language
    return customers.filter((c) => {
      if (filterLeadStage !== 'all' && c.lead_stage !== filterLeadStage) return false;
      if (filterInterestStage !== 'all' && c.interest_stage !== filterInterestStage) return false;
      if (filterConversionStage !== 'all' && c.conversion_stage !== filterConversionStage) return false;
      if (filterLanguage !== 'all' && c.language !== filterLanguage) return false;
      return true;
    });
  }, [
    customers,
    targetAudienceType,
    selectedCustomerIds,
    selectedGroupId,
    filterLeadStage,
    filterInterestStage,
    filterConversionStage,
    filterLanguage,
  ]);

  // Filter only those with valid mobile phone numbers
  const validSmsRecipients = useMemo(() => {
    return eligibleCustomers.filter((c) => isValidSmsPhone(c.phone || ''));
  }, [eligibleCustomers]);

  const invalidPhoneCount = eligibleCustomers.length - validSmsRecipients.length;

  // SMS part & credit calculations
  const partsInfo = useMemo(() => calculateSmsParts(message), [message]);
  const estimatedCredits = useMemo(
    () => calculateEstimatedCredits(validSmsRecipients.length, message),
    [validSmsRecipients.length, message]
  );

  // Customer search for manual pick
  const filteredSearchCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, customerSearch]);

  const toggleCustomerSelection = (id: number) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllManualCustomers = () => {
    setSelectedCustomerIds(filteredSearchCustomers.map((c) => c.id));
  };

  const clearManualSelection = () => {
    setSelectedCustomerIds([]);
  };

  const canProceedStep1 = campaignName.trim().length > 0 && validSmsRecipients.length > 0;
  const canProceedStep2 = message.trim().length > 0;

  const handleLaunchCampaign = async () => {
    if (!smsSenderId || !smsApiToken) {
      toast('SMS Sender ID or API Token is not configured. Please contact the Super Admin to configure your Text.lk SMS credentials.', 'error');
      return;
    }

    if (!campaignName.trim()) {
      toast('Please provide a campaign name.', 'error');
      return;
    }

    if (!message.trim()) {
      toast('Please write your SMS message body.', 'error');
      return;
    }

    if (validSmsRecipients.length === 0) {
      toast('No valid recipients selected with phone numbers.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const recipientIds = validSmsRecipients.map((c) => c.id);
      const res = await createBroadcast({
        name: campaignName.trim(),
        channel: 'sms',
        message_type: 'sms',
        message: message.trim(),
        recipient_ids: recipientIds,
      });

      if (res.success) {
        toast('SMS Campaign launched successfully! Messages are now being dispatched via Text.lk gateway.', 'success');
        onSuccess();
        onCloseModal();
      } else {
        toast(res.message || 'Failed to dispatch SMS campaign.', 'error');
      }
    } catch (err: any) {
      console.error('Failed to launch SMS campaign:', err);
      toast(err.message || 'Failed to dispatch SMS campaign.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    step,
    setStep,
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
    filteredSearchCustomers,
    toggleCustomerSelection,
    selectAllManualCustomers,
    clearManualSelection,
    eligibleCustomers,
    validSmsRecipients,
    invalidPhoneCount,
    message,
    setMessage,
    partsInfo,
    estimatedCredits,
    submitting,
    canProceedStep1,
    canProceedStep2,
    handleLaunchCampaign,
  };
}
