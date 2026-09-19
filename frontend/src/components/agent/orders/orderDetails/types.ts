import React from 'react';

export type BusinessType = 'product' | 'service';

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderDetails {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  order_details: {
    items: OrderItem[];
    total_amount: number;
    notes?: string;
    shipping_address?: string;
  };
  advance_amount?: number;
  payment_status?: string;
  status: string;
  estimated_delivery_date?: string;
  created_at: string;
  updated_at?: string;
  prev_order_id?: number | null;
  next_order_id?: number | null;
}

export const getStatusStyle = (status: string): React.CSSProperties => {
  const s = status ? status.toLowerCase() : '';
  if (s === 'pending') return { background: 'rgba(245,158,11,0.1)', color: '#B45309', borderRadius: 9999 };
  if (s === 'confirmed') return { background: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: 9999 };
  if (s === 'processing' || s === 'in_progress') return { background: 'rgba(59,130,246,0.1)', color: '#1D4ED8', borderRadius: 9999 };
  if (s === 'shipped') return { background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderRadius: 9999 };
  if (s === 'delivered' || s === 'completed') return { background: 'rgba(34,197,94,0.1)', color: '#15803D', borderRadius: 9999 };
  if (s === 'cancelled') return { background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: 9999 };
  return { background: '#F4F7F4', color: '#71717a', borderRadius: 9999 };
};

export const getPaymentStatusStyle = (paymentStatus: string): React.CSSProperties => {
  const s = paymentStatus?.toLowerCase() || 'unpaid';
  if (s === 'paid') return { background: 'rgba(34,197,94,0.1)', color: '#15803D', borderRadius: 9999 };
  if (s === 'partially_paid') return { background: 'rgba(59,130,246,0.1)', color: '#1D4ED8', borderRadius: 9999 };
  if (s === 'unpaid') return { background: 'rgba(239,68,68,0.1)', color: '#EF4444', borderRadius: 9999 };
  return { background: '#F4F7F4', color: '#71717a', borderRadius: 9999 };
};
