import React from "react";
import type { ServiceWithPackages, Package } from "../../../types";
import { X, Briefcase, ExternalLink } from "lucide-react";
import Portal from "../shared/Portal";

interface ViewServiceModalProps {
  service: ServiceWithPackages;
  onClose: () => void;
}

const ViewServiceModal: React.FC<ViewServiceModalProps> = ({ service, onClose }) => {
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#16281D]/65 animate-modal-backdrop">
        <div className="w-full max-w-[min(32rem,95vw)] sm:max-w-lg bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-[0_20px_50px_rgba(22,40,29,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-modal-card">
          {/* Header */}
          <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-[#EAEAEA] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-2">
              {service.image_urls && service.image_urls.length > 0 ? (
                <img
                  src={
                    service.image_urls[0].startsWith("https://")
                      ? service.image_urls[0]
                      : `https://${service.image_urls[0]}`
                  }
                  alt={service.service_name}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shrink-0 border border-[#EAEAEA]"
                />
              ) : (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#16281D]/5 flex items-center justify-center text-[#16281D] shrink-0">
                  <Briefcase size={17} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-sans text-sm sm:text-base font-bold text-[#16281D] truncate">{service.service_name}</h3>
                <span className="text-[11px] sm:text-xs text-[#71717A] truncate block">
                  {service.packages.length} package{service.packages.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {service.description && (
              <div>
                <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-2">
                  Description
                </div>
                <p className="text-xs text-[#16281D] leading-relaxed whitespace-pre-wrap">
                  {service.description}
                </p>
              </div>
            )}

            {service.image_urls && service.image_urls.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-2">
                  Images
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {service.image_urls.map((url, index) => (
                    <img
                      key={index}
                      src={url.startsWith("https://") ? url : `https://${url}`}
                      alt={`${service.service_name} ${index + 1}`}
                      className="w-full h-24 object-cover rounded-xl border border-[#EAEAEA]"
                    />
                  ))}
                </div>
              </div>
            )}

            {service.service_links && service.service_links.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-2">
                  Service Links
                </div>
                <div className="flex flex-wrap gap-2">
                  {service.service_links.map((link, index) => {
                    let displayLink = link;
                    try {
                      const url = new URL(link);
                      displayLink = url.hostname + (url.pathname !== "/" ? url.pathname : "");
                      if (displayLink.length > 30) {
                        displayLink = displayLink.substring(0, 27) + "…";
                      }
                    } catch {
                      // fallback
                    }
                    return (
                      <a
                        key={index}
                        href={link.startsWith("http") ? link : `https://${link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] border border-[#EAEAEA] text-xs font-semibold text-[#16281D] transition-colors"
                      >
                        <ExternalLink size={12} className="text-[#71717A]" />
                        <span>{displayLink}</span>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-2.5">
                Packages
              </div>
              {service.packages.length > 0 ? (
                <div className="space-y-2.5">
                  {service.packages.map((pkg: Package) => (
                    <div
                      key={pkg.id}
                      className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex-1">
                          <span className="text-xs font-bold text-[#16281D]">{pkg.package_name}</span>
                          {pkg.discount && pkg.discount > 0 ? (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/10 text-[#15803D] border border-[#22C55E]/20">
                              {pkg.discount}% off
                            </span>
                          ) : null}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-sm font-bold text-[#16281D]">
                            {(pkg.currency === 'LKR' || pkg.currency === 'USD' || !pkg.currency ? 'Rs.' : pkg.currency)} {pkg.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-[#71717A] whitespace-pre-wrap mt-1">
                          {pkg.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#71717A]">No packages available.</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 sm:px-6 sm:py-4 border-t border-[#EAEAEA] flex justify-end shrink-0 bg-white">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[38px] rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer flex items-center justify-center"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default ViewServiceModal;
