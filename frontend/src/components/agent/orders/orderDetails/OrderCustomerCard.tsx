import React from 'react';
import { Package, Briefcase } from 'lucide-react';
import { OrderDetails, BusinessType } from './types';

interface OrderCustomerCardProps {
  order: OrderDetails;
  businessType?: BusinessType;
}

const infoRow = (label: string, value: string | React.ReactNode) => (
  <div className="mb-3 last:mb-0">
    <div className="text-[10.5px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
      {label}
    </div>
    <div className="text-[13px] font-semibold text-[#16281D]">
      {value}
    </div>
  </div>
);

export const OrderCustomerCard: React.FC<OrderCustomerCardProps> = ({
  order,
  businessType = 'product',
}) => {
  const isService = businessType === 'service';

  return (
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-xs overflow-hidden">
      <div className="p-4 sm:px-5 border-b border-[#EAEAEA] flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#9FE870]/25 flex items-center justify-center text-[#16281D]">
          {isService ? (
            <Briefcase size={15} strokeWidth={2.2} />
          ) : (
            <Package size={15} strokeWidth={2.2} />
          )}
        </div>
        <span className="text-sm font-bold text-[#16281D]">
          {isService ? 'Client Information' : 'Customer Information'}
        </span>
      </div>

      {/* Avatar and Contact */}
      <div className="p-4 sm:p-5 border-b border-[#EAEAEA] flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#16281D] flex items-center justify-center shrink-0">
          <span className="text-base font-bold text-[#9FE870]">
            {order.customer_name ? order.customer_name.charAt(0).toUpperCase() : '?'}
          </span>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-[#16281D] truncate">
            {order.customer_name || (isService ? 'Unknown Client' : 'Unknown Customer')}
          </div>
          <div className="text-xs text-[#71717A] font-medium truncate">
            {order.customer_phone || 'No phone provided'}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="p-4 sm:p-5 flex flex-col">
        {infoRow(
          isService ? 'Booking Date' : 'Order Date',
          new Date(order.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        )}
        {order.estimated_delivery_date &&
          infoRow(
            isService ? 'Service / Scheduled Date' : 'Estimated Delivery Date',
            new Date(order.estimated_delivery_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          )}
        {order.updated_at &&
          infoRow(
            'Last Updated',
            new Date(order.updated_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          )}
      </div>
    </div>
  );
};

export default OrderCustomerCard;
