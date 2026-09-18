import React, { useState, useMemo } from 'react';
import { LayoutGrid, List, Download } from 'lucide-react';
import { DashboardMetrics, DashboardTelemetry, TelemetryPoint } from './dashboard.types';
import { ThroughputCard, ActiveConversationsCard } from './telemetry';

interface DashboardTelemetryGridProps {
  metrics: DashboardMetrics;
  telemetry?: DashboardTelemetry | null;
  onExport?: () => void;
}

const DEFAULT_HOURLY_THROUGHPUT: TelemetryPoint[] = [
  { label: '08:00', value: 0 },
  { label: '09:00', value: 0 },
  { label: '10:00', value: 0 },
  { label: '11:00', value: 0 },
  { label: '12:00', value: 0 },
  { label: '01:00', value: 0 },
];

const DEFAULT_DAILY_THROUGHPUT: TelemetryPoint[] = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 0 },
  { label: 'Wed', value: 0 },
  { label: 'Thu', value: 0 },
  { label: 'Fri', value: 0 },
  { label: 'Sat', value: 0 },
  { label: 'Sun', value: 0 },
];

const DEFAULT_HOURLY_CONV: TelemetryPoint[] = [
  { label: '08:00', value: 0 },
  { label: '09:00', value: 0 },
  { label: '10:00', value: 0 },
  { label: '11:00', value: 0 },
  { label: '12:00', value: 0 },
  { label: '01:00', value: 0 },
  { label: '02:00', value: 0 },
  { label: '03:00', value: 0 },
];

const DEFAULT_DAILY_CONV: TelemetryPoint[] = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 0 },
  { label: 'Wed', value: 0 },
  { label: 'Thu', value: 0 },
  { label: 'Fri', value: 0 },
  { label: 'Sat', value: 0 },
  { label: 'Sun', value: 0 },
];

export const DashboardTelemetryGrid: React.FC<DashboardTelemetryGridProps> = ({
  metrics,
  telemetry,
  onExport,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [throughputRange, setThroughputRange] = useState<'Hourly' | 'Daily'>('Hourly');
  const [convRange, setConvRange] = useState<'Hourly' | 'Daily'>('Hourly');

  // 1. Throughput Calculation
  const throughputData = useMemo(() => {
    const rawPoints =
      throughputRange === 'Hourly'
        ? (telemetry?.throughput?.hourly && telemetry.throughput.hourly.length > 0
            ? telemetry.throughput.hourly
            : DEFAULT_HOURLY_THROUGHPUT)
        : (telemetry?.throughput?.daily && telemetry.throughput.daily.length > 0
            ? telemetry.throughput.daily
            : DEFAULT_DAILY_THROUGHPUT);

    const isAllZero = rawPoints.every((p) => p.value === 0);
    const maxVal = Math.max(...rawPoints.map((p) => p.value), 1);
    const step = 280 / Math.max(1, rawPoints.length - 1);

    const coords = rawPoints.map((p, i) => {
      const x = 20 + i * step;
      if (isAllZero) {
        // Subtle ambient idle wave ±4px around baseline 45
        const y = 45 + (i % 2 === 0 ? -4 : 4);
        return { x, y, value: 0, label: p.label };
      }
      const ratio = p.value / maxVal;
      const y = Math.round(45 - ratio * 32);
      return { x, y, value: p.value, label: p.label };
    });

    let wavePath = `M 10 45 L ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const midX = (prev.x + curr.x) / 2;
      wavePath += ` Q ${prev.x} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2} T ${curr.x} ${curr.y}`;
    }
    wavePath += ` L 310 45`;

    const peakIdx = rawPoints.reduce((maxI, p, idx, arr) => (p.value > arr[maxI].value ? idx : maxI), 0);
    const peakPercent = isAllZero
      ? 48
      : Math.max(15, Math.min(80, Math.round((20 + peakIdx * step) / 3.2) - 8));

    const latestRate =
      throughputRange === 'Hourly'
        ? telemetry?.throughput?.currentRate ?? (isAllZero ? 0 : rawPoints[peakIdx].value)
        : rawPoints.reduce((acc, curr) => acc + curr.value, 0);

    return {
      points: rawPoints,
      wavePath,
      peakPercent,
      latestRate,
      unit: throughputRange === 'Hourly' ? 'msg/s' : 'msgs',
    };
  }, [telemetry?.throughput, throughputRange]);

  // 2. Active Conversations Dumbbell Bars
  const convData = useMemo(() => {
    const rawPoints =
      convRange === 'Hourly'
        ? (telemetry?.activeConversations?.hourly && telemetry.activeConversations.hourly.length > 0
            ? telemetry.activeConversations.hourly
            : DEFAULT_HOURLY_CONV)
        : (telemetry?.activeConversations?.daily && telemetry.activeConversations.daily.length > 0
            ? telemetry.activeConversations.daily
            : DEFAULT_DAILY_CONV);

    const isAllZero = rawPoints.every((p) => p.value === 0);
    const maxVal = Math.max(...rawPoints.map((p) => p.value), 1);
    const step = 260 / Math.max(1, rawPoints.length - 1);

    const barbells = rawPoints.map((p, i) => {
      const x = 30 + i * step;
      if (isAllZero) {
        return { x, y1: 41, y2: 49, value: 0, label: p.label };
      }
      const ratio = p.value / maxVal;
      const halfH = Math.max(6, Math.min(32, Math.round(ratio * 30)));
      return { x, y1: 45 - halfH, y2: 45 + halfH, value: p.value, label: p.label };
    });

    const totalCount =
      telemetry?.activeConversations?.total ?? metrics.activeConversations ?? 0;

    return {
      points: rawPoints,
      barbells,
      totalCount,
    };
  }, [telemetry?.activeConversations, metrics.activeConversations, convRange]);

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      const exportData = {
        timestamp: new Date().toISOString(),
        metrics,
        telemetry,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizagentz-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <section
      className="flex flex-col gap-3 sm:gap-3.5 font-sans select-none"
    >
      {/* Section Header with View Toggles and Export Action Pill */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold text-base md:text-lg text-[#16281D] m-0 tracking-tight">
          Live telemetry & throughput
        </h2>

        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-[#F4F7F4] p-1 rounded-xl border border-black/5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid view"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border-0 ${
                viewMode === 'grid'
                  ? 'bg-[#9FE870] text-[#16281D] shadow-xs'
                  : 'text-[#71717A] hover:text-[#16281D] bg-transparent'
              }`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              title="List view"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer border-0 ${
                viewMode === 'list'
                  ? 'bg-[#9FE870] text-[#16281D] shadow-xs'
                  : 'text-[#71717A] hover:text-[#16281D] bg-transparent'
              }`}
            >
              <List size={14} />
            </button>
          </div>

          {/* Export Action Pill Button */}
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] px-4 py-2 rounded-full font-bold text-xs shadow-[0_2px_8px_rgba(159,232,112,0.35)] transition-colors cursor-pointer border-0"
          >
            Export <Download size={13} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* 2 Focused Operational Telemetry Cards */}
      <div
        className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4'
            : 'flex flex-col gap-3.5 sm:gap-4'
        }
      >
        <ThroughputCard
          range={throughputRange}
          onToggleRange={() => setThroughputRange((r) => (r === 'Hourly' ? 'Daily' : 'Hourly'))}
          data={throughputData}
        />

        <ActiveConversationsCard
          range={convRange}
          onToggleRange={() => setConvRange((r) => (r === 'Hourly' ? 'Daily' : 'Hourly'))}
          data={convData}
        />
      </div>
    </section>
  );
};
