import React from 'react';

// Shared skeleton shimmer style using standard inline CSS or Tailwind pulse classes.
// We'll define a custom CSS animation block injected globally.
const injectShimmerStyle = () => {
  if (typeof document === 'undefined') return null;
  const styleId = 'skeleton-shimmer-styles';
  if (document.getElementById(styleId)) return null;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes skeleton-shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }
    .skeleton-shimmer {
      background: linear-gradient(90deg, #f4f4f5 25%, #e4e4e7 37%, #f4f4f5 63%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.4s ease-in-out infinite;
    }
    .skeleton-shimmer-dark {
      background: linear-gradient(90deg, #18181b 25%, #27272a 37%, #18181b 63%);
      background-size: 200% 100%;
      animation: skeleton-shimmer 1.4s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
  return null;
};

// Main skeleton base element
export const SkeletonBase: React.FC<{
  className?: string;
  style?: React.CSSProperties;
  dark?: boolean;
}> = ({ className = '', style = {}, dark = false }) => {
  injectShimmerStyle();
  return (
    <div
      className={`${dark ? 'skeleton-shimmer-dark' : 'skeleton-shimmer'} ${className}`}
      style={{
        borderRadius: '8px',
        width: '100%',
        height: '100%',
        minHeight: '1em',
        ...style
      }}
    />
  );
};

// Skeleton welcome banner
export const SkeletonBanner: React.FC = () => {
  return (
    <div
      style={{
        background: '#0c1a0e',
        borderRadius: '16px',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ flex: 1, minWidth: '200px' }}>
        <SkeletonBase dark style={{ width: '150px', height: '14px', marginBottom: '8px', borderRadius: '4px' }} />
        <SkeletonBase dark style={{ width: '280px', height: '24px', marginBottom: '8px', borderRadius: '6px' }} />
        <SkeletonBase dark style={{ width: '400px', height: '14px', borderRadius: '4px' }} />
      </div>
      <div style={{ width: '120px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        <SkeletonBase dark style={{ width: '100px', height: '22px', borderRadius: '4px' }} />
        <SkeletonBase dark style={{ width: '80px', height: '12px', borderRadius: '4px' }} />
      </div>
    </div>
  );
};

// Skeleton metric card
export const SkeletonMetricCard: React.FC = () => {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '14px',
        padding: '20px 22px',
        border: '1px solid #ebebeb',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        height: '146px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <SkeletonBase style={{ width: '38px', height: '38px', borderRadius: '10px' }} />
        <SkeletonBase style={{ width: '60px', height: '22px', borderRadius: '9999px' }} />
      </div>
      <SkeletonBase style={{ width: '80px', height: '28px', marginBottom: '6px', borderRadius: '6px' }} />
      <SkeletonBase style={{ width: '120px', height: '14px', marginBottom: '4px', borderRadius: '4px' }} />
      <SkeletonBase style={{ width: '160px', height: '11px', borderRadius: '4px' }} />
    </div>
  );
};

// Skeleton activities card
export const SkeletonActivityCard: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '14px',
        border: '1px solid #ebebeb',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SkeletonBase style={{ width: '30px', height: '30px', borderRadius: '8px' }} />
        <div>
          <SkeletonBase style={{ width: '120px', height: '14px', marginBottom: '4px', borderRadius: '4px' }} />
          <SkeletonBase style={{ width: '60px', height: '11px', borderRadius: '4px' }} />
        </div>
      </div>
      <div>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              padding: '14px 22px',
              borderBottom: i < count - 1 ? '1px solid #f9f9f9' : 'none',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}
          >
            <SkeletonBase style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <SkeletonBase style={{ width: '100px', height: '13px', borderRadius: '4px' }} />
                <SkeletonBase style={{ width: '50px', height: '14px', borderRadius: '9999px' }} />
              </div>
              <SkeletonBase style={{ width: '220px', height: '12px', marginBottom: '4px', borderRadius: '4px' }} />
              <SkeletonBase style={{ width: '60px', height: '10px', borderRadius: '4px' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton quick actions card
export const SkeletonQuickActionsCard: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '14px',
        border: '1px solid #ebebeb',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ padding: '18px 22px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SkeletonBase style={{ width: '30px', height: '30px', borderRadius: '8px' }} />
        <div>
          <SkeletonBase style={{ width: '100px', height: '14px', marginBottom: '4px', borderRadius: '4px' }} />
          <SkeletonBase style={{ width: '70px', height: '11px', borderRadius: '4px' }} />
        </div>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px' }}>
            <SkeletonBase style={{ width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <SkeletonBase style={{ width: '130px', height: '13px', marginBottom: '4px', borderRadius: '4px' }} />
              <SkeletonBase style={{ width: '100px', height: '10px', borderRadius: '4px' }} />
            </div>
            <SkeletonBase style={{ width: '12px', height: '12px', borderRadius: '2px' }} />
          </div>
        ))}
      </div>
    </div>
  );
};

// Skeleton row for tables (customers, orders, inventory, services)
export const SkeletonRow: React.FC<{ columnsCount?: number }> = ({ columnsCount = 5 }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid #f4f4f5',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {Array.from({ length: columnsCount }).map((_, idx) => (
        <div key={idx} style={{ flex: 1, paddingRight: '16px' }}>
          <SkeletonBase
            style={{
              width: idx === 0 ? '70%' : idx === columnsCount - 1 ? '40%' : '85%',
              height: '14px',
              borderRadius: '4px'
            }}
          />
        </div>
      ))}
    </div>
  );
};

