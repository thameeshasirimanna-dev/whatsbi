import React from 'react';
import {
  Users, Plus, MessageCircle, Pencil, ShoppingBag, Trash2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  Customer, ProfileImage, thCell,
  getProgressDotColor, getProgressStyle, getProgressLabel,
  detectCountryCode, getFlagEmoji,
  PJS, MONO
} from './CustomerTypes';
import { TableSelection } from '../shared/useTableSelection';

interface CustomersTableProps {
  tableRef: React.RefObject<HTMLDivElement | null>;
  paginatedCustomers: Customer[];
  totalCustomersCount: number;
  totalPages: number;
  effectiveCurrentPage: number;
  startIndex: number;
  endIndex: number;
  searchTerm: string;
  selection: TableSelection<number>;
  selectAllCheckboxRef: React.RefObject<HTMLInputElement | null>;
  isAllPageSelected: boolean;
  pageIds: number[];
  profileImages: ProfileImage[];
  agentPrefix: string | null;
  agentId: number | null;
  onPageChange: (page: number, shouldScroll?: boolean) => void;
  onAddCustomerClick: () => void;
  onSelectCustomerForOrder: (customer: Customer) => void;
  onEditCustomerClick: (customer: Customer) => void;
  onDeleteCustomerClick: (customer: Customer) => void;
  onFetchProfilePic: (phone: string) => void;
  onProfilePicError: (phone: string) => void;
}

