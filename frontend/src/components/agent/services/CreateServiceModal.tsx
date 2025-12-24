import React, { useState } from "react";
import type { Package } from "../../../types";

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

interface CreateServiceModalProps {
  onClose: () => void;
  onCreate: (formData: {
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
  }) => Promise<boolean>;
  setError: (error: string | null) => void;
}

const CreateServiceModal: React.FC<CreateServiceModalProps> = ({
  onClose,
  onCreate,
  setError,
}) => {
  const [formData, setFormData] = useState({
    service_name: "",
    description: "",
  });
  const [selectedImages, setSelectedImages] = useState<
    Array<{
      fileName: string;
      fileBase64: string;
      fileType: string;
      preview?: string;
    }>
  >([]);
  const [packages, setPackages] = useState<
    Array<
      Omit<
        Package,
        "id" | "service_id" | "is_active" | "created_at" | "updated_at"
      >
    >
  >([
    {
      package_name: "",
      price: 0,
      currency: "USD",
      discount: 0,
      description: "",
    },
  ]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.service_name.trim()) {
      newErrors.service_name = "Service name is required";
    }

    packages.forEach((pkg, index) => {
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

    if (packages.length === 0) {
      newErrors.packages = "At least one package is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const fullPackages = packages.map((pkg) => ({
      ...pkg,
      is_active: true,
    }));

    const result = await onCreate({
      ...formData,
      service_name: formData.service_name.trim(),
      images: selectedImages,
      packages: fullPackages,
    });

    if (result) {
      setFormData({ service_name: "", description: "" });
      setSelectedImages([]);
      setPackages([
        {
          package_name: "",
          price: 0,
          currency: "USD",
          discount: 0,
          description: "",
        },
      ]);
      setErrors({});
      onClose();
    }
    setSubmitting(false);
  };

  const addPackage = () => {
    setPackages([
      ...packages,
      {
        package_name: "",
        price: 0,
        currency: "USD",
        discount: 0,
        description: "",
      },
    ]);
  };

  const removePackage = (index: number) => {
    if (packages.length > 1) {
      setPackages(packages.filter((_, i) => i !== index));
    }
  };

  const updatePackage = (index: number, field: string, value: any) => {
    const newPackages = [...packages];
    newPackages[index] = { ...newPackages[index], [field]: value };
    setPackages(newPackages);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Create New Service</h2>
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
                setFormData({ ...formData, service_name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={3}
            />
          </div>

          {/* Image upload */}
          <div className="p-4 border rounded-md bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Service Images (Optional, max 10)
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                if (files.length + selectedImages.length > 10) {
                  setError("Maximum 10 images allowed");
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
            {selectedImages.length > 0 && (
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
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Packages *
            </label>
            {packages.map((pkg, index) => (
              <div
                key={index}
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={2}
                    />
                  </div>
                </div>
                {packages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePackage(index)}
                    className="text-red-500 text-sm underline hover:text-red-700"
                  >
                    Remove Package
                  </button>
                )}
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
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition-colors disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServiceModal;