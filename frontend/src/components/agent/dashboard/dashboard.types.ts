import React from 'react';

export interface DashboardAgent {
  id?: number;
  name: string;
  credits?: number;
  template_credits?: number;
  ai_balance?: number;
  balance?: number;
}

export interface TelemetryPoint {
  label: string;
  value: number;
}

export interface DashboardTelemetry {
  throughput?: {
    hourly: TelemetryPoint[];
    daily: TelemetryPoint[];
    currentRate: number;
    unit: string;
  };
  tokenUsage?: {
    monthly: TelemetryPoint[];
    weekly: TelemetryPoint[];
    totalFormatted: string;
  };
  activeConversations?: {
    hourly: TelemetryPoint[];
    daily: TelemetryPoint[];
    total: number;
  };
  quota?: {
    percentage: number;
    usedAmount: number;
    totalBudget: number;
  };
  performance?: {
    satisfaction: string;
    avgResponseTime: string;
    deliveryRate: string;
  };
}

export interface DashboardMetrics {
  activeConversations: number;
  totalCustomers: number;
  ordersToday: number;
  avgResponseTime: string;
  balance?: number;
  ai_balance?: number;
  template_credits?: number;
  telemetry?: DashboardTelemetry;
}

export interface RecentActivity {
  id: string;
  type: 'conversation' | 'order' | 'customer';
  title: string;
  description: string;
  time: string;
  status: 'new' | 'active' | 'completed' | 'pending';
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
