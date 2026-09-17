import React from 'react';
import { MaintenanceControlCard } from './MaintenanceControlCard';
import { Server, ShieldCheck, Settings } from 'lucide-react';
import { AdminPageBanner } from '../AdminPageBanner';

interface AdminSettingsTabProps {
  onMaintenanceStatusChange?: (isActive: boolean) => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  onMaintenanceStatusChange,
}) => {
  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Unified Template Hero Banner */}
      <AdminPageBanner
        category="Platform Administration"
        title="System Settings & Controls"
        subtitle="Manage platform-wide configurations, maintenance windows, zero-loss webhook buffers, and reliability policies."
        Icon={Settings}
        statusBadge="System Core • 100% Operational"
      />

      {/* Primary: Maintenance Control Card */}
      <MaintenanceControlCard onStatusChange={onMaintenanceStatusChange} />

      {/* Secondary: Infrastructure & Resilience Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-[24px] border border-[#EAEAEA] p-5 md:p-6 shadow-sm hover:border-[#9FE870] transition-all flex flex-col gap-2 group">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <Server size={16} strokeWidth={2.4} />
            </div>
            <span className="text-sm font-bold text-[#16281D]">
              Zero-Loss Webhook Buffer
            </span>
          </div>
          <p className="text-xs text-[#71717A] font-medium m-0 leading-relaxed">
            When maintenance mode is active, incoming WhatsApp messages trigger an automated{' '}
            <code className="bg-[#F4F7F4] text-[#16281D] px-1.5 py-0.5 rounded-md border border-black/5 font-mono text-[11px]">
              HTTP 503 Retry-After
            </code>{' '}
            response. Meta automatically queues messages for up to 24 hours.
          </p>
        </div>

        <div className="bg-white rounded-[24px] border border-[#EAEAEA] p-5 md:p-6 shadow-sm hover:border-[#9FE870] transition-all flex flex-col gap-2 group">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#E8F8EE] text-[#059669] flex items-center justify-center shrink-0 group-hover:bg-[#9FE870] group-hover:text-[#16281D] transition-colors shadow-xs">
              <ShieldCheck size={16} strokeWidth={2.4} />
            </div>
            <span className="text-sm font-bold text-[#16281D]">
              Super Admin Override
            </span>
          </div>
          <p className="text-xs text-[#71717A] font-medium m-0 leading-relaxed">
            Super Administrators retain 100% access to this administration portal during active
            maintenance, allowing you to configure agents and monitor metrics without disruption.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsTab;
