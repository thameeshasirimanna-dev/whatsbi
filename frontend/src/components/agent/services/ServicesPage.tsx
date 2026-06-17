import React, { useState, useEffect } from "react";
import type { Service, ServiceWithPackages, Package, Agent } from "../../../types";
import { motion } from "framer-motion";
import { Search, Plus, Eye, Pencil, Trash2, Briefcase } from "lucide-react";

import CreateServiceModal from "./CreateServiceModal";
import EditServiceModal from "./EditServiceModal";
import DeleteServiceModal from "./DeleteServiceModal";
import ViewServiceModal from "./ViewServiceModal";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#3f3f46',
  background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 9,
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', cursor: 'pointer', width: 'auto', minWidth: 130 };

const onFocusG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#22c55e';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.1)';
};
const onBlurG = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#ebebeb';
  e.currentTarget.style.boxShadow = 'none';
};

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<ServiceWithPackages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithPackages | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
  const [viewingService, setViewingService] = useState<ServiceWithPackages | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [filters, setFilters] = useState({
    service_name: "",
    package_name: "",
    sort_by: "created_at" as "price" | "created_at",
    sort_order: "desc" as "asc" | "desc",
  });

  useEffect(() => { fetchServices(); }, [filters]);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (response.ok && data.success) setAgent(data.agent);
      } catch (error) { console.error("Failed to fetch agent:", error); }
    };
    fetchAgent();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("auth_token");
      if (!token) { setError("Not authenticated"); setLoading(false); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operation: "get", ...filters }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.message || "Failed to fetch services");
      else setServices(result.data || []);
    } catch { setError("Failed to fetch services"); }
    finally { setLoading(false); }
  };

  const handleCreateService = async (formData: {
    service_name: string;
    description?: string;
    images?: Array<{ fileName: string; fileBase64: string; fileType: string; }>;
    packages: Array<{ package_name: string; price: number; currency?: string; discount?: number; description?: string; }>;
  }): Promise<boolean> => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) { setError("Not authenticated"); return false; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operation: "create", ...formData }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.message || "Failed to create service"); return false; }
      setShowCreateModal(false);
      fetchServices();
      setError(null);
      return true;
    } catch { setError("Failed to create service"); return false; }
  };

  const handleUpdateService = async (type: "service" | "package", id: string, updates: any) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) { setError("Not authenticated"); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operation: "update", type, id, updates }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.message || "Failed to update service");
      else { setEditingService(null); fetchServices(); }
    } catch { setError("Failed to update service"); }
  };

  const handleDeleteService = async (id: string) => {
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) { setError("Not authenticated"); return; }
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/manage-services`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ operation: "delete", id }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.message || "Failed to permanently delete service");
      else { setShowDeleteModal(false); setDeletingServiceId(null); fetchServices(); setError(null); }
    } catch { setError("Failed to permanently delete service"); }
  };

  const confirmDelete = (id: string) => { setDeletingServiceId(id); setShowDeleteModal(true); };

  const filteredServices = services.filter(service =>
    service.service_name.toLowerCase().includes(filters.service_name.toLowerCase()) ||
    service.packages.some(pkg => pkg.package_name.toLowerCase().includes(filters.package_name.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 320 }}>
        <style>{`@keyframes sp-spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(34,197,94,0.15)', borderTopColor: '#22c55e', animation: 'sp-spin 0.8s linear infinite' }} />
          <span style={{ ...DM, fontSize: 13, color: '#71717a' }}>Loading services…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes sp-spin { to { transform: rotate(360deg); } }`}</style>

      {error && (
        <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)', borderRadius: 9, ...DM, fontSize: 13, color: '#f43f5e' }}>
          {error}
        </div>
      )}

      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '14px 18px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#a1a1aa', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search services or packages…"
            value={`${filters.service_name} ${filters.package_name}`.trim() || ""}
            onChange={e => { const v = e.target.value; setFilters({ ...filters, service_name: v, package_name: v }); }}
            style={{ ...inputStyle, paddingLeft: 30 }}
            onFocus={onFocusG} onBlur={onBlurG}
          />
        </div>

        <select value={filters.sort_by} onChange={e => setFilters({ ...filters, sort_by: e.target.value as "price" | "created_at" })} style={selectStyle} onFocus={onFocusG} onBlur={onBlurG}>
          <option value="created_at">Sort by Date</option>
          <option value="price">Sort by Price</option>
        </select>

        <select value={filters.sort_order} onChange={e => setFilters({ ...filters, sort_order: e.target.value as "asc" | "desc" })} style={selectStyle} onFocus={onFocusG} onBlur={onBlurG}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>

        <button onClick={() => setShowCreateModal(true)}
          style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 16px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Plus size={14} /> Add Service
        </button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ background: '#fff', borderRadius: 14, border: '1px solid #ebebeb', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden' }}
      >
        {filteredServices.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f4f4f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Briefcase size={22} style={{ color: '#d4d4d8' }} />
            </div>
            <div style={{ ...SYNE, fontSize: 15, fontWeight: 600, color: '#0c1a0e', marginBottom: 6 }}>
              {filters.service_name || filters.package_name ? "No services found" : "No services yet"}
            </div>
            <div style={{ ...DM, fontSize: 13, color: '#71717a', marginBottom: 20 }}>
              {filters.service_name || filters.package_name ? "No services match your search" : "Start by adding your first service"}
            </div>
            {!filters.service_name && !filters.package_name && (
              <button onClick={() => setShowCreateModal(true)}
                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #059669 100%)', color: '#fff', border: 'none', borderRadius: 9, padding: '10px 20px', ...DM, fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Plus size={14} /> Add Service
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile/Tablet Card Layout */}
            <div className="block lg:hidden">
              <div className="flex flex-col divide-y divide-[#f4f4f5]">
                {filteredServices.map((service, index) => {
                  const prices = service.packages.map(p => p.price).filter(p => p > 0);
                  const minPrice = prices.length ? Math.min(...prices) : null;
                  const maxPrice = prices.length ? Math.max(...prices) : null;
                  const currency = service.packages[0]?.currency || 'LKR';
                  const priceLabel = minPrice === null ? '—'
                    : minPrice === maxPrice ? `${currency} ${minPrice.toFixed(2)}`
                    : `${currency} ${minPrice.toFixed(2)} – ${maxPrice!.toFixed(2)}`;

                  return (
                    <motion.div key={service.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                      style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                          {service.image_urls && service.image_urls.length > 0 ? (
                            <img
                              src={service.image_urls[0].startsWith('https://') ? service.image_urls[0] : `https://${service.image_urls[0]}`}
                              alt={service.service_name}
                              style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: '1px solid #ebebeb' }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Briefcase size={16} style={{ color: '#22c55e' }} />
                            </div>
                          )}
                          <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{service.service_name}</span>
                        </div>
                        <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#059669', flexShrink: 0 }}>{priceLabel}</span>
                      </div>

                      <div style={{ ...DM, fontSize: 12, color: '#71717a', lineHeight: 1.4 }}>
                        {service.description || <span style={{ color: '#a1a1aa' }}>No description</span>}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                        {[
                          { Icon: Eye, label: 'View', color: '#0891b2', bg: 'rgba(8,145,178,0.08)', hbg: 'rgba(8,145,178,0.15)', onClick: () => setViewingService(service) },
                          { Icon: Pencil, label: 'Edit', color: '#059669', bg: 'rgba(34,197,94,0.08)', hbg: 'rgba(34,197,94,0.15)', onClick: () => setEditingService(service) },
                          { Icon: Trash2, label: 'Delete', color: '#f43f5e', bg: 'rgba(244,63,94,0.06)', hbg: 'rgba(244,63,94,0.12)', onClick: () => confirmDelete(service.id) },
                        ].map(({ Icon, label, color, bg, hbg, onClick }) => (
                          <button key={label} onClick={onClick} title={label}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, background: bg, border: 'none', cursor: 'pointer', ...DM, fontSize: 12, fontWeight: 600, color, transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hbg}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = bg}
                          >
                            <Icon size={13} /> {label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table Layout */}
            <div className="hidden lg:block overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Service', 'Description', 'Price Range', 'Actions'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 16px', ...DM, fontSize: 11, fontWeight: 600,
                      color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em',
                      textAlign: i === 3 ? 'right' : 'left',
                      background: '#fafafa', borderBottom: '1px solid #ebebeb',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service, index) => {
                  const prices = service.packages.map(p => p.price).filter(p => p > 0);
                  const minPrice = prices.length ? Math.min(...prices) : null;
                  const maxPrice = prices.length ? Math.max(...prices) : null;
                  const currency = service.packages[0]?.currency || 'LKR';
                  const priceLabel = minPrice === null ? '—'
                    : minPrice === maxPrice ? `${currency} ${minPrice.toFixed(2)}`
                    : `${currency} ${minPrice.toFixed(2)} – ${maxPrice!.toFixed(2)}`;

                  return (
                    <motion.tr key={service.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                      style={{ borderBottom: '1px solid #f4f4f5', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(34,197,94,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      {/* Service */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {service.image_urls && service.image_urls.length > 0 ? (
                            <img
                              src={service.image_urls[0].startsWith('https://') ? service.image_urls[0] : `https://${service.image_urls[0]}`}
                              alt={service.service_name}
                              style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: '1px solid #ebebeb' }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Briefcase size={16} style={{ color: '#22c55e' }} />
                            </div>
                          )}
                          <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#0c1a0e' }}>{service.service_name}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td style={{ padding: '14px 16px', maxWidth: 220 }}>
                        <span style={{ ...DM, fontSize: 12, color: '#71717a', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {service.description || <span style={{ color: '#a1a1aa' }}>—</span>}
                        </span>
                      </td>

                      {/* Price Range */}
                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...SYNE, fontSize: 13, fontWeight: 700, color: '#059669' }}>{priceLabel}</span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 5 }}>
                          {[
                            { Icon: Eye, label: 'View', color: '#0891b2', bg: 'rgba(8,145,178,0.08)', hbg: 'rgba(8,145,178,0.15)', onClick: () => setViewingService(service) },
                            { Icon: Pencil, label: 'Edit', color: '#059669', bg: 'rgba(34,197,94,0.08)', hbg: 'rgba(34,197,94,0.15)', onClick: () => setEditingService(service) },
                            { Icon: Trash2, label: 'Delete', color: '#f43f5e', bg: 'rgba(244,63,94,0.06)', hbg: 'rgba(244,63,94,0.12)', onClick: () => confirmDelete(service.id) },
                          ].map(({ Icon, label, color, bg, hbg, onClick }) => (
                            <button key={label} onClick={onClick} title={label}
                              style={{ width: 28, height: 28, borderRadius: 7, background: bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.1s' }}
                              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = hbg}
                              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = bg}
                            >
                              <Icon size={13} style={{ color }} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>

      {showCreateModal && <CreateServiceModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateService} setError={setError} />}
      {editingService && agent && (
        <EditServiceModal editingService={editingService} agent={agent} onClose={() => setEditingService(null)}
          onSuccess={() => { setEditingService(null); fetchServices(); setError(null); }} setError={setError} />
      )}
      {showDeleteModal && (
        <DeleteServiceModal deletingServiceId={deletingServiceId} services={services}
          onClose={() => { setShowDeleteModal(false); setDeletingServiceId(null); }} onDelete={handleDeleteService} />
      )}
      {viewingService && <ViewServiceModal service={viewingService} onClose={() => setViewingService(null)} />}
    </div>
  );
};

export default ServicesPage;
