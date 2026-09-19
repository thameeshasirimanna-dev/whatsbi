import React from 'react';
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
      value: `Rs. ${totalAmount.toFixed(2)}`,
      label: 'Total Amount',
      color: '#16281D',
    },
    {
      value: `Rs. ${advanceAmount.toFixed(2)}`,
      label: order.payment_status === 'unpaid' ? 'Advance Amount' : 'Advance Paid',
      color: '#1D4ED8',
    },
    {
      value: `Rs. ${balanceDue.toFixed(2)}`,
      label: 'Balance Due',
      color: '#EF4444',
    },
    {
      value: String(lineItemsCount),
      label: isService ? 'Services Count' : 'Line Items',
      color: '#7C3AED',
    },
    {
      value: String(totalQty),
      label: isService ? 'Booked Units' : 'Total Qty',
      color: '#15803D',
    },
  ];

  return (
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-xs overflow-hidden">
      <div className="p-4 sm:px-5 border-b border-[#EAEAEA]">
        <span className="text-sm font-bold text-[#16281D]">
          {isService ? 'Service Order Summary' : 'Order Summary'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 p-3 sm:p-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="col-span-1 last:col-span-2 md:last:col-span-1 bg-[#F4F7F4] rounded-xl p-2.5 sm:p-3 text-center min-w-0"
          >
            <div
              style={{ color: stat.color }}
              className="font-mono text-sm font-bold leading-tight mb-1 truncate"
              title={stat.value}
            >
              {stat.value}
            </div>
            <div className="text-[11px] text-[#71717A] font-medium truncate" title={stat.label}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderSummaryStats;
