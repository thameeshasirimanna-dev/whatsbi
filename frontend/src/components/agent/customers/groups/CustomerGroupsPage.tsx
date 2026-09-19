import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  X,
  Layers,
  LayoutGrid,
  List,
} from 'lucide-react';
import { CustomerGroup, Customer } from '../CustomerTypes';
import {
  fetchCustomerGroups,
  deleteCustomerGroup,
  exportGroupPhones,
  fetchAllCustomers,
} from './customerGroupsApi';
import { CreateGroupModal } from './CreateGroupModal';
import { GroupMembersDrawer } from './GroupMembersDrawer';
import { GroupMetricCards } from './GroupMetricCards';
import { GroupCard } from './GroupCard';
import { CustomerGroupsTable } from './CustomerGroupsTable';
import { useDialog } from '../../shared/DialogProvider';
import { EmptyTableState } from '../../shared/EmptyTableState';
import CustomDropdown from '../../shared/CustomDropdown';

const PIPELINE_STAGE_ORDER = [
  'New Lead',
  'Contacted',
  'Follow-up Needed',
  'Not Responding',
  'Interested',
  'Quotation Sent',
  'Asked for More Info',
  'Payment Pending',
  'Paid',
  'Order Confirmed',
];

export const CustomerGroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast, confirm: dlgConfirm } = useDialog();

  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [totalGroupedCustomers, setTotalGroupedCustomers] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pipeline_stage' | 'lead_stage' | 'custom'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'most_contacts' | 'fewest_contacts' | 'name'>('default');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>(() => {
    try {
      const saved = localStorage.getItem('whatsbi_customer_groups_view_mode');
      return saved === 'grid' ? 'grid' : 'table';
    } catch {
      return 'table';
    }
  });

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setViewMode(mode);
    try {
      localStorage.setItem('whatsbi_customer_groups_view_mode', mode);
    } catch {}
  };

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [inspectingGroup, setInspectingGroup] = useState<CustomerGroup | null>(null);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [copiedGroupId, setCopiedGroupId] = useState<number | null>(null);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const res = await fetchCustomerGroups();
      setGroups(res.groups || []);
      setTotalGroups(res.total_groups || 0);
      setTotalGroupedCustomers(res.total_grouped_customers || 0);
      setTotalCustomers(res.total_customers || 0);
    } catch (err: any) {
      toast(err.message || 'Failed to load customer groups', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const custs = await fetchAllCustomers();
      setAllCustomers(custs);
    } catch (e) {
      console.error('Failed to load customers for groups:', e);
    }
  };

  // Load groups and customer list on mount
  useEffect(() => {
    loadGroups();
    loadCustomers();
  }, []);

  // Filter and sort groups
  const filteredAndSortedGroups = useMemo(() => {
    return groups
      .filter((g) => {
        const matchesSearch =
          g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (g.description && g.description.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesType =
          typeFilter === 'all'
            ? true
            : (typeFilter === 'pipeline_stage' || typeFilter === 'lead_stage')
            ? g.is_default === true
            : g.is_default !== true;

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === 'most_contacts') {
          return b.member_count - a.member_count;
        }
        if (sortBy === 'fewest_contacts') {
          return a.member_count - b.member_count;
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        // default: pipeline stage groups in canonical funnel order, then custom groups
        if (Boolean(a.is_default) !== Boolean(b.is_default)) {
          return a.is_default ? -1 : 1;
        }
        if (a.is_default && b.is_default) {
          const idxA = PIPELINE_STAGE_ORDER.indexOf(a.name);
          const idxB = PIPELINE_STAGE_ORDER.indexOf(b.name);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [groups, searchTerm, typeFilter, sortBy]);

  const handleDeleteGroup = async (group: CustomerGroup) => {
    if (group.is_default) {
      toast('Default pipeline stage groups cannot be deleted as they are managed by the CRM system.', 'error');
      return;
    }

    const ok = await dlgConfirm(
      `Are you sure you want to delete "${group.name}"? Contacts in this group will not be deleted from your CRM.`,
      { danger: true }
    );
    if (!ok) return;

    try {
      await deleteCustomerGroup(group.id);
      toast(`Group "${group.name}" deleted`, 'success');
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
      setTotalGroups((prev) => Math.max(0, prev - 1));
      if (inspectingGroup?.id === group.id) setInspectingGroup(null);
    } catch (err: any) {
      toast(err.message || 'Failed to delete group', 'error');
    }
  };

  const handleCopyGroupPhones = async (group: CustomerGroup) => {
    try {
      const res = await exportGroupPhones(group.id);
      if (res.phones.length === 0) {
        toast(`No contact numbers found in "${group.name}"`, 'error');
        return;
      }
      await navigator.clipboard.writeText(res.phones.join('\n'));
      setCopiedGroupId(group.id);
      toast(`Copied ${res.phones.length} phone number(s) to clipboard`, 'success');
      setTimeout(() => setCopiedGroupId(null), 2000);
    } catch (err: any) {
      toast(err.message || 'Failed to copy phone numbers', 'error');
    }
  };

  const largestGroupCount = groups.reduce((max, g) => Math.max(max, g.member_count), 0);
  const unassignedCount = Math.max(0, totalCustomers - totalGroupedCustomers);

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      {/* Metric Cards */}
      <GroupMetricCards
        totalGroups={totalGroups}
        totalGroupedCustomers={totalGroupedCustomers}
        largestGroupCount={largestGroupCount}
        unassignedCount={unassignedCount}
      />

      {/* Two-Row Full-Width Toolbar (Exact CustomersPage Parity) */}
      <div className="bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3">
        {/* Row 1: Search & Primary Actions (Full width) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          {/* Search Input with Clear Action */}
          <div className="relative flex-1 min-w-0 flex items-center">
            <Search
              size={14}
              className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
            />
            <input
              type="text"
              placeholder="Search groups by name or description…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-9 pr-9 rounded-full bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 w-5 h-5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* View Switcher, Navigation Pill & Primary CTA Button */}
          <div className="flex items-center gap-2 sm:gap-3 justify-between sm:justify-end shrink-0">
            {/* View Switcher: Grid vs Table */}
            <div className="flex items-center p-0.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-full shrink-0">
              <button
                type="button"
                onClick={() => handleViewModeChange('grid')}
                className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer border-0 ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#16281D] shadow-xs font-bold'
                    : 'text-[#71717A] hover:text-[#16281D]'
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid size={13} />
                <span className="hidden md:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('table')}
                className={`h-8 sm:h-9 px-2.5 sm:px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer border-0 ${
                  viewMode === 'table'
                    ? 'bg-white text-[#16281D] shadow-xs font-bold'
                    : 'text-[#71717A] hover:text-[#16281D]'
                }`}
                title="Table View"
                aria-label="Table View"
              >
                <List size={14} />
                <span className="hidden md:inline">Table</span>
              </button>
            </div>

            <button
              onClick={() => navigate('/agent/customers')}
              className="rounded-full px-3.5 py-2 sm:py-2.5 bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#16281D] font-sans text-xs font-bold border border-[#EAEAEA] hover:border-[#16281D]/20 flex items-center gap-1.5 sm:gap-2 shrink-0 transition-all cursor-pointer"
              title="View All Customers"
            >
              <Users size={13} className="text-[#16281D]" />
              <span>All Customers</span>
              {totalCustomers > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#16281D] text-[#9FE870] text-[10px] font-mono font-bold leading-none">
                  {totalCustomers}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setEditingGroup(null);
                setShowCreateModal(true);
              }}
              className="flex-1 sm:flex-initial justify-center rounded-full px-4 sm:px-5 py-2 sm:py-2.5 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 cursor-pointer border-0"
            >
              <Plus size={14} /> Create Group
            </button>
          </div>
        </div>

        {/* Row 2: Full-Width Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:flex lg:items-center gap-2 sm:gap-2.5 w-full">
          {/* Group Category / Type Filter */}
          <div className="col-span-1 w-full min-w-0 lg:flex-1">
            <CustomDropdown
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as any)}
              options={[
                { value: 'all', label: 'All Groups' },
                { value: 'pipeline_stage', label: 'Pipeline Stage Groups' },
                { value: 'custom', label: 'Custom Groups' },
              ]}
              className="w-full"
            />
          </div>

          {/* Sort By Filter */}
          <div className="col-span-1 w-full min-w-0 lg:flex-1">
            <CustomDropdown
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              options={[
                { value: 'default', label: 'Default Order' },
                { value: 'most_contacts', label: 'Most Contacts' },
                { value: 'fewest_contacts', label: 'Fewest Contacts' },
                { value: 'name', label: 'Name (A-Z)' },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Group Content: Loading, Empty, Table View, or Grid View */}
      {loading ? (
        <div className="p-12 text-center text-xs font-medium text-[#71717A] bg-white rounded-[20px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)]">
          Loading customer groups…
        </div>
      ) : groups.length === 0 ? (
        <EmptyTableState
          icon={Layers}
          title="No customer groups yet"
          description="Group and segment your contacts into custom and pipeline stage categories."
          actionLabel="Create First Group"
          onAction={() => {
            setEditingGroup(null);
            setShowCreateModal(true);
          }}
        />
      ) : filteredAndSortedGroups.length === 0 ? (
        <EmptyTableState
          isFiltered
          filteredTitle="No matching groups found"
          filteredMessage={`No customer groups match "${searchTerm}".`}
        />
      ) : viewMode === 'table' ? (
        <CustomerGroupsTable
          groups={filteredAndSortedGroups}
          totalGroupsCount={groups.length}
          searchTerm={searchTerm}
          copiedGroupId={copiedGroupId}
          onEdit={(g) => {
            setEditingGroup(g);
            setShowCreateModal(true);
          }}
          onDelete={handleDeleteGroup}
          onCopyPhones={handleCopyGroupPhones}
          onViewMembers={(g) => setInspectingGroup(g)}
          onCreateGroup={() => {
            setEditingGroup(null);
            setShowCreateModal(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredAndSortedGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              isCopied={copiedGroupId === group.id}
              onEdit={(g) => {
                setEditingGroup(g);
                setShowCreateModal(true);
              }}
              onDelete={handleDeleteGroup}
              onCopyPhones={handleCopyGroupPhones}
              onViewMembers={(g) => setInspectingGroup(g)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Group Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingGroup(null);
        }}
        onSaved={() => {
          loadGroups();
          loadCustomers();
          setShowCreateModal(false);
          setEditingGroup(null);
        }}
        editingGroup={editingGroup}
        allCustomers={allCustomers}
      />

      {/* Members Management Drawer */}
      <GroupMembersDrawer
        isOpen={inspectingGroup !== null}
        onClose={() => setInspectingGroup(null)}
        group={inspectingGroup}
        allCustomers={allCustomers}
        onMembershipChanged={() => {
          loadGroups();
          loadCustomers();
        }}
      />
    </div>
  );
};

export default CustomerGroupsPage;
