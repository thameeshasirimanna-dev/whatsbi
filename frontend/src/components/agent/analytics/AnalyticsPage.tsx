import React, { useState, useMemo } from 'react';
import { Download, X } from 'lucide-react';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { SkeletonPage } from '../shared/Skeleton';
import { DatePicker } from '../shared/DatePicker';
import AnalyticsMetricCards from './AnalyticsMetricCards';
import RevenuePerformanceCharts from './RevenuePerformanceCharts';
import CRMActivitySection from './CRMActivitySection';
import OrderStatusDistribution from './OrderStatusDistribution';

const AnalyticsPage: React.FC = () => {
  const { analytics, loading, error } = useAnalytics();
  const [activePreset, setActivePreset] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const handlePresetSelect = (presetId: string) => {
    setActivePreset(presetId);
    setFromDate(null);
    setToDate(null);
  };

  const handleFromDateChange = (val: string | null) => {
    setFromDate(val);
    if (val || toDate) {
      setActivePreset("custom");
    } else {
      setActivePreset("all");
    }
  };

  const handleToDateChange = (val: string | null) => {
    setToDate(val);
    if (val || fromDate) {
      setActivePreset("custom");
    } else {
      setActivePreset("all");
    }
  };

  const handleClearCustomDates = () => {
    setFromDate(null);
    setToDate(null);
    setActivePreset("all");
  };

  const filteredData = useMemo(() => {
    if (!analytics) return analytics;

    let orders = analytics.monthlyOrders || [];
    let revenue = analytics.monthlyRevenue || [];
    let messages = analytics.monthlyMessages || [];

    if (activePreset === "month") {
      orders = orders.slice(-1);
      revenue = revenue.slice(-1);
      messages = messages.slice(-1);
    } else if (activePreset === "last_3_months") {
      orders = orders.slice(-3);
      revenue = revenue.slice(-3);
      messages = messages.slice(-3);
    } else if (activePreset === "week") {
      orders = orders.slice(-2);
      revenue = revenue.slice(-2);
      messages = messages.slice(-2);
    } else if (activePreset === "today") {
      orders = orders.slice(-1);
      revenue = revenue.slice(-1);
      messages = messages.slice(-1);
    } else if (activePreset === "custom" && (fromDate || toDate)) {
      const start = fromDate ? new Date(fromDate) : new Date(0);
      const end = toDate ? new Date(toDate) : new Date();
      const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      let sliceCount = 12;
      if (diffDays <= 7) {
        sliceCount = 1;
      } else if (diffDays <= 31) {
        sliceCount = 1;
      } else if (diffDays <= 92) {
        sliceCount = 3;
      } else if (diffDays <= 183) {
        sliceCount = 6;
      } else {
        sliceCount = 12;
      }
      orders = orders.slice(-sliceCount);
      revenue = revenue.slice(-sliceCount);
      messages = messages.slice(-sliceCount);
    }

    const isAll = activePreset === "all";
    const filteredTotalOrders = (orders || []).reduce((sum, o) => sum + (o?.count || 0), 0);
    const filteredTotalRevenue = (revenue || []).reduce((sum, r) => sum + (r?.revenue || 0), 0);
    const filteredProfit = filteredTotalRevenue * 0.7;
    const filteredExpense = filteredTotalRevenue * 0.3;
    const ratio = (analytics.totalOrders && analytics.totalOrders > 0) ? filteredTotalOrders / analytics.totalOrders : 1;
    const filteredCompletedOrders = Math.round((analytics.completedOrders || 0) * ratio);
    const filteredPendingOrders = Math.round((analytics.pendingOrders || 0) * ratio);

    return {
      ...analytics,
      totalOrders: isAll ? analytics.totalOrders : filteredTotalOrders,
      totalRevenue: isAll ? analytics.totalRevenue : filteredTotalRevenue,
      profit: isAll ? analytics.profit : filteredProfit,
      expense: isAll ? analytics.expense : filteredExpense,
      completedOrders: isAll ? analytics.completedOrders : filteredCompletedOrders,
      pendingOrders: isAll ? analytics.pendingOrders : filteredPendingOrders,
      monthlyOrders: orders.length > 0 ? orders : analytics.monthlyOrders,
      monthlyRevenue: revenue.length > 0 ? revenue : analytics.monthlyRevenue,
      monthlyMessages: messages.length > 0 ? messages : analytics.monthlyMessages,
    };
  }, [analytics, activePreset, fromDate, toDate]);

  if (loading) {
    return <SkeletonPage type="analytics" />;
  }

  if (error) {
    return (
      <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
        <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl text-xs text-[#EF4444]">
          Error loading analytics: {error}
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans"
    >
      {/* Top Controls Bar: Time Ranges on Left, Export Report on Right */}
      <div className="bg-white rounded-[20px] p-3 sm:p-3.5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Left Side: Time Ranges & Direct Date Period */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 flex-1 min-w-0 w-full">
          {/* Quick Presets Strip */}
          <div className="w-full lg:flex-1 flex items-center justify-between p-1 bg-[#F4F7F4] border border-[#EAEAEA] rounded-full overflow-x-auto scrollbar-none gap-0.5">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'last_3_months', label: 'Last 3 Months' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handlePresetSelect(tab.id)}
                className={`flex-1 text-center justify-center px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-0 whitespace-nowrap ${
                  activePreset === tab.id
                    ? 'bg-[#16281D] text-[#9FE870] shadow-sm'
                    : 'bg-transparent text-[#71717A] hover:text-[#16281D]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Direct Date Period Selector (From -> To DatePicker) */}
          <div
            className={`w-full lg:flex-1 flex items-center justify-between gap-1.5 p-1 border rounded-full transition-all ${
              activePreset === 'custom'
                ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                : 'bg-[#F4F7F4] border-[#EAEAEA]'
            }`}
          >
            <div className="flex-1 min-w-0">
              <DatePicker
                value={fromDate}
                onChange={handleFromDateChange}
                placeholder="From date..."
                size="sm"
                variant={fromDate ? "mint" : "white"}
                maxDate={toDate ?? undefined}
                className="w-full"
                triggerClassName="w-full text-center !justify-center"
              />
            </div>
            <span className="text-xs text-[#71717A] font-medium px-1 shrink-0">to</span>
            <div className="flex-1 min-w-0">
              <DatePicker
                value={toDate}
                onChange={handleToDateChange}
                placeholder="To date..."
                size="sm"
                variant={toDate ? "mint" : "white"}
                minDate={fromDate ?? undefined}
                className="w-full"
                triggerClassName="w-full text-center !justify-center"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={handleClearCustomDates}
                title="Clear date period"
                className="w-6 h-6 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer border-0 mr-1 shrink-0"
              >
                <X size={11} strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Export Report Button */}
        <button
          onClick={() => window.print()}
          className="w-full xl:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-xs font-semibold text-[#16281D] transition-colors border border-[#EAEAEA] cursor-pointer shrink-0"
        >
          <Download size={13} /> Export Report
        </button>
      </div>

      {/* KPI Metric Cards */}
      <AnalyticsMetricCards analytics={filteredData} />

      {/* Revenue & Momentum Charts */}
      <RevenuePerformanceCharts
        profit={filteredData.profit}
        expense={filteredData.expense}
        monthlyRevenue={filteredData.monthlyRevenue}
        monthlyOrders={filteredData.monthlyOrders}
      />

      {/* CRM & Conversational Activity */}
      <CRMActivitySection
        leadStages={filteredData.leadStages}
        monthlyMessages={filteredData.monthlyMessages}
        totalCustomers={filteredData.totalCustomers}
      />

      {/* Order Status Breakdown & Financials */}
      <OrderStatusDistribution
        orderStatuses={filteredData.orderStatuses}
        gateways={filteredData.paymentGateways}
        upcomingAppointments={filteredData.upcomingAppointments}
        completedOrders={filteredData.completedOrders}
        pendingOrders={filteredData.pendingOrders}
      />
    </div>
  );
};

export default AnalyticsPage;
