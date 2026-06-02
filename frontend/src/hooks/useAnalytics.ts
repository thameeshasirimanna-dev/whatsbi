import React, { useState, useEffect, useCallback } from "react";
import { getToken } from "../lib/auth";

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
  leadStages: { stage: string; count: number }[];
  monthlyMessages: { month: string; inbound: number; outbound: number }[];
  customerGrowth: string;
  orderGrowth: string;
  revenueGrowth: string;
  appointmentGrowth: string;
  profit: number;
  expense: number;
  paymentGateways: { name: string; amount: number }[];
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
    leadStages: [],
    monthlyMessages: [],
    customerGrowth: "0%",
    orderGrowth: "0%",
    revenueGrowth: "0%",
    appointmentGrowth: "0%",
    profit: 0,
    expense: 0,
    paymentGateways: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${backendUrl}/get-analytics`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch analytics");
      }

      setAnalytics(result.analytics);
    } catch (err: any) {
      setError(err.message || "Failed to fetch analytics");
      console.error("Fetch analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

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
