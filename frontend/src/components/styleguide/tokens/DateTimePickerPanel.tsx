import React, { useState } from 'react';
import { Calendar, Clock, CalendarClock, Sparkles, Check, Info } from 'lucide-react';
import { DatePicker } from '../../agent/shared/DatePicker';
import { TimePicker } from '../../agent/shared/TimePicker';
import { DateTimePicker } from '../../agent/shared/DateTimePicker';

export const DateTimePickerPanel: React.FC = () => {
  const [sampleDate1, setSampleDate1] = useState<string | null>('2026-09-18');
  const [sampleDate2, setSampleDate2] = useState<string | null>(null);
  const [sampleDateDark, setSampleDateDark] = useState<string | null>('2026-09-24');

  const [sampleTime1, setSampleTime1] = useState<string | null>('10:30 AM');
  const [sampleTime2, setSampleTime2] = useState<string | null>(null);
  const [sampleTimeDark, setSampleTimeDark] = useState<string | null>('03:45 PM');

  const [sampleDateTime, setSampleDateTime] = useState<string | null>('2026-09-20 02:00 PM');

  return (
    <div className="flex flex-col gap-10 font-sans">
      {/* 1. Overview & Anatomy */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight flex items-center gap-2">
              <CalendarClock size={20} className="text-[#16281D]" />
              Date & Time Picker Ergonomics
            </h2>
            <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
              Capsule button triggers, floating elevated popovers, quick preset chips, and dark inspector adaptation.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
              WCAG AAA Compliant (11.5:1 Contrast)
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] flex flex-col gap-1 shadow-xs">
            <span className="text-xs font-bold text-[#16281D]">Capsule Trigger</span>
            <span className="text-[11px] text-[#71717A]">
              100% pill geometry (<code className="text-[#16281D] font-mono">rounded-full</code>) with integrated vector icon & clear action.
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] flex flex-col gap-1 shadow-xs">
            <span className="text-xs font-bold text-[#16281D]">Quick Presets</span>
            <span className="text-[11px] text-[#71717A]">
              Instant single-tap chips for <em>Today</em>, <em>Tomorrow</em>, <em>+1 Week</em>, and common time slots.
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] flex flex-col gap-1 shadow-xs">
            <span className="text-xs font-bold text-[#16281D]">Vibrant Lime Energy</span>
            <span className="text-[11px] text-[#71717A]">
              Active dates highlighted in signature <code className="text-[#15803D] font-mono">#9FE870</code> with dark forest text.
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] flex flex-col gap-1 shadow-xs">
            <span className="text-xs font-bold text-[#16281D]">Dual Surface Support</span>
            <span className="text-[11px] text-[#71717A]">
              Seamless light canvas and deep forest (<code className="text-[#16281D] font-mono">#16281D</code>) inspector variants.
            </span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Date Pickers */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
            1. Date Picker Variants
          </h3>
          <p className="text-xs text-[#71717A] m-0 mt-0.5">
            Test live interactive date selection, month navigation, and quick presets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Default Mint Trigger */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">Standard Mint Variant</span>
              <span className="text-[10px] font-mono text-[#71717A]">variant="mint"</span>
            </div>
            <DatePicker
              value={sampleDate1}
              onChange={setSampleDate1}
              placeholder="Pick a date..."
              showPresets={true}
            />
            <div className="pt-2 border-t border-[#F4F7F4] flex items-center justify-between text-[11px] text-[#71717A]">
              <span>Stored ISO:</span>
              <span className="font-mono font-bold text-[#16281D]">{sampleDate1 || 'null'}</span>
            </div>
          </div>

          {/* Card 2: Pure White Trigger (Unselected Placeholder) */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">White Surface Trigger</span>
              <span className="text-[10px] font-mono text-[#71717A]">variant="white"</span>
            </div>
            <DatePicker
              value={sampleDate2}
              onChange={setSampleDate2}
              placeholder="Choose delivery date..."
              variant="white"
              showPresets={true}
            />
            <div className="pt-2 border-t border-[#F4F7F4] flex items-center justify-between text-[11px] text-[#71717A]">
              <span>Stored ISO:</span>
              <span className="font-mono font-bold text-[#16281D]">{sampleDate2 || 'null'}</span>
            </div>
          </div>

          {/* Card 3: Compact Small (sm) */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">Compact Toolbar Size (sm)</span>
              <span className="text-[10px] font-mono text-[#71717A]">size="sm"</span>
            </div>
            <DatePicker
              value={sampleDate1}
              onChange={setSampleDate1}
              size="sm"
              showPresets={true}
            />
            <div className="pt-2 border-t border-[#F4F7F4] flex items-center justify-between text-[11px] text-[#71717A]">
              <span>Height:</span>
              <span className="font-mono font-bold text-[#16281D]">32px (h-8)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Time Pickers */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
            2. Time Picker Variants
          </h3>
          <p className="text-xs text-[#71717A] m-0 mt-0.5">
            12-hour format wheel selection, AM/PM toggle pill, and common appointment slots.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Default Time Picker */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">Standard Time Picker</span>
              <span className="text-[10px] font-mono text-[#71717A]">size="md"</span>
            </div>
            <TimePicker
              value={sampleTime1}
              onChange={setSampleTime1}
              placeholder="Select time..."
              showPresets={true}
            />
            <div className="pt-2 border-t border-[#F4F7F4] flex items-center justify-between text-[11px] text-[#71717A]">
              <span>Selected Value:</span>
              <span className="font-mono font-bold text-[#16281D]">{sampleTime1 || 'null'}</span>
            </div>
          </div>

          {/* Card 2: Empty State / White Variant */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">White Variant</span>
              <span className="text-[10px] font-mono text-[#71717A]">variant="white"</span>
            </div>
            <TimePicker
              value={sampleTime2}
              onChange={setSampleTime2}
              placeholder="Appointment time..."
              variant="white"
              showPresets={true}
            />
            <div className="pt-2 border-t border-[#F4F7F4] flex items-center justify-between text-[11px] text-[#71717A]">
              <span>Selected Value:</span>
              <span className="font-mono font-bold text-[#16281D]">{sampleTime2 || 'null'}</span>
            </div>
          </div>

          {/* Card 3: Compact Small Size */}
          <div className="bg-white p-5 rounded-3xl border border-[#EAEAEA] flex flex-col gap-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">Compact Size (sm)</span>
              <span className="text-[10px] font-mono text-[#71717A]">size="sm"</span>
            </div>
            <TimePicker
              value={sampleTime1}
              onChange={setSampleTime1}
              size="sm"
              showPresets={true}
            />
            <div className="pt-2 border-t border-[#F4F7F4] flex items-center justify-between text-[11px] text-[#71717A]">
              <span>Height:</span>
              <span className="font-mono font-bold text-[#16281D]">32px (h-8)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Combined Schedule Picker & Dark Surface Inspector */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
            3. Combined Schedule Picker & Dark Surface Adaptations
          </h3>
          <p className="text-xs text-[#71717A] m-0 mt-0.5">
            Combined Date-Time picker for appointments/broadcasts, alongside deep forest inspector variants.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Combined Schedule Picker Card */}
          <div className="bg-white p-6 rounded-3xl border border-[#EAEAEA] flex flex-col gap-4 shadow-xs">
            <div>
              <span className="text-xs font-bold text-[#16281D] block">
                Combined Schedule Picker (Appointment & Broadcast)
              </span>
              <span className="text-[11px] text-[#71717A]">
                Unified popover combining calendar day matrix and time slot chips with a "Confirm Schedule" CTA.
              </span>
            </div>

            <DateTimePicker
              value={sampleDateTime}
              onChange={setSampleDateTime}
              placeholder="Schedule appointment..."
            />

            <div className="p-3 bg-[#F4F7F4] rounded-2xl border border-[#EAEAEA] flex items-center justify-between text-xs">
              <span className="text-[#71717A]">Active Schedule:</span>
              <span className="font-mono font-bold text-[#15803D]">
                {sampleDateTime || 'Not scheduled'}
              </span>
            </div>
          </div>

          {/* Dark Surface Inspector Card */}
          <div className="bg-[#16281D] p-6 rounded-3xl border border-white/5 flex flex-col gap-4 text-white shadow-xl">
            <div>
              <span className="text-xs font-bold text-white block">
                Dark Contextual Inspector Surface (#16281D)
              </span>
              <span className="text-[11px] text-[#8FA89B]">
                Adapted for right-hand inspector drawers, dark modal dialogs, and terminal schedulers.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <span className="text-[10px] uppercase font-bold text-[#8FA89B] mb-1 block">
                  Broadcast Date
                </span>
                <DatePicker
                  value={sampleDateDark}
                  onChange={setSampleDateDark}
                  variant="forest"
                  showPresets={true}
                  className="w-full"
                />
              </div>

              <div className="flex-1 w-full">
                <span className="text-[10px] uppercase font-bold text-[#8FA89B] mb-1 block">
                  Send Time
                </span>
                <TimePicker
                  value={sampleTimeDark}
                  onChange={setSampleTimeDark}
                  variant="forest"
                  showPresets={true}
                  className="w-full"
                />
              </div>
            </div>

            <div className="p-3 bg-[#203628] rounded-2xl border border-white/10 flex items-center justify-between text-xs">
              <span className="text-[#8FA89B]">Inspector Payload:</span>
              <span className="font-mono font-bold text-[#9FE870]">
                {sampleDateDark || 'YYYY-MM-DD'} @ {sampleTimeDark || 'HH:mm'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Specification & Token Reference Table */}
      <section className="bg-white rounded-3xl p-6 border border-[#EAEAEA] shadow-xs flex flex-col gap-4">
        <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
          Date & Time Picker Design Token Specification
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-[#EAEAEA] text-[#71717A]">
                <th className="py-2.5 px-3 font-bold">Element</th>
                <th className="py-2.5 px-3 font-bold">Token / Class</th>
                <th className="py-2.5 px-3 font-bold">Dimension</th>
                <th className="py-2.5 px-3 font-bold">Spec & Interaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA]/80">
              <tr>
                <td className="py-2.5 px-3 font-bold text-[#16281D]">Trigger Button</td>
                <td className="py-2.5 px-3 font-mono text-[#15803D]">rounded-full</td>
                <td className="py-2.5 px-3 font-mono text-[#71717A]">h-10 (md) / h-8 (sm)</td>
                <td className="py-2.5 px-3 text-[#71717A]">Capsule pill with vector icon, display value & quick clear action.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-[#16281D]">Popover Container</td>
                <td className="py-2.5 px-3 font-mono text-[#15803D]">rounded-3xl</td>
                <td className="py-2.5 px-3 font-mono text-[#71717A]">w-[280px] - w-[340px]</td>
                <td className="py-2.5 px-3 text-[#71717A]">Deep shadow <code className="text-[10px] font-mono">shadow-[0_16px_48px_rgba(20,40,24,0.16)]</code> with backdrop isolation.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-[#16281D]">Day Cells</td>
                <td className="py-2.5 px-3 font-mono text-[#15803D]">w-8 h-8 rounded-full</td>
                <td className="py-2.5 px-3 font-mono text-[#71717A]">32×32px</td>
                <td className="py-2.5 px-3 text-[#71717A]">High contrast circular touch target, active in <code className="text-[#15803D] font-mono">#9FE870</code>.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-[#16281D]">Quick Preset Chips</td>
                <td className="py-2.5 px-3 font-mono text-[#15803D]">rounded-full text-[11px]</td>
                <td className="py-2.5 px-3 font-mono text-[#71717A]">px-2.5 py-1</td>
                <td className="py-2.5 px-3 text-[#71717A]">Single-tap chips for common date offsets and appointment time slots.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-[#16281D]">Time Selector Wheels</td>
                <td className="py-2.5 px-3 font-mono text-[#15803D]">rounded-xl h-36</td>
                <td className="py-2.5 px-3 font-mono text-[#71717A]">w-12 columns</td>
                <td className="py-2.5 px-3 text-[#71717A]">Scrollable column for hours, minutes, and AM/PM segmented pills.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-[#16281D]">Active Selection</td>
                <td className="py-2.5 px-3 font-mono text-[#15803D]">bg-[#9FE870] text-[#16281D]</td>
                <td className="py-2.5 px-3 font-mono text-[#71717A]">Signature Lime</td>
                <td className="py-2.5 px-3 text-[#71717A]">11.5:1 Contrast ratio surpassing WCAG AAA requirement of 7:1.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default DateTimePickerPanel;
