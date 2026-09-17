import React from 'react';

export interface DashboardAgent {
  id?: number;
  name: string;
  credits?: number;
  template_credits?: number;
  ai_balance?: number;
  balance?: number;
}

export interface DashboardMetrics {
  activeConversations: number;
  totalCustomers: number;
  ordersToday: number;
  avgResponseTime: string;
  balance?: number;
  ai_balance?: number;
  template_credits?: number;
}

export interface RecentActivity {
  id: string;
  type: 'conversation' | 'order' | 'customer';
  title: string;
  description: string;
  time: string;
  status: 'new' | 'active' | 'completed';
}

export interface MetricItem {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down';
  color?: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
}
