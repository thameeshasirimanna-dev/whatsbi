import React from "react";
import type { ServiceWithPackages, Package } from "../../../types";

interface ViewServiceModalProps {
  service: ServiceWithPackages;
  onClose: () => void;
}

const ViewServiceModal: React.FC<ViewServiceModalProps> = ({
  service,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Service Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Service Name */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            {service.service_name}
          </h3>
        </div>

        {/* Description */}
        {service.description && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <p className="text-gray-600 whitespace-pre-wrap">
              {service.description}
            </p>
          </div>
        )}

        {/* Images */}
        {service.image_urls && service.image_urls.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {service.image_urls.map((url, index) => (
                <img
                  key={index}
                  src={url.startsWith("https://") ? url : `https://${url}`}
                  alt={`${service.service_name} image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Packages */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Packages
          </label>
          <div className="space-y-3">
            {service.packages.length > 0 ? (
              service.packages.map((pkg: Package) => (
                <div
                  key={pkg.id}
                  className="border border-gray-200 rounded-md p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-gray-900">
                      {pkg.package_name}
                    </h4>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {pkg.currency} {pkg.price.toFixed(2)}
                      </p>
                      {pkg.discount && pkg.discount > 0 && (
                        <p className="text-xs text-green-600">
                          ({pkg.discount}% discount)
                        </p>
                      )}
                    </div>
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                      {pkg.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 italic">No packages available.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 rounded-md hover:bg-gray-400 text-gray-700 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewServiceModal;