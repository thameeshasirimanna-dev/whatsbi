import React from "react";
import type { ServiceWithPackages, Package } from "../../../types";
import { X, Briefcase } from "lucide-react";

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" };
const DM: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface ViewServiceModalProps {
  service: ServiceWithPackages;
  onClose: () => void;
}

const ViewServiceModal: React.FC<ViewServiceModalProps> = ({ service, onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #ebebeb', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', width: '100%', maxWidth: 560, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ flexShrink: 0, padding: '20px 24px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {service.image_urls && service.image_urls.length > 0 ? (
              <img
                src={service.image_urls[0].startsWith('https://') ? service.image_urls[0] : `https://${service.image_urls[0]}`}
                alt={service.service_name}
                style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Briefcase size={18} style={{ color: '#22c55e' }} />
              </div>
            )}
            <div>
              <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#0c1a0e', display: 'block' }}>{service.service_name}</span>
              <span style={{ ...DM, fontSize: 11, color: '#71717a' }}>{service.packages.length} package{service.packages.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
            <X size={14} style={{ color: '#71717a' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {service.description && (
            <div>
              <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Description</div>
              <p style={{ ...DM, fontSize: 13, color: '#3f3f46', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{service.description}</p>
            </div>
          )}

          {service.image_urls && service.image_urls.length > 0 && (
            <div>
              <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Images</div>
              <div className="grid grid-cols-3 gap-2">
                {service.image_urls.map((url, index) => (
                  <img
                    key={index}
                    src={url.startsWith('https://') ? url : `https://${url}`}
                    alt={`${service.service_name} ${index + 1}`}
                    style={{ width: '100%', height: 96, objectFit: 'cover', borderRadius: 10, border: '1px solid #ebebeb' }}
                  />
                ))}
              </div>
            </div>
          )}

          {service.service_links && service.service_links.length > 0 && (
            <div>
              <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Service Links</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {service.service_links.map((link, index) => {
                  let displayLink = link;
                  try {
                    const url = new URL(link);
                    displayLink = url.hostname + (url.pathname !== '/' ? url.pathname : '');
                    if (displayLink.length > 30) {
                      displayLink = displayLink.substring(0, 27) + '...';
                    }
                  } catch (e) {
                    // Fallback to raw string
                  }
                  return (
                    <a
                      key={index}
                      href={link.startsWith('http') ? link : `https://${link}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        background: 'rgba(34,197,94,0.08)',
                        border: '1px solid rgba(34,197,94,0.15)',
                        borderRadius: 20,
                        ...DM,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#059669',
                        textDecoration: 'none',
                        transition: 'background-color 0.15s, border-color 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.15)';
                        e.currentTarget.style.borderColor = 'rgba(34,197,94,0.3)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.08)';
                        e.currentTarget.style.borderColor = 'rgba(34,197,94,0.15)';
                      }}
                    >
                      <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {displayLink}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div style={{ ...DM, fontSize: 11, fontWeight: 600, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Packages</div>
            {service.packages.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {service.packages.map((pkg: Package) => (
                  <div key={pkg.id} style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: pkg.description ? 8 : 0 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ ...DM, fontSize: 13, fontWeight: 600, color: '#0c1a0e' }}>{pkg.package_name}</span>
                        {pkg.discount && pkg.discount > 0 && (
                          <span style={{ marginLeft: 8, ...DM, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: 'rgba(34,197,94,0.1)', color: '#059669' }}>
                            {pkg.discount}% off
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                        <span style={{ ...SYNE, fontSize: 16, fontWeight: 700, color: '#059669' }}>{pkg.currency} {pkg.price.toFixed(2)}</span>
                      </div>
                    </div>
                    {pkg.description && (
                      <p style={{ ...DM, fontSize: 12, color: '#71717a', whiteSpace: 'pre-wrap', margin: 0 }}>{pkg.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ ...DM, fontSize: 13, color: '#a1a1aa' }}>No packages available.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '14px 24px', borderTop: '1px solid #ebebeb' }}>
          <button onClick={onClose} style={{ width: '100%', background: 'rgba(0,0,0,0.06)', color: '#3f3f46', border: 'none', borderRadius: 10, padding: '11px 20px', ...DM, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewServiceModal;
