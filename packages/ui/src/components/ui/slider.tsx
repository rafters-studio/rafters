/**
 * Range slider component with precise value selection and accessibility features
 *
 * @cognitive-load 3/10 - Value selection with immediate visual feedback
 * @attention-economics Value communication: visual track, precise labels, immediate feedback
 * @trust-building Immediate visual feedback, undo capability, clear value indication
 * @accessibility Keyboard increment/decrement, screen reader value announcements, touch-friendly handles
 * @semantic-meaning Range contexts: settings=configuration, filters=data selection, controls=media/volume
 *
 * @usage-patterns
 * DO: Show current value and units for clarity
 * DO: Use large thumb size for mobile and accessibility
 * DO: Provide visual markers for discrete value ranges
 * DO: Give immediate feedback with real-time updates
 * NEVER: Invisible ranges, unclear min/max values, tiny touch targets
 *
 * @example
 * ```tsx
 * // Basic slider
 * <Slider defaultValue={[50]} max={100} step={1} />
 *
 * // Range slider with multiple handles
 * <Slider defaultValue={[25, 75]} max={100} step={5} />
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import {
  sliderContainerBaseClasses,
  sliderRangeBaseClasses,
  sliderSizeClasses,
  sliderThumbBaseClasses,
  sliderThumbInteractionClasses,
  sliderTrackBaseClasses,
  sliderVariantClasses,
} from './slider.classes';

export interface SliderProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Controlled value (array of numbers for single or range) */
  value?: number[];
  /** Default value for uncontrolled usage */
  defaultValue?: number[];
  /** Callback when value changes */
  onValueChange?: (value: number[]) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Orientation of the slider */
  orientation?: 'horizontal' | 'vertical';
  /** Visual variant per docs/COMPONENT_STYLING_REFERENCE.md */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'accent';
  /** Size variant */
  size?: 'sm' | 'default' | 'lg';
}

// Re-export variant and size classes from shared file
const variantClasses = sliderVariantClasses;
const sizeClassMap = sliderSizeClasses;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function snapToStep(value: number, min: number, step: number): number {
  const steps = Math.round((value - min) / step);
  return min + steps * step;
}

