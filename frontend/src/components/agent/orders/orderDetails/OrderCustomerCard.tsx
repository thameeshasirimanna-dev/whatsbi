import React, { useState, useEffect } from 'react';
import { Package, Briefcase, Phone, MessageCircle, Copy, Check, Calendar, Clock, Pencil, Save, User } from 'lucide-react';
import { OrderDetails, BusinessType, OrderUpdatePayload } from './types';

interface OrderCustomerCardProps {
  order: OrderDetails;
  businessType?: BusinessType;
  onUpdateCustomer?: (payload: OrderUpdatePayload) => Promise<void> | void;
  updating?: boolean;
}

const infoRow = (label: string, value: string | React.ReactNode, icon?: React.ReactNode) => (
  <div className="mb-3.5 last:mb-0">
    <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#71717A] uppercase tracking-wider mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-[13px] font-semibold text-[#16281D]">
      {value}
    </div>
  </div>
);

export const OrderCustomerCard: React.FC<OrderCustomerCardProps> = ({
  order,
  businessType = 'product',
  onUpdateCustomer,
  updating = false,
}) => {
  const [copied, setCopied] = useState(false);
  const isService = businessType === 'service';
  const cleanPhone = order.customer_phone ? order.customer_phone.replace(/\D/g, '') : '';

  // Customer inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(order.customer_name || '');
  const [draftPhone, setDraftPhone] = useState(order.customer_phone || '');

  useEffect(() => {
    setDraftName(order.customer_name || '');
    setDraftPhone(order.customer_phone || '');
  }, [order.customer_name, order.customer_phone]);

  const handleCopyPhone = () => {
    if (!order.customer_phone) return;
    navigator.clipboard.writeText(order.customer_phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCustomer = async () => {
    if (!onUpdateCustomer) return;
    await onUpdateCustomer({
      customer_name: draftName.trim(),
      customer_phone: draftPhone.trim(),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDraftName(order.customer_name || '');
    setDraftPhone(order.customer_phone || '');
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden flex-1 flex flex-col justify-between">
      <div className="p-3.5 sm:px-4 py-3 sm:py-3.5 border-b border-[#EAEAEA] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
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

        <div className="flex items-center gap-2">
          {order.customer_id && (
            <span className="font-mono text-[10.5px] font-bold text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-md border border-[#EAEAEA]">
              ID #{order.customer_id}
            </span>
          )}

          {onUpdateCustomer && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] text-xs font-bold transition-all cursor-pointer active:scale-95 border-0"
              title="Edit customer details"
            >
              <Pencil size={11} strokeWidth={2.4} />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      {/* Avatar and Contact or Edit Form */}
      <div className="p-3.5 sm:p-4 border-b border-[#EAEAEA] flex flex-col gap-3">
        {isEditing ? (
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10.5px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                {isService ? 'Client Name' : 'Customer Name'}
              </label>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Customer full name..."
                className="w-full h-9 px-3 text-xs sm:text-sm text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                placeholder="+94 7X XXX XXXX"
                className="w-full h-9 px-3 text-xs sm:text-sm font-mono text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={updating}
                className="h-7 px-3 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#52525B] text-xs font-bold transition-all border border-[#EAEAEA] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                disabled={updating}
                className="h-7 px-3.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50 active:scale-95 border-0"
              >
                <Save size={11} strokeWidth={2.4} />
                <span>{updating ? 'Saving…' : 'Save'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#16281D] flex items-center justify-center shrink-0 shadow-xs">
                <span className="text-base font-extrabold text-[#9FE870]">
                  {order.customer_name ? order.customer_name.charAt(0).toUpperCase() : '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-[#16281D] truncate">
                  {order.customer_name || (isService ? 'Unknown Client' : 'Unknown Customer')}
                </div>
                <div className="text-xs font-mono text-[#71717A] font-medium truncate mt-0.5">
                  {order.customer_phone || 'No phone provided'}
                </div>
              </div>
            </div>

            {/* Quick Communication Actions */}
            {cleanPhone && (
              <div className="flex items-center gap-1.5 pt-1">
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#059669] border border-[#A7F3D0] text-[11px] font-bold transition-all no-underline active:scale-95"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle size={12} strokeWidth={2.4} /> WhatsApp
                </a>
                <a
                  href={`tel:${cleanPhone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] border border-[#EAEAEA] text-[11px] font-bold transition-all no-underline active:scale-95"
                  title="Call Customer"
                >
                  <Phone size={12} strokeWidth={2.4} /> Call
                </a>
                <button
                  type="button"
                  onClick={handleCopyPhone}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#52525B] border border-[#EAEAEA] text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                  title="Copy Phone Number"
                >
                  {copied ? <Check size={12} className="text-[#059669]" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dates Section */}
      <div className="p-3.5 sm:p-4 flex flex-col mt-auto bg-[#F4F7F4]/30 border-t border-[#EAEAEA]/60">
        {infoRow(
          isService ? 'Booking Date & Time' : 'Order Date & Time',
          <div className="flex flex-col gap-0.5">
            <span>
              {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="text-[11px] font-mono text-[#71717A]">
              {new Date(order.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>,
          <Calendar size={12} className="text-[#71717A]" />
        )}

        {order.estimated_delivery_date &&
          infoRow(
            isService ? 'Service / Scheduled Date' : 'Estimated Delivery Date',
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#15803D]">
                {new Date(order.estimated_delivery_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                Scheduled
              </span>
            </div>,
            <Clock size={12} className="text-[#15803D]" />
          )}

        {order.updated_at &&
          infoRow(
            'Last Updated',
            <span className="text-xs font-mono text-[#71717A]">
              {new Date(order.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}{' '}
              {new Date(order.updated_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>,
            <Clock size={12} className="text-[#71717A]" />
          )}
      </div>
    </div>
  );
};

export default OrderCustomerCard;
