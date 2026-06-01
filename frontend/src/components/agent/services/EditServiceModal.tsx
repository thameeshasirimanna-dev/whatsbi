import React, { useState } from "react";
import type { Package, ServiceWithPackages, Agent } from "../../../types";
import { X, Plus, Trash2, Pencil } from "lucide-react";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

const resizeImage = (file: File, maxWidth: number = 2000, maxHeight: number = 2000): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => { img.src = e.target?.result as string; };
    reader.onerror = reject;
    reader.readAsDataURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      let { width, height } = img;
      if (width > height) { if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; } }
      else { if (height > maxHeight) { width = Math.round(width * maxHeight / height); height = maxHeight; } }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" }));
        else reject(new Error("Failed to resize image"));
      }, "image/jpeg", 0.8);
    };
    img.onerror = reject;
  });
};

interface EditServiceModalProps {
  editingService: ServiceWithPackages | null;
  agent: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
  setError: (error: string | null) => void;
}

const EditServiceModal: React.FC<EditServiceModalProps> = ({
  editingService, agent, onClose, onSuccess, setError,
}) => {
  if (!editingService || !agent) return null;

  const [formData, setFormData] = useState({ service_name: editingService.service_name, description: editingService.description || "" });
  const [currentPackages, setCurrentPackages] = useState([...editingService.packages]);
  const [originalPackageIds] = useState(new Set(editingService.packages.map(p => p.id)));
  const [removedPackageIds, setRemovedPackageIds] = useState(new Set<string>());
  const [selectedImages, setSelectedImages] = useState<Array<{ fileName: string; fileBase64: string; fileType: string; preview?: string; }>>([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.service_name.trim()) newErrors.service_name = "Service name is required";
    currentPackages.forEach((pkg, i) => {
      if (!pkg.package_name.trim()) newErrors[`package_name_${i}`] = `Package ${i + 1} name is required`;
      if (pkg.price <= 0) newErrors[`price_${i}`] = `Package ${i + 1} price must be greater than 0`;
    });
    if (currentPackages.length === 0) newErrors.packages = "At least one package is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);

    try {
      let newImageUrls: string[] = [];

      if (selectedImages.length > 0) {
        const token = localStorage.getItem("auth_token");
        if (!token) { setError("Not authenticated"); setSubmitting(false); return; }
        const uploadResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/upload-service-images`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ agentId: agent!.id, serviceId: editingService.id, images: selectedImages }),
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.success) { setError(uploadResult.message || "Failed to upload images"); setSubmitting(false); return; }
        newImageUrls = uploadResult.urls || [];
      }

      const serviceUpdates: { service_name: string; description: string | null; image_urls?: { add?: string[]; remove?: string[]; }; } = {
        service_name: formData.service_name.trim(),
        description: formData.description || null,
      };
      if (newImageUrls.length > 0 || removedImageUrls.length > 0) {
        serviceUpdates.image_urls = {};
        if (newImageUrls.length > 0) serviceUpdates.image_urls.add = newImageUrls;
        if (removedImageUrls.length > 0) serviceUpdates.image_urls.remove = removedImageUrls;
      }

      const token = localStorage.getItem("auth_token");
      if (!token) { setError("Not authenticated"); setSubmitting(false); return; }

      const serviceResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operation: "update", type: "service", id: editingService.id, updates: serviceUpdates }),
      });
      const serviceResult = await serviceResponse.json();
      if (!serviceResponse.ok) { setError(serviceResult.message || "Failed to update service"); setSubmitting(false); return; }

      onSuccess();
    } catch { setError("Failed to update service"); }
    finally { setSubmitting(false); }
  };

  const addPackage = () => setCurrentPackages([...currentPackages, { id: "", service_id: editingService.id, package_name: "", price: 0, currency: "USD", discount: undefined, description: "", is_active: true, created_at: "", updated_at: "" }]);

  const removePackage = (i: number) => {
    const pkg = currentPackages[i];
    if (pkg.id && originalPackageIds.has(pkg.id as string)) setRemovedPackageIds(prev => new Set([...prev, pkg.id as string]));
    setCurrentPackages(currentPackages.filter((_, idx) => idx !== i));
  };

  const updatePackage = (i: number, field: keyof Package, value: any) => {
    const p = [...currentPackages]; p[i] = { ...p[i], [field]: value }; setCurrentPackages(p);
  };

  const updateServiceData = (field: "service_name" | "description", value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <style>{`@keyframes esm-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pencil size={14} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e', display: 'block' }}>Edit Service</span>
                <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>{editingService.service_name}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={14} style={{ color: '#71717a' }} />
            </button>
          </div>

          {/* Form */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Service Name *</label>
                <input type="text" value={formData.service_name} onChange={e => updateServiceData("service_name", e.target.value)} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                {errors.service_name && <div style={{ ...DM, fontSize: 11, color: '#f43f5e', marginTop: 4 }}>{errors.service_name}</div>}
              </div>

              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 6 }}>Description</label>
                <textarea value={formData.description} onChange={e => updateServiceData("description", e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur} />
              </div>

              {/* Image management */}
              <div style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 12, padding: '14px 16px' }}>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 8 }}>Service Images <span style={{ color: '#a1a1aa', fontWeight: 400 }}>(optional, max 10 total)</span></label>

                {(() => {
                  const currentImgs = editingService.image_urls?.filter(url => !removedImageUrls.includes(url)) || [];
                  return currentImgs.length > 0 ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ ...DM, fontSize: 11, color: '#71717a', marginBottom: 6 }}>Current Images:</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {currentImgs.map((url, idx) => (
                          <div key={url} style={{ position: 'relative' }}
                            onMouseEnter={e => (e.currentTarget.querySelector('button') as HTMLButtonElement).style.opacity = '1'}
                            onMouseLeave={e => (e.currentTarget.querySelector('button') as HTMLButtonElement).style.opacity = '0'}
                          >
                            <img src={url.startsWith('https://') ? url : `https://${url}`} alt={`Image ${idx + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 9, border: '1px solid #ebebeb' }} />
                            <button type="button" onClick={() => setRemovedImageUrls(prev => [...prev, url])}
                              style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, background: '#f43f5e', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}>
                              <X size={10} style={{ color: '#fff' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}

                <input type="file" multiple accept="image/*" style={{ ...DM, fontSize: 12, color: '#71717a', width: '100%', marginBottom: 8 }}
                  onChange={async e => {
                    const files = Array.from(e.target.files || []);
                    const currentCount = (editingService.image_urls?.length || 0) - removedImageUrls.length + selectedImages.length;
                    if (files.length + currentCount > 10) { setError("Maximum 10 images total allowed"); return; }
                    const newImages: Array<{ fileName: string; fileBase64: string; fileType: string; preview?: string; }> = [];
                    for (const file of files) {
                      if (!file.type.startsWith("image/")) { setError("Only image files are allowed"); continue; }
                      try {
                        const resized = await resizeImage(file, 2000, 2000);
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const base64 = ev.target?.result as string;
                          const m = base64.match(/^data:(.*);base64,(.*)$/);
                          if (m) {
                            newImages.push({ fileName: resized.name, fileBase64: m[2], fileType: m[1], preview: base64 });
                            if (newImages.length === files.length) { setSelectedImages(prev => [...prev, ...newImages]); setError(null); }
                          }
                        };
                        reader.readAsDataURL(resized);
                      } catch { setError("Failed to compress image"); }
                    }
                  }}
                />

                {selectedImages.length > 0 && (
                  <div>
                    <div style={{ ...DM, fontSize: 11, color: '#71717a', marginBottom: 6 }}>New Images:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selectedImages.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img.preview} alt={img.fileName} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 9, border: '1px solid #ebebeb' }} />
                          <button type="button" onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, background: '#f43f5e', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={10} style={{ color: '#fff' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Packages */}
              <div>
                <label style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#3f3f46', display: 'block', marginBottom: 10 }}>Packages *</label>
                {currentPackages.map((pkg, i) => (
                  <div key={pkg.id || i} style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{ ...DM, fontSize: 12, fontWeight: 600, color: '#71717a' }}>Package {i + 1}</span>
                      <button type="button" onClick={() => removePackage(i)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(244,63,94,0.06)', border: 'none', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', ...DM, fontSize: 11, fontWeight: 600, color: '#f43f5e' }}>
                        <Trash2 size={11} /> Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <input type="text" placeholder="Package name *" value={pkg.package_name} onChange={e => updatePackage(i, "package_name", e.target.value)} required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                        {errors[`package_name_${i}`] && <div style={{ ...DM, fontSize: 11, color: '#f43f5e', marginTop: 3 }}>{errors[`package_name_${i}`]}</div>}
                      </div>
                      <div>
                        <input type="number" placeholder="Price *" value={pkg.price} onChange={e => updatePackage(i, "price", parseFloat(e.target.value) || 0)} min="0" step="0.01" required style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                        {errors[`price_${i}`] && <div style={{ ...DM, fontSize: 11, color: '#f43f5e', marginTop: 3 }}>{errors[`price_${i}`]}</div>}
                      </div>
                      <div className="md:col-span-2">
                        <input type="text" placeholder="Currency (e.g. USD)" value={pkg.currency} onChange={e => updatePackage(i, "currency", e.target.value.toUpperCase())} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div>
                        <input type="number" placeholder="Discount % (0–100)" value={pkg.discount || ""} onChange={e => updatePackage(i, "discount", parseFloat(e.target.value) || undefined)} min="0" max="100" step="0.01" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                      <div className="md:col-span-2">
                        <textarea placeholder="Package description" value={pkg.description || ""} onChange={e => updatePackage(i, "description", e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur} />
                      </div>
                    </div>
                  </div>
                ))}
                {errors.packages && <div style={{ ...DM, fontSize: 11, color: '#f43f5e', marginBottom: 8 }}>{errors.packages}</div>}
                <button type="button" onClick={addPackage}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.08)', color: '#059669', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9, padding: '8px 14px', ...DM, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  <Plus size={13} /> Add Package
                </button>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={onClose} disabled={submitting}
                  style={{ flex: 1, background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.5 : 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  style={{ flex: 1, background: submitting ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', boxShadow: submitting ? 'none' : '0 4px 14px rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {submitting ? (
                    <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'esm-spin 0.7s linear infinite' }} />Updating…</>
                  ) : 'Update Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditServiceModal;
