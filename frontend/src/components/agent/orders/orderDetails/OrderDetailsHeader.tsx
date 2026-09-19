import React from 'react';
import { ArrowLeft, Printer, RotateCw } from 'lucide-react';
import {
  OrderDetails,
  BusinessType,
  getStatusStyle,
  getPaymentStatusStyle,
  getStatusDotColor,
  getPaymentStatusDotColor,
} from './types';
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
  onRefresh?: () => void;
  refreshing?: boolean;
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
  onRefresh,
  refreshing = false,
}) => {
  const isService = businessType === 'service';

  const formatStatusLabel = (status: string) => {
    if (!status) return 'Pending';
    const s = status.toLowerCase();
    if (isService && (s === 'processing' || s === 'in_progress')) return 'In Progress';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-3.5 sm:p-4 flex flex-col gap-3">
      {/* Top Row: Back Button + Order ID + Next/Prev Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer transition-all shrink-0 active:scale-95"
            title="Back to Orders"
          >
            <ArrowLeft size={14} strokeWidth={2.4} /> Back
          </button>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-extrabold text-[#16281D] font-mono tracking-tight truncate leading-tight">
              {isService ? 'Booking' : 'Order'} #{order.id.toString().padStart(4, '0')}
            </div>
            <div className="text-[11px] sm:text-xs text-[#71717A] truncate font-medium">
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
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#EAEAEA]">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Fulfillment Status Badge with Dot Token */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight select-none"
            style={getStatusStyle(order.status)}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
              style={{ backgroundColor: getStatusDotColor(order.status) }}
            />
            <span>Status: {formatStatusLabel(order.status)}</span>
          </span>

          {/* Payment Status Badge with Dot Token */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight select-none"
            style={getPaymentStatusStyle(order.payment_status || 'unpaid')}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: getPaymentStatusDotColor(order.payment_status || 'unpaid') }}
            />
            <span>
              Payment:{' '}
              {order.payment_status === 'partially_paid'
                ? 'Partially Paid'
                : order.payment_status === 'paid'
                ? 'Paid'
                : 'Unpaid'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh order data"
              className="inline-flex items-center justify-center gap-1.5 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] rounded-full h-8 px-3 text-xs font-bold cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCw size={13} strokeWidth={2.4} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] rounded-full h-8 px-3.5 text-xs font-bold cursor-pointer transition-all active:scale-95"
          >
            <Printer size={13} strokeWidth={2.2} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsHeader;

