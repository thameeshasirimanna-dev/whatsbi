import React from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { OrderDetails, BusinessType, getStatusStyle, getPaymentStatusStyle } from './types';
import OrderNavigationControls from './OrderNavigationControls';

interface OrderDetailsHeaderProps {
  order: OrderDetails;
  businessType?: BusinessType;
  prevOrderId: number | null;
  nextOrderId: number | null;
  currentIndex?: number;
  totalCount?: number;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onBack: () => void;
}

export const OrderDetailsHeader: React.FC<OrderDetailsHeaderProps> = ({
  order,
  businessType = 'product',
  prevOrderId,
  nextOrderId,
  currentIndex,
  totalCount,
  onNavigatePrev,
  onNavigateNext,
  onBack,
}) => {
  const isService = businessType === 'service';

  const formatStatusLabel = (status: string) => {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    if (isService && (s === 'processing' || s === 'in_progress')) return 'In Progress';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="flex flex-col gap-3.5 mb-4 sm:mb-6">
      {/* Top Row: Back Button + Order ID + Next/Prev Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] rounded-full px-3.5 py-2 text-xs font-bold cursor-pointer transition-all shrink-0 active:scale-95"
            title="Back to Orders"
          >
            <ArrowLeft size={14} strokeWidth={2.4} /> Back
          </button>
          <div className="min-w-0">
            <div className="text-xl sm:text-2xl font-extrabold text-[#16281D] font-mono tracking-tight truncate">
              Order #{order.id.toString().padStart(4, '0')}
            </div>
            <div className="text-xs text-[#71717A] truncate font-medium">
              {isService
                ? 'Service booking details and client information'
                : 'Order details and customer information'}
            </div>
          </div>
        </div>

        {/* Next / Previous Navigator */}
        <div className="flex items-center gap-2">
          <OrderNavigationControls
            prevOrderId={prevOrderId}
            nextOrderId={nextOrderId}
            currentIndex={currentIndex}
            totalCount={totalCount}
            onNavigatePrev={onNavigatePrev}
            onNavigateNext={onNavigateNext}
          />
        </div>
      </div>

      {/* Secondary Bar: Status Badges and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-[#EAEAEA]/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 11px',
              borderRadius: 9999,
              ...getStatusStyle(order.status),
            }}
          >
            Status: {formatStatusLabel(order.status)}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 11px',
              borderRadius: 9999,
              ...getPaymentStatusStyle(order.payment_status || 'unpaid'),
            }}
          >
            Payment:{' '}
            {order.payment_status === 'partially_paid'
              ? 'Partially Paid'
              : order.payment_status === 'paid'
              ? 'Paid'
              : 'Unpaid'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center justify-center gap-1.5 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] rounded-full px-4 py-2 text-xs font-bold cursor-pointer transition-all active:scale-95"
        >
          <Printer size={14} strokeWidth={2.2} /> Print Receipt
        </button>
      </div>
    </div>
  );
};

export default OrderDetailsHeader;
