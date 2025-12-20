import React from "react";
import type { ServiceWithPackages } from "../../../types";

interface DeleteServiceModalProps {
  deletingServiceId: string | null;
  services: ServiceWithPackages[];
  onClose: () => void;
  onDelete: (id: string) => void;
}

const DeleteServiceModal: React.FC<DeleteServiceModalProps> = ({
  deletingServiceId,
  services,
  onClose,
  onDelete,
}) => {
  if (!deletingServiceId || !services.length) return null;

  const serviceToDelete = services.find((s) => s.id === deletingServiceId);
  if (!serviceToDelete) return null;

  const handleConfirmDelete = () => {
    if (deletingServiceId) {
      onDelete(deletingServiceId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold text-red-600 mb-4">
          Delete Service
        </h2>
        <p className="mb-4">
          Are you sure you want to delete the service "
          <strong>{serviceToDelete.service_name}</strong>"?
        </p>
        <p className="text-sm text-gray-600 mb-6">
          This will permanently delete the service and all its packages. This action
          cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-gray-300 rounded-md hover:bg-gray-400 text-gray-700 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-medium transition-colors"
          >
            Permanent Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteServiceModal;