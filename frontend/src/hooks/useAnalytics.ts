import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AnalyticsData {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  upcomingAppointments: number;
  totalAppointments: number;
  monthlyOrders: { month: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  orderStatuses: { status: string; count: number }[];
}

export const useAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    upcomingAppointments: 0,
    totalAppointments: 0,
    monthlyOrders: [],
    monthlyRevenue: [],
    orderStatuses: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/get-analytics`;

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(functionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

      setAnalytics(result.analytics);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analytics');
      console.error('Fetch analytics error:', err);
    } finally {
      setLoading(false);
    }
  }, [functionUrl]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
  };
};