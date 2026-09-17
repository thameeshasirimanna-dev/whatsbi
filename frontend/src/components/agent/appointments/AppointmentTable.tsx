import React from 'react';
import { Menu, Transition } from '@headlessui/react';
import { Calendar, ChevronDown, Eye, Pencil, Trash2, Plus } from 'lucide-react';
import { Appointment } from '../../../types';
import { useDialog } from '../shared/DialogProvider';

interface AppointmentTableProps {
  appointments: Appointment[];
  totalCount: number;
  updatingAppointmentId: number | null;
  onUpdateStatus: (
    appointmentId: number,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  ) => Promise<void>;
  onView: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
  onScheduleFirst: () => void;
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const getStatusBadge = (status: string) => {
  const s = status.toLowerCase();
  let bg = 'bg-[#71717A]/10 text-[#71717A] border border-[#71717A]/20';
  let dot = 'bg-[#71717A]';
  let label = s.charAt(0).toUpperCase() + s.slice(1);

  if (s === 'pending') {
    bg = 'bg-[#F59E0B]/10 text-[#B45309] border border-[#F59E0B]/20';
    dot = 'bg-[#F59E0B]';
  } else if (s === 'confirmed') {
    bg = 'bg-[#3B82F6]/10 text-[#1D4ED8] border border-[#3B82F6]/20';
    dot = 'bg-[#3B82F6]';
  } else if (s === 'completed') {
    bg = 'bg-[#22C55E]/10 text-[#15803D] border border-[#22C55E]/20';
    dot = 'bg-[#22C55E]';
  } else if (s === 'cancelled') {
    bg = 'bg-[#EF4444]/10 text-[#B91C1C] border border-[#EF4444]/20';
    dot = 'bg-[#EF4444]';
  }

  return { bg, dot, label };
};

const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  totalCount,
  updatingAppointmentId,
  onUpdateStatus,
  onView,
  onEdit,
  onDelete,
  onScheduleFirst,
}) => {
  const { confirm: dlgConfirm } = useDialog();

  if (appointments.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-[#F4F7F4] text-[#71717A] flex items-center justify-center mx-auto mb-3">
          <Calendar size={22} />
        </div>
        <h4 className="text-sm font-bold text-[#16281D] mb-1">
          {totalCount === 0 ? 'No appointments yet' : 'No matching appointments'}
        </h4>
        <p className="text-xs text-[#71717A] max-w-sm mx-auto mb-4">
          {totalCount === 0
            ? 'Schedule your first appointment with any customer in your database.'
            : 'Try adjusting your search criteria or clear your active filters.'}
        </p>
        {totalCount === 0 && (
          <button
            onClick={onScheduleFirst}
            className="px-5 py-2.5 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.3)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.4)] transition-all inline-flex items-center gap-1.5 cursor-pointer border-0"
          >
            <Plus size={14} />
            <span>Schedule First Appointment</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#EAEAEA] bg-[#F4F7F4]/60">
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">#</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Customer</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Title</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Date & Time</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Duration</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-[11px] font-semibold text-[#71717A] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAEAEA]">
            {appointments.map((appointment) => {
              const statusBadge = getStatusBadge(appointment.status);
              return (
                <tr key={appointment.id} className="hover:bg-[#F4F7F4]/40 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-[#16281D]">
                      #{appointment.id.toString().padStart(4, '0')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center text-xs font-bold shrink-0">
                        {appointment.customer_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#16281D]">{appointment.customer_name}</div>
                        {appointment.customer_phone && (
                          <div className="font-mono text-[11px] text-[#71717A]">{appointment.customer_phone}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs text-[#16281D] font-medium">{appointment.title}</span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="font-mono text-xs text-[#71717A]">
                      {new Date(appointment.appointment_date).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <span className="font-mono text-xs text-[#16281D]">
                      {appointment.duration_minutes} min
                    </span>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <Menu as="div" className="relative inline-block text-left">
                      <Menu.Button
                        disabled={updatingAppointmentId === appointment.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.bg} hover:opacity-85 transition-opacity cursor-pointer disabled:opacity-50`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                        <span>{updatingAppointmentId === appointment.id ? 'Updating…' : statusBadge.label}</span>
                        <ChevronDown size={12} className="opacity-70" />
                      </Menu.Button>
                      <Transition
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute left-0 mt-1.5 w-36 bg-white border border-[#EAEAEA] rounded-2xl shadow-[0_10px_30px_rgba(22,40,29,0.08)] z-50 p-1 outline-none">
                          {statusOptions.map((option) => (
                            <Menu.Item key={option.value}>
                              {({ active }) => (
                                <button
                                  type="button"
                                  disabled={updatingAppointmentId === appointment.id}
                                  onClick={async () => {
                                    if (await dlgConfirm(`Change appointment status to ${option.label}?`)) {
                                      onUpdateStatus(appointment.id, option.value as any);
                                    }
                                  }}
                                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                    active ? 'bg-[#F4F7F4] text-[#16281D]' : 'text-[#71717A]'
                                  } ${appointment.status === option.value ? 'font-bold text-[#16281D]' : ''}`}
                                >
                                  {option.label}
                                </button>
                              )}
                            </Menu.Item>
                          ))}
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => onView(appointment)}
                        title="View details"
                        className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => onEdit(appointment)}
                        title="Edit appointment"
                        className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onDelete(appointment)}
                        title="Delete appointment"
                        className="w-7 h-7 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="block lg:hidden divide-y divide-[#EAEAEA]">
        {appointments.map((appointment) => {
          const statusBadge = getStatusBadge(appointment.status);
          return (
            <div key={appointment.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center text-xs font-bold shrink-0">
                    {appointment.customer_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#16281D]">{appointment.customer_name}</div>
                    {appointment.customer_phone && (
                      <div className="font-mono text-[11px] text-[#71717A]">{appointment.customer_phone}</div>
                    )}
                  </div>
                </div>
                <span className="font-mono text-xs font-semibold text-[#16281D]">
                  #{appointment.id.toString().padStart(4, '0')}
                </span>
              </div>

              <div className="text-xs font-medium text-[#16281D]">{appointment.title}</div>

              <div className="flex items-center justify-between text-xs bg-[#F4F7F4] p-2.5 rounded-xl">
                <div>
                  <span className="text-[#71717A] block text-[10px]">Date & Time</span>
                  <span className="font-mono font-medium text-[#16281D]">
                    {new Date(appointment.appointment_date).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[#71717A] block text-[10px]">Duration</span>
                  <span className="font-mono font-medium text-[#16281D]">{appointment.duration_minutes} min</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Menu as="div" className="relative inline-block text-left">
                  <Menu.Button
                    disabled={updatingAppointmentId === appointment.id}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge.bg}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                    <span>{updatingAppointmentId === appointment.id ? 'Updating…' : statusBadge.label}</span>
                    <ChevronDown size={12} className="opacity-70" />
                  </Menu.Button>
                  <Transition
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Menu.Items className="absolute left-0 mt-1.5 w-36 bg-white border border-[#EAEAEA] rounded-2xl shadow-[0_10px_30px_rgba(22,40,29,0.08)] z-50 p-1 outline-none">
                      {statusOptions.map((option) => (
                        <Menu.Item key={option.value}>
                          {({ active }) => (
                            <button
                              type="button"
                              disabled={updatingAppointmentId === appointment.id}
                              onClick={async () => {
                                if (await dlgConfirm(`Change appointment status to ${option.label}?`)) {
                                  onUpdateStatus(appointment.id, option.value as any);
                                }
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                                active ? 'bg-[#F4F7F4] text-[#16281D]' : 'text-[#71717A]'
                              }`}
                            >
                              {option.label}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </Menu.Items>
                  </Transition>
                </Menu>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onView(appointment)}
                    className="w-7 h-7 rounded-full bg-[#F4F7F4] text-[#71717A] flex items-center justify-center cursor-pointer"
                  >
                    <Eye size={13} />
                  </button>
                  <button
                    onClick={() => onEdit(appointment)}
                    className="w-7 h-7 rounded-full bg-[#F4F7F4] text-[#71717A] flex items-center justify-center cursor-pointer"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => onDelete(appointment)}
                    className="w-7 h-7 rounded-full bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default AppointmentTable;
