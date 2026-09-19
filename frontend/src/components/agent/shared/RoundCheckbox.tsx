import React, { forwardRef, useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';

export interface RoundCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  checked?: boolean;
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'forest' | 'lime';
  wrapperClassName?: string;
}

export const RoundCheckbox = forwardRef<HTMLInputElement, RoundCheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      onChange,
      disabled = false,
      size = 'md',
      variant = 'forest',
      className = '',
      wrapperClassName = '',
      title,
      'aria-label': ariaLabel,
      ...rest
    },
    forwardedRef
  ) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const resolvedRef = (forwardedRef || innerRef) as React.RefObject<HTMLInputElement>;

    useEffect(() => {
      if (resolvedRef && 'current' in resolvedRef && resolvedRef.current) {
        resolvedRef.current.indeterminate = !!indeterminate;
      }
    }, [indeterminate, resolvedRef]);

    const isSelected = checked && !indeterminate;
    const isIndet = indeterminate;

    // Size dimensions:
    // sm: 16px (w-4 h-4), md: 18px (w-[18px] h-[18px]), lg: 20px (w-5 h-5)
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-[18px] h-[18px]',
      lg: 'w-5 h-5',
    }[size];

    const iconSize = {
      sm: 10,
      md: 11,
      lg: 13,
    }[size];

    // Variant styling when active:
    // Forest dark surface with signature vibrant lime check (default, high-contrast)
    // or Lime surface with forest dark check
    const activeClasses =
      variant === 'lime'
        ? 'bg-[#9FE870] border-[#8CE05A] text-[#16281D]'
        : 'bg-[#16281D] border-[#16281D] text-[#9FE870]';

    return (
      <label
        className={`inline-flex items-center justify-center cursor-pointer select-none relative shrink-0 ${
          disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
        } ${wrapperClassName}`}
        title={title}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={forwardedRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          aria-label={ariaLabel}
          className="sr-only peer"
          {...rest}
        />
        <div
          className={`
            ${sizeClasses}
            rounded-full
            flex items-center justify-center
            transition-all duration-150 ease-out
            border
            peer-focus-visible:ring-2 peer-focus-visible:ring-[#9FE870] peer-focus-visible:ring-offset-1
            ${
              isSelected || isIndet
                ? `${activeClasses} shadow-2xs scale-100`
                : 'bg-white border-[#D4D4D8] hover:border-[#16281D] hover:bg-[#F4F7F4]'
            }
            ${className}
          `}
        >
          {isSelected && (
            <Check size={iconSize} strokeWidth={3} className="animate-in zoom-in-75 duration-100" />
          )}
          {isIndet && (
            <Minus size={iconSize} strokeWidth={3.5} className="animate-in zoom-in-75 duration-100" />
          )}
        </div>
      </label>
    );
  }
);

RoundCheckbox.displayName = 'RoundCheckbox';

export default RoundCheckbox;
