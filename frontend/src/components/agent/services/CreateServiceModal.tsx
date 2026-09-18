import React, { useState } from "react";
import type { Package } from "../../../types";
import { X, Plus, Trash2, Briefcase, Image as ImageIcon } from "lucide-react";
import Portal from "../shared/Portal";

const resizeImage = (file: File, maxWidth: number = 2000, maxHeight: number = 2000): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      let { width, height } = img;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" }));
          else reject(new Error("Failed to resize image"));
        },
        "image/jpeg",
        0.8
      );
    };
    img.onerror = reject;
  });
};

interface CreateServiceModalProps {
  onClose: () => void;
  onCreate: (formData: {
    service_name: string;
    description?: string;
    images?: Array<{ fileName: string; fileBase64: string; fileType: string }>;
    packages: Array<{ package_name: string; price: number; currency?: string; discount?: number; description?: string }>;
    service_links?: string[];
  }) => Promise<boolean>;
  setError: (error: string | null) => void;
}

const CreateServiceModal: React.FC<CreateServiceModalProps> = ({ onClose, onCreate, setError }) => {
  const [formData, setFormData] = useState({ service_name: "", description: "" });
  const [selectedImages, setSelectedImages] = useState<
    Array<{ fileName: string; fileBase64: string; fileType: string; preview?: string }>
  >([]);
  const [serviceLinks, setServiceLinks] = useState<string[]>([""]);
  const [packages, setPackages] = useState<
    Array<Omit<Package, "id" | "service_id" | "is_active" | "created_at" | "updated_at">>
  >([{ package_name: "", price: 0, currency: "Rs.", discount: 0, description: "" }]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.service_name.trim()) newErrors.service_name = "Service name is required";
    packages.forEach((pkg, i) => {
      if (!pkg.package_name.trim()) newErrors[`package_name_${i}`] = `Package ${i + 1} name is required`;
      if (pkg.price <= 0) newErrors[`price_${i}`] = `Package ${i + 1} price must be greater than 0`;
    });
    if (packages.length === 0) newErrors.packages = "At least one package is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    const result = await onCreate({
      ...formData,
      service_name: formData.service_name.trim(),
      images: selectedImages,
      packages: packages.map((pkg) => ({ ...pkg, is_active: true })),
      service_links: serviceLinks.map((l) => l.trim()).filter(Boolean),
    });
    if (result) {
      setFormData({ service_name: "", description: "" });
      setSelectedImages([]);
      setPackages([{ package_name: "", price: 0, currency: "Rs.", discount: 0, description: "" }]);
      setServiceLinks([""]);
      setErrors({});
      onClose();
    }
    setSubmitting(false);
  };

  const addPackage = () =>
    setPackages([...packages, { package_name: "", price: 0, currency: "USD", discount: 0, description: "" }]);

  const removePackage = (i: number) => {
    if (packages.length > 1) setPackages(packages.filter((_, idx) => idx !== i));
  };

  const updatePackage = (i: number, field: string, value: any) => {
    const p = [...packages];
    p[i] = { ...p[i], [field]: value };
    setPackages(p);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-[#16281D]/65 animate-modal-backdrop">
        <div className="w-full max-w-[min(36rem,95vw)] sm:max-w-xl bg-white rounded-2xl sm:rounded-3xl border border-[#EAEAEA] shadow-[0_20px_50px_rgba(22,40,29,0.15)] overflow-hidden flex flex-col max-h-[90vh] animate-modal-card">
          {/* Header */}
          <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-[#EAEAEA] flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#16281D]/5 flex items-center justify-center text-[#16281D] shrink-0">
                <Briefcase size={17} />
              </div>
              <h3 className="font-sans text-sm sm:text-base font-bold text-[#16281D] truncate">Create New Service</h3>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="w-8 h-8 rounded-full bg-[#F4F7F4] hover:bg-[#EAEAEA] text-[#71717A] hover:text-[#16281D] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <form id="create-service-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Service Name */}
              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">Service Name *</label>
                <input
                  type="text"
                  value={formData.service_name}
                  onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                  placeholder="e.g. Website Development"
                  required
                  className="w-full h-10 px-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
                />
                {errors.service_name && (
                  <div className="text-[11px] text-[#EF4444] mt-1 font-medium">{errors.service_name}</div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your service scope and deliverables…"
                  rows={3}
                  className="w-full p-3 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all resize-none"
                />
              </div>

              {/* Service Links */}
              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Service Links <span className="text-[#71717A] font-normal">(optional)</span>
                </label>
                <div className="space-y-2 mb-2">
                  {serviceLinks.map((link, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="url"
                        value={link}
                        onChange={(e) => {
                          const newLinks = [...serviceLinks];
                          newLinks[idx] = e.target.value;
                          setServiceLinks(newLinks);
                        }}
                        placeholder="https://example.com"
                        className="flex-1 h-9 px-3.5 bg-[#F4F7F4] border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setServiceLinks(serviceLinks.filter((_, i) => i !== idx))}
                        className="w-9 h-9 rounded-xl bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setServiceLinks([...serviceLinks, ""])}
                  className="px-3.5 py-1.5 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#16281D] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Link</span>
                </button>
              </div>

              {/* Images */}
              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-1.5">
                  Service Images <span className="text-[#71717A] font-normal">(optional, max 10)</span>
                </label>
                <label className="flex items-center gap-2 px-3.5 py-2.5 border border-dashed border-[#EAEAEA] hover:border-[#16281D]/30 rounded-xl cursor-pointer bg-[#F4F7F4] text-xs text-[#71717A] hover:text-[#16281D] transition-colors">
                  <ImageIcon size={16} />
                  <span>
                    {selectedImages.length > 0
                      ? `${selectedImages.length} image(s) selected`
                      : "Click to upload portfolio or cover images…"}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length + selectedImages.length > 10) {
                        setError("Maximum 10 images allowed");
                        return;
                      }
                      const newImages: Array<{ fileName: string; fileBase64: string; fileType: string; preview?: string }> = [];
                      for (const file of files) {
                        if (!file.type.startsWith("image/")) {
                          setError("Only image files are allowed");
                          continue;
                        }
                        try {
                          const resized = await resizeImage(file, 2000, 2000);
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const base64 = ev.target?.result as string;
                            const m = base64.match(/^data:(.*);base64,(.*)$/);
                            if (m) {
                              newImages.push({ fileName: resized.name, fileBase64: m[2], fileType: m[1], preview: base64 });
                              if (newImages.length === files.length) {
                                setSelectedImages((prev) => [...prev, ...newImages]);
                                setError(null);
                              }
                            }
                          };
                          reader.readAsDataURL(resized);
                        } catch {
                          setError("Failed to compress image");
                        }
                      }
                    }}
                  />
                </label>

                {selectedImages.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-2.5">
                    {selectedImages.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-[#EAEAEA]">
                        <img src={img.preview} alt={img.fileName} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setSelectedImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center text-xs opacity-90 hover:opacity-100 transition-opacity cursor-pointer border-0 shadow-sm"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Packages */}
              <div>
                <label className="block text-xs font-semibold text-[#16281D] mb-2">Packages *</label>
                <div className="space-y-3 mb-2.5">
                  {packages.map((pkg, i) => (
                    <div key={i} className="bg-[#F4F7F4] border border-[#EAEAEA] rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#16281D]">Package {i + 1}</span>
                        {packages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePackage(i)}
                            className="px-2.5 py-1 rounded-full bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border-0"
                          >
                            <Trash2 size={12} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            placeholder="Package name *"
                            value={pkg.package_name}
                            onChange={(e) => updatePackage(i, "package_name", e.target.value)}
                            required
                            className="w-full h-9 px-3 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all"
                          />
                          {errors[`package_name_${i}`] && (
                            <div className="text-[11px] text-[#EF4444] mt-1 font-medium">
                              {errors[`package_name_${i}`]}
                            </div>
                          )}
                        </div>

                        <div>
                          <input
                            type="number"
                            placeholder="Price *"
                            value={pkg.price || ""}
                            onChange={(e) => updatePackage(i, "price", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            required
                            className="w-full h-9 px-3 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-mono"
                          />
                          {errors[`price_${i}`] && (
                            <div className="text-[11px] text-[#EF4444] mt-1 font-medium">{errors[`price_${i}`]}</div>
                          )}
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Currency (e.g. Rs, LKR)"
                            value={pkg.currency}
                            onChange={(e) => updatePackage(i, "currency", e.target.value)}
                            className="w-full h-9 px-3 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-mono"
                          />
                        </div>

                        <div>
                          <input
                            type="number"
                            placeholder="Discount % (optional)"
                            value={pkg.discount || ""}
                            onChange={(e) => updatePackage(i, "discount", parseFloat(e.target.value) || undefined)}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full h-9 px-3 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all font-mono"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <textarea
                            placeholder="Package description & inclusions…"
                            value={pkg.description || ""}
                            onChange={(e) => updatePackage(i, "description", e.target.value)}
                            rows={2}
                            className="w-full p-2.5 bg-white border border-[#EAEAEA] rounded-xl text-xs text-[#16281D] placeholder-[#71717A] focus:outline-none focus:border-[#9FE870] focus:ring-2 focus:ring-[#9FE870]/20 transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.packages && (
                  <div className="text-[11px] text-[#EF4444] mb-2 font-medium">{errors.packages}</div>
                )}

                <button
                  type="button"
                  onClick={addPackage}
                  className="px-4 py-2 rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#16281D] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Package</span>
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="p-3 sm:px-6 sm:py-4 border-t border-[#EAEAEA] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[38px] rounded-full border border-[#EAEAEA] bg-white hover:bg-[#F4F7F4] text-xs font-semibold text-[#71717A] hover:text-[#16281D] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-service-form"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[38px] rounded-full bg-[#9FE870] hover:bg-[#8CE05A] text-[#16281D] text-xs font-bold shadow-[0_4px_16px_rgba(159,232,112,0.35)] hover:shadow-[0_6px_20px_rgba(159,232,112,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer border-0"
            >
              {submitting ? "Creating…" : "Create Service"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default CreateServiceModal;
