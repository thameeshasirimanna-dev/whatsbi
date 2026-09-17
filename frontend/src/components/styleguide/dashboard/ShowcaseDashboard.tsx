import React, { useState } from 'react';
import {
  Search,
  Mic,
  Bell,
  LayoutGrid,
  List,
  Download,
} from 'lucide-react';
import { NavigationRail } from './NavigationRail';
import { HeroBanner } from './HeroBanner';
import { TelemetryGrid } from './TelemetryGrid';
import { AutomationsList } from './AutomationsList';
import { CampaignInspector } from './CampaignInspector';

export const ShowcaseDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="w-full min-h-screen bg-[#E1E6E1] py-6 md:py-10 px-3 md:px-6 flex justify-center items-start select-none font-sans">
      {/* Outer Rounded Dashboard Frame (Faithfully matching the uploaded reference image) */}
      <div className="w-full max-w-[1360px] bg-white rounded-[36px] md:rounded-[44px] p-4 md:p-6 border border-black/5 shadow-[0_24px_72px_rgba(20,40,24,0.12)] flex flex-col xl:flex-row items-stretch gap-5">
        {/* Column 1: Dark Navigation Rail */}
        <NavigationRail
          activeTab={activeNav}
          onTabChange={setActiveNav}
          isDarkTheme={isDarkTheme}
          onToggleTheme={() => setIsDarkTheme(!isDarkTheme)}
        />

        {/* Column 2: Center Telemetry & Management Canvas */}
        <div className="flex-1 flex flex-col justify-between gap-5 min-w-0">
          {/* Top Search Bar */}
          <div className="w-full h-12 bg-white rounded-full px-5 border border-[#EAEAEA] shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <Search size={17} className="text-[#A1A1AA] shrink-0" />
              <input
                type="text"
                placeholder="Search anything here"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none text-xs md:text-sm text-[#16281D] placeholder-[#A1A1AA] w-full font-sans font-medium"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                title="Voice search"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#16281D] hover:bg-[#F4F7F4] transition-colors cursor-pointer border-0 bg-transparent"
              >
                <Mic size={16} />
              </button>
              <button
                title="Notifications"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#71717A] hover:text-[#16281D] hover:bg-[#F4F7F4] transition-colors cursor-pointer border-0 bg-transparent"
              >
                <Bell size={16} />
              </button>
            </div>
          </div>

          {/* Welcome Hero Banner */}
          <HeroBanner
            userName="Liam Gallagher"
            greeting="Hello"
            subtitle="Multi-tenant WhatsApp Cloud API & AI routing are active and operating normally."
          />

          {/* Section: Live Telemetry with Toolbar */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base md:text-lg text-[#16281D] m-0 tracking-tight">
                Live telemetry & throughput
              </h2>

              <div className="flex items-center gap-2">
                {/* View Mode Toggles */}
                <div className="flex items-center gap-1 bg-[#F4F7F4] p-1 rounded-xl border border-black/5">
                  <button
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
                  onClick={() => alert('Exporting WhatsApp telemetry report...')}
                  className="inline-flex items-center gap-1.5 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] px-4 py-2 rounded-full font-bold text-xs shadow-[0_2px_8px_rgba(159,232,112,0.35)] transition-colors cursor-pointer border-0"
                >
                  Export <Download size={13} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            {/* 4 Telemetry Chart Cards */}
            <TelemetryGrid />
          </div>

          {/* Section: Automated Workflows & Campaigns */}
          <AutomationsList onAddClick={() => alert('New workflow modal prompt')} />
        </div>

        {/* Column 3: Dark Campaign Inspector Drawer */}
        <CampaignInspector
          onDeployCampaign={(day, time) => {
            console.log(`Campaign broadcast scheduled for day ${day} at ${time}`);
          }}
        />
      </div>
    </div>
  );
};
