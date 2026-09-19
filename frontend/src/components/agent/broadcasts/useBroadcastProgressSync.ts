import { useEffect, useMemo } from 'react';
import { Broadcast, getBroadcasts } from '../../../lib/api';
import { getCurrentAgent } from '../../../lib/agent';

interface UseBroadcastProgressSyncOptions {
  broadcasts: Broadcast[];
  setBroadcasts: React.Dispatch<React.SetStateAction<Broadcast[]>>;
  setSelectedBroadcast: React.Dispatch<React.SetStateAction<Broadcast | null>>;
  setAgent: React.Dispatch<React.SetStateAction<any>>;
}

/**
 * Real-time synchronization hook for campaign delivery progress and agent credits.
 * 1. Listens to socket events forwarded via window ('broadcast_updated', 'agent_status_update').
 * 2. Automatically polls campaign progress and credits every 2.5s while any campaign is active.
 */
export function useBroadcastProgressSync({
  broadcasts,
  setBroadcasts,
  setSelectedBroadcast,
  setAgent,
}: UseBroadcastProgressSyncOptions) {
  // 1. Socket Event Listeners
  useEffect(() => {
    const handleBroadcastUpdated = (event: Event) => {
      const data = (event as CustomEvent).detail;
      if (!data?.broadcast_id) return;

      setBroadcasts((prev) =>
        prev.map((b) => {
          if (b.id !== data.broadcast_id) return b;
          return {
            ...b,
            sent_count: typeof data.sent_count === 'number' ? data.sent_count : b.sent_count,
            failed_count: typeof data.failed_count === 'number' ? data.failed_count : b.failed_count,
            status: data.status || b.status,
            total_recipients:
              typeof data.total_recipients === 'number' ? data.total_recipients : b.total_recipients,
          };
        })
      );

      setSelectedBroadcast((prev) => {
        if (!prev || prev.id !== data.broadcast_id) return prev;
        return {
          ...prev,
          sent_count: typeof data.sent_count === 'number' ? data.sent_count : prev.sent_count,
          failed_count: typeof data.failed_count === 'number' ? data.failed_count : prev.failed_count,
          status: data.status || prev.status,
          total_recipients:
            typeof data.total_recipients === 'number' ? data.total_recipients : prev.total_recipients,
        };
      });
    };

    const handleStatusUpdated = (event: Event) => {
      const statusData = (event as CustomEvent).detail;
      if (statusData?.type === 'credits_updated' && statusData?.credits !== undefined) {
        const updatedCredits = parseFloat(statusData.credits);
        setAgent((prev: any) => (prev ? { ...prev, credits: updatedCredits } : prev));
      } else if (statusData?.type === 'sms_credits_updated' && statusData?.sms_credits !== undefined) {
        const updatedSmsCredits = parseFloat(statusData.sms_credits);
        setAgent((prev: any) => (prev ? { ...prev, sms_credits: updatedSmsCredits } : prev));
      }
    };

    window.addEventListener('broadcast_updated', handleBroadcastUpdated);
    window.addEventListener('agent_status_update', handleStatusUpdated);

    return () => {
      window.removeEventListener('broadcast_updated', handleBroadcastUpdated);
      window.removeEventListener('agent_status_update', handleStatusUpdated);
    };
  }, [setBroadcasts, setSelectedBroadcast, setAgent]);

  // 2. Automated Polling Fallback while any campaign is actively running
  const hasActiveCampaign = useMemo(
    () => broadcasts.some((b) => b.status === 'processing' || b.status === 'pending'),
    [broadcasts]
  );

  useEffect(() => {
    if (!hasActiveCampaign) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const [bData, currentAgent] = await Promise.all([getBroadcasts(), getCurrentAgent()]);
        if (!isMounted) return;
        setBroadcasts(bData);
        if (currentAgent) setAgent(currentAgent);
      } catch (err) {
        console.error('Active campaign poll failed:', err);
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [hasActiveCampaign, setBroadcasts, setAgent]);
}
