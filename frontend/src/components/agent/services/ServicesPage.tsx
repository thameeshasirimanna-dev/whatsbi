import React, { useState, useEffect } from "react";
import {
  createService,
  getServices,
  updateService,
  deleteService,
  supabase,
  getCurrentAgent,
} from "../../../lib/supabase";
import type {
  Service,
  ServiceWithPackages,
  Package,
  Agent,
} from "../../../types";

import CreateServiceModal from "./CreateServiceModal";
import EditServiceModal from "./EditServiceModal";
import DeleteServiceModal from "./DeleteServiceModal";
import ViewServiceModal from "./ViewServiceModal";

import { Menu, Transition } from "@headlessui/react";
import { motion } from "framer-motion";

const sortByOptions = [
  { value: "created_at" as "price" | "created_at", label: "Sort by Date" },
  { value: "price" as "price" | "created_at", label: "Sort by Price" },
];

const sortOrderOptions = [
  { value: "desc" as "asc" | "desc", label: "Descending" },
  { value: "asc" as "asc" | "desc", label: "Ascending" },
];

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<ServiceWithPackages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] =
    useState<ServiceWithPackages | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
    null
  );
  const [viewingService, setViewingService] = useState<ServiceWithPackages | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [filters, setFilters] = useState({
    service_name: "",
    package_name: "",
    sort_by: "created_at" as "price" | "created_at",
    sort_order: "desc" as "asc" | "desc",
  });

  // Fetch services
  useEffect(() => {
    fetchServices();
  }, [filters]);

  // Fetch agent
  useEffect(() => {
    getCurrentAgent().then(setAgent);
  }, []);

  const fetchServices = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getServices(filters);
    if (fetchError) {
      setError(fetchError);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  // Create service - modified to return success boolean
  const handleCreateService = async (formData: {
    service_name: string;
    description?: string;
    images?: Array<{
      fileName: string;
      fileBase64: string;
      fileType: string;
    }>;
    packages: Array<{
      package_name: string;
      price: number;
      currency?: string;
      discount?: number;
      description?: string;
    }>;
  }): Promise<boolean> => {
    const { data, error: createError } = await createService(formData);
    if (createError) {
      setError(createError.message || "Failed to create service");
      return false;
    } else {
      setShowCreateModal(false);
      fetchServices(); // Refresh list
      setError(null);
      return true;
    }
  };

  // Update service or package
  const handleUpdateService = async (
    type: "service" | "package",
    id: string,
    updates: any
  ) => {
    const { data, error: updateError } = await updateService(type, id, updates);
    if (updateError) {
      setError(updateError);
    } else {
      setEditingService(null);
      fetchServices(); // Refresh list
    }
  };

  // Delete service (permanent only)
  const handleDeleteService = async (id: string) => {
    const { data, error: deleteError } = await deleteService(id);
    if (deleteError) {
      setError(deleteError.message || "Failed to permanently delete service");
    } else {
      setShowDeleteModal(false);
      setDeletingServiceId(null);
      fetchServices(); // Refresh list
      setError(null);
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingServiceId(id);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-center">
          Error: {error}
        </div>
      </div>
    );
  }

  const filteredServices = services.filter(
    (service) =>
      service.service_name
        .toLowerCase()
        .includes(filters.service_name.toLowerCase()) ||
      service.packages.some((pkg) =>
        pkg.package_name
          .toLowerCase()
          .includes(filters.package_name.toLowerCase())
      )
  );

  return (
    <div className="p-6">
      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
        className="bg-white rounded-xl border border-gray-200 p-4 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: 0.25 }}
            className="flex-1 min-w-0"
          >
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search services or packages..."
                value={`${filters.service_name} ${filters.package_name}`.trim() || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({
                    ...filters,
                    service_name: value,
                    package_name: value,
                  });
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: 0.3 }}
            className="flex flex-wrap gap-2 items-center min-w-max"
          >
            {/* Sort By Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.1, delay: 0.35 }}
            >
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  {sortByOptions.find((opt) => opt.value === filters.sort_by)?.label || "Sort by Date"}
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Menu.Button>
                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    {sortByOptions.map((option) => (
                      <Menu.Item key={option.value}>
                        {({ active }) => (
                          <button
                            className={`w-full text-left px-4 py-2 text-sm ${
                              active ? "bg-gray-100" : ""
                            } ${
                              filters.sort_by === option.value
                                ? "bg-green-50 text-green-700"
                                : ""
                            }`}
                            onClick={() => setFilters({ ...filters, sort_by: option.value })}
                          >
                            {option.label}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>
            </motion.div>

            {/* Sort Order Dropdown */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.1, delay: 0.4 }}
            >
              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent">
                  {sortOrderOptions.find((opt) => opt.value === filters.sort_order)?.label || "Descending"}
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Menu.Button>
                <Transition
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                    {sortOrderOptions.map((option) => (
                      <Menu.Item key={option.value}>
                        {({ active }) => (
                          <button
                            className={`w-full text-left px-4 py-2 text-sm ${
                              active ? "bg-gray-100" : ""
                            } ${
                              filters.sort_order === option.value
                                ? "bg-green-50 text-green-700"
                                : ""
                            }`}
                            onClick={() => setFilters({ ...filters, sort_order: option.value })}
                          >
                            {option.label}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>
            </motion.div>

            {/* Add Service Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.1, delay: 0.45 }}
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Service
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filters.service_name || filters.package_name
                ? "No services found"
                : "No services yet"}
            </h3>
            <p className="text-gray-500">
              {filters.service_name || filters.package_name
                ? `No services match your search`
                : "Start by adding your first service"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {filteredServices.map((service) => (
              <div
                key={service.id}
                className="w-full border border-gray-200 rounded-lg shadow-sm p-4 bg-white hover:shadow-md transition-shadow duration-150"
              >
                {/* Service Header */}
                <div className="flex items-start space-x-3 mb-3">
                  <div className="flex-shrink-0">
                    {service.image_urls &&
                    service.image_urls.length > 0 ? (
                      <img
                        className="h-12 w-12 rounded-lg object-cover"
                        src={service.image_urls[0]}
                        alt={service.service_name}
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                        <svg
                          className="h-5 w-5 text-gray-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6z" />
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 mb-1">
                      {service.service_name}
                    </h3>
                    {service.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {service.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Packages */}
                <div className="mb-3">
                  <h4 className="text-xs font-medium text-gray-900 mb-1.5 uppercase tracking-wide">Packages</h4>
                  <div className="space-y-2 max-h-24 overflow-y-auto">
                    {service.packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="flex justify-between items-start bg-gray-50 p-2 rounded"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {pkg.package_name}
                          </p>
                          {pkg.description && (
                            <p className="text-xs text-gray-500 truncate">
                              {pkg.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <p className="text-sm font-medium text-gray-900">
                            {pkg.currency} {pkg.price.toFixed(2)}
                          </p>
                          {pkg.discount && pkg.discount > 0 && (
                            <p className="text-xs text-green-600">
                              ({pkg.discount}% off)
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {service.packages.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No packages</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    onClick={() => setViewingService(service)}
                    className="text-blue-600 hover:text-blue-900 text-xs font-medium transition-colors"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setEditingService(service)}
                    className="text-indigo-600 hover:text-indigo-900 text-xs font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      confirmDelete(service.id)
                    }
                    className="text-red-600 hover:text-red-900 text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
