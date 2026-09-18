import React, { useState } from 'react';
import {
  Search,
  X,
  Command,
  Loader2,
  Sparkles,
  SlidersHorizontal,
  ArrowRight,
  Filter,
  Check,
  Copy,
} from 'lucide-react';

interface FilterItem {
  id: string;
  name: string;
  category: string;
  phone: string;
  status: 'active' | 'pending' | 'completed';
}

const SAMPLE_DATA: FilterItem[] = [
  { id: 'ORD-1092', name: 'Thameesha Sirimanna', category: 'Enterprise CRM', phone: '+94 77 123 4567', status: 'completed' },
  { id: 'ORD-1093', name: 'Kasun Bandara', category: 'WhatsApp Bot Pro', phone: '+94 71 987 6543', status: 'pending' },
  { id: 'ORD-1094', name: 'Nadeesha Perera', category: 'Broadcast Tier 2', phone: '+94 76 555 1212', status: 'active' },
  { id: 'ORD-1095', name: 'Dilshan Silva', category: 'Catalog Sync API', phone: '+94 70 333 4444', status: 'completed' },
  { id: 'ORD-1096', name: 'Chamari Jayasinghe', category: 'WhatsApp Bot Pro', phone: '+94 78 888 9999', status: 'pending' },
];

export const SearchBarPanel: React.FC = () => {
  // State for interactive inputs
  const [toolbarSearch, setToolbarSearch] = useState('');
  const [darkSearch, setDarkSearch] = useState('');
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [simQuery, setSimQuery] = useState('');
  const [isSimLoading, setIsSimLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToken = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedToken(val);
    setTimeout(() => setCopiedToken(null), 1800);
  };

  const handleSimChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSimQuery(q);
    if (q) {
      setIsSimLoading(true);
      const timer = setTimeout(() => setIsSimLoading(false), 250);
      return () => clearTimeout(timer);
    } else {
      setIsSimLoading(false);
    }
  };

  const filteredItems = SAMPLE_DATA.filter((item) => {
    if (!simQuery.trim()) return true;
    const q = simQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.phone.includes(q) ||
      item.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-10 font-sans">
      {/* 1. Overview & Anatomy */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-xl text-[#16281D] m-0 tracking-tight flex items-center gap-2">
              <Search size={20} className="text-[#16281D]" />
              Search Bar Architecture & Ergonomics
            </h2>
            <p className="text-xs text-[#71717A] m-0 mt-0.5 font-medium">
              Capsule pill geometry (<code className="text-[#16281D] font-mono">rounded-full</code>), Rule 7 full-width Row 1 integration, signature lime glow, and instant clear ergonomics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
              Rule 7 Responsive Standard
            </span>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] flex flex-col gap-1 shadow-xs">
            <span className="text-xs font-bold text-[#16281D]">Capsule Pill Geometry</span>
            <span className="text-[11px] text-[#71717A]">
              Standardized with <code className="text-[#16281D] font-mono">rounded-full</code> (9999px), eliminating sharp boxy corners.
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] flex flex-col gap-1 shadow-xs">
            <span className="text-xs font-bold text-[#16281D]">Rule 7 Row 1 Full-Width</span>
            <span className="text-[11px] text-[#71717A]">
              Consumes 100% of available space with <code className="text-[#16281D] font-mono">flex-1 min-w-0</code> on desktop and stacks full-width on mobile.
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] flex flex-col gap-1 shadow-xs">
            <span className="text-xs font-bold text-[#16281D]">Vibrant Lime Focus Glow</span>
            <span className="text-[11px] text-[#71717A]">
              Focus ring highlights in brand lime: <code className="text-[#15803D] font-mono">#9FE870</code> with 20% alpha halo shadow.
            </span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-[#EAEAEA] flex flex-col gap-1 shadow-xs">
            <span className="text-xs font-bold text-[#16281D]">Single-Tap Clear Action</span>
            <span className="text-[11px] text-[#71717A]">
              Inline circular <code className="text-[#16281D] font-mono">[X]</code> button allows instant clearing without disrupting input focus.
            </span>
          </div>
        </div>
      </section>

      {/* 2. Interactive Search Bar Gallery */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
            1. Search Bar Design Variants
          </h3>
          <p className="text-xs text-[#71717A] m-0 mt-0.5">
            Test live interactive inputs across light canvas, dark inspector, command palette, and dropdown menus.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Primary Toolbar Search (Orders, Customers, Invoices, Appointments) */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">Primary Toolbar Search (Row 1 Standard)</span>
              <span className="text-[10px] font-mono text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full border border-black/5">
                h-10 px-4 rounded-full
              </span>
            </div>

            <div className="relative flex items-center w-full">
              <Search
                size={14}
                className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
              />
              <input
                type="text"
                value={toolbarSearch}
                onChange={(e) => setToolbarSearch(e.target.value)}
                placeholder="Search orders by customer, phone, status..."
                className="w-full h-10 pl-9 pr-9 rounded-full bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/20"
              />
              {toolbarSearch && (
                <button
                  type="button"
                  onClick={() => setToolbarSearch('')}
                  className="absolute right-3 w-5 h-5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1 border-t border-[#F4F7F4]">
              <span>Used on: Orders, Customers, Appointments, Invoices</span>
              <span>{toolbarSearch.length} characters</span>
            </div>
          </div>

          {/* Card 2: Global Command Palette Search (Navbar / Modal) */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">Global Command Palette Trigger</span>
              <span className="text-[10px] font-mono text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full border border-black/5">
                Capsule with Keybadge
              </span>
            </div>

            <div className="relative flex items-center w-full">
              <Search
                size={14}
                className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
              />
              <input
                type="text"
                readOnly
                value=""
                placeholder="Quick navigate or search actions..."
                className="w-full h-10 pl-9 pr-18 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#71717A] outline-none transition-all cursor-pointer"
              />
              <div className="absolute right-2.5 flex items-center gap-1 bg-white border border-[#E4E4E7] rounded-md px-1.5 py-0.5 text-[10px] font-mono text-[#71717A] shadow-2xs pointer-events-none">
                <Command size={10} /> K
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1 border-t border-[#F4F7F4]">
              <span>Trigger for system command palette (`HeaderCommandPalette.tsx`)</span>
              <span className="text-[#059669] font-semibold">Instant Modal Launch</span>
            </div>
          </div>

          {/* Card 3: Dark Forest Inspector Search */}
          <div className="bg-[#16281D] rounded-2xl p-5 border border-white/10 shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Dark Inspector Search</span>
              <span className="text-[10px] font-mono text-[#8FA89B] bg-[#203628] px-2 py-0.5 rounded-full border border-white/10">
                #203628 surface
              </span>
            </div>

            <div className="relative flex items-center w-full">
              <Search
                size={14}
                className="absolute left-3.5 text-[#8FA89B] pointer-events-none shrink-0"
              />
              <input
                type="text"
                value={darkSearch}
                onChange={(e) => setDarkSearch(e.target.value)}
                placeholder="Search campaigns, audience..."
                className="w-full h-10 pl-9 pr-9 rounded-full bg-[#203628] border border-white/10 text-xs font-sans text-white placeholder-[#8FA89B] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/25"
              />
              {darkSearch && (
                <button
                  type="button"
                  onClick={() => setDarkSearch('')}
                  className="absolute right-3 w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white cursor-pointer border-0 transition-colors"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#8FA89B] pt-1 border-t border-white/5">
              <span>Used inside Right Campaign Drawer & Dark Panels</span>
              <span>{darkSearch.length} characters</span>
            </div>
          </div>

          {/* Card 4: In-Menu / Dropdown Search Header */}
          <div className="bg-white rounded-2xl p-5 border border-[#EAEAEA] shadow-xs flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#16281D]">In-Menu Dropdown Search Header</span>
              <span className="text-[10px] font-mono text-[#71717A] bg-[#F4F7F4] px-2 py-0.5 rounded-full border border-black/5">
                CustomDropdown.tsx
              </span>
            </div>

            <div className="p-2.5 bg-[#F4F7F4] rounded-xl border border-[#EAEAEA] flex flex-col gap-2">
              <div className="relative flex items-center w-full">
                <Search
                  size={13}
                  className="absolute left-2.5 text-[#a1a1aa] pointer-events-none shrink-0"
                />
                <input
                  type="text"
                  value={dropdownSearch}
                  onChange={(e) => setDropdownSearch(e.target.value)}
                  placeholder="Search customer by name or phone..."
                  className="w-full h-8 pl-8 pr-7 rounded-lg bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20"
                />
                {dropdownSearch && (
                  <button
                    type="button"
                    onClick={() => setDropdownSearch('')}
                    className="absolute right-2 text-[#a1a1aa] hover:text-[#16281D] cursor-pointer border-0 bg-transparent p-0 flex items-center"
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1 border-t border-[#F4F7F4]">
              <span>Sticky header inside portaled dropdown popovers</span>
              <span className="text-[#059669] font-semibold">Auto-focused</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Search & Filter Simulator */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight flex items-center gap-2">
              <Sparkles size={16} className="text-[#16281D]" />
              2. Live Interactive Filter Simulator
            </h3>
            <p className="text-xs text-[#71717A] m-0 mt-0.5">
              Type in the search bar below to filter live sample data by order ID, customer name, service category, or phone.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-[#71717A]">
            Showing {filteredItems.length} of {SAMPLE_DATA.length} records
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-[#EAEAEA] p-5 shadow-xs flex flex-col gap-4">
          {/* Full-width Search Bar */}
          <div className="relative flex items-center w-full">
            <Search
              size={15}
              className="absolute left-4 text-[#a1a1aa] pointer-events-none shrink-0"
            />
            <input
              type="text"
              value={simQuery}
              onChange={handleSimChange}
              placeholder="Filter by 'Thameesha', 'Bot', '+94', 'ORD-1092', 'pending'..."
              className="w-full h-11 pl-11 pr-11 rounded-full bg-[#FAFAFA] hover:bg-white border border-[#EAEAEA] text-xs sm:text-sm font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:bg-white focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/25 shadow-2xs"
            />
            {isSimLoading ? (
              <Loader2
                size={16}
                className="absolute right-4 text-[#9FE870] animate-spin shrink-0 pointer-events-none"
              />
            ) : simQuery ? (
              <button
                type="button"
                onClick={() => setSimQuery('')}
                className="absolute right-3.5 w-6 h-6 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
                title="Clear filter"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>

          {/* Filtered Results Table */}
          <div className="overflow-x-auto border border-[#EAEAEA] rounded-xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-[#71717A] uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-2.5 px-4">Order ID</th>
                  <th className="py-2.5 px-4">Customer Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Phone Number</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F7F4]">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 px-4 text-center text-xs text-[#71717A]">
                      No results matching &ldquo;{simQuery}&rdquo;. Try clearing your search.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F9FAF9] transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-[#16281D]">{item.id}</td>
                      <td className="py-2.5 px-4 font-medium text-[#16281D]">{item.name}</td>
                      <td className="py-2.5 px-4 text-[#52525B]">{item.category}</td>
                      <td className="py-2.5 px-4 font-mono text-[#71717A]">{item.phone}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'completed'
                              ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]'
                              : item.status === 'pending'
                              ? 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]'
                              : 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Specifications & Code Tokens */}
      <section className="flex flex-col gap-4">
        <div>
          <h3 className="font-bold text-base text-[#16281D] m-0 tracking-tight">
            3. Search Bar Design Tokens
          </h3>
          <p className="text-xs text-[#71717A] m-0 mt-0.5">
            Exact Tailwind metrics, CSS properties, and color tokens for copy-paste implementation.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#EAEAEA] p-5 shadow-xs overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#EAEAEA] text-[#71717A] uppercase text-[10px] font-bold">
                <th className="py-2 px-3">Property</th>
                <th className="py-2 px-3">Light Toolbar Token</th>
                <th className="py-2 px-3">Dark Inspector Token</th>
                <th className="py-2 px-3">Rule / Behavior</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F7F4] font-mono text-[11px]">
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-[#16281D]">Geometry / Radius</td>
                <td className="py-2.5 px-3 text-[#16281D]">rounded-full (9999px)</td>
                <td className="py-2.5 px-3 text-[#16281D]">rounded-full (9999px)</td>
                <td className="py-2.5 px-3 font-sans text-[#71717A]">Strict capsule shape; no boxy corners</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-[#16281D]">Height & Padding</td>
                <td className="py-2.5 px-3 text-[#16281D]">h-10 pl-9 pr-9</td>
                <td className="py-2.5 px-3 text-[#16281D]">h-10 pl-9 pr-9</td>
                <td className="py-2.5 px-3 font-sans text-[#71717A]">Compact touch target (min 40px height)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-[#16281D]">Background</td>
                <td className="py-2.5 px-3 text-[#16281D]">#FFFFFF (bg-white)</td>
                <td className="py-2.5 px-3 text-[#16281D]">#203628</td>
                <td className="py-2.5 px-3 font-sans text-[#71717A]">High contrast against container floor</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-[#16281D]">Border & Focus Ring</td>
                <td className="py-2.5 px-3 text-[#15803D]">focus:border-[#9FE870] focus:ring-3 [#9FE870]/20</td>
                <td className="py-2.5 px-3 text-[#15803D]">focus:border-[#9FE870] focus:ring-3 [#9FE870]/25</td>
                <td className="py-2.5 px-3 font-sans text-[#71717A]">Signature vibrant lime interactive glow</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-[#16281D]">Vector Icon</td>
                <td className="py-2.5 px-3 text-[#71717A]">Search size=14 text-[#a1a1aa]</td>
                <td className="py-2.5 px-3 text-[#8FA89B]">Search size=14 text-[#8FA89B]</td>
                <td className="py-2.5 px-3 font-sans text-[#71717A]">Left aligned, vertically centered</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-[#16281D]">Clear Action</td>
                <td className="py-2.5 px-3 text-[#71717A]">X size=12 w-5 h-5 rounded-full</td>
                <td className="py-2.5 px-3 text-white/70">X size=12 w-5 h-5 rounded-full</td>
                <td className="py-2.5 px-3 font-sans text-[#71717A]">Shown conditionally when query exists</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-sans font-bold text-[#16281D]">Responsive Width</td>
                <td className="py-2.5 px-3 text-[#16281D]">w-full sm:flex-1 min-w-0</td>
                <td className="py-2.5 px-3 text-[#16281D]">w-full</td>
                <td className="py-2.5 px-3 font-sans text-[#71717A]">Rule 7: Consumes 100% width, zero trailing voids</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
export default SearchBarPanel;
