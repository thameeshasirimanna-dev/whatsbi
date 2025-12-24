import React, { useState } from "react";
import type { Package, ServiceWithPackages, Agent } from "../../../types";

const resizeImage = (
  file: File,
  maxWidth: number = 2000,
  maxHeight: number = 2000
): Promise<File> => {
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

      // Calculate new dimensions maintaining aspect ratio
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
          if (blob) {
            const resizedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"),
              { type: "image/jpeg" }
            );
            resolve(resizedFile);
          } else {
            reject(new Error("Failed to resize image"));
          }
        },
        "image/jpeg",
        0.8
      ); // 80% quality for better compression
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
  editingService,
  agent,
  onClose,
  onSuccess,
  setError,
}) => {
  if (!editingService || !agent) return null;

  const [formData, setFormData] = useState({
    service_name: editingService.service_name,
    description: editingService.description || "",
  });
  const [currentPackages, setCurrentPackages] = useState([
    ...editingService.packages,
  ]);
  const [originalPackageIds] = useState(
    new Set(editingService.packages.map((p) => p.id))
  );
  const [removedPackageIds, setRemovedPackageIds] = useState(new Set<string>());
  const [selectedImages, setSelectedImages] = useState<
    Array<{
      fileName: string;
      fileBase64: string;
      fileType: string;
      preview?: string;
    }>
  >([]);
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.service_name.trim()) {
      newErrors.service_name = "Service name is required";
    }

    currentPackages.forEach((pkg, index) => {
      if (!pkg.package_name.trim()) {
        newErrors[`package_name_${index}`] = `Package ${
          index + 1
        } name is required`;
      }
      if (pkg.price <= 0) {
        newErrors[`price_${index}`] = `Package ${
          index + 1
        } price must be greater than 0`;
      }
    });

    if (currentPackages.length === 0) {
      newErrors.packages = "At least one package is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      let newImageUrls: string[] = [];

      // Upload new images first if any
      if (selectedImages.length > 0) {
        const token = localStorage.getItem("auth_token");
        if (!token) {
          setError("Not authenticated");
          setSubmitting(false);
          return;
        }

        const uploadResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/upload-service-images`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              agentId: agent!.id,
              serviceId: editingService.id,
              images: selectedImages,
            }),
          }
        );

        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadResult.success) {
          setError(uploadResult.message || "Failed to upload images");
          setSubmitting(false);
          return;
        }
        newImageUrls = uploadResult.urls || [];
      }

      // Prepare updates with image handling
      const serviceUpdates: {
        service_name: string;
        description: string | null;
        image_urls?: {
          add?: string[];
          remove?: string[];
        };
      } = {
        service_name: formData.service_name.trim(),
        description: formData.description || null,
      };

      if (newImageUrls.length > 0 || removedImageUrls.length > 0) {
        serviceUpdates.image_urls = {};
        if (newImageUrls.length > 0) {
          serviceUpdates.image_urls.add = newImageUrls;
        }
        if (removedImageUrls.length > 0) {
          serviceUpdates.image_urls.remove = removedImageUrls;
        }
      }

      // Update service via backend API
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setError("Not authenticated");
        setSubmitting(false);
        return;
      }

      const serviceResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/manage-services`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            operation: "update",
            type: "service",
            id: editingService.id,
            updates: serviceUpdates,
          }),
        }
      );

      const serviceResult = await serviceResponse.json();
      if (!serviceResponse.ok) {
        setError(serviceResult.message || "Failed to update service");
        setSubmitting(false);
        return;
      }

      // TODO: Handle package updates via backend API
      // For now, package updates are not implemented

      onSuccess();
    } catch (err) {
      setError("Failed to update service");
    } finally {
      setSubmitting(false);
    }
  };

  const addPackage = () => {
    setCurrentPackages([
      ...currentPackages,
      {
        id: "",
        service_id: editingService.id,
        package_name: "",
        price: 0,
        currency: "USD",
        discount: undefined,
        description: "",
        is_active: true,
        created_at: "",
        updated_at: "",
      },
    ]);
  };

  const removePackage = (index: number) => {
    const pkg = currentPackages[index];
    if (pkg.id && originalPackageIds.has(pkg.id as string)) {
      setRemovedPackageIds((prev) => new Set([...prev, pkg.id as string]));
    }
    setCurrentPackages(currentPackages.filter((_, i) => i !== index));
  };

  const updatePackage = (index: number, field: keyof Package, value: any) => {
    const newPackages = [...currentPackages];
    newPackages[index] = { ...newPackages[index], [field]: value };
    setCurrentPackages(newPackages);
  };

  const updateServiceData = (
    field: "service_name" | "description",
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            Edit Service: {editingService.service_name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              value={formData.service_name}
              onChange={(e) =>
                updateServiceData("service_name", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {errors.service_name && (
              <p className="text-red-500 text-sm mt-1">{errors.service_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateServiceData("description", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Image upload and management */}
          <div className="p-4 border rounded-md bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Images (Optional, max 10 total)
            </label>

            {/* Current images */}
            {(() => {
              const currentImages =
                editingService.image_urls?.filter(
                  (url) => !removedImageUrls.includes(url)
                ) || [];
              return currentImages.length > 0 ? (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">Current Images:</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentImages.map((url, idx) => (
                      <div key={url} className="relative group">
                        <img
                          src={url}
                          alt={`Current image ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setRemovedImageUrls((prev) => [...prev, url]);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Add new images */}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                const currentCount =
                  (editingService.image_urls?.length || 0) -
                  removedImageUrls.length +
                  selectedImages.length;
                if (files.length + currentCount > 10) {
                  setError("Maximum 10 images total allowed");
                  return;
                }

                const newImages: Array<{
                  fileName: string;
                  fileBase64: string;
                  fileType: string;
                  preview?: string;
                }> = [];

                for (const file of files) {
                  if (!file.type.startsWith("image/")) {
                    setError("Only image files are allowed");
                    continue;
                  }

                  try {
                    const resizedFile = await resizeImage(file, 2000, 2000);
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64 = event.target?.result as string;
                      const matches = base64.match(/^data:(.*);base64,(.*)$/);
                      if (matches) {
                        newImages.push({
                          fileName: resizedFile.name,
                          fileBase64: matches[2],
                          fileType: matches[1],
                          preview: base64,
                        });
                        if (newImages.length === files.length) {
                          setSelectedImages((prev) => [...prev, ...newImages]);
                          setError(null);
                        }
                      }
                    };
                    reader.readAsDataURL(resizedFile);
                  } catch (error) {
                    setError("Failed to compress image");
                    console.error("Image compression error:", error);
                  }
                }
              }}
              className="w-full mb-2"
            />

            {/* New selected images preview */}
            {selectedImages.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-1">New Images:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedImages.map((img, index) => (
                    <div key={index} className="relative">
                      <img
                        src={img.preview}
                        alt={img.fileName}
                        className="w-20 h-20 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImages((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Packages *
            </label>
            {currentPackages.map((pkg, index) => (
              <div
                key={pkg.id || index}
                className="border p-4 rounded-md mb-3 bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Package Name *"
                      value={pkg.package_name}
                      onChange={(e) =>
                        updatePackage(index, "package_name", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {errors[`package_name_${index}`] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors[`package_name_${index}`]}
                      </p>
                    )}
                  </div>

                  <div>
                    <input
                      type="number"
                      placeholder="Price *"
                      value={pkg.price}
                      onChange={(e) =>
                        updatePackage(
                          index,
                          "price",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                    {errors[`price_${index}`] && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors[`price_${index}`]}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="Currency (e.g., USD)"
                      value={pkg.currency}
                      onChange={(e) =>
                        updatePackage(
                          index,
                          "currency",
                          e.target.value.toUpperCase()
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      placeholder="Discount % (0-100)"
                      value={pkg.discount || ""}
                      onChange={(e) =>
                        updatePackage(
                          index,
                          "discount",
                          parseFloat(e.target.value) || undefined
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <textarea
                      placeholder="Package Description"
                      value={pkg.description || ""}
                      onChange={(e) =>
                        updatePackage(index, "description", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePackage(index)}
                  className="text-red-500 text-sm underline hover:text-red-700"
                >
                  Remove Package
                </button>
              </div>
            ))}
            {errors.packages && (
              <p className="text-red-500 text-sm mb-3">{errors.packages}</p>
            )}
            <button
              type="button"
              onClick={addPackage}
              className="px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-colors"
            >
              Add Package
            </button>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 rounded-md hover:bg-gray-400 text-gray-700 font-medium transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Updating..." : "Update Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditServiceModal;
