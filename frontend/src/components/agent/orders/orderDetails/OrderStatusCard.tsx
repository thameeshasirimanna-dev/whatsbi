import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, CheckCircle2, ArrowRight, Zap, Calendar, Save, Check } from 'lucide-react';
import CustomDropdown from '../../shared/CustomDropdown';
import { DatePicker } from '../../shared/DatePicker';
import {
  OrderDetails,
  BusinessType,
  OrderUpdatePayload,
  getStatusDotColor,
  getPaymentStatusDotColor,
} from './types';

interface OrderStatusCardProps {
  order: OrderDetails;
  businessType?: BusinessType;
  updatingStatus: boolean;
  onUpdateOrder: (payload: OrderUpdatePayload) => Promise<void> | void;
  onSendWhatsApp: () => void;
}

export const OrderStatusCard: React.FC<OrderStatusCardProps> = ({
  order,
  businessType = 'product',
  updatingStatus,
  onUpdateOrder,
  onSendWhatsApp,
}) => {
  const isService = businessType === 'service';
  const totalAmount = Number(order.order_details.total_amount) || 0;

  // Local draft states
  const [draftStatus, setDraftStatus] = useState(order.status);
  const [draftPaymentStatus, setDraftPaymentStatus] = useState(order.payment_status || 'unpaid');
  const [draftAdvanceAmount, setDraftAdvanceAmount] = useState(Number(order.advance_amount || 0));
  const [draftDeliveryDate, setDraftDeliveryDate] = useState(order.estimated_delivery_date || '');

  // Sync draft states when active order changes
  useEffect(() => {
    setDraftStatus(order.status);
    setDraftPaymentStatus(order.payment_status || 'unpaid');
    setDraftAdvanceAmount(Number(order.advance_amount || 0));
    setDraftDeliveryDate(order.estimated_delivery_date || '');
  }, [order.id, order.status, order.payment_status, order.advance_amount, order.estimated_delivery_date]);

  // Compute changes
  const isStatusChanged = draftStatus !== order.status;
  const isPaymentChanged = draftPaymentStatus !== (order.payment_status || 'unpaid');
  const isAdvanceChanged = Math.abs(draftAdvanceAmount - Number(order.advance_amount || 0)) > 0.009;
  const isDeliveryDateChanged = (draftDeliveryDate || '') !== (order.estimated_delivery_date || '');
  const hasChanges = isStatusChanged || isPaymentChanged || isAdvanceChanged || isDeliveryDateChanged;

  // Status dropdown options
  const statusOptions = useMemo(() => {
    if (isService) {
      const base = [
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'processing', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ];
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

  // Next suggested workflow status
  const nextSuggestedStatus = useMemo(() => {
    const s = order.status.toLowerCase();
    if (s === 'pending') return { status: 'confirmed', label: 'Confirm Order' };
    if (s === 'confirmed') return { status: 'processing', label: isService ? 'Start Service' : 'Start Processing' };
    if (s === 'processing' || s === 'in_progress') return isService ? { status: 'completed', label: 'Mark Completed' } : { status: 'shipped', label: 'Mark Shipped' };
    if (s === 'shipped') return { status: 'delivered', label: 'Mark Delivered' };
    return null;
  }, [order.status, isService]);

  const handleSave = async () => {
    if (!hasChanges) return;
    const payload: OrderUpdatePayload = {};
    if (isStatusChanged) payload.status = draftStatus;
    if (isPaymentChanged) payload.payment_status = draftPaymentStatus;
    if (isAdvanceChanged) payload.advance_amount = draftAdvanceAmount;
    if (isDeliveryDateChanged) payload.estimated_delivery_date = draftDeliveryDate ? draftDeliveryDate : null;
    await onUpdateOrder(payload);
  };

  const handleQuickStatus = async (status: string) => {
    setDraftStatus(status);
    await onUpdateOrder({ status });
  };

  const handleQuickMarkPaid = async () => {
    setDraftPaymentStatus('paid');
    setDraftAdvanceAmount(totalAmount);
    await onUpdateOrder({
      payment_status: 'paid',
      advance_amount: totalAmount,
    });
  };

  const currentBalanceDue = Math.max(0, totalAmount - draftAdvanceAmount);

  return (
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-3.5 sm:p-4 flex flex-col gap-3.5 shrink-0">
      <div className="flex items-center justify-between pb-3 border-b border-[#EAEAEA]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} strokeWidth={2.4} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#16281D]">Order Management</h3>
            <p className="text-[11px] text-[#71717A]">Update status, payments & schedule</p>
          </div>
        </div>

        {hasChanges && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] animate-pulse">
            Unsaved Changes
          </span>
        )}
      </div>

      {/* 1. Fulfillment Status */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#16281D] flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: getStatusDotColor(draftStatus) }}
            />
            <span>Fulfillment Status</span>
          </label>
        </div>

        <CustomDropdown
          value={draftStatus}
          onChange={(val) => setDraftStatus(val)}
          options={statusOptions}
          className="w-full"
        />

        {/* Quick Next Workflow Action Button */}
        {nextSuggestedStatus && (
          <button
            type="button"
            onClick={() => handleQuickStatus(nextSuggestedStatus.status)}
            disabled={updatingStatus}
            className="w-full h-8 px-3 rounded-full bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-98"
          >
            <Zap size={12} strokeWidth={2.4} />
            <span>Next: {nextSuggestedStatus.label}</span>
            <ArrowRight size={12} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* 2. Payment Status & Advance Amount */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[#EAEAEA]/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-[#16281D] flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: getPaymentStatusDotColor(draftPaymentStatus) }}
            />
            <span>Payment Status</span>
          </label>
          <span className="font-mono text-xs font-bold text-[#71717A]">
            Bal: Rs. {currentBalanceDue.toFixed(2)}
          </span>
        </div>

        {/* Payment Status Segmented Selector */}
        <div className="grid grid-cols-3 gap-1 bg-[#F4F7F4] p-1 rounded-xl border border-[#EAEAEA]">
          {[
            { value: 'unpaid', label: 'Unpaid' },
            { value: 'partially_paid', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setDraftPaymentStatus(opt.value);
                if (opt.value === 'paid') {
                  setDraftAdvanceAmount(totalAmount);
                } else if (opt.value === 'unpaid') {
                  setDraftAdvanceAmount(0);
                }
              }}
              className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border-0 ${
                draftPaymentStatus === opt.value
                  ? 'bg-white text-[#16281D] shadow-xs'
                  : 'bg-transparent text-[#71717A] hover:text-[#16281D]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Advance / Paid Amount Input */}
        {draftPaymentStatus !== 'paid' && (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#71717A]">
              <span>Advance / Deposit Paid:</span>
              <span className="font-mono">Rs. {draftAdvanceAmount.toFixed(2)}</span>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#71717A] font-bold">
                Rs.
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={draftAdvanceAmount || ''}
                placeholder="0.00"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  const parsed = isNaN(val) ? 0 : Math.max(0, val);
                  setDraftAdvanceAmount(parsed);
                  if (parsed >= totalAmount && totalAmount > 0) {
                    setDraftPaymentStatus('paid');
                  } else if (parsed > 0) {
                    setDraftPaymentStatus('partially_paid');
                  } else {
                    setDraftPaymentStatus('unpaid');
                  }
                }}
                className="w-full h-9 pl-9 pr-3 text-xs font-mono font-bold text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  setDraftAdvanceAmount(totalAmount);
                  setDraftPaymentStatus('paid');
                }}
                className="flex-1 py-1 px-2 rounded-lg text-[10.5px] font-bold bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] cursor-pointer transition-all"
              >
                Full (Paid)
              </button>
              {totalAmount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const half = Number((totalAmount / 2).toFixed(2));
                    setDraftAdvanceAmount(half);
                    setDraftPaymentStatus('partially_paid');
                  }}
                  className="flex-1 py-1 px-2 rounded-lg text-[10.5px] font-bold bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1D4ED8] border border-[#BFDBFE] cursor-pointer transition-all"
                >
                  50% Deposit
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDraftAdvanceAmount(0);
                  setDraftPaymentStatus('unpaid');
                }}
                className="flex-1 py-1 px-2 rounded-lg text-[10.5px] font-bold bg-[#F4F4F5] hover:bg-[#E4E4E7] text-[#52525B] border border-[#E4E4E7] cursor-pointer transition-all"
              >
                Clear (Rs. 0)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Estimated Delivery / Scheduled Date */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-[#EAEAEA]/80">
        <label className="text-xs font-bold text-[#16281D] flex items-center gap-1.5">
          <Calendar size={13} className="text-[#71717A]" />
          <span>{isService ? 'Service Scheduled Date' : 'Estimated Delivery Date'}</span>
        </label>
        <DatePicker
          value={draftDeliveryDate || null}
          onChange={(val) => setDraftDeliveryDate(val || '')}
          placeholder="Select delivery / scheduled date..."
          className="w-full"
          variant="white"
          triggerClassName="!h-9 !rounded-xl !border-[#EAEAEA] !bg-[#F4F7F4] focus:!bg-white text-xs"
        />
      </div>

      {/* Action Buttons Cluster */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[#EAEAEA]">
        <button
          type="button"
          onClick={handleSave}
          disabled={updatingStatus || !hasChanges}
          className={`w-full h-10 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-2 border-0 ${
            hasChanges
              ? 'bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] shadow-[0_2px_10px_rgba(159,232,112,0.35)] cursor-pointer active:scale-98'
              : 'bg-[#F4F7F4] text-[#A1A1AA] cursor-not-allowed'
          }`}
        >
          {updatingStatus ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#16281D]/30 border-t-[#16281D] animate-spin" />
              <span>Saving Changes…</span>
            </>
          ) : hasChanges ? (
            <>
              <Save size={14} strokeWidth={2.4} />
              <span>Save Changes</span>
            </>
          ) : (
            <>
              <Check size={14} strokeWidth={2.4} />
              <span>All Changes Saved</span>
            </>
          )}
        </button>

        {order.payment_status !== 'paid' && (
          <button
            type="button"
            onClick={handleQuickMarkPaid}
            disabled={updatingStatus}
            className="w-full h-9 rounded-full bg-[#16281D] text-[#9FE870] hover:bg-[#16281D]/90 border-0 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98 shadow-xs"
          >
            <CheckCircle2 size={13} strokeWidth={2.4} />
            <span>Mark as Fully Paid</span>
          </button>
        )}

        <button
          type="button"
          onClick={onSendWhatsApp}
          className="w-full h-9 bg-[#F4F7F4] hover:bg-[#9FE870]/15 text-[#16281D] border border-[#EAEAEA] rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <MessageSquare size={13} strokeWidth={2.2} />
          <span>Send WhatsApp Update</span>
        </button>
      </div>
    </div>
  );
};

export default OrderStatusCard;
