import React from 'react';
import { Users } from 'lucide-react';

interface CustomerAnalyticsProps {
  totalCustomers: number;
}

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({ totalCustomers }) => {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '20px 22px', display: 'inline-flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={18} style={{ color: '#22c55e' }} />
        </div>
        <div>
          <div style={{ ...DM, fontSize: 12, fontWeight: 500, color: '#71717a', marginBottom: 2 }}>Total Customers</div>
          <div style={{ ...SYNE, fontSize: 26, fontWeight: 800, color: '#0c1a0e', lineHeight: 1 }}>{totalCustomers}</div>
        </div>
      </div>
    </div>
  );
};

export default CustomerAnalytics;
