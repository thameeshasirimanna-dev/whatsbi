import React, { useState, useEffect } from "react";
import { X, Search, Briefcase } from "lucide-react";
import { getToken } from "../../../lib/auth";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

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
  service_links?: string[];
  packages: Package[];
}

interface ServiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectService: (service: Service) => void;
}

const ServiceSelectorModal: React.FC<ServiceSelectorModalProps> = ({
  isOpen, onClose, onSelectService,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);

  useEffect(() => { if (isOpen) fetchServices(); }, [isOpen]);

  useEffect(() => {
    setFilteredServices(services.filter(s => s.service_name.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [searchTerm, services]);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) { setLoading(false); return; }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "get" }),
      });

      if (!response.ok) { setServices([]); setLoading(false); return; }

      const servicesData = await response.json();
      if (servicesData.status !== "success") {
        setServices([]);
      } else {
        setServices((servicesData.data || []).map((service: any) => ({
          id: service.id,
          service_name: service.service_name,
          description: service.description,
          service_links: service.service_links || [],
          packages: (service.packages || []).map((pkg: any) => ({
            id: pkg.id,
            package_name: pkg.package_name,
            price: Number(pkg.price),
            currency: pkg.currency || "USD",
            discount: pkg.discount ? Number(pkg.discount) : undefined,
            description: pkg.description,
          })),
        })));
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <style>{`@keyframes ss-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '18px 20px 14px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(8,145,178,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Briefcase size={15} style={{ color: '#0891b2' }} />
            </div>
            <span style={{ ...SYNE, fontSize: 15, fontWeight: 700, color: '#0c1a0e' }}>Select Service</span>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} style={{ color: '#71717a' }} />
          </button>
        </div>

        {/* Search */}
        <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: '1px solid #ebebeb' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa' }} />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 32px', border: '1px solid #ebebeb', borderRadius: 8, fontSize: 13, background: '#f9f9f9', color: '#0c1a0e', outline: 'none', ...DM, boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#ebebeb'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 10 }}>
              <div style={{ width: 24, height: 24, border: '2px solid #ebebeb', borderTopColor: '#0891b2', borderRadius: '50%', animation: 'ss-spin 0.8s linear infinite' }} />
              <span style={{ ...DM, fontSize: 13, color: '#71717a' }}>Loading services...</span>
            </div>
          ) : filteredServices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', ...DM, fontSize: 13, color: '#71717a' }}>
              {searchTerm ? "No services found." : "No services available."}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  onClick={() => { onSelectService(service); onClose(); }}
                  style={{ padding: '10px 12px', border: '1px solid #ebebeb', borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.04)'; e.currentTarget.style.borderColor = 'rgba(34,197,94,0.25)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#ebebeb'; }}
                >
                  <div style={{ ...SYNE, fontSize: 13, fontWeight: 600, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.service_name}</div>
                  {service.description && (
                    <div style={{ ...DM, fontSize: 12, color: '#71717a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{service.description}</div>
                  )}
                  {service.packages.length > 0 && (
                    <div style={{ ...DM, fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>
                      {service.packages.map(p => p.package_name).join(' · ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: '1px solid #ebebeb', background: '#fafafa' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '9px 0', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: 9, cursor: 'pointer', ...DM, fontSize: 13, fontWeight: 600, color: '#3f3f46' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceSelectorModal;