export const CustomersTable: React.FC<CustomersTableProps> = ({
  tableRef,
  paginatedCustomers,
  totalCustomersCount,
  totalPages,
  effectiveCurrentPage,
  startIndex,
  endIndex,
  searchTerm,
  selection,
  selectAllCheckboxRef,
  isAllPageSelected,
  pageIds,
  profileImages,
  agentPrefix,
  agentId,
  onPageChange,
  onAddCustomerClick,
  onSelectCustomerForOrder,
  onEditCustomerClick,
  onDeleteCustomerClick,
  onFetchProfilePic,
  onProfilePicError,
}) => {
  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, '...', total];
    if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  return (
    <div
      ref={tableRef}
      style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #EAEAEA',
        boxShadow: '0 4px 20px rgba(22,40,29,0.03)',
        overflow: 'hidden',
        scrollMarginTop: 20,
      }}
    >
      {totalCustomersCount === 0 ? (
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#F4F7F4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <Users size={24} style={{ color: '#A1A1AA' }} />
          </div>
          <div style={{ ...PJS, fontSize: 16, fontWeight: 700, color: '#16281D', marginBottom: 6 }}>
            {searchTerm ? "No customers found" : "No customers yet"}
          </div>
          <div style={{ ...PJS, fontSize: 13, color: '#71717A', marginBottom: 20 }}>
            {searchTerm ? `No customers match "${searchTerm}"` : "Get started by adding your first customer."}
          </div>
          <button
            onClick={onAddCustomerClick}
            className="rounded-full px-5 py-2.5 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] inline-flex items-center gap-2 cursor-pointer border-0"
          >
            <Plus size={14} /> Add your first customer
          </button>
        </div>
      ) : (
        <>
          {/* Mobile/Tablet Card Layout */}
          <div className="block lg:hidden">
            <div className="flex flex-col divide-y divide-[#EAEAEA]">
              {paginatedCustomers.map((customer: Customer, index: number) => {
                const profile = profileImages.find(img => img.phone === customer.phone);
                const hasImage = profile?.url && !profile?.error;
                const isCardSelected = selection.isSelected(customer.id);

                return (
                  <div
                    key={customer.id}
                    style={{
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      background: isCardSelected ? '#F4F7F4' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          checked={isCardSelected}
                          onChange={() => selection.toggleSelect(customer.id)}
                          aria-label={`Select customer ${customer.name}`}
                          style={{
                            cursor: 'pointer',
                            accentColor: '#16281D',
                            width: 16,
                            height: 16,
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                          {profile?.loading ? (
                            <div style={{ width: 36, height: 36, background: '#F4F7F4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(159,232,112,0.3)', borderTopColor: '#9FE870', animation: 'cp-spin 0.7s linear infinite' }} />
                            </div>
                          ) : hasImage ? (
                            <img
                              src={profile.url}
                              alt={customer.name}
                              style={{ width: 36, height: 36, objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              onClick={() => onFetchProfilePic(customer.phone)}
                              style={{ width: 36, height: 36, background: '#16281D', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <span style={{ ...PJS, fontSize: 13, fontWeight: 700, color: '#9FE870' }}>{customer.name.charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ ...PJS, fontSize: 13, fontWeight: 600, color: '#16281D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{ fontSize: 13 }}>{getFlagEmoji(detectCountryCode(customer.phone))}</span>
                            <span style={{ ...MONO, fontSize: 12, color: '#71717A' }}>{customer.phone}</span>
                          </div>
                        </div>
                      </div>

                      <span style={{ ...PJS, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, ...getProgressStyle(customer) }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: getProgressDotColor(customer) }} />
                        {getProgressLabel(customer)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F4F7F4', padding: '8px 12px', borderRadius: 12 }}>
                      <span style={{ ...PJS, fontSize: 12, color: '#71717A' }}>Orders: <strong style={{ color: '#16281D', ...MONO }}>{customer.order_count || 0}</strong></span>
                      <span style={{ ...PJS, fontSize: 11, color: '#71717A' }}>Joined: {new Date(customer.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                      <button
                        title="Open conversation"
                        onClick={() => window.open(`${window.location.origin}/agent/conversations?customerId=${customer.id}`, "_blank")}
                        className="rounded-full px-3.5 py-1.5 bg-[#9FE870]/20 hover:bg-[#9FE870] text-[#16281D] font-sans text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-0"
                      >
                        <MessageCircle size={13} /> Chat
                      </button>

                      <button
                        title="Edit customer"
                        onClick={() => onEditCustomerClick(customer)}
                        className="rounded-full px-3.5 py-1.5 bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#D97706] font-sans text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-0"
                      >
                        <Pencil size={12} /> Edit
                      </button>

                      <button
                        title="Create new order"
                        onClick={() => onSelectCustomerForOrder(customer)}
                        disabled={!agentPrefix || !agentId}
                        className="rounded-full px-3.5 py-1.5 bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] font-sans text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
                      >
                        <ShoppingBag size={12} /> New Order
                      </button>

                      <button
                        title="Delete customer"
                        onClick={() => onDeleteCustomerClick(customer)}
                        className="rounded-full px-3.5 py-1.5 bg-[#FEE2E2] hover:bg-[#FECACA] text-[#EF4444] font-sans text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-0"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block w-full">
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
              <thead>
                <tr>
                  <th style={{ ...thCell, width: '38px', textAlign: 'center', padding: '10px 6px' }}>
                    <input
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={() => selection.selectAll(pageIds)}
                      aria-label="Select all customers on page"
                      style={{
                        cursor: 'pointer',
                        accentColor: '#16281D',
                        width: 15,
                        height: 15,
                      }}
                    />
                  </th>
                  <th style={{ ...thCell, width: '26%' }}>Name</th>
                  <th style={{ ...thCell, width: '18%' }}>Phone</th>
                  <th style={{ ...thCell, width: '10%' }}>Orders</th>
                  <th style={{ ...thCell, width: '18%' }}>Progress</th>
                  <th style={{ ...thCell, width: '14%' }}>Joined</th>
                  <th style={{ ...thCell, textAlign: 'right', width: '14%', minWidth: 155 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map((customer: Customer, index: number) => {
                  const profile = profileImages.find(img => img.phone === customer.phone);
                  const hasImage = profile?.url && !profile?.error;
                  const isRowSelected = selection.isSelected(customer.id);

                  return (
                    <tr
                      key={customer.id}
                      style={{
                        borderBottom: '1px solid #EAEAEA',
                        transition: 'background 0.1s',
                        background: isRowSelected ? '#F4F7F4' : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (!isRowSelected) (e.currentTarget as HTMLTableRowElement).style.background = '#F4F7F4';
                      }}
                      onMouseLeave={e => {
                        if (!isRowSelected) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center', padding: '12px 6px', whiteSpace: 'nowrap' }}>
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => selection.toggleSelect(customer.id)}
                          aria-label={`Select customer ${customer.name}`}
                          style={{
                            cursor: 'pointer',
                            accentColor: '#16281D',
                            width: 15,
                            height: 15,
                          }}
                        />
                      </td>

                      {/* Name */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                            {profile?.loading ? (
                              <div style={{ width: 36, height: 36, background: '#F4F7F4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(159,232,112,0.3)', borderTopColor: '#9FE870', animation: 'cp-spin 0.7s linear infinite' }} />
                              </div>
                            ) : hasImage ? (
                              <img
                                src={profile.url}
                                alt={customer.name}
                                style={{ width: 36, height: 36, objectFit: 'cover' }}
                                onError={() => onProfilePicError(customer.phone)}
                              />
                            ) : (
                              <div
                                onClick={() => onFetchProfilePic(customer.phone)}
                                style={{ width: 36, height: 36, background: '#16281D', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <span style={{ ...PJS, fontSize: 13, fontWeight: 700, color: '#9FE870' }}>{customer.name.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <span style={{ ...PJS, fontSize: 13, fontWeight: 600, color: '#16281D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={customer.name}>
                            {customer.name}
                          </span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13 }}>{getFlagEmoji(detectCountryCode(customer.phone))}</span>
                          <span style={{ ...MONO, fontSize: 13, color: '#16281D' }}>{customer.phone}</span>
                        </div>
                      </td>

                      {/* Orders */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ ...MONO, fontSize: 13, fontWeight: 700, color: '#16281D' }}>{customer.order_count || 0}</span>
                      </td>

                      {/* Progress */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ ...PJS, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, display: 'inline-flex', alignItems: 'center', gap: 5, ...getProgressStyle(customer) }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: getProgressDotColor(customer) }} />
                          {getProgressLabel(customer)}
                        </span>
                      </td>

                      {/* Joined */}
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...PJS, fontSize: 12, color: '#71717A' }}>
                          {new Date(customer.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', width: '14%', minWidth: 155 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            title="Open conversation"
                            onClick={() => window.open(`${window.location.origin}/agent/conversations?customerId=${customer.id}`, "_blank")}
                            className="w-7 h-7 rounded-full bg-[#9FE870]/20 hover:bg-[#9FE870] text-[#16281D] flex items-center justify-center transition-colors cursor-pointer border-0"
                          >
                            <MessageCircle size={14} />
                          </button>

                          <button
                            title="Edit customer"
                            onClick={() => onEditCustomerClick(customer)}
                            className="w-7 h-7 rounded-full bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#D97706] flex items-center justify-center transition-colors cursor-pointer border-0"
                          >
                            <Pencil size={13} />
                          </button>

                          <button
                            title="Create new order"
                            onClick={() => onSelectCustomerForOrder(customer)}
                            disabled={!agentPrefix || !agentId}
                            className="w-7 h-7 rounded-full bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0284C7] flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer border-0"
                          >
                            <ShoppingBag size={13} />
                          </button>

                          <button
                            title="Delete customer"
                            onClick={() => onDeleteCustomerClick(customer)}
                            className="w-7 h-7 rounded-full bg-[#FEE2E2] hover:bg-[#FECACA] text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer border-0"
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

          {/* Pagination Footer */}
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid #EAEAEA',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Entries Status */}
            <div style={{ ...PJS, fontSize: 12, color: '#71717A' }}>
              Showing <strong style={{ color: '#16281D', ...MONO }}>{totalCustomersCount === 0 ? 0 : startIndex + 1}</strong> to <strong style={{ color: '#16281D', ...MONO }}>{endIndex}</strong> of <strong style={{ color: '#16281D', ...MONO }}>{totalCustomersCount}</strong> customers
            </div>

            {/* Page Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={() => onPageChange(Math.max(1, effectiveCurrentPage - 1), true)}
                disabled={effectiveCurrentPage <= 1}
                title="Previous page"
                className="w-8 h-8 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-[#16281D] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              {getPageNumbers(effectiveCurrentPage, totalPages).map((p, idx) => {
                if (p === '...') {
                  return (
                    <span key={`dots-${idx}`} style={{ ...PJS, fontSize: 12, color: '#A1A1AA', padding: '0 4px' }}>
                      …
                    </span>
                  );
                }
                const isCurrent = p === effectiveCurrentPage;
                return (
                  <button
                    key={p}
                    onClick={() => onPageChange(p as number, true)}
                    className={`min-w-[32px] h-8 px-2.5 rounded-full font-mono text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#9FE870] text-[#16281D] shadow-[0_2px_8px_rgba(159,232,112,0.35)] border-0'
                        : 'bg-white border border-[#EAEAEA] text-[#71717A] hover:bg-[#F4F7F4] hover:text-[#16281D]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => onPageChange(Math.min(totalPages, effectiveCurrentPage + 1), true)}
                disabled={effectiveCurrentPage >= totalPages}
                title="Next page"
                className="w-8 h-8 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-[#16281D] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomersTable;
