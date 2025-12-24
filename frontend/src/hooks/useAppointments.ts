import React, { useState, useEffect, useCallback } from 'react';
import { getToken } from "../lib/auth";
import { Appointment } from "../types";

interface CreateAppointmentData {
  customer_id: number;
  title: string;
  appointment_date: string; // ISO string
  duration_minutes?: number;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
}

interface UpdateAppointmentData {
  title?: string;
  appointment_date?: string; // ISO string
  duration_minutes?: number;
  status?: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
}

interface FetchAppointmentsParams {
  customerId?: number | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  limit?: number;
  offset?: number;
  searchTerm?: string;
}

export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const functionUrl = `${import.meta.env.VITE_BACKEND_URL}/manage-appointments`;

  const fetchAppointments = useCallback(
    async (params: FetchAppointmentsParams = {}) => {
      try {
        setLoading(true);
        setError(null);

        const token = getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const url = new URL(functionUrl);
        if (params.customerId !== undefined && params.customerId !== null)
          url.searchParams.set("customer_id", params.customerId.toString());
        if (params.status) url.searchParams.set("status", params.status);
        if (params.startDate)
          url.searchParams.set("start_date", params.startDate);
        if (params.endDate) url.searchParams.set("end_date", params.endDate);
        if (params.limit)
          url.searchParams.set("limit", params.limit.toString());
        if (params.offset)
          url.searchParams.set("offset", params.offset.toString());

        const response = await fetch(url.toString(), {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setAppointments(data.appointments || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch appointments");
        console.error("Fetch appointments error:", err);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    },
    [functionUrl]
  );

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const createAppointment = useCallback(
    async (data: CreateAppointmentData) => {
      try {
        setError(null);

        const token = getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || "Failed to create appointment");
        }

        await fetchAppointments();
        return result.appointment.id;
      } catch (err: any) {
        setError(err.message || "Failed to create appointment");
        console.error("Create appointment error:", err);
        throw err;
      }
    },
    [functionUrl, fetchAppointments]
  );

  const updateAppointment = useCallback(
    async (id: number, data: UpdateAppointmentData) => {
      try {
        setError(null);

        const updateData = { id, ...data };
        const token = getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(functionUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || "Failed to update appointment");
        }

        await fetchAppointments();
      } catch (err: any) {
        setError(err.message || "Failed to update appointment");
        console.error("Update appointment error:", err);
        throw err;
      }
    },
    [functionUrl, fetchAppointments]
  );

  const deleteAppointment = useCallback(
    async (id: number) => {
      try {
        setError(null);

        const token = getToken();
        if (!token) {
          throw new Error("Not authenticated");
        }

        const response = await fetch(`${functionUrl}?id=${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || "Failed to delete appointment");
        }

        await fetchAppointments();
      } catch (err: any) {
        setError(err.message || "Failed to delete appointment");
        console.error("Delete appointment error:", err);
        throw err;
      }
    },
    [functionUrl, fetchAppointments]
  );

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
  };
};