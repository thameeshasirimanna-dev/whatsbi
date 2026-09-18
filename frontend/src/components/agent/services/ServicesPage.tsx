import React, { useState, useEffect } from "react";
import type { ServiceWithPackages, Agent } from "../../../types";
import { Search, Plus, Eye, Pencil, Trash2, Briefcase, Layers, Tag, X } from "lucide-react";

import CreateServiceModal from "./CreateServiceModal";
import EditServiceModal from "./EditServiceModal";
import DeleteServiceModal from "./DeleteServiceModal";
import ViewServiceModal from "./ViewServiceModal";
import { SkeletonPage } from "../shared/Skeleton";
import CustomDropdown from "../shared/CustomDropdown";
import { EmptyTableState } from "../shared/EmptyTableState";

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<ServiceWithPackages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithPackages | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [viewingService, setViewingService] = useState<ServiceWithPackages | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [filters, setFilters] = useState({
    service_name: "",
    package_name: "",
    sort_by: "created_at" as "price" | "created_at",
    sort_order: "desc" as "asc" | "desc",
  });

  useEffect(() => { fetchServices(); }, [filters]);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (response.ok && data.success) setAgent(data.agent);
      } catch (error) { console.error("Failed to fetch agent:", error); }
    };
    fetchAgent();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth_token");
      if (!token) { setError("Not authenticated"); setLoading(false); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operation: "get", ...filters }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.message || "Failed to fetch services");
      else setServices(result.data || []);
    } catch { setError("Failed to fetch services"); }
    finally { setLoading(false); }
  };

  const handleCreateService = async (formData: {
    service_name: string;
    description?: string;
    images?: Array<{ fileName: string; fileBase64: string; fileType: string; }>;
    packages: Array<{ package_name: string; price: number; currency?: string; discount?: number; description?: string; }>;
  }): Promise<boolean> => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) { setError("Not authenticated"); return false; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operation: "create", ...formData }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.message || "Failed to create service"); return false; }
      setShowCreateModal(false);
      fetchServices();
      setError(null);
      return true;
    } catch { setError("Failed to create service"); return false; }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) { setError("Not authenticated"); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operation: "delete", id }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.message || "Failed to permanently delete service");
      else { setShowDeleteModal(false); setDeletingServiceId(null); fetchServices(); setError(null); }
    } catch { setError("Failed to permanently delete service"); }
  };

  const confirmDelete = (id: string) => { setDeletingServiceId(id); setShowDeleteModal(true); };

  const filteredServices = services.filter(service =>
    service.service_name.toLowerCase().includes(filters.service_name.toLowerCase()) ||
    service.packages.some(pkg => pkg.package_name.toLowerCase().includes(filters.package_name.toLowerCase()))
  );

  const totalPackages = services.reduce((sum, s) => sum + (s.packages?.length || 0), 0);
  const multiPkgCount = services.filter(s => (s.packages?.length || 0) > 1).length;

  if (loading) {
    return <SkeletonPage type="list" />;
  }

  return (
    <div className="w-full p-2.5 sm:p-3.5 md:p-4 lg:p-5 flex flex-col gap-3.5 sm:gap-4 animate-fade-in font-sans">
      {/* KPI Cards */}
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {[
          {
            label: "Total Services",
            value: services.length,
            icon: Briefcase,
            iconColor: "text-[#16281D]",
            bgColor: "bg-[#9FE870]/25",
          },
          {
            label: "Total Packages",
            value: totalPackages,
            icon: Layers,
            iconColor: "text-[#15803D]",
            bgColor: "bg-[#22C55E]/10",
          },
          {
            label: "Multi-Tier Offerings",
            value: multiPkgCount,
            icon: Tag,
            iconColor: "text-[#2563EB]",
            bgColor: "bg-[#3B82F6]/10",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-[18px] sm:rounded-[20px] p-3.5 sm:p-5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex items-center justify-between col-span-1 last:col-span-2 sm:last:col-span-1 min-w-0"
            >
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-[11px] sm:text-xs font-medium text-[#71717A] truncate">{card.label}</p>
                <h3 className="font-mono text-xl sm:text-2xl font-extrabold text-[#16281D] mt-0.5 sm:mt-1 tracking-tight truncate">
                  {card.value}
                </h3>
              </div>
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl ${card.bgColor} ${card.iconColor} flex items-center justify-center shrink-0`}>
                <Icon size={18} className="sm:w-5 sm:h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#EF4444] font-medium">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div
        className="bg-white rounded-[20px] p-3 sm:p-3.5 border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] flex flex-col gap-2.5 sm:gap-3"
      >
        {/* Row 1: Search & Primary Action (Full width) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-0 flex items-center">
            <Search
              size={14}
              className="absolute left-3.5 text-[#a1a1aa] pointer-events-none shrink-0"
            />
            <input
              type="text"
              placeholder="Search services or packages…"
              value={`${filters.service_name} ${filters.package_name}`.trim() || ""}
              onChange={e => {
                const v = e.target.value;
                setFilters({ ...filters, service_name: v, package_name: v });
              }}
              className="w-full h-10 pl-9 pr-9 rounded-full bg-white border border-[#EAEAEA] text-xs font-sans text-[#16281D] placeholder-[#a1a1aa] outline-none transition-all duration-150 focus:border-[#9FE870] focus:ring-3 focus:ring-[#9FE870]/20"
            />
            {Boolean(filters.service_name || filters.package_name) && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, service_name: "", package_name: "" })}
                className="absolute right-3 w-5 h-5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717a] hover:text-[#16281D] cursor-pointer border-0 transition-colors"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Add Service Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-initial justify-center px-4 py-2 h-9 rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.3)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.4)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center gap-1.5 shrink-0 cursor-pointer border-0"
          >
            <Plus size={14} /> Add Service
          </button>
        </div>

        {/* Row 2: Filters Grid (Full fill 100% row width across all screen sizes) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 w-full items-center">
          {/* Sort By Dropdown */}
          <div className="col-span-1 w-full min-w-0">
            <CustomDropdown
              value={filters.sort_by}
              onChange={(val) => setFilters({ ...filters, sort_by: val as "price" | "created_at" })}
              options={[
                { value: "created_at", label: "Sort by Date" },
                { value: "price", label: "Sort by Price" },
              ]}
              className="w-full"
            />
          </div>

          {/* Sort Order Dropdown */}
          <div className="col-span-1 w-full min-w-0">
            <CustomDropdown
              value={filters.sort_order}
              onChange={(val) => setFilters({ ...filters, sort_order: val as "asc" | "desc" })}
              options={[
                { value: "desc", label: "Descending" },
                { value: "asc", label: "Ascending" },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div
        className="bg-white rounded-[24px] border border-[#EAEAEA] shadow-[0_4px_20px_rgba(22,40,29,0.03)] overflow-hidden"
      >
        {filteredServices.length === 0 ? (
          <EmptyTableState
            isFiltered={services.length > 0}
            filteredTitle="No services found"
            filteredMessage={
              filters.service_name || filters.package_name
                ? "No services match your search criteria. Try a different query."
                : "No services match your current filter criteria."
            }
            icon={Briefcase}
            title="No services yet"
            description="Create service packages with transparent tier pricing for your clients."
            actionLabel="Add Service"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <>
            {/* Mobile/Tablet Card Layout */}
            <div className="block lg:hidden divide-y divide-[#F4F7F4]">
              {filteredServices.map((service, index) => {
                const prices = service.packages.map(p => p.price).filter(p => p > 0);
                const minPrice = prices.length ? Math.min(...prices) : null;
                const maxPrice = prices.length ? Math.max(...prices) : null;
                const rawCurr = service.packages[0]?.currency || 'Rs.';
                const currency = (rawCurr === 'LKR' || rawCurr === 'USD') ? 'Rs.' : rawCurr;
                const priceLabel = minPrice === null ? '—'
                  : minPrice === maxPrice ? `${currency} ${minPrice.toFixed(2)}`
                  : `${currency} ${minPrice.toFixed(2)} – ${maxPrice!.toFixed(2)}`;

                return (
                  <div
                    key={service.id}
                    className="p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        {service.image_urls && service.image_urls.length > 0 ? (
                          <img
                            src={service.image_urls[0].startsWith('https://') ? service.image_urls[0] : `https://${service.image_urls[0]}`}
                            alt={service.service_name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#EAEAEA]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#9FE870]/20 text-[#16281D] flex items-center justify-center shrink-0">
                            <Briefcase size={16} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#16281D] truncate">{service.service_name}</p>
                          <span className="inline-flex items-center gap-1 text-[11px] text-[#71717A] mt-0.5">
                            <Layers size={11} /> {service.packages?.length || 0} package{(service.packages?.length || 0) === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#16281D] bg-[#F4F7F4] px-2.5 py-1 rounded-full border border-[#EAEAEA] shrink-0">
                        {priceLabel}
                      </span>
                    </div>

                    <p className="text-xs text-[#71717A] line-clamp-2">
                      {service.description || "No description provided."}
                    </p>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#F4F7F4]">
                      <button
                        onClick={() => setViewingService(service)}
                        className="flex-1 py-1.5 min-h-[34px] rounded-full bg-[#0891B2]/10 text-[#0891B2] hover:bg-[#0891B2]/20 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        onClick={() => setEditingService(service)}
                        className="flex-1 py-1.5 min-h-[34px] rounded-full bg-[#22C55E]/10 text-[#15803D] hover:bg-[#22C55E]/20 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => confirmDelete(service.id)}
                        className="flex-1 py-1.5 min-h-[34px] rounded-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
                    <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Service
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Description
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Packages
                    </th>
                    <th className="py-3 px-4 text-left text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Price Range
                    </th>
                    <th className="py-3 px-4 text-right text-xs font-bold uppercase tracking-wider text-[#71717A]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F7F4]">
                  {filteredServices.map((service, index) => {
                    const prices = service.packages.map(p => p.price).filter(p => p > 0);
                    const minPrice = prices.length ? Math.min(...prices) : null;
                    const maxPrice = prices.length ? Math.max(...prices) : null;
                    const rawCurr = service.packages[0]?.currency || 'Rs.';
                    const currency = (rawCurr === 'LKR' || rawCurr === 'USD') ? 'Rs.' : rawCurr;
                    const priceLabel = minPrice === null ? '—'
                      : minPrice === maxPrice ? `${currency} ${minPrice.toFixed(2)}`
                      : `${currency} ${minPrice.toFixed(2)} – ${maxPrice!.toFixed(2)}`;

                    return (
                      <tr
                        key={service.id}
                        className="hover:bg-[#F4F7F4]/40 transition-colors"
                      >
                        {/* Service */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {service.image_urls && service.image_urls.length > 0 ? (
                              <img
                                src={service.image_urls[0].startsWith('https://') ? service.image_urls[0] : `https://${service.image_urls[0]}`}
                                alt={service.service_name}
                                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-[#EAEAEA]"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-[#9FE870]/20 text-[#16281D] flex items-center justify-center shrink-0">
                                <Briefcase size={16} />
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold text-[#16281D]">{service.service_name}</p>
                            </div>
                          </div>
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-xs text-[#71717A] line-clamp-2">
                            {service.description || "—"}
                          </p>
                        </td>

                        {/* Packages count */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F4F7F4] border border-[#EAEAEA] text-[11px] font-medium text-[#71717A]">
                            <Layers size={12} className="text-[#16281D]" />
                            {service.packages?.length || 0} package{(service.packages?.length || 0) === 1 ? '' : 's'}
                          </span>
                        </td>

                        {/* Price Range */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold text-[#16281D]">
                            {priceLabel}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingService(service)}
                              title="View Details"
                              className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#0891B2]/15 text-[#71717A] hover:text-[#0891B2] flex items-center justify-center transition-colors"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => setEditingService(service)}
                              title="Edit Service"
                              className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#22C55E]/15 text-[#71717A] hover:text-[#15803D] flex items-center justify-center transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => confirmDelete(service.id)}
                              title="Delete Service"
                              className="w-7 h-7 rounded-full bg-[#F4F7F4] hover:bg-[#EF4444]/15 text-[#71717A] hover:text-[#EF4444] flex items-center justify-center transition-colors"
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
          </>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateServiceModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateService}
          setError={setError}
        />
      )}
      {editingService && agent && (
        <EditServiceModal
          editingService={editingService}
          agent={agent}
          onClose={() => setEditingService(null)}
          onSuccess={() => {
            setEditingService(null);
            fetchServices();
            setError(null);
          }}
          setError={setError}
        />
      )}
      {showDeleteModal && (
        <DeleteServiceModal
          deletingServiceId={deletingServiceId}
          services={services}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingServiceId(null);
          }}
          onDelete={handleDeleteService}
        />
      )}
      {viewingService && (
        <ViewServiceModal
          service={viewingService}
          onClose={() => setViewingService(null)}
        />
      )}
    </div>
  );
};

export default ServicesPage;
