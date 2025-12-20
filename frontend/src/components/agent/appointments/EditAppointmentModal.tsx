import React, { useState, useEffect } from 'react';
import { Appointment } from '../../../types';

interface UpdateAppointmentData {
  title?: string;
  appointment_date?: string;
  duration_minutes?: number;
  status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

interface EditAppointmentModalProps {
  appointment: Appointment;
  updateAppointment: (id: number, data: UpdateAppointmentData) => Promise<void>;
  onClose: () => void;
  onSuccess: () => void;
}

const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  appointment,
  updateAppointment,
  onClose,
  onSuccess,
}) => {
  const formatLocalDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [title, setTitle] = useState(appointment.title);
  console.log("Original appointment_date:", appointment.appointment_date);
  console.log("Parsed date:", new Date(appointment.appointment_date));
  console.log(
    "Formatted local datetime:",
    formatLocalDateTime(new Date(appointment.appointment_date))
  );
  const [appointmentDate, setAppointmentDate] = useState(
    formatLocalDateTime(new Date(appointment.appointment_date))
  );
  const [durationMinutes, setDurationMinutes] = useState(
    appointment.duration_minutes
  );
  const [status, setStatus] = useState(appointment.status);
  const [notes, setNotes] = useState(appointment.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  useEffect(() => {
    setTitle(appointment.title);
    setAppointmentDate(
      formatLocalDateTime(new Date(appointment.appointment_date))
    );
    setDurationMinutes(appointment.duration_minutes);
    setStatus(appointment.status);
    setNotes(appointment.notes || "");
  }, [appointment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    const parsedDate = new Date(appointmentDate);
    if (isNaN(parsedDate.getTime()) || parsedDate < new Date()) {
      setError("Appointment date must be a valid future date");
      return;
    }

    if (durationMinutes <= 0 || durationMinutes > 1440) {
      setError("Duration must be between 1 and 1440 minutes");
      return;
    }

    if (!statusOptions.some((opt) => opt.value === status)) {
      setError("Invalid status");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updateData: UpdateAppointmentData = {
        title: title.trim(),
        appointment_date: parsedDate.toISOString(),
        duration_minutes: durationMinutes,
        status,
        notes: notes.trim() || undefined,
      };

      await updateAppointment(appointment.id, updateData);
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || "Unknown error";
      setError(`Failed to update appointment: ${errorMessage}`);
      console.error("Appointment update error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Edit Appointment
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Customer:{" "}
            <span className="font-medium">{appointment.customer_name}</span>
          </p>
          <p className="text-sm text-gray-600">
            Phone:{" "}
            <span className="font-medium">{appointment.customer_phone}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Appointment title"
              required
              maxLength={100}
            />
          </div>

          {/* Date and Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date & Time *
            </label>
            <input
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(parseInt(e.target.value) || 30)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="30"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as
                    | "pending"
                    | "confirmed"
                    | "completed"
                    | "cancelled"
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !appointmentDate}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Appointment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAppointmentModal;