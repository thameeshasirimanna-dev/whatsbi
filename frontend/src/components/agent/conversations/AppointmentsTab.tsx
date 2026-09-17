import React from "react";
import { Appointment } from "../../../types/index";
import { Calendar, Eye, Pencil, Trash2 } from "lucide-react";
import { useDialog } from "../shared/DialogProvider";

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
    if (
      !(await dlgConfirm(
        "Are you sure you want to delete this appointment? This action cannot be undone.",
        { danger: true }
      ))
    )
      return;
    onDeleteAppointment(appointmentId);
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "completed") return "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]";
    if (s === "confirmed") return "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]";
    if (s === "pending") return "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]";
    if (s === "cancelled") return "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]";
    return "bg-[#F4F4F5] text-[#71717A] border-[#E4E4E7]";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 rounded-full border-2 border-[#16281D]/20 border-t-[#16281D] animate-spin" />
      </div>
    );
  }

  return (
    <>
      {appointments.length === 0 ? (
        <div className="text-center py-14 px-4 bg-white rounded-2xl border border-dashed border-[#EAEAEA] flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[#F4F7F4] flex items-center justify-center text-[#71717A] mb-3">
            <Calendar size={20} />
          </div>
          <p className="font-sans text-sm font-bold text-[#16281D] mb-1">No appointments found</p>
          <p className="font-sans text-xs text-[#71717A]">No appointments scheduled for this customer yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-white rounded-2xl border border-[#EAEAEA] p-5 shadow-xs hover:border-[#16281D]/20 transition-all flex flex-col gap-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-sans text-sm font-bold text-[#16281D] block">
                    {appointment.title}
                  </span>
                  <span className="font-mono text-xs text-[#71717A] mt-0.5 block">
                    #APT-{appointment.id.toString().padStart(4, "0")}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-semibold font-sans px-2.5 py-0.5 rounded-full border shrink-0 ${getStatusBadge(
                    appointment.status
                  )}`}
                >
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </span>
              </div>

              {/* Telemetry Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-3.5 bg-[#F4F7F4] rounded-xl border border-[#EAEAEA]/80">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-sans text-xs text-[#71717A] font-medium">Date & Time:</span>
                  <span className="font-mono text-xs font-semibold text-[#16281D]">
                    {new Date(appointment.appointment_date).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-white text-[#16281D] border border-[#EAEAEA]">
                    {appointment.duration_minutes} min
                  </span>
                </div>

                <span className="font-sans text-[11px] text-[#71717A]">
                  Created on <span className="font-mono font-medium text-[#16281D]">{new Date(appointment.created_at).toLocaleDateString()}</span>
                </span>
              </div>

              {appointment.notes && (
                <div className="text-xs font-sans text-[#71717A] bg-[#FAFAF9] px-3.5 py-2.5 rounded-xl border border-[#EAEAEA]/70">
                  <span className="font-semibold text-[#16281D]">Notes: </span>
                  {appointment.notes}
                </div>
              )}

              {/* Action Buttons following Style Guide Section 6 */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#F4F7F4]">
                <button
                  onClick={() => onViewAppointment(appointment)}
                  className="h-8 px-3 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-0"
                >
                  <Eye size={13} strokeWidth={2.2} />
                  <span>View</span>
                </button>

                <button
                  onClick={() => onEditAppointment(appointment)}
                  className="h-8 px-3 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer border-0"
                >
                  <Pencil size={13} strokeWidth={2.2} />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => handleDelete(appointment.id)}
                  className="h-8 px-3 rounded-full bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#E11D48] border border-[#FECDD3] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Trash2 size={13} strokeWidth={2.2} />
                  <span>Delete</span>
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
