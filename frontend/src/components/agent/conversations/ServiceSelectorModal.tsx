import React, { useState, useEffect } from "react";
import { X, Search, Briefcase } from "lucide-react";
import { getToken } from "../../../lib/auth";
import Portal from "../shared/Portal";
import { SkeletonBase } from "../shared/Skeleton";

interface Package {
  id: string;
  package_name: string;
  price: number;
  currency: string;
  discount?: number;
  description?: string;
}

interface Service {
  id: string;
  service_name: string;
  description?: string;
  service_links?: string[];
  packages: Package[];
}

interface ServiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: Service) => void;
}

let servicesCache: Service[] | null = null;

const ServiceSelectorModal: React.FC<ServiceSelectorModalProps> = ({
  isOpen, onClose, onSelectService,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);

  useEffect(() => { if (isOpen) fetchServices(); }, [isOpen]);

  useEffect(() => {
    setFilteredServices(services.filter(s => s.service_name.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [searchTerm, services]);

  const fetchServices = async () => {
    if (servicesCache) {
      setServices(servicesCache);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const token = getToken();
      if (!token) { setLoading(false); return; }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "get" }),
      });

      if (!response.ok) { 
        if (!servicesCache) setServices([]); 
        setLoading(false); 
        return; 
      }

      const servicesData = await response.json();
      if (servicesData.status !== "success") {
        if (!servicesCache) setServices([]);
      } else {
        const fetchedServices = (servicesData.data || []).map((service: any) => ({
          id: service.id,
          service_name: service.service_name,
          description: service.description,
          service_links: service.service_links || [],
          packages: (service.packages || []).map((pkg: any) => ({
            id: pkg.id,
            package_name: pkg.package_name,
            price: Number(pkg.price),
            currency: pkg.currency || "USD",
            discount: pkg.discount ? Number(pkg.discount) : undefined,
            description: pkg.description,
          })),
        }));
        servicesCache = fetchedServices;
        setServices(fetchedServices);
      }
    } catch (err) {
      console.error("Unexpected error fetching services:", err);
      if (!servicesCache) setServices([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] bg-[#16281D]/65 flex items-center justify-center p-4 animate-modal-backdrop">
        <div className="bg-white rounded-3xl border border-[#EAEAEA] shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-modal-card">
          {/* Header */}
          <div className="shrink-0 px-6 py-4 border-b border-[#EAEAEA] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#16281D] text-[#9FE870] flex items-center justify-center">
                <Briefcase size={16} />
              </div>
              <h3 className="font-sans text-base font-bold text-[#16281D]">
                Select Service
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] flex items-center justify-center text-[#71717A] hover:text-[#16281D] transition-colors border-0 cursor-pointer"
              aria-label="Close modal"
            >
              <X size={15} />
            </button>
          </div>

          {/* Search Input */}
          <div className="shrink-0 p-4 border-b border-[#EAEAEA] bg-[#F4F7F4]/50">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717A]" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 text-xs font-medium font-sans text-[#16281D] bg-white border border-[#EAEAEA] rounded-full focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 outline-none transition-all placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>

          {/* Service List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading && services.length === 0 ? (
              <div className="space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-3.5 border border-[#EAEAEA] rounded-2xl space-y-2"
                  >
                    <SkeletonBase className="w-1/2 h-3.5 rounded" />
                    <SkeletonBase className="w-4/5 h-3 rounded" />
                    <SkeletonBase className="w-1/3 h-2.5 rounded" />
                  </div>
                ))}
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="text-center py-10 font-sans text-xs text-[#71717A]">
                {searchTerm ? "No services matching your search." : "No services available."}
              </div>
            ) : (
              filteredServices.map((service) => (
                <div
                  key={service.id}
                  onClick={() => { onSelectService(service); onClose(); }}
                  className="p-3.5 border border-[#EAEAEA] rounded-2xl bg-white hover:bg-[#F0FDF4] hover:border-[#BBF7D0] cursor-pointer transition-all group"
                >
                  <div className="font-sans text-sm font-bold text-[#16281D] truncate group-hover:text-[#16281D]">
                    {service.service_name}
                  </div>
                  {service.description && (
                    <div className="font-sans text-xs text-[#71717A] truncate mt-0.5">
                      {service.description}
                    </div>
                  )}
                  {service.packages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {service.packages.map(p => (
                        <span
                          key={p.id}
                          className="px-2.5 py-0.5 rounded-full bg-[#F4F7F4] border border-[#EAEAEA] text-[10px] font-sans font-semibold text-[#16281D]"
                        >
                          {p.package_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 p-4 border-t border-[#EAEAEA] bg-[#F4F7F4]/40 flex justify-end">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-full bg-white border border-[#E4E4E7] hover:bg-[#F4F7F4] active:scale-[0.98] font-sans text-xs font-bold text-[#52525B] transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ServiceSelectorModal;

