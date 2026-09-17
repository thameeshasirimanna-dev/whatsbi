import React from 'react';
import { Briefcase, ShoppingBag, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { FleetOverviewData } from './types';

interface FleetDistributionGridProps {
  fleet: FleetOverviewData;
}

export const FleetDistributionGrid: React.FC<FleetDistributionGridProps> = ({ fleet }) => {
  const total = fleet.totalAgents || 1;

  // 1. Business Type distribution
  const servicePercent = Math.round((fleet.serviceAgents / total) * 100);
  const productPercent = 100 - servicePercent;

  // 2. WhatsApp Connectivity distribution
  const activePercent = Math.round((fleet.activeWhatsAppCount / total) * 100);
  const inactivePercent = 100 - activePercent;

  // 3. Liquidity Health
  const lowCount = fleet.lowBalanceCount;
  const healthyCount = Math.max(fleet.totalAgents - lowCount, 0);
  const healthyPercent = Math.round((healthyCount / total) * 100);
  const lowPercent = 100 - healthyPercent;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Business Type Distribution */}
      <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
              Business Model Breakdown
            </span>
            <span className="text-xs font-bold text-[#16281D]">
              {fleet.totalAgents} Total
            </span>
          </div>
          <h4 className="text-base font-bold text-[#16281D] m-0">
            Service vs. Product Fleet
          </h4>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="w-full h-3 rounded-full bg-[#F4F7F4] overflow-hidden flex">
            <div
              style={{ width: `${servicePercent}%` }}
              className="h-full bg-[#059669] rounded-l-full transition-all duration-500"
              title={`Service: ${fleet.serviceAgents}`}
            />
            <div
              style={{ width: `${productPercent}%` }}
              className="h-full bg-[#16281D] rounded-r-full transition-all duration-500"
              title={`Product: ${fleet.productAgents}`}
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
              <div className="flex flex-col">
                <span className="font-bold text-[#16281D]">Service ({servicePercent}%)</span>
                <span className="text-[11px] text-[#71717A]">{fleet.serviceAgents} accounts</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div className="flex flex-col items-end">
                <span className="font-bold text-[#16281D]">Product ({productPercent}%)</span>
                <span className="text-[11px] text-[#71717A]">{fleet.productAgents} accounts</span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#16281D]" />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#F4F4F5] text-[11px] text-[#71717A] font-medium">
          Automated invoices & AI recommendation templates dynamically adapt to business type.
        </div>
      </div>

      {/* 2. WhatsApp Connectivity Health */}
      <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
              Fleet Connectivity
            </span>
            <span className="text-xs font-bold text-[#059669]">
              {activePercent}% Online
            </span>
          </div>
          <h4 className="text-base font-bold text-[#16281D] m-0">
            WhatsApp Cloud API Readiness
          </h4>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="w-full h-3 rounded-full bg-[#F4F7F4] overflow-hidden flex">
            <div
              style={{ width: `${activePercent}%` }}
              className="h-full bg-[#9FE870] rounded-l-full transition-all duration-500"
              title={`Active: ${fleet.activeWhatsAppCount}`}
            />
            <div
              style={{ width: `${inactivePercent}%` }}
              className="h-full bg-[#D4D4D8] rounded-r-full transition-all duration-500"
              title={`Pending / Offline: ${fleet.totalAgents - fleet.activeWhatsAppCount}`}
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#9FE870]" />
              <div className="flex flex-col">
                <span className="font-bold text-[#16281D]">Routing Live</span>
                <span className="text-[11px] text-[#71717A]">{fleet.activeWhatsAppCount} connected</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div className="flex flex-col items-end">
                <span className="font-bold text-[#71717A]">Pending Setup</span>
                <span className="text-[11px] text-[#71717A]">{fleet.totalAgents - fleet.activeWhatsAppCount} accounts</span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#D4D4D8]" />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#F4F4F5] text-[11px] text-[#71717A] font-medium">
          Meta Business Cloud webhooks verified and operating with zero message backpressure.
        </div>
      </div>

      {/* 3. AI Balance Liquidity Health */}
      <div className="bg-white rounded-[24px] p-5 md:p-6 border border-[#EAEAEA] shadow-sm flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
              Fleet Solvency
            </span>
            <span className="text-xs font-bold text-[#16281D]">
              ${fleet.totalAiBalance.toFixed(2)} Total
            </span>
          </div>
          <h4 className="text-base font-bold text-[#16281D] m-0">
            Credit & AI Balance Health
          </h4>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="w-full h-3 rounded-full bg-[#F4F7F4] overflow-hidden flex">
            <div
              style={{ width: `${healthyPercent}%` }}
              className="h-full bg-[#059669] rounded-l-full transition-all duration-500"
              title={`Healthy: ${healthyCount}`}
            />
            <div
              style={{ width: `${lowPercent}%` }}
              className="h-full bg-[#F59E0B] rounded-r-full transition-all duration-500"
              title={`Low: ${lowCount}`}
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
              <div className="flex flex-col">
                <span className="font-bold text-[#16281D]">Funded ({healthyPercent}%)</span>
                <span className="text-[11px] text-[#71717A]">{healthyCount} &ge; $2.00</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-right">
              <div className="flex flex-col items-end">
                <span className="font-bold text-[#D97706]">Low Warning</span>
                <span className="text-[11px] text-[#71717A]">{lowCount} accounts</span>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-[#F4F4F5] text-[11px] text-[#71717A] font-medium">
          {fleet.lowBalanceCount > 0
            ? `${fleet.lowBalanceCount} tenant accounts require top-up to prevent AI chatbot interruption.`
            : 'All tenant accounts currently have sufficient liquidity for AI responses.'}
        </div>
      </div>
    </div>
  );
};
