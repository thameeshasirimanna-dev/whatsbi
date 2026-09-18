import React from 'react';
import { LucideIcon, Search, Plus } from 'lucide-react';

export interface EmptyTableStateProps {
  isFiltered?: boolean;
  filteredTitle?: string;
  filteredMessage?: string;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyTableState: React.FC<EmptyTableStateProps> = ({
  isFiltered = false,
  filteredTitle = 'No results found',
  filteredMessage = 'No items match your current filters.',
  icon: Icon,
  title = 'No items yet',
  description = 'Get started by creating your first item.',
  actionLabel,
  onAction,
}) => {
  if (isFiltered) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#F4F7F4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <Search size={20} style={{ color: '#71717A' }} />
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#16281D',
            marginBottom: 4,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {filteredTitle}
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#71717A',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {filteredMessage}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '56px 24px', textAlign: 'center' }}>
      {Icon && (
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: '#F4F7F4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
          }}
        >
          <Icon size={22} style={{ color: '#71717A' }} />
        </div>
      )}
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#16281D',
          marginBottom: 6,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: '#71717A',
          marginBottom: onAction && actionLabel ? 20 : 0,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {description}
      </div>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          style={{
            background: '#9FE870',
            color: '#16281D',
            border: 'none',
            borderRadius: 9999,
            padding: '10px 22px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(159,232,112,0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.15s',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <Plus size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyTableState;
