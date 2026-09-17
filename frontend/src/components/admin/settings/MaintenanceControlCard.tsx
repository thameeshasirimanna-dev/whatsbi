import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Radio, Save, Sparkles, ShieldCheck } from 'lucide-react';
import { useDialog } from '../../agent/shared/DialogProvider';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  ...DM,
  fontSize: 13,
  color: '#0c1a0e',
  background: '#fafafa',
  border: '1px solid #ebebeb',
  borderRadius: 10,
  outline: 'none',
  boxSizing: 'border-box',
};

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
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', padding: '32px 24px', textAlign: 'center', ...DM, color: '#71717a', fontSize: 13 }}>
        Loading maintenance settings...
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #ebebeb', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
      {/* Header with Master Toggle */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, background: mode ? 'rgba(217,119,6,0.03)' : '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: mode ? 'rgba(217,119,6,0.1)' : 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {mode ? <AlertTriangle size={20} style={{ color: '#d97706' }} /> : <CheckCircle2 size={20} style={{ color: '#22c55e' }} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e' }}>Maintenance Mode</span>
              <span style={{ ...DM, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: mode ? 'rgba(217,119,6,0.15)' : 'rgba(34,197,94,0.15)', color: mode ? '#b45309' : '#059669' }}>
                {mode ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <p style={{ ...DM, fontSize: 12, color: '#71717a', margin: '2px 0 0' }}>
              Control platform accessibility and webhook queuing during scheduled downtime
            </p>
          </div>
        </div>

        {/* Master Toggle Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#3f3f46' }}>{mode ? 'Turn Off' : 'Turn On'}</span>
          <button
            type="button"
            role="switch"
            aria-checked={mode}
            onClick={() => setMode(!mode)}
            style={{ width: 50, height: 26, borderRadius: 14, border: 'none', background: mode ? '#d97706' : '#e4e4e7', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease', padding: 2 }}
          >
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: mode ? 26 : 2, transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>
      </div>

      {/* Form Body */}
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>
            Maintenance Notice Title
          </label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Scheduled Maintenance Underway" style={inputStyle} />
        </div>

        <div>
          <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>
            Maintenance Explanation Message
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe what is being updated and when services will resume..."
            style={{ ...inputStyle, resize: 'vertical', minHeight: 75, lineHeight: 1.5 }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Clock size={13} style={{ color: '#71717a' }} />
              Estimated Completion Time (Optional)
            </label>
            <input type="text" value={estimatedEnd} onChange={(e) => setEstimatedEnd(e.target.value)} placeholder="e.g. 30 minutes, or 02:00 PM UTC" style={inputStyle} />
          </div>

          <div>
            <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Radio size={13} style={{ color: '#71717a' }} />
              WhatsApp Webhook Ingestion Policy
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10, background: '#fafafa', border: '1px solid #ebebeb', cursor: 'pointer' }}>
              <input type="checkbox" checked={webhookRetry} onChange={(e) => setWebhookRetry(e.target.checked)} style={{ marginTop: 2, accentColor: '#22c55e', cursor: 'pointer' }} />
              <span style={{ ...DM, fontSize: 12, color: '#3f3f46', lineHeight: 1.4 }}>
                <strong>Signal Meta to Hold & Retry (`HTTP 503`)</strong>
                <br />
                <span style={{ color: '#71717a', fontSize: 11 }}>
                  Instructs Meta to preserve all incoming customer messages in its queue and deliver them when maintenance ends.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* Live Preview Box */}
        <div style={{ border: '1px dashed #d4d4d8', borderRadius: 14, padding: '16px 20px', background: '#fafafa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...SYNE, fontSize: 12, fontWeight: 700, color: '#71717a', marginBottom: 12 }}>
            <Sparkles size={13} style={{ color: '#d97706' }} />
            LIVE USER-FACING PREVIEW
          </div>
          <div style={{ background: '#fff', border: '1px solid #e4e7e4', borderRadius: 16, padding: '24px 20px', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f4f6f4', border: '1px solid #e4e7e4', borderRadius: 20, padding: '3px 10px', marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706' }} />
              <span style={{ ...SYNE, fontSize: 11, fontWeight: 700, color: '#0c1a0e' }}>WhatsBi</span>
              <span style={{ color: '#a1a1aa', fontSize: 10 }}>|</span>
              <span style={{ ...DM, fontSize: 10, fontWeight: 600, color: '#71717a' }}>Platform Maintenance</span>
            </div>
            <div style={{ ...SYNE, fontSize: 16, fontWeight: 800, color: '#0c1a0e', marginBottom: 6, letterSpacing: '-0.01em' }}>
              {title || 'System Maintenance Underway'}
            </div>
            <div style={{ ...DM, fontSize: 12, color: '#52525b', lineHeight: 1.5, maxWidth: 420, margin: '0 auto 14px' }}>
              {message || 'We are currently performing scheduled maintenance to optimize system performance.'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fafafa', border: '1px solid #ebebeb', borderRadius: 20, padding: '4px 10px' }}>
                <Clock size={11} style={{ color: '#d97706' }} />
                <span style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#3f3f46' }}>
                  Return: <strong style={{ color: '#0c1a0e' }}>{estimatedEnd || 'Shortly'}</strong>
                </span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 20, padding: '4px 10px' }}>
                <ShieldCheck size={12} style={{ color: '#059669' }} />
                <span style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#059669' }}>
                  Messages: Safe & Queued
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderTop: '1px solid #f4f4f5', paddingTop: 16 }}>
          <div style={{ ...DM, fontSize: 11, color: '#a1a1aa' }}>
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : ''}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 9,
              padding: '10px 20px',
              ...DM,
              fontSize: 13,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(34,197,94,0.25)',
              transition: 'opacity 0.15s',
            }}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Apply Maintenance Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceControlCard;