// Skeleton page layout for standard grids
export const SkeletonPage: React.FC<{ type?: 'dashboard' | 'list' | 'analytics' }> = ({ type = 'list' }) => {
  if (type === 'dashboard') {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <SkeletonBanner />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SkeletonMetricCard />
          <SkeletonMetricCard />
          <SkeletonMetricCard />
          <SkeletonMetricCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <SkeletonActivityCard />
          </div>
          <SkeletonQuickActionsCard />
        </div>
      </div>
    );
  }

  if (type === 'analytics') {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SkeletonMetricCard />
          <SkeletonMetricCard />
          <SkeletonMetricCard />
          <SkeletonMetricCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '14px', padding: '20px', height: '320px' }}>
            <SkeletonBase style={{ width: '150px', height: '16px', marginBottom: '24px', borderRadius: '4px' }} />
            <SkeletonBase style={{ height: '240px', borderRadius: '8px' }} />
          </div>
          <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '14px', padding: '20px', height: '320px' }}>
            <SkeletonBase style={{ width: '130px', height: '16px', marginBottom: '24px', borderRadius: '4px' }} />
            <SkeletonBase style={{ height: '240px', borderRadius: '8px' }} />
          </div>
        </div>
      </div>
    );
  }

  // Default 'list' skeleton layout (e.g. customers, orders, inventory, services)
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <SkeletonBase style={{ width: '180px', height: '24px', marginBottom: '6px', borderRadius: '6px' }} />
          <SkeletonBase style={{ width: '280px', height: '14px', borderRadius: '4px' }} />
        </div>
        <SkeletonBase style={{ width: '120px', height: '38px', borderRadius: '9999px' }} />
      </div>
      <div style={{ background: '#fff', border: '1px solid #ebebeb', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', gap: '16px' }}>
          <SkeletonBase style={{ width: '250px', height: '36px', borderRadius: '8px' }} />
          <SkeletonBase style={{ width: '120px', height: '36px', borderRadius: '8px' }} />
        </div>
        <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #ebebeb', background: '#fafafa' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ flex: 1 }}>
              <SkeletonBase style={{ width: '80px', height: '12px', borderRadius: '3px' }} />
            </div>
          ))}
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
};

// Skeleton conversation left list panel
export const SkeletonConversationList: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', height: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderBottom: '1px solid #f4f4f5'
          }}
        >
          <SkeletonBase style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <SkeletonBase style={{ width: '90px', height: '13px', borderRadius: '4px' }} />
              <SkeletonBase style={{ width: '30px', height: '10px', borderRadius: '3px' }} />
            </div>
            <SkeletonBase style={{ width: '180px', height: '11px', borderRadius: '3px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

// Skeleton messages chat panel
export const SkeletonMessages: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', height: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => {
        const isOutgoing = i % 2 !== 0; // Alternates left/right
        const widths = ['60%', '40%', '75%', '30%', '50%'];
        const width = widths[i % widths.length];
        
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
              width: '100%'
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isOutgoing ? 'flex-end' : 'flex-start',
                width: width,
                maxWidth: '80%',
                gap: '6px'
              }}
            >
              {/* Message bubble */}
              <div
                style={{
                  background: isOutgoing ? 'rgba(34,197,94,0.06)' : '#fff',
                  border: isOutgoing ? '1px solid rgba(34,197,94,0.15)' : '1px solid #ebebeb',
                  borderRadius: isOutgoing ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '12px 14px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <SkeletonBase style={{ height: '12px', borderRadius: '4px', width: '85%', marginBottom: '6px' }} />
                {i % 3 === 0 && <SkeletonBase style={{ height: '12px', borderRadius: '4px', width: '60%', marginBottom: '6px' }} />}
                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                  <SkeletonBase style={{ height: '8px', borderRadius: '2px', width: '30px' }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
