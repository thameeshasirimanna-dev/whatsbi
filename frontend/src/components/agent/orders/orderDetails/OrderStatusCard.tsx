import React, { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import CustomDropdown from '../../shared/CustomDropdown';
import { OrderDetails, BusinessType } from './types';

interface OrderStatusCardProps {
  order: OrderDetails;
  businessType?: BusinessType;
  newStatus: string;
  setNewStatus: (status: string) => void;
  updatingStatus: boolean;
  onUpdateStatus: () => void;
  onMarkAsPaid: () => void;
  onSendWhatsApp: () => void;
}

export const OrderStatusCard: React.FC<OrderStatusCardProps> = ({
  order,
  businessType = 'product',
  newStatus,
  setNewStatus,
  updatingStatus,
  onUpdateStatus,
  onMarkAsPaid,
  onSendWhatsApp,
}) => {
  const isService = businessType === 'service';
  const isStatusUnchanged = newStatus === order.status;

  const options = useMemo(() => {
    if (isService) {
      const base = [
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'processing', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ];
      // If current order status is shipped or delivered, preserve it
      if (['shipped', 'delivered'].includes(order.status) && !base.some((b) => b.value === order.status)) {
        base.splice(3, 0, {
          value: order.status,
          label: order.status.charAt(0).toUpperCase() + order.status.slice(1),
        });
      }
      return base;
    }

    return [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'completed',
      'cancelled',
    ].map((s) => ({
      value: s,
      label: s.charAt(0).toUpperCase() + s.slice(1),
    }));
  }, [isService, order.status]);

  return (
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-xs p-5">
      <div className="text-sm font-bold text-[#16281D] mb-3.5">
        Update Status
      </div>

      <div className="flex flex-col gap-3">
        <CustomDropdown
          value={newStatus}
          onChange={(val) => setNewStatus(val)}
          options={options}
          className="w-full"
        />

        <button
          type="button"
          onClick={onUpdateStatus}
          disabled={updatingStatus || isStatusUnchanged}
          style={{
            background: updatingStatus || isStatusUnchanged ? 'rgba(159,232,112,0.4)' : '#9FE870',
            color: '#16281D',
            boxShadow: updatingStatus || isStatusUnchanged ? 'none' : '0 2px 10px rgba(159,232,112,0.3)',
          }}
          className="w-full border-none rounded-full py-2.5 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-98"
        >
          {updatingStatus ? (
            <>
              <div className="w-3 h-3 rounded-full border-2 border-[#16281D]/30 border-t-[#16281D] animate-spin" />
              <span>Updating…</span>
            </>
          ) : (
            'Update Status'
          )}
        </button>

        {order.payment_status !== 'paid' && (
          <button
            type="button"
            onClick={onMarkAsPaid}
            disabled={updatingStatus}
            className="w-full bg-[#16281D] text-[#9FE870] hover:bg-[#16281D]/90 border-none rounded-full py-2.5 px-4 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-98"
          >
            Mark as Fully Paid
          </button>
        )}

        <button
          type="button"
          onClick={onSendWhatsApp}
          className="w-full bg-[#F4F7F4] hover:bg-[#9FE870]/15 text-[#16281D] border border-[#EAEAEA] rounded-full py-2.5 px-4 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <MessageSquare size={14} strokeWidth={2.2} /> Send WhatsApp Update
        </button>
      </div>
    </div>
  );
};

export default OrderStatusCard;
