import React from "react";
import { Appointment } from "../../../types/index";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useDialog } from "../shared/DialogProvider";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface AppointmentsTabProps {
  appointments: Appointment[];
  loading: boolean;
  onViewAppointment: (appointment: Appointment) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (appointmentId: number) => void;
}

const AppointmentsTab: React.FC<AppointmentsTabProps> = ({
  appointments,
  loading,
  onViewAppointment,
  onEditAppointment,
  onDeleteAppointment,
}) => {
  const { confirm: dlgConfirm } = useDialog();

  const handleDelete = async (appointmentId: number) => {
    if (!await dlgConfirm('Are you sure you want to delete this appointment? This action cannot be undone.', { danger: true })) return;
    onDeleteAppointment(appointmentId);
  };

  const getStatusStyle = (status: string): React.CSSProperties => {
    if (status === "completed") return { background: "rgba(34,197,94,0.1)", color: "#059669" };
    if (status === "pending") return { background: "rgba(217,119,6,0.1)", color: "#d97706" };
    if (status === "confirmed") return { background: "rgba(8,145,178,0.1)", color: "#0891b2" };
    if (status === "cancelled") return { background: "rgba(244,63,94,0.08)", color: "#f43f5e" };
    return { background: "#f4f4f5", color: "#71717a" };
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "48px 0" }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid rgba(34,197,94,0.2)",
            borderTopColor: "#22c55e",
            animation: "com-spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  return (
    <>
      {appointments.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 0",
            ...DM,
            fontSize: 14,
            color: "#71717a",
          }}
        >
          No appointments found for this customer.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              style={{
                background: "#fff",
                borderRadius: 14,
                border: "1px solid #ebebeb",
                padding: "16px 18px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)")
              }
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <span style={{ ...SYNE, fontSize: 14, fontWeight: 700, color: "#0c1a0e" }}>
                  {appointment.title}
                </span>
                <span
                  style={{
                    ...DM,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 9px",
                    borderRadius: 9999,
                    ...getStatusStyle(appointment.status),
                  }}
                >
                  {appointment.status}
                </span>
              </div>

              <p style={{ ...DM, fontSize: 13, color: "#3f3f46", marginBottom: 4 }}>
                Date:{" "}
                <span style={{ fontWeight: 600, color: "#0c1a0e" }}>
                  {new Date(appointment.appointment_date).toLocaleDateString()}
                </span>
              </p>
              <p style={{ ...DM, fontSize: 13, color: "#3f3f46", marginBottom: 4 }}>
                Duration:{" "}
                <span style={{ fontWeight: 600, color: "#0c1a0e" }}>
                  {appointment.duration_minutes} minutes
                </span>
              </p>
              {appointment.notes && (
                <p style={{ ...DM, fontSize: 12, color: "#71717a", marginBottom: 4 }}>
                  Notes: {appointment.notes}
                </p>
              )}
              <p style={{ ...DM, fontSize: 12, color: "#a1a1aa", marginBottom: 12 }}>
                Created on: {new Date(appointment.created_at).toLocaleDateString()}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  paddingTop: 12,
                  borderTop: "1px solid #f4f4f5",
                }}
              >
                <button
                  onClick={() => onViewAppointment(appointment)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    background: "rgba(8,145,178,0.08)",
                    color: "#0891b2",
                    border: "1px solid rgba(8,145,178,0.15)",
                    borderRadius: 8,
                    cursor: "pointer",
                    ...DM,
                    fontSize: 12,
                    fontWeight: 600,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(8,145,178,0.14)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(8,145,178,0.08)")}
                >
                  <Eye size={13} />
                  View
                </button>

                <button
                  onClick={() => onEditAppointment(appointment)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    background: "rgba(34,197,94,0.08)",
                    color: "#059669",
                    border: "1px solid rgba(34,197,94,0.15)",
                    borderRadius: 8,
                    cursor: "pointer",
                    ...DM,
                    fontSize: 12,
                    fontWeight: 600,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.14)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(34,197,94,0.08)")}
                >
                  <Pencil size={13} />
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(appointment.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 12px",
                    background: "rgba(244,63,94,0.06)",
                    color: "#f43f5e",
                    border: "1px solid rgba(244,63,94,0.15)",
                    borderRadius: 8,
                    cursor: "pointer",
                    ...DM,
                    fontSize: 12,
                    fontWeight: 600,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.12)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(244,63,94,0.06)")}
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default AppointmentsTab;
