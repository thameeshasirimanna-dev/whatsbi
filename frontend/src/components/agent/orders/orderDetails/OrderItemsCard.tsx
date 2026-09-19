import React from 'react';
import { Package, Briefcase } from 'lucide-react';
import { OrderDetails, BusinessType } from './types';

interface OrderItemsCardProps {
  order: OrderDetails;
  businessType?: BusinessType;
}

export const OrderItemsCard: React.FC<OrderItemsCardProps> = ({
  order,
  businessType = 'product',
}) => {
  const isService = businessType === 'service';
  const items = order.order_details.items;
  const totalAmount = Number(order.order_details.total_amount) || 0;
  const notes = order.order_details.notes;
  const shippingAddress = order.order_details.shipping_address;

  return (
    <div className="flex flex-col gap-4">
      {/* Items Card */}
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
            {isService ? 'Booked Services & Packages' : 'Order Items'}
          </span>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-xs font-medium text-[#71717A]">
            {isService ? 'No services in this booking' : 'No items in this order'}
          </div>
        ) : (
          <div>
            <div className="max-h-[280px] overflow-y-auto divide-y divide-[#EAEAEA]">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-3.5 sm:px-5 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#16281D] truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-[#71717A] mt-0.5">
                      {isService ? 'Units / Qty: ' : 'Qty: '}
                      {item.quantity} ×{' '}
                      <span className="font-mono font-medium">Rs. {item.price.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-[#16281D] shrink-0">
                    Rs. {item.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3.5 sm:px-5 border-t border-[#EAEAEA] flex justify-between items-center bg-[#F4F7F4]">
              <span className="text-xs sm:text-sm font-bold text-[#16281D]">Total</span>
              <span className="font-mono text-sm sm:text-base font-extrabold text-[#16281D]">
                Rs. {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Additional Information (Notes / Shipping or Service Address) */}
      {(notes || shippingAddress) && (
        <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-xs p-4 sm:p-5">
          <div className="text-sm font-bold text-[#16281D] mb-3.5">
            Additional Information
          </div>

          {notes && (
            <div className="mb-3 last:mb-0">
              <div className="text-[10.5px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
                {isService ? 'Service Notes & Instructions' : 'Notes'}
              </div>
              <div className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl p-3 text-xs sm:text-sm text-[#16281D] leading-relaxed">
                {notes}
              </div>
            </div>
          )}

          {shippingAddress && (
            <div className="mb-3 last:mb-0">
              <div className="text-[10.5px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
                {isService ? 'Service Location / Address' : 'Shipping Address'}
              </div>
              <div className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl p-3 text-xs sm:text-sm text-[#16281D] leading-relaxed">
                {shippingAddress}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderItemsCard;
