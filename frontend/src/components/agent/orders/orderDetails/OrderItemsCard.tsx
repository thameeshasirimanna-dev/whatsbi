import React, { useState, useEffect } from 'react';
import { Package, Briefcase, Pencil, Check, X, Save, MapPin, FileText, Plus, Trash2, Minus } from 'lucide-react';
import { OrderDetails, BusinessType, OrderItem, OrderUpdatePayload } from './types';

interface OrderItemsCardProps {
  order: OrderDetails;
  businessType?: BusinessType;
  onUpdateOrder?: (payload: OrderUpdatePayload) => Promise<void> | void;
  updating?: boolean;
}

export const OrderItemsCard: React.FC<OrderItemsCardProps> = ({
  order,
  businessType = 'product',
  onUpdateOrder,
  updating = false,
}) => {
  const isService = businessType === 'service';
  const items = order.order_details.items || [];
  const totalAmount = Number(order.order_details.total_amount) || 0;
  const advanceAmount = Number(order.advance_amount || 0);
  const balanceDue = Math.max(0, totalAmount - advanceAmount);
  const notes = order.order_details.notes;
  const shippingAddress = order.order_details.shipping_address;

  // Item editing state
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [draftItems, setDraftItems] = useState<OrderItem[]>(items);

  useEffect(() => {
    setDraftItems(order.order_details.items || []);
  }, [order.order_details.items]);

  const draftItemsSubtotal = draftItems.reduce(
    (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.price) || 0),
    0
  );

  const handleItemFieldChange = (index: number, field: keyof OrderItem, val: any) => {
    setDraftItems((prev) => {
      const next = [...prev];
      const updated = { ...next[index], [field]: val };
      if (field === 'quantity' || field === 'price') {
        const q = field === 'quantity' ? Number(val) : updated.quantity;
        const p = field === 'price' ? Number(val) : updated.price;
        updated.total = (Number(q) || 0) * (Number(p) || 0);
      }
      next[index] = updated;
      return next;
    });
  };

  const handleAddItemRow = () => {
    setDraftItems((prev) => [
      ...prev,
      {
        name: '',
        quantity: 1,
        price: 0,
        total: 0,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveItems = async () => {
    if (!onUpdateOrder) return;
    const validItems = draftItems.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) return;
    const newTotal = validItems.reduce(
      (sum, it) => sum + (Number(it.quantity) || 1) * (Number(it.price) || 0),
      0
    );
    await onUpdateOrder({
      items: validItems.map((it) => ({
        name: it.name.trim(),
        quantity: Number(it.quantity) || 1,
        price: Number(it.price) || 0,
        total: (Number(it.quantity) || 1) * (Number(it.price) || 0),
      })),
      total_amount: newTotal,
    });
    setIsEditingItems(false);
  };

  const handleCancelItems = () => {
    setDraftItems(order.order_details.items || []);
    setIsEditingItems(false);
  };

  // Inline edit state for notes and shipping address
  const [isEditing, setIsEditing] = useState(false);
  const [draftAddress, setDraftAddress] = useState(shippingAddress || '');
  const [draftNotes, setDraftNotes] = useState(notes || '');

  useEffect(() => {
    setDraftAddress(shippingAddress || '');
    setDraftNotes(notes || '');
  }, [shippingAddress, notes]);

  const handleSaveDetails = async () => {
    if (!onUpdateOrder) return;
    await onUpdateOrder({
      shipping_address: draftAddress.trim(),
      notes: draftNotes.trim(),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setDraftAddress(shippingAddress || '');
    setDraftNotes(notes || '');
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 h-full flex-1">
      {/* Items Card */}
      <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col shrink-0">
        <div className="p-3.5 sm:px-4 py-3 sm:py-3.5 border-b border-[#EAEAEA] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
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

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#71717A] bg-[#F4F7F4] px-2.5 py-0.5 rounded-full border border-[#EAEAEA]">
              {isEditingItems ? draftItems.length : items.length}{' '}
              {(isEditingItems ? draftItems.length : items.length) === 1
                ? isService ? 'service' : 'item'
                : isService ? 'services' : 'items'}
            </span>

            {onUpdateOrder && !isEditingItems && (
              <button
                type="button"
                onClick={() => setIsEditingItems(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] text-xs font-bold transition-all cursor-pointer active:scale-95 border-0"
              >
                <Pencil size={11} strokeWidth={2.4} />
                <span>Edit Items</span>
              </button>
            )}
          </div>
        </div>

        {isEditingItems ? (
          /* Editable Items Mode */
          <div className="flex flex-col">
            <div className="p-3 sm:p-4 flex flex-col gap-3 max-h-[380px] overflow-y-auto divide-y divide-[#EAEAEA]">
              {draftItems.map((item, index) => (
                <div key={index} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <div className="flex-1 min-w-0">
                    <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                      {isService ? 'Service / Item Name' : 'Item Name'}
                    </label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemFieldChange(index, 'name', e.target.value)}
                      placeholder="Enter item or service name..."
                      className="w-full h-9 px-3 text-xs sm:text-sm text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div>
                      <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                        {isService ? 'Units' : 'Qty'}
                      </label>
                      <div className="flex items-center border border-[#EAEAEA] rounded-xl overflow-hidden bg-[#F4F7F4] h-9">
                        <button
                          type="button"
                          onClick={() => handleItemFieldChange(index, 'quantity', Math.max(1, Number(item.quantity || 1) - 1))}
                          className="w-7 h-full flex items-center justify-center text-[#71717A] hover:text-[#16281D] hover:bg-[#EAEAEA] transition-colors cursor-pointer border-0"
                        >
                          <Minus size={11} strokeWidth={2.4} />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemFieldChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-10 text-center text-xs font-mono font-bold text-[#16281D] bg-transparent border-0 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleItemFieldChange(index, 'quantity', Number(item.quantity || 1) + 1)}
                          className="w-7 h-full flex items-center justify-center text-[#71717A] hover:text-[#16281D] hover:bg-[#EAEAEA] transition-colors cursor-pointer border-0"
                        >
                          <Plus size={11} strokeWidth={2.4} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                        Price (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleItemFieldChange(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-24 h-9 px-2.5 text-xs font-mono font-bold text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] outline-none"
                      />
                    </div>

                    <div className="text-right min-w-[70px]">
                      <label className="text-[10px] font-bold text-[#71717A] uppercase tracking-wider block mb-1">
                        Total
                      </label>
                      <div className="h-9 flex items-center justify-end font-mono text-xs font-bold text-[#16281D]">
                        Rs. {((Number(item.quantity) || 1) * (Number(item.price) || 0)).toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(index)}
                      className="h-9 w-9 mt-4 flex items-center justify-center rounded-xl bg-transparent hover:bg-[#FEE2E2] text-[#71717A] hover:text-[#EF4444] transition-colors cursor-pointer border-0 shrink-0"
                      title="Remove item"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Item Row Button */}
            <div className="p-3 sm:px-4 border-t border-[#EAEAEA] bg-[#FAFAFA] flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#F4F7F4] text-[#16281D] text-xs font-bold border border-[#EAEAEA] transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>Add {isService ? 'Service' : 'Item'}</span>
              </button>

              <div className="text-xs text-[#71717A]">
                Updated Subtotal:{' '}
                <span className="font-mono font-bold text-[#16281D]">
                  Rs. {draftItemsSubtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Edit Action Bar */}
            <div className="p-3.5 sm:px-4 border-t border-[#EAEAEA] bg-[#F4F7F4]/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelItems}
                disabled={updating}
                className="h-8 px-3.5 rounded-full bg-white hover:bg-[#EAEAEA] text-[#52525B] text-xs font-bold transition-all border border-[#EAEAEA] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItems}
                disabled={updating}
                className="h-8 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 border-0"
              >
                <Save size={12} strokeWidth={2.4} />
                <span>{updating ? 'Saving…' : 'Save Items'}</span>
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs font-medium text-[#71717A]">
            {isService ? 'No services in this booking' : 'No items in this order'}
          </div>
        ) : (
          <div>
            <div className="max-h-[300px] overflow-y-auto divide-y divide-[#EAEAEA]">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-3 sm:p-3.5 md:p-4 flex items-center justify-between gap-3 hover:bg-[#FAFFFE] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-5 h-5 rounded-full bg-[#F4F7F4] text-[#71717A] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-bold text-[#16281D] truncate">
                        {item.name}
                      </div>
                      <div className="text-xs text-[#71717A] mt-0.5">
                        {isService ? 'Units: ' : 'Qty: '}
                        <span className="font-bold text-[#16281D]">{item.quantity}</span>
                        {' × '}
                        <span className="font-mono font-medium">Rs. {item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs sm:text-sm font-bold text-[#16281D] shrink-0 text-right">
                    Rs. {item.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Breakdown Table Footer */}
            <div className="p-3.5 sm:p-4 border-t border-[#EAEAEA] bg-[#F4F7F4]/60 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs text-[#71717A]">
                <span>Items Subtotal</span>
                <span className="font-mono font-bold text-[#16281D]">
                  Rs. {totalAmount.toFixed(2)}
                </span>
              </div>

              {advanceAmount > 0 && (
                <div className="flex justify-between items-center text-xs text-[#059669]">
                  <span>Advance / Deposit Paid</span>
                  <span className="font-mono font-bold">
                    - Rs. {advanceAmount.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-[#EAEAEA]/80 flex justify-between items-center">
                <span className="text-xs sm:text-sm font-bold text-[#16281D]">
                  {balanceDue === 0 ? 'Total (Paid in Full)' : 'Balance Due'}
                </span>
                <span
                  className={`font-mono text-sm sm:text-base font-extrabold ${
                    balanceDue === 0 ? 'text-[#059669]' : 'text-[#E11D48]'
                  }`}
                >
                  Rs. {balanceDue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Additional Information (Notes / Shipping or Service Location) with Inline Edit */}
      <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_2px_8px_rgba(0,0,0,0.03)] p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-[#EAEAEA]">
          <div className="text-sm font-bold text-[#16281D]">
            {isService ? 'Service Location & Instructions' : 'Delivery & Order Instructions'}
          </div>

          {onUpdateOrder && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] text-xs font-bold transition-all cursor-pointer active:scale-95 border-0"
            >
              <Pencil size={11} strokeWidth={2.4} />
              <span>Edit</span>
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-3 flex-1 justify-between">
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-[#16281D] flex items-center gap-1.5 mb-1.5">
                  <MapPin size={12} className="text-[#71717A]" />
                  <span>{isService ? 'Service Location / Address' : 'Shipping / Delivery Address'}</span>
                </label>
                <input
                  type="text"
                  value={draftAddress}
                  onChange={(e) => setDraftAddress(e.target.value)}
                  placeholder="Enter destination or service address..."
                  className="w-full h-10 px-3.5 text-xs sm:text-sm text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#16281D] flex items-center gap-1.5 mb-1.5">
                  <FileText size={12} className="text-[#71717A]" />
                  <span>{isService ? 'Service Notes & Instructions' : 'Order Notes'}</span>
                </label>
                <textarea
                  rows={3}
                  value={draftNotes}
                  onChange={(e) => setDraftNotes(e.target.value)}
                  placeholder="Enter client instructions, delivery requests, or terms..."
                  className="w-full p-3 text-xs sm:text-sm text-[#16281D] bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl focus:bg-white focus:border-[#16281D] focus:ring-2 focus:ring-[#9FE870]/30 outline-none transition-all resize-none flex-1 min-h-[72px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 mt-auto">
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={updating}
                className="h-8 px-3.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#52525B] text-xs font-bold transition-all border border-[#EAEAEA] cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={updating}
                className="h-8 px-4 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 border-0"
              >
                <Save size={12} strokeWidth={2.4} />
                <span>{updating ? 'Saving…' : 'Save Details'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 flex-1">
            {/* Shipping Address */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
                <MapPin size={12} className="text-[#71717A]" />
                <span>{isService ? 'Service Location / Address' : 'Shipping Address'}</span>
              </div>
              <div className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl p-3 text-xs sm:text-sm text-[#16281D] leading-relaxed flex-1 min-h-[56px]">
                {shippingAddress || <span className="text-[#A1A1AA] italic">No shipping address recorded</span>}
              </div>
            </div>

            {/* Notes */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#71717A] uppercase tracking-wider mb-1.5">
                <FileText size={12} className="text-[#71717A]" />
                <span>{isService ? 'Service Notes & Instructions' : 'Notes'}</span>
              </div>
              <div className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl p-3 text-xs sm:text-sm text-[#16281D] leading-relaxed flex-1 min-h-[56px]">
                {notes || <span className="text-[#A1A1AA] italic">No order notes provided</span>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderItemsCard;
