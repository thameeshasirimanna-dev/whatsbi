import React, { useState, useEffect } from "react";
import { getToken } from "../../../lib/auth";
import { getCurrentAgent } from "../../../lib/agent";

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
  packages: Package[];
}

interface ServiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: Service) => void;
}

const ServiceSelectorModal: React.FC<ServiceSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectService,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = services.filter((service) =>
      service.service_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredServices(filtered);
  }, [searchTerm, services]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        console.error("User not authenticated");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-services`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            operation: "get",
          }),
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch services");
        setServices([]);
        setLoading(false);
        return;
      }

      const servicesData = await response.json();
      if (servicesData.status !== "success") {
        console.error("Error fetching services:", servicesData.message);
        setServices([]);
      } else {
        // Map the data to Service interface
        const servicesWithPackages: Service[] = (servicesData.data || []).map(
          (service: any) => ({
            id: service.id,
            service_name: service.service_name,
            description: service.description,
            packages: (service.packages || []).map((pkg: any) => ({
              id: pkg.id,
              package_name: pkg.package_name,
              price: Number(pkg.price),
              currency: pkg.currency || "USD",
              discount: pkg.discount ? Number(pkg.discount) : undefined,
              description: pkg.description,
            })),
          })
        );

        setServices(servicesWithPackages);
      }
    } catch (err) {
      console.error("Unexpected error fetching services:", err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Service</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Services List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-500">Loading services...</span>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "No services found." : "No services available."}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    onSelectService(service);
                    onClose();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{service.service_name}</h4>
                    {service.description && (
                      <p className="text-sm text-gray-500 truncate">{service.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Packages: {service.packages.map(p => p.package_name).join(', ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceSelectorModal;