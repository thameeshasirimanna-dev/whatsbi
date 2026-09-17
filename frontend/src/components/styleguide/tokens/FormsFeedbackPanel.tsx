import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  Search,
  Check,
  Inbox,
  Plus,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { DatePicker } from '../../agent/shared/DatePicker';
import { TimePicker } from '../../agent/shared/TimePicker';

export const FormsFeedbackPanel: React.FC = () => {
  const [toggleActive, setToggleActive] = useState(true);
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [selectedRow, setSelectedRow] = useState<number | null>(1);
  const [inputValue, setInputValue] = useState('john.doe@company.com');
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('WhatsApp AI Agent');
  const [isDarkSelectOpen, setIsDarkSelectOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Tenant Administrator');
  const [demoDate, setDemoDate] = useState<string | null>('2026-09-18');
  const [demoTime, setDemoTime] = useState<string | null>('11:00 AM');

  const selectRef = useRef<HTMLDivElement>(null);
  const darkSelectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsSelectOpen(false);
      }
      if (darkSelectRef.current && !darkSelectRef.current.contains(e.target as Node)) {
        setIsDarkSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-10 font-sans">
      {/* 1. Form Controls & Inputs */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
            Form Controls & Inputs
          </h2>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Standard text inputs, focus rings with lime accent glow, toggles, and checkboxes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Default Text Input */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col gap-2">
            <span className="text-xs font-bold text-[#16281D]">Standard Input</span>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter text..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAFAFA] border border-[#E4E4E7] text-xs text-[#16281D] outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-sans"
            />
          </div>

          {/* Focused Lime Glow Input */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col gap-2">
            <span className="text-xs font-bold text-[#16281D]">Focus State (Lime Ring)</span>
            <div className="relative">
              <input
                type="text"
                readOnly
                value="Active focused input"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#9FE870] ring-3 ring-[#9FE870]/25 text-xs text-[#16281D] font-medium outline-none font-sans"
              />
            </div>
          </div>

          {/* Error Input */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col gap-2">
            <span className="text-xs font-bold text-[#F43F5E]">Error State</span>
            <input
              type="text"
              readOnly
              value="invalid-email-format"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF1F2] border border-[#F43F5E] ring-3 ring-[#F43F5E]/15 text-xs text-[#E11D48] outline-none font-sans"
            />
          </div>

          {/* Dark Surface Input */}
          <div className="bg-[#16281D] rounded-2xl p-5 border border-white/5 flex flex-col gap-2">
            <span className="text-xs font-bold text-white">Dark Surface Input</span>
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value="Search in dark panel..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#203628] border border-white/10 text-xs text-white placeholder-[#8FA89B] outline-none font-sans"
              />
              <Search size={14} className="absolute right-3 text-[#8FA89B]" />
            </div>
          </div>

          {/* Interactive Toggle Switch */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col justify-between gap-3">
            <span className="text-xs font-bold text-[#16281D]">Toggle Switch</span>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#71717A]">
                {toggleActive ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={() => setToggleActive(!toggleActive)}
                className={`w-11 h-6 rounded-full transition-colors cursor-pointer p-0.5 border-0 flex items-center ${
                  toggleActive ? 'bg-[#9FE870]' : 'bg-[#E4E4E7]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                    toggleActive ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Interactive Checkbox */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col justify-between gap-3">
            <span className="text-xs font-bold text-[#16281D]">Checkbox</span>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <button
                type="button"
                onClick={() => setCheckboxChecked(!checkboxChecked)}
                className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border cursor-pointer ${
                  checkboxChecked
                    ? 'bg-[#9FE870] border-[#9FE870] text-[#16281D]'
                    : 'bg-white border-[#D4D4D8]'
                }`}
              >
                {checkboxChecked && <Check size={13} strokeWidth={3} />}
              </button>
              <span className="text-xs text-[#16281D] font-medium">
                Auto-sync WhatsApp contacts
              </span>
            </label>
          </div>

          {/* Interactive Form Select Menu (Button Styled Dropdown) */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col gap-2 relative">
            <span className="text-xs font-bold text-[#16281D]">Select Menu / Dropdown (Button Style)</span>
            <div ref={selectRef} className="relative">
              <button
                type="button"
                onClick={() => setIsSelectOpen(!isSelectOpen)}
                className={`w-full h-10 px-4 rounded-full text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
                  isSelectOpen
                    ? 'border-2 border-[#9FE870] ring-3 ring-[#9FE870]/25 bg-white text-[#16281D]'
                    : 'border border-black/5 bg-[#F4F7F4] hover:bg-[#E8ECE8] text-[#16281D]'
                }`}
              >
                <span className="truncate">{selectedModel}</span>
                <ChevronDown
                  size={14}
                  className={`text-[#71717A] shrink-0 transition-transform duration-200 ${
                    isSelectOpen ? 'rotate-180 text-[#16281D]' : ''
                  }`}
                />
              </button>

              {isSelectOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-[#EAEAEA] p-1.5 shadow-[0_12px_36px_rgba(20,40,24,0.14)] z-30 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  {['WhatsApp AI Agent', 'Sales Concierge', 'Customer Care', 'Booking Specialist'].map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => {
                        setSelectedModel(opt);
                        setIsSelectOpen(false);
                      }}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all flex items-center justify-between border-0 ${
                        selectedModel === opt
                          ? 'bg-[#9FE870] text-[#16281D] shadow-xs'
                          : 'text-[#16281D] hover:bg-[#F4F7F4] bg-transparent'
                      }`}
                    >
                      <span>{opt}</span>
                      {selectedModel === opt && <Check size={13} strokeWidth={2.8} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-[#A1A1AA]">Capsule button trigger with pill selection items</span>
          </div>

          {/* Dark Surface Dropdown */}
          <div className="bg-[#16281D] rounded-2xl p-5 border border-white/5 flex flex-col gap-2 relative">
            <span className="text-xs font-bold text-white">Dark Surface Dropdown (Button Style)</span>
            <div ref={darkSelectRef} className="relative">
              <button
                type="button"
                onClick={() => setIsDarkSelectOpen(!isDarkSelectOpen)}
                className={`w-full h-10 px-4 rounded-full text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
                  isDarkSelectOpen
                    ? 'border-2 border-[#9FE870] ring-3 ring-[#9FE870]/25 bg-[#203628] text-white'
                    : 'border border-white/10 hover:border-white/25 bg-[#203628] hover:bg-[#274232] text-white'
                }`}
              >
                <span className="truncate">{selectedRole}</span>
                <ChevronDown
                  size={14}
                  className={`text-[#8FA89B] shrink-0 transition-transform duration-200 ${
                    isDarkSelectOpen ? 'rotate-180 text-[#9FE870]' : ''
                  }`}
                />
              </button>

              {isDarkSelectOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#16281D] rounded-2xl border border-white/10 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.35)] z-30 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                  {['Tenant Administrator', 'Senior Agent', 'Support Specialist', 'Auditor (Read-Only)'].map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => {
                        setSelectedRole(role);
                        setIsDarkSelectOpen(false);
                      }}
                      className={`px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer transition-all flex items-center justify-between border-0 ${
                        selectedRole === role
                          ? 'bg-[#9FE870] text-[#16281D] shadow-xs'
                          : 'text-[#E4E4E7] hover:bg-[#203628] hover:text-white bg-transparent'
                      }`}
                    >
                      <span>{role}</span>
                      {selectedRole === role && <Check size={13} strokeWidth={2.8} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-[#8FA89B]">Inspector panel dark capsule styling</span>
          </div>

          {/* Date Picker Trigger Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col gap-2">
            <span className="text-xs font-bold text-[#16281D]">Capsule Date Picker</span>
            <DatePicker
              value={demoDate}
              onChange={setDemoDate}
              placeholder="Select date..."
            />
            <span className="text-[10px] text-[#A1A1AA]">Interactive calendar popover with quick presets</span>
          </div>

          {/* Time Picker Trigger Card */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col gap-2">
            <span className="text-xs font-bold text-[#16281D]">Capsule Time Picker</span>
            <TimePicker
              value={demoTime}
              onChange={setDemoTime}
              placeholder="Select time..."
            />
            <span className="text-[10px] text-[#A1A1AA]">12-hour wheel selector and common slot chips</span>
          </div>
        </div>
      </section>

      {/* 2. Alerts & Notifications */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
            Alerts & Banners
          </h2>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            System notices for status feedback, warnings, and mission-critical actions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Success Alert */}
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-3.5 rounded-xl flex items-center gap-3">
            <CheckCircle2 size={18} className="text-[#15803D] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#15803D]">Changes Saved</span>
              <span className="text-[11px] text-[#166534]">
                Your agent profile and webhook settings were updated successfully.
              </span>
            </div>
          </div>

          {/* Warning Alert */}
          <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3.5 rounded-xl flex items-center gap-3">
            <AlertTriangle size={18} className="text-[#D97706] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#92400E]">Low Credit Balance</span>
              <span className="text-[11px] text-[#B45309]">
                DeepSeek AI balance is below $2.00 USD. Consider adding credits.
              </span>
            </div>
          </div>

          {/* Danger Alert */}
          <div className="bg-[#FFF1F2] border border-[#FECDD3] p-3.5 rounded-xl flex items-center gap-3">
            <AlertCircle size={18} className="text-[#E11D48] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#E11D48]">Webhook Authentication Error</span>
              <span className="text-[11px] text-[#BE123C]">
                Meta Graph API returned 401 Unauthorized for tenant phone number.
              </span>
            </div>
          </div>

          {/* Info Alert */}
          <div className="bg-[#F0F9FF] border border-[#BAE6FD] p-3.5 rounded-xl flex items-center gap-3">
            <Info size={18} className="text-[#0284C7] shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#0369A1]">Maintenance Buffer Active</span>
              <span className="text-[11px] text-[#075985]">
                Incoming messages will be safely queued during maintenance windows.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Loading, Feedback & Empty States */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
            Loading States & Empty Affordances
          </h2>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Shimmer skeletons, non-blocking spinners, and teaching empty states.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Skeleton Shimmer */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col gap-3">
            <span className="text-xs font-bold text-[#16281D]">Skeleton Shimmer</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 animate-pulse shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3.5 bg-zinc-200 rounded-md w-3/4 animate-pulse" />
                <div className="h-2.5 bg-zinc-100 rounded-md w-1/2 animate-pulse" />
              </div>
            </div>
            <div className="h-14 bg-zinc-100 rounded-xl w-full animate-pulse mt-1" />
          </div>

          {/* Vector Spinners & Typing Dots */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col justify-between gap-4">
            <span className="text-xs font-bold text-[#16281D]">Spinners & AI Pulse</span>
            <div className="flex items-center justify-around py-3">
              {/* Spinner */}
              <div className="flex items-center gap-2 text-xs text-[#16281D] font-medium">
                <Loader2 size={20} className="animate-spin text-[#059669]" />
                <span>Processing...</span>
              </div>

              {/* 3-Dot Pulse */}
              <div className="flex items-center gap-1 bg-[#F4F7F4] px-3 py-1.5 rounded-full border border-black/5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
            <span className="text-[11px] text-[#71717A] text-center">
              Agent typing & asynchronous sync indicators
            </span>
          </div>

          {/* Empty State */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] flex flex-col items-center justify-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center mb-1">
              <Inbox size={20} />
            </div>
            <span className="text-xs font-bold text-[#16281D]">No Records Found</span>
            <span className="text-[11px] text-[#71717A] max-w-[200px]">
              Provision your first agent instance to start streaming telemetry.
            </span>
            <button className="inline-flex items-center gap-1 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-bold text-[11px] px-3 py-1.5 rounded-full shadow-xs cursor-pointer border-0 mt-1">
              <Plus size={12} /> Add Tenant
            </button>
          </div>
        </div>
      </section>

      {/* 4. Data Table Standard */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight">
            Data Table Specification
          </h2>
          <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
            Standard high-contrast table layout with row selection, hover highlights, and status badges.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F8FAF8] border-b border-[#EAEAEA]">
                  <th className="px-4 py-3 text-[11px] font-bold text-[#52525B] uppercase tracking-wider text-left">
                    Agent Tenant
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-[#52525B] uppercase tracking-wider text-left">
                    Routing State
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-[#52525B] uppercase tracking-wider text-left">
                    DeepSeek AI Balance
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-[#52525B] uppercase tracking-wider text-left">
                    Credits
                  </th>
                  <th className="px-4 py-3 text-[11px] font-bold text-[#52525B] uppercase tracking-wider text-left">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5]">
                {[
                  { id: 1, name: 'Apex Logistics', email: 'support@apex.com', status: 'Active', balance: '$24.50 USD', credits: '450' },
                  { id: 2, name: 'Nordic Commerce', email: 'support@nordic.no', status: 'Active', balance: '$12.00 USD', credits: '180' },
                  { id: 3, name: 'Metro Retailers', email: 'sales@metro.com', status: 'Offline', balance: '$1.50 USD', credits: '12' },
                ].map((row) => {
                  const isSelected = selectedRow === row.id;
                  const isActive = row.status === 'Active';

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRow(row.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#F0FDF4]' : 'hover:bg-[#FAFFFE]'
                      }`}
                    >
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#16281D] text-[#9FE870] flex items-center justify-center font-bold text-[11px]">
                            {row.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-[#16281D]">{row.name}</div>
                            <div className="text-[11px] text-[#71717A]">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isActive
                              ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]'
                              : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-[#22C55E]' : 'bg-zinc-400'
                            }`}
                          />
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#15803D]">
                        {row.balance}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-[#0F766E]">
                        {row.credits}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <button className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:text-[#047857] transition-colors cursor-pointer bg-transparent border-0">
                          View details <ArrowRight size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};
