import React from 'react';
import { Receipt, Wallet, CreditCard, Layers, Hash } from 'lucide-react';
import { OrderDetails, BusinessType } from './types';

interface OrderSummaryStatsProps {
  order: OrderDetails;
  businessType?: BusinessType;
}

export const OrderSummaryStats: React.FC<OrderSummaryStatsProps> = ({
  order,
  businessType = 'product',
}) => {
  const isService = businessType === 'service';
  const totalAmount = Number(order.order_details.total_amount) || 0;
  const advanceAmount = Number(order.advance_amount || 0);
  const balanceDue = Math.max(0, totalAmount - advanceAmount);
  const lineItemsCount = order.order_details.items.length;
  const totalQty = order.order_details.items.reduce((sum, item) => sum + item.quantity, 0);

  const stats = [
    {
      value: `Rs. ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      label: isService ? 'Total Service Fee' : 'Total Amount',
      icon: Receipt,
      iconColor: '#16281D',
      iconBg: 'rgba(159,232,112,0.25)',
      valueColor: '#16281D',
    },
    {
      value: `Rs. ${advanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      label: order.payment_status === 'unpaid' ? 'Advance Deposit' : 'Advance Paid',
      icon: Wallet,
      iconColor: '#059669',
      iconBg: 'rgba(16,185,129,0.12)',
      valueColor: '#059669',
    },
    {
      value: `Rs. ${balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      label: balanceDue === 0 ? 'Balance Cleared' : 'Balance Remaining',
      icon: CreditCard,
      iconColor: balanceDue > 0 ? '#E11D48' : '#059669',
      iconBg: balanceDue > 0 ? 'rgba(225,29,72,0.1)' : 'rgba(16,185,129,0.12)',
      valueColor: balanceDue > 0 ? '#E11D48' : '#059669',
    },
    {
      value: String(lineItemsCount),
      label: isService ? 'Booked Services' : 'Line Items',
      icon: Layers,
      iconColor: '#4F46E5',
      iconBg: 'rgba(79,70,229,0.1)',
      valueColor: '#16281D',
    },
    {
      value: String(totalQty),
      label: isService ? 'Total Units' : 'Total Quantity',
      icon: Hash,
      iconColor: '#0D9488',
      iconBg: 'rgba(13,148,136,0.1)',
      valueColor: '#16281D',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 w-full">
      {stats.map(({ label, value, icon: Icon, iconColor, iconBg, valueColor }) => (
        <div
          key={label}
          className="col-span-1 last:col-span-2 sm:last:col-span-1 bg-white rounded-[16px] sm:rounded-[20px] p-3 sm:p-4 border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col justify-between min-w-0"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: iconBg }}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: iconColor }} />
            </div>
          </div>
          <div
            className="font-mono text-sm sm:text-base lg:text-lg font-bold leading-tight mb-1 truncate"
            style={{ color: valueColor }}
            title={value}
          >
            {value}
          </div>
          <div className="text-[11px] sm:text-xs font-medium text-[#71717A] truncate" title={label}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderSummaryStats;

