import React from 'react';
import { AnimatePresence } from "framer-motion";
import { Search, Plus } from 'lucide-react';
import CreateOrderModal from "./CreateOrderModal";
import TimeRangeFilter from "../shared/TimeRangeFilter";
import CustomDropdown from "../shared/CustomDropdown";
import { SkeletonPage } from "../shared/Skeleton";
import CustomerBulkActionsBar from "./CustomerBulkActionsBar";
import CustomerMetricsCards from "./CustomerMetricsCards";
import CreateCustomerModal from "./CreateCustomerModal";
import EditCustomerModal from "./EditCustomerModal";
import DeleteCustomerModal from "./DeleteCustomerModal";
import CustomersTable from "./CustomersTable";
import { useCustomers } from "./useCustomers";
import {
  leadStages, interestStages, conversionStages,
  detectCountryCode, extractLocalNumber,
  inputStyle, selectStyle, onFocusG, onBlurG, PJS
} from "./CustomerTypes";

const CustomersPage: React.FC = () => {
  const {
    tableRef,
    agentPrefix,
    agentId,
    paginatedCustomers,
    totalCustomersCount,
    totalPages,
    effectiveCurrentPage,
    startIndex,
    endIndex,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    timeRange,
    setTimeRange,
    progressCategory,
    setProgressCategory,
    progressStage,
    setProgressStage,
    rowsPerPage,
    handleRowsPerPageChange,
    handlePageChange,
    metrics,
    selection,
    isBulkProcessing,
    selectAllCheckboxRef,
    isAllPageSelected,
    pageIds,
    profileImages,
    setProfileImages,
    fetchCustomers,
    fetchProfilePicture,
    showCreateModal,
    setShowCreateModal,
    createForm,
    setCreateForm,
    selectedCountryCode,
    setSelectedCountryCode,
    handleCreateChange,
    handleCreateCountryChange,
    handleCreateStageChange,
    handleCreateCustomer,
    editingCustomer,
    setEditingCustomer,
    editForm,
    setEditForm,
    selectedEditCountryCode,
    setSelectedEditCountryCode,
    handleEditChange,
    handleEditCountryChange,
    handleStageChange,
    handleUpdateCustomer,
    deletingCustomer,
    setDeletingCustomer,
    handleDeleteCustomer,
    showOrderModal,
    setShowOrderModal,
    selectedCustomer,
    setSelectedCustomer,
    handleBulkDelete,
    handleBulkBroadcast,
  } = useCustomers();

  const handleOrderSuccess = () => {
    fetchCustomers();
    setShowOrderModal(false);
    setSelectedCustomer(null);
  };

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      <style>{`@keyframes cp-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Create Customer Modal */}
      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
          setSelectedCountryCode("+94");
        }}
        form={createForm}
        selectedCountryCode={selectedCountryCode}
        onFormChange={handleCreateChange}
        onCountryChange={handleCreateCountryChange}
        onStageChange={handleCreateStageChange}
        onSubmit={handleCreateCustomer}
      />

      {/* Edit Customer Modal */}
      <EditCustomerModal
        editingCustomer={editingCustomer}
        onClose={() => {
          setEditingCustomer(null);
          setEditForm({ name: "", phone: "", lead_stage: "New Lead", interest_stage: "", conversion_stage: "" });
          setSelectedEditCountryCode("+94");
        }}
        form={editForm}
        selectedCountryCode={selectedEditCountryCode}
        onFormChange={handleEditChange}
        onCountryChange={handleEditCountryChange}
        onStageChange={handleStageChange}
        onDeleteTrigger={(customer) => {
          setDeletingCustomer(customer);
          setEditingCustomer(null);
        }}
        onSubmit={handleUpdateCustomer}
      />

      {/* Delete Confirmation Modal */}
      <DeleteCustomerModal
        deletingCustomer={deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onConfirmDelete={handleDeleteCustomer}
      />

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && selectedCustomer && agentPrefix && agentId && (
          <CreateOrderModal
            key="order-modal"
            customer={selectedCustomer}
            agentPrefix={agentPrefix}
            agentId={agentId}
            onClose={() => setShowOrderModal(false)}
            onSuccess={handleOrderSuccess}
          />
        )}
      </AnimatePresence>

      {/* Metric Cards */}
      <CustomerMetricsCards metrics={metrics} timeRange={timeRange} />

      {/* Error Notice */}
      {error && (
        <div style={{ padding: '10px 14px', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 12, ...PJS, fontSize: 13, color: '#EF4444' }}>
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid #EAEAEA',
          boxShadow: '0 4px 20px rgba(22,40,29,0.03)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#71717A', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              handlePageChange(1, false);
            }}
            style={{ ...inputStyle, borderRadius: 9999, paddingLeft: 38 }}
            onFocus={onFocusG}
            onBlur={onBlurG}
          />
        </div>

        {/* Filters */}
        <CustomDropdown
          value={progressCategory}
          onChange={(val) => {
            setProgressCategory(val as any);
            setProgressStage("");
            handlePageChange(1, false);
          }}
          options={[
            { value: "all", label: "All Progress" },
            { value: "lead", label: "Lead Stage" },
            { value: "interest", label: "Interest Stage" },
            { value: "conversion", label: "Conversion Stage" },
          ]}
          minWidth={130}
        />

        {progressCategory !== "all" && (
          <CustomDropdown
            value={progressStage}
            onChange={(val) => {
              setProgressStage(val);
              handlePageChange(1, false);
            }}
            options={[
              {
                value: "",
                label: `All ${
                  progressCategory === "lead"
                    ? "Leads"
                    : progressCategory === "interest"
                    ? "Interests"
                    : "Conversions"
                }`,
              },
              ...(progressCategory === "lead"
                ? leadStages
                : progressCategory === "interest"
                ? interestStages
                : conversionStages
              ).map((s) => ({ value: s, label: s })),
            ]}
            minWidth={140}
          />
        )}

        <CustomDropdown
          value={sortBy}
          onChange={(val) => {
            setSortBy(val as any);
            handlePageChange(1, false);
          }}
          options={[
            { value: "newest", label: "Newest First" },
            { value: "oldest", label: "Oldest First" },
            { value: "orders", label: "Most Orders" },
          ]}
          minWidth={140}
        />

        <TimeRangeFilter
          value={timeRange}
          onChange={range => {
            setTimeRange(range);
            handlePageChange(1, false);
          }}
        />

        {/* Rows per page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ ...PJS, fontSize: 12, color: '#71717A', whiteSpace: 'nowrap', fontWeight: 600 }}>Rows:</span>
          <CustomDropdown
            value={rowsPerPage}
            onChange={(val) => handleRowsPerPageChange(Number(val))}
            options={[
              { value: 10, label: "10" },
              { value: 20, label: "20" },
              { value: 50, label: "50" },
              { value: 100, label: "100" },
            ]}
            minWidth={75}
          />
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-full px-5 py-2.5 bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] font-sans text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center gap-2 shrink-0 cursor-pointer border-0"
        >
          <Plus size={14} /> Add Customer
        </button>
      </div>

      {/* Bulk Actions Bar */}
      <CustomerBulkActionsBar
        selectedCount={selection.selectedCount}
        onBulkBroadcast={handleBulkBroadcast}
        onBulkDelete={handleBulkDelete}
        onClearSelection={selection.clearSelection}
        isProcessing={isBulkProcessing}
      />

      {/* Customer Table */}
      <CustomersTable
        tableRef={tableRef}
        paginatedCustomers={paginatedCustomers}
        totalCustomersCount={totalCustomersCount}
        totalPages={totalPages}
        effectiveCurrentPage={effectiveCurrentPage}
        startIndex={startIndex}
        endIndex={endIndex}
        searchTerm={searchTerm}
        selection={selection}
        selectAllCheckboxRef={selectAllCheckboxRef}
        isAllPageSelected={isAllPageSelected}
        pageIds={pageIds}
        profileImages={profileImages}
        agentPrefix={agentPrefix}
        agentId={agentId}
        onPageChange={handlePageChange}
        onAddCustomerClick={() => setShowCreateModal(true)}
        onSelectCustomerForOrder={(customer) => {
          setSelectedCustomer(customer);
          setShowOrderModal(true);
        }}
        onEditCustomerClick={(customer) => {
          const detectedCode = detectCountryCode(customer.phone);
          setEditingCustomer(customer);
          setEditForm({
            name: customer.name,
            phone: extractLocalNumber(customer.phone, detectedCode),
            lead_stage: customer.lead_stage || "New Lead",
            interest_stage: customer.interest_stage || "",
            conversion_stage: customer.conversion_stage || "",
          });
          setSelectedEditCountryCode(detectedCode);
        }}
        onDeleteCustomerClick={(customer) => setDeletingCustomer(customer)}
        onFetchProfilePic={fetchProfilePicture}
        onProfilePicError={(phone) => {
          setProfileImages(prev => prev.map(img => img.phone === phone ? { ...img, error: true } : img));
        }}
      />
    </div>
  );
};

export default CustomersPage;
