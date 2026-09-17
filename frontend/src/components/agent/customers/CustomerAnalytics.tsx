import React from 'react';
import { Users } from 'lucide-react';

interface CustomerAnalyticsProps {
  totalCustomers: number;
}

const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({ totalCustomers }) => {
  return (
    <div className="mb-6">
      <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-5 inline-flex items-center gap-4 transition-all duration-200 hover:shadow-md hover:border-[#16281D]/20">
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(159,232,112,0.3)' }} className="flex items-center justify-center shrink-0">
          <Users size={20} style={{ color: '#16281D' }} />
        </div>
        <div>
          <div className="font-sans text-xs font-semibold text-[#71717A] mb-1">Total Customers</div>
          <div className="font-mono text-2xl font-bold text-[#16281D] leading-none">{totalCustomers}</div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalytics;
