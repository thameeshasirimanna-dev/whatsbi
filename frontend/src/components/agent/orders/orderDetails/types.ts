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

export interface OrderUpdatePayload {
  status?: string;
  payment_status?: string;
  advance_amount?: number;
  total_amount?: number;
  estimated_delivery_date?: string | null;
  shipping_address?: string;
  notes?: string;
  items?: OrderItem[];
  customer_name?: string;
  customer_phone?: string;
}

export const getStatusDotColor = (status: string): string => {
  const s = status ? status.toLowerCase() : '';
  if (s === 'pending') return '#F59E0B';
  if (s === 'confirmed') return '#10B981';
  if (s === 'processing' || s === 'in_progress') return '#3B82F6';
  if (s === 'shipped') return '#7C3AED';
  if (s === 'delivered' || s === 'completed') return '#22C55E';
  if (s === 'cancelled') return '#EF4444';
  return '#71717A';
};

export const getPaymentStatusDotColor = (paymentStatus: string): string => {
  const s = paymentStatus?.toLowerCase() || 'unpaid';
  if (s === 'paid') return '#22C55E';
  if (s === 'partially_paid') return '#3B82F6';
  if (s === 'unpaid') return '#EF4444';
  return '#71717A';
};