function getPercentage(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue = [0],
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      orientation = 'horizontal',
      variant = 'default',
      size = 'default',
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      'aria-describedby': ariaDescribedby,
      ...props
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const values = isControlled ? controlledValue : uncontrolledValue;

    const trackRef = React.useRef<HTMLDivElement>(null);
    const draggingThumbIndex = React.useRef<number | null>(null);

    const updateValue = React.useCallback(
      (newValues: number[]) => {
        if (!isControlled) {
          setUncontrolledValue(newValues);
        }
        onValueChange?.(newValues);
      },
      [isControlled, onValueChange],
    );

    const getValueFromPosition = React.useCallback(
      (clientX: number, clientY: number): number => {
        const track = trackRef.current;
        if (!track) return min;

        const rect = track.getBoundingClientRect();
        let percentage: number;

        if (orientation === 'vertical') {
          // For vertical, top is max, bottom is min
          percentage = 1 - (clientY - rect.top) / rect.height;
        } else {
          percentage = (clientX - rect.left) / rect.width;
        }

        percentage = clamp(percentage, 0, 1);
        const rawValue = min + percentage * (max - min);
        const snappedValue = snapToStep(rawValue, min, step);
        return clamp(snappedValue, min, max);
      },
      [min, max, step, orientation],
    );

    const findClosestThumbIndex = React.useCallback(
      (newValue: number): number => {
        if (values.length === 1) return 0;

        let closestIndex = 0;
        const firstValue = values[0];
        let minDistance = firstValue !== undefined ? Math.abs(firstValue - newValue) : Infinity;

        for (let i = 1; i < values.length; i++) {
          const currentVal = values[i];
          if (currentVal === undefined) continue;
          const distance = Math.abs(currentVal - newValue);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        }

        return closestIndex;
      },
      [values],
    );

    const handleTrackClick = React.useCallback(
      (event: React.PointerEvent<HTMLDivElement>) => {
        if (disabled) return;

        const newValue = getValueFromPosition(event.clientX, event.clientY);
        const thumbIndex = findClosestThumbIndex(newValue);

        const newValues = [...values];
        newValues[thumbIndex] = newValue;

        // Keep values sorted for range sliders
        if (values.length > 1) {
          newValues.sort((a, b) => a - b);
        }

        updateValue(newValues);
      },
      [disabled, getValueFromPosition, findClosestThumbIndex, values, updateValue],
    );

    const handleThumbPointerDown = React.useCallback(
      (event: React.PointerEvent<HTMLSpanElement>, thumbIndex: number) => {
        if (disabled) return;

        event.preventDefault();
        event.stopPropagation();
        draggingThumbIndex.current = thumbIndex;

        const target = event.currentTarget;
        target.setPointerCapture(event.pointerId);
      },
      [disabled],
    );

    const handlePointerMove = React.useCallback(
      (event: React.PointerEvent<HTMLSpanElement>) => {
        if (draggingThumbIndex.current === null || disabled) return;

        const newValue = getValueFromPosition(event.clientX, event.clientY);
        const thumbIndex = draggingThumbIndex.current;

        const newValues = [...values];
        newValues[thumbIndex] = newValue;

        // Keep values sorted for range sliders
        if (values.length > 1) {
          newValues.sort((a, b) => a - b);
          // Update dragging index if values swapped
          const newIndex = newValues.indexOf(newValue);
          if (newIndex !== thumbIndex) {
            draggingThumbIndex.current = newIndex;
          }
        }

        updateValue(newValues);
      },
      [disabled, getValueFromPosition, values, updateValue],
    );

    const handlePointerUp = React.useCallback((event: React.PointerEvent<HTMLSpanElement>) => {
      if (draggingThumbIndex.current !== null) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        draggingThumbIndex.current = null;
      }
    }, []);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLSpanElement>, thumbIndex: number) => {
        if (disabled) return;

        const currentValue = values[thumbIndex];
        if (currentValue === undefined) return;

        let newValue: number | null = null;
        const largeStep = step * 10;

        switch (event.key) {
          case 'ArrowRight':
          case 'ArrowUp':
            event.preventDefault();
            newValue = clamp(currentValue + step, min, max);
            break;
          case 'ArrowLeft':
          case 'ArrowDown':
            event.preventDefault();
            newValue = clamp(currentValue - step, min, max);
            break;
          case 'PageUp':
            event.preventDefault();
            newValue = clamp(currentValue + largeStep, min, max);
            break;
          case 'PageDown':
            event.preventDefault();
            newValue = clamp(currentValue - largeStep, min, max);
            break;
          case 'Home':
            event.preventDefault();
            newValue = min;
            break;
          case 'End':
            event.preventDefault();
            newValue = max;
            break;
        }

        if (newValue !== null && newValue !== currentValue) {
          const newValues = [...values];
          newValues[thumbIndex] = newValue;

          // Keep values sorted for range sliders
          if (values.length > 1) {
            newValues.sort((a, b) => a - b);
          }

          updateValue(newValues);
        }
      },
      [disabled, values, step, min, max, updateValue],
    );

    // Calculate range position
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const rangeStart = getPercentage(minValue, min, max);
    const rangeEnd = getPercentage(maxValue, min, max);

    const isHorizontal = orientation === 'horizontal';

    // Get variant and size classes with explicit defaults
    const v = variantClasses[variant] ?? variantClasses.default;
    const s = sizeClassMap[size] ?? { track: 'h-2', thumb: 'h-5 w-5' };

    const containerClasses = classy(
      sliderContainerBaseClasses,
      {
        'w-full': isHorizontal,
        'h-full flex-col': !isHorizontal,
        'opacity-50 pointer-events-none': disabled,
      },
      className,
    );

    const trackClasses = classy(sliderTrackBaseClasses, isHorizontal && s.track, {
      'w-full': isHorizontal,
      'h-full w-2': !isHorizontal,
    });

    const rangeStyle: React.CSSProperties = isHorizontal
      ? {
          left: `${rangeStart}%`,
          right: `${100 - rangeEnd}%`,
        }
      : {
          bottom: `${rangeStart}%`,
          top: `${100 - rangeEnd}%`,
        };

    return (
      <div
        ref={ref}
        className={containerClasses}
        data-orientation={orientation}
        aria-disabled={disabled ? true : undefined}
        data-disabled={disabled ? '' : undefined}
        {...props}
      >
        <div ref={trackRef} className={trackClasses} onPointerDown={handleTrackClick}>
          {/* Range indicator */}
          <div
            className={classy(sliderRangeBaseClasses, v?.range)}
            style={{
              ...rangeStyle,
              ...(isHorizontal ? { top: 0, bottom: 0 } : { left: 0, right: 0 }),
            }}
          />
        </div>

        {/* Thumbs */}
        {values.map((thumbValue, index) => {
          const percentage = getPercentage(thumbValue, min, max);
          const thumbStyle: React.CSSProperties = isHorizontal
            ? {
                left: `${percentage}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }
            : {
                bottom: `${percentage}%`,
                left: '50%',
                transform: 'translate(-50%, 50%)',
              };

          return (
            <span
              key={index}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={thumbValue}
              aria-disabled={disabled ? true : undefined}
              aria-orientation={orientation}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledby}
              aria-describedby={ariaDescribedby}
              className={classy(
                sliderThumbBaseClasses,
                s?.thumb,
                v?.thumb,
                sliderThumbInteractionClasses,
                v?.ring,
                {
                  'cursor-grab': !disabled,
                  'cursor-not-allowed': disabled,
                },
              )}
              style={thumbStyle}
              onPointerDown={(e) => handleThumbPointerDown(e, index)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onKeyDown={(e) => handleKeyDown(e, index)}
            />
          );
        })}
      </div>
    );
  },
);

Slider.displayName = 'Slider';

export default Slider;
