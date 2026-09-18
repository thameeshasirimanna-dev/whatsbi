import React, { useRef } from "react";
import { FileText, Plus, Search } from "lucide-react";
import GenerateInvoiceModal from "../conversations/GenerateInvoiceModal";
import { SkeletonPage } from "../shared/Skeleton";
import { SYNE, DM } from "./constants";
import { useInvoices } from "./useInvoices";
import { InvoiceSummaryCards } from "./InvoiceSummaryCards";
import { InvoiceToolbar } from "./InvoiceToolbar";
import { InvoiceBulkActionsBar } from "./InvoiceBulkActionsBar";
import { InvoiceTable } from "./InvoiceTable";
import { InvoiceMobileList } from "./InvoiceMobileList";
import { InvoicePagination } from "./InvoicePagination";
import { InvoicePaymentModal } from "./InvoicePaymentModal";
import { FloatingBulkProgress } from "../shared/BulkProgress";
import { EmptyTableState } from "../shared/EmptyTableState";

const InvoicesPage: React.FC = () => {
  const tableRef = useRef<HTMLDivElement>(null);
  const {
    invoices,
    customers,
    loading,
    error,
    agentId,
    agentPrefix,
    invoiceTemplatePath,
    agentDetails,
    searchTerm,
    setSearchTerm,
    selectedCustomerFilter,
    setSelectedCustomerFilter,
    timeRange,
    setTimeRange,
    rowsPerPage,
    effectiveCurrentPage,
    handlePageChange,
    handleRowsPerPageChange,
    updating,
    isBulkProcessing,
    bulkProgress,
    isModalOpen,
    setIsModalOpen,
    fetchData,
    filteredInvoices,
    paginatedInvoices,
    totalInvoicesCount,
    totalPages,
    startIndex,
    endIndex,
    totalInvoices,
    paidCount,
    sentCount,
    totalPaidRevenue,
    handleSendInvoice,
    downloadPDF,
    handleDeleteInvoice,
    handleOpenMarkPaidModal,
    handleMarkPaidFull,
    payingInvoice,
    setPayingInvoice,
    orderPaidAmount,
    setOrderPaidAmount,
    orderShippingAddress,
    setOrderShippingAddress,
    orderEstimatedDelivery,
    setOrderEstimatedDelivery,
    orderNotes,
    setOrderNotes,
    creatingOrderFromInv,
    handleConfirmPaymentAndCreateOrder,
    handleMarkPaidOnly,
    // Multi-selection & bulk actions
    selection,
    handleBulkMarkPaid,
    handleBulkDelete,
    handleBulkDownload,
  } = useInvoices(tableRef);

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  const pageIds = paginatedInvoices.map((inv) => inv.id);
  const isAllPageSelected = selection.isAllSelected(pageIds);
  const isPageIndeterminate = selection.isIndeterminate(pageIds);

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      <style>{`@keyframes ip-spin { to { transform: rotate(360deg); } }`}</style>

      {/* Generate Invoice Modal */}
      <GenerateInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customers={customers}
        agentPrefix={agentPrefix}
        agentId={agentId}
        agentDetails={agentDetails}
        invoiceTemplatePath={invoiceTemplatePath}
        onSuccess={fetchData}
      />

      {/* Mark Paid & Create Order Modal */}
      <InvoicePaymentModal
        payingInvoice={payingInvoice}
        onClose={() => setPayingInvoice(null)}
        orderPaidAmount={orderPaidAmount}
        setOrderPaidAmount={setOrderPaidAmount}
        orderShippingAddress={orderShippingAddress}
        setOrderShippingAddress={setOrderShippingAddress}
        orderEstimatedDelivery={orderEstimatedDelivery}
        setOrderEstimatedDelivery={setOrderEstimatedDelivery}
        orderNotes={orderNotes}
        setOrderNotes={setOrderNotes}
        creatingOrderFromInv={creatingOrderFromInv}
        onQuickConfirm={handleMarkPaidOnly}
        onConfirmAndCreateOrder={handleConfirmPaymentAndCreateOrder}
      />

      {/* Summary Cards */}
      <InvoiceSummaryCards
        totalInvoices={totalInvoices}
        totalPaidRevenue={totalPaidRevenue}
        sentCount={sentCount}
        paidCount={paidCount}
      />

      {error && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-medium font-sans">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <InvoiceToolbar
        searchTerm={searchTerm}
        onSearchChange={(term) => {
          setSearchTerm(term);
          handlePageChange(1, false);
        }}
        selectedCustomerFilter={selectedCustomerFilter}
        onCustomerFilterChange={(id) => {
          setSelectedCustomerFilter(id);
          handlePageChange(1, false);
        }}
        customers={customers}
        timeRange={timeRange}
        onTimeRangeChange={(range) => {
          setTimeRange(range);
          handlePageChange(1, false);
        }}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        onCreateInvoiceClick={() => setIsModalOpen(true)}
      />

      {/* Bulk Actions Banner (appears when rows are selected) */}
      <InvoiceBulkActionsBar
        selectedCount={selection.selectedCount}
        onBulkMarkPaid={handleBulkMarkPaid}
        onBulkDownload={handleBulkDownload}
        onBulkDelete={handleBulkDelete}
        onClearSelection={selection.clearSelection}
        isProcessing={isBulkProcessing}
        bulkProgress={bulkProgress}
      />

      {/* Floating Viewport Progress Banner */}
      <FloatingBulkProgress progress={bulkProgress} />

      {/* Table Container */}
      <div
        ref={tableRef}
        style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #EAEAEA",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          overflow: "visible",
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          scrollMarginTop: 20,
        }}
      >
        {invoices.length === 0 ? (
          <EmptyTableState
            icon={FileText}
            title="No invoices yet"
            description="Start by creating your first invoice for a customer."
            actionLabel="Create Invoice"
            onAction={() => setIsModalOpen(true)}
          />
        ) : filteredInvoices.length === 0 ? (
          <EmptyTableState
            isFiltered
            filteredTitle="No invoices found"
            filteredMessage={
              searchTerm || selectedCustomerFilter !== null || Boolean(timeRange.preset)
                ? "No invoices match your current filters."
                : "No invoices available."
            }
          />
        ) : (
          <>
            {/* Mobile/Tablet Card Layout */}
            <InvoiceMobileList
              invoices={paginatedInvoices}
              selectedIds={selection.selectedIds}
              onToggleSelect={selection.toggleSelect}
              onView={(inv) => window.open(inv.pdf_url, "_blank")}
              onDownload={downloadPDF}
              onSend={(inv) => handleSendInvoice(inv.id)}
              onMarkPaid={handleOpenMarkPaidModal}
              onMarkPaidFull={handleMarkPaidFull}
              onDelete={handleDeleteInvoice}
              updatingId={updating}
            />

            {/* Desktop Table Layout */}
            <InvoiceTable
              invoices={paginatedInvoices}
              selectedIds={selection.selectedIds}
              onToggleSelect={selection.toggleSelect}
              onSelectAll={selection.selectAll}
              isAllSelected={isAllPageSelected}
              isIndeterminate={isPageIndeterminate}
              onView={(inv) => window.open(inv.pdf_url, "_blank")}
              onDownload={downloadPDF}
              onSend={(inv) => handleSendInvoice(inv.id)}
              onMarkPaid={handleOpenMarkPaidModal}
              onMarkPaidFull={handleMarkPaidFull}
              onDelete={handleDeleteInvoice}
              updatingId={updating}
            />

            {/* Pagination Footer */}
            <InvoicePagination
              startIndex={startIndex}
              endIndex={endIndex}
              totalInvoicesCount={totalInvoicesCount}
              effectiveCurrentPage={effectiveCurrentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default InvoicesPage;
