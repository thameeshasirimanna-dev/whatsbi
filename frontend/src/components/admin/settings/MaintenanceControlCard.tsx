import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Radio, Save, Sparkles, ShieldCheck } from 'lucide-react';
import { useDialog } from '../../agent/shared/DialogProvider';

interface MaintenanceControlCardProps {
  onStatusChange?: (isActive: boolean) => void;
}

export const MaintenanceControlCard: React.FC<MaintenanceControlCardProps> = ({ onStatusChange }) => {
  const { toast, confirm: dlgConfirm } = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [mode, setMode] = useState(false);
  const [title, setTitle] = useState('System Maintenance Underway');
  const [message, setMessage] = useState(
    'We are currently performing scheduled maintenance to improve system stability. Services will resume shortly.'
  );
  const [estimatedEnd, setEstimatedEnd] = useState('');
  const [webhookRetry, setWebhookRetry] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${backendUrl}/maintenance-status`);
      const data = await res.json();
      if (data.success) {
        setMode(Boolean(data.maintenance_mode));
        if (data.maintenance_title) setTitle(data.maintenance_title);
        if (data.maintenance_message) setMessage(data.maintenance_message);
        if (data.estimated_end) setEstimatedEnd(data.estimated_end);
        setWebhookRetry(data.webhook_retry_mode !== false);
        if (data.updated_at) setLastUpdated(data.updated_at);
        onStatusChange?.(Boolean(data.maintenance_mode));
      }
    } catch (err) {
      console.error('Failed to fetch maintenance status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const isEnabling = mode;
    const confirmText = isEnabling
      ? 'Activate Maintenance Mode? Non-admin agents and public users will be blocked and redirected to the maintenance screen.'
      : 'Deactivate Maintenance Mode? Regular platform access will be restored for all agents and users.';

    const confirmed = await dlgConfirm(confirmText, {
      danger: isEnabling,
      confirmLabel: isEnabling ? 'Activate Maintenance' : 'Deactivate Maintenance',
    });

    if (!confirmed) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast('Authentication token missing. Please log in again.', 'error');
        return;
      }

      const res = await fetch(`${backendUrl}/admin/maintenance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maintenance_mode: mode,
          maintenance_title: title.trim(),
          maintenance_message: message.trim(),
          estimated_end: estimatedEnd.trim() || null,
          webhook_retry_mode: webhookRetry,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update maintenance mode');
      }

      toast(
        mode ? 'Maintenance mode activated successfully' : 'Maintenance mode deactivated successfully',
        'success'
      );
      setLastUpdated(new Date().toISOString());
      onStatusChange?.(mode);
    } catch (err: any) {
      toast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[24px] border border-[#EAEAEA] p-8 text-center text-xs font-medium text-[#71717A] flex items-center justify-center gap-2 font-sans">
        <span className="w-4 h-4 border-2 border-[#9FE870] border-t-transparent rounded-full animate-spin" />
        <span>Loading maintenance settings…</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden font-sans">
      {/* Header with Master Toggle */}
      <div
        className={`p-5 md:p-6 border-b border-[#EAEAEA] flex items-center justify-between flex-wrap gap-4 transition-colors ${
          mode ? 'bg-[#FFFBEB]/50' : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              mode ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#E8F8EE] text-[#059669]'
            }`}
          >
            {mode ? (
              <AlertTriangle size={20} strokeWidth={2.4} />
            ) : (
              <CheckCircle2 size={20} strokeWidth={2.4} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-base font-bold text-[#16281D]">Maintenance Mode</span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                  mode
                    ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                    : 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                }`}
              >
                {mode ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
              Control platform accessibility and webhook queuing during scheduled downtime.
            </p>
          </div>
        </div>

        {/* Master Toggle Switch */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#52525B]">
            {mode ? 'Turn Off' : 'Turn On'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={mode}
            onClick={() => setMode(!mode)}
            className={`w-12 h-6.5 rounded-full border-0 cursor-pointer relative transition-colors duration-200 p-0.5 ${
              mode ? 'bg-[#D97706]' : 'bg-[#E4E4E7]'
            }`}
          >
            <div
              className={`w-5.5 h-5.5 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                mode ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Form Body */}
      <div className="p-5 md:p-6 flex flex-col gap-5">
        <div>
          <label className="text-xs font-bold text-[#52525B] block mb-1.5">
            Maintenance Notice Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Scheduled Maintenance Underway"
            className="w-full px-4 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-2xl text-xs font-medium text-[#16281D] placeholder-[#A1A1AA] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#52525B] block mb-1.5">
            Maintenance Explanation Message
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what is being updated and when services will resume..."
            className="w-full px-4 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-2xl text-xs font-medium text-[#16281D] placeholder-[#A1A1AA] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20 resize-y min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#52525B] flex items-center gap-1.5 mb-1.5">
              <Clock size={13} className="text-[#71717A]" />
              Estimated Completion Time (Optional)
            </label>
            <input
              type="text"
              value={estimatedEnd}
              onChange={(e) => setEstimatedEnd(e.target.value)}
              placeholder="e.g. 30 minutes, or 02:00 PM UTC"
              className="w-full px-4 py-2.5 bg-[#F4F7F4] border border-[#EAEAEA] focus:border-[#9FE870] focus:bg-white rounded-2xl text-xs font-medium text-[#16281D] placeholder-[#A1A1AA] outline-none transition-all focus:ring-2 focus:ring-[#9FE870]/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#52525B] flex items-center gap-1.5 mb-1.5">
              <Radio size={13} className="text-[#71717A]" />
              WhatsApp Webhook Ingestion Policy
            </label>
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#F4F7F4] border border-[#EAEAEA] cursor-pointer">
              <input
                type="checkbox"
                checked={webhookRetry}
                onChange={(e) => setWebhookRetry(e.target.checked)}
                className="mt-0.5 accent-[#059669] cursor-pointer"
              />
              <span className="text-xs text-[#52525B] leading-snug">
                <strong className="text-[#16281D]">Signal Meta to Hold & Retry (HTTP 503)</strong>
                <span className="text-[11px] text-[#71717A] block mt-0.5">
                  Instructs Meta to preserve all incoming customer messages in its queue and deliver them when maintenance ends.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="border border-dashed border-[#D4D4D8] rounded-[20px] p-5 bg-[#FAFAFA]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#71717A] mb-3">
            <Sparkles size={13} className="text-[#D97706]" />
            LIVE USER-FACING PREVIEW
          </div>
          <div className="bg-white border border-[#E4E7E4] rounded-2xl p-6 text-center shadow-xs">
            <div className="inline-flex items-center gap-2 bg-[#F4F6F4] border border-[#E4E7E4] rounded-full px-3 py-1 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
              <span className="text-xs font-bold text-[#16281D]">Biz Agentz</span>
              <span className="text-[#A1A1AA] text-xs">|</span>
              <span className="text-xs font-medium text-[#71717A]">Platform Maintenance</span>
            </div>
            <div className="text-base font-bold text-[#16281D] mb-1.5 tracking-tight">
              {title || 'System Maintenance Underway'}
            </div>
            <div className="text-xs text-[#52525B] leading-relaxed max-w-md mx-auto mb-3.5">
              {message || 'We are currently performing scheduled maintenance to optimize system performance.'}
            </div>
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <div className="inline-flex items-center gap-1.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-full px-3 py-1 text-xs font-semibold text-[#52525B]">
                <Clock size={11} className="text-[#D97706]" />
                <span>Return: <strong className="text-[#16281D]">{estimatedEnd || 'Shortly'}</strong></span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#F0FDF4] border border-[#DCFCE7] rounded-full px-3 py-1 text-xs font-semibold text-[#059669]">
                <ShieldCheck size={12} strokeWidth={2.4} />
                <span>Messages: Safe & Queued</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-[#F4F4F5]">
          <span className="text-[11px] text-[#A1A1AA] font-medium">
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : ''}
          </span>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 py-2.5 px-5 rounded-full text-xs font-bold border-0 transition-all ${
              saving
                ? 'bg-[#E4E4E7] text-[#A1A1AA] cursor-not-allowed'
                : 'bg-[#9FE870] hover:bg-[#8CE05A] active:scale-[0.98] text-[#16281D] shadow-[0_4px_14px_rgba(159,232,112,0.35)] cursor-pointer'
            }`}
          >
            <Save size={14} strokeWidth={2.4} />
            <span>{saving ? 'Saving…' : 'Apply Maintenance Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceControlCard;
