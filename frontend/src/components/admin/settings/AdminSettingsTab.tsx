import React from 'react';
import { MaintenanceControlCard } from './MaintenanceControlCard';
import { Server, ShieldCheck, Activity } from 'lucide-react';

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface AdminSettingsTabProps {
  onMaintenanceStatusChange?: (isActive: boolean) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  onMaintenanceStatusChange,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ ...SYNE, fontSize: 18, fontWeight: 700, color: '#0c1a0e', margin: 0 }}>
            System Settings & Controls
          </h2>
          <p style={{ ...DM, fontSize: 12, color: '#71717a', margin: '4px 0 0' }}>
            Manage platform-wide configurations, maintenance windows, and reliability policies
          </p>
        </div>
      </div>

      {/* Primary: Maintenance Control Card */}
      <MaintenanceControlCard onStatusChange={onMaintenanceStatusChange} />

      {/* Secondary: Infrastructure & Resilience Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid #ebebeb',
            padding: '18px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: 'rgba(34,197,94,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Server size={16} style={{ color: '#22c55e' }} />
            </div>
            <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>
              Zero-Loss Webhook Buffer
            </span>
          </div>
          <p style={{ ...DM, fontSize: 12, color: '#71717a', margin: 0, lineHeight: 1.5 }}>
            When maintenance mode is active, incoming WhatsApp messages trigger an automated{' '}
            <code style={{ background: '#f4f4f5', padding: '1px 4px', borderRadius: 4 }}>
              HTTP 503 Retry-After
            </code>{' '}
            response. Meta will automatically queue messages for up to 24 hours.
          </p>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            border: '1px solid #ebebeb',
            padding: '18px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: 'rgba(8,145,178,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={16} style={{ color: '#0891b2' }} />
            </div>
            <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>
              Super Admin Override
            </span>
          </div>
          <p style={{ ...DM, fontSize: 12, color: '#71717a', margin: 0, lineHeight: 1.5 }}>
            Super Administrators retain 100% access to this administration portal during active
            maintenance, allowing you to configure agents and monitor metrics without disruption.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsTab;
