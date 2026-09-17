import React from "react";
import type { ServiceWithPackages } from "../../../types";
import { X, AlertTriangle } from "lucide-react";
import Portal from "../shared/Portal";

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
    if (deletingServiceId) onDelete(deletingServiceId);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#16281D]/65 animate-modal-backdrop">
        <div className="w-full max-w-md bg-white rounded-3xl border border-[#EAEAEA] shadow-[0_20px_50px_rgba(22,40,29,0.15)] overflow-hidden flex flex-col animate-modal-card">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#EF4444]/10 flex items-center justify-center text-[#EF4444]">
                <AlertTriangle size={18} />
              </div>
              <h3 className="font-sans text-base font-bold text-[#16281D]">Delete Service</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-[#16281D] mb-1 leading-relaxed">
              Delete <strong className="font-semibold">"{serviceToDelete.service_name}"</strong>?
            </p>
            <p className="text-xs text-[#71717A]">
              This permanently deletes the service and all its associated packages. This action cannot be undone.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#EAEAEA] flex items-center justify-end gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-6 py-2.5 rounded-full bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold shadow-[0_4px_16px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
            >
              Delete Service
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DeleteServiceModal;
