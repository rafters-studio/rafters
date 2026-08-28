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
import { createBehavior, type PartIds } from '@/lib/contract';
import { useMemory } from '@/hooks/use-memory';
import classy from '@/lib/primitives/classy';
import {
  composeSliderInteractions,
  effectiveValues,
  focusedThumbIndex,
  percentFor,
  sliderBehavior,
  sliderFormValue,
  sliderThumbAria,
  type SliderConfig,
  type SliderOrientation,
  type SliderPart,
  type SliderSize,
  type SliderVariant,
} from '@/components/ui/slider.behavior';
import { sliderClasses } from '@/components/ui/slider.classes';

export { sliderVariants } from '@/components/ui/slider.classes';
export type { SliderSize, SliderVariant, SliderOrientation };

/**
 * Slider -- the React performance of the slider score. The shadcn Slider
 * surface: an array-valued `value`/`defaultValue` (a two-element array is a
 * range with two thumbs), `onValueChange`, `min`/`max`/`step`, `orientation`,
 * plus the rafters `variant`/`size` extensions.
 *
 * Thin by construction: the score owns the value math and projections, so the
 * controller wires memory + classes and composes the ONE pointer/keyboard
 * surface (`composeSliderInteractions`) in an effect -- the same composition the
 * WC/Astro bind runs. The value/name props ride the form-value axis into the
 * hidden inputs the score projects.
 *
 * @cognitive-load 3/10 - decision 1, information 1, interaction 1, disruption 0,
 * learning 0. One continuous choice along a visible range; the thumb position
 * and any printed value are the only information to read. A universally learned
 * drag/arrow affordance, no workflow disruption, nothing to learn.
 * @attention-economics The track makes the whole range visible at a glance, so
 * the control communicates both the current value and its bounds without
 * competing for attention. Best for approximate selection within a bounded
 * range; pair with a printed value when precision matters.
 * @trust-building Immediate, reversible feedback -- the thumb tracks the pointer
 * and every arrow key in real time, and the disabled gate keeps an unavailable
 * control from moving while staying discoverable. Steps snap predictably so the
 * user is never left between valid values.
 * @accessibility Each thumb is a role="slider" with aria-valuemin/max/now and
 * aria-orientation, wired to real DOM by the harness. Arrow keys step, Page keys
 * jump by ten steps, Home/End reach the ends; every thumb is a tab stop. The
 * control has no intrinsic text, so consumers MUST supply an accessible name
 * (aria-label / aria-labelledby). Disabled removes the thumbs from the tab order
 * and gates all movement.
 */
export interface SliderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Controlled values (one element per thumb). */
  value?: number[];
  /** Uncontrolled seed for the values. */
  defaultValue?: number[];
  /** Fires on every committed move with the values the consumer should adopt. */
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  orientation?: SliderOrientation;
  disabled?: boolean;
  variant?: SliderVariant;
  size?: SliderSize;
  /** Form-value axis: the field name each thumb's value submits under. */
  name?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>((props, ref) => {
  const {
    className,
    value,
    defaultValue = [0],
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    orientation = 'horizontal',
    disabled = false,
    variant = 'default',
    size = 'default',
    name,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    ...rest
  } = props;

  const config: SliderConfig = {
    variant,
    size,
    min,
    max,
    step,
    orientation,
    value,
    defaultValue,
    disabled,
    name,
  };

  const { memory, dispatch } = React.useMemo(() => createBehavior(sliderBehavior, config), []);
  const state = useMemory(memory);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const setRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  // Gotcha #1: report the value the consumer should adopt, computed from the
  // EFFECTIVE values before (a controlled slider's effective value never moves)
  // with the moved thumb applied and the range re-sorted -- never intrinsic.
  const latest = React.useRef({ config, onValueChange });
  latest.current = { config, onValueChange };
  const request = React.useCallback(
    (index: number, next: number): number => {
      const { config: cfg, onValueChange: cb } = latest.current;
      const current = effectiveValues(memory.get(), cfg);
      const proposed = [...current];
      proposed[index] = next;
      if (proposed.length > 1) proposed.sort((a, b) => a - b);
      if (!dispatch('setThumb', cfg, { index, value: next })) return index;
      cb?.(proposed);
      const landed = proposed.indexOf(next);
      return landed === -1 ? index : landed;
    },
    [memory, dispatch],
  );

  // Compose the ONE pointer/keyboard surface -- the same composition the bind
  // runs. Re-created only when orientation/disabled change (interactive fixes
  // its mode at create; min/max/step are read live via getConfig).
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return composeSliderInteractions({
      root,
      getConfig: () => latest.current.config,
      getValues: () => effectiveValues(memory.get(), latest.current.config),
      getFocusedIndex: () => focusedThumbIndex(root),
      request,
      setDragging: (on) => {
        if (on) root.setAttribute('data-dragging', 'true');
        else root.removeAttribute('data-dragging');
      },
    });
  }, [orientation, disabled, request, memory]);

  const uid = React.useId();
  const ids = {} as PartIds<SliderPart>;
  for (const part of Object.keys(sliderBehavior.parts) as SliderPart[])
    ids[part] = `${uid}-${part}`;
  const aria = sliderBehavior.aria(state, config, ids);
  const classes = sliderClasses(config, state);

  const values = effectiveValues(state, config);
  const isHorizontal = orientation === 'horizontal';
  const low = Math.min(...values);
  const high = Math.max(...values);
  const rangeStart = values.length > 1 ? percentFor(low, config) : 0;
  const rangeEnd = percentFor(high, config);
  const rangeStyle: React.CSSProperties = isHorizontal
    ? { left: `${rangeStart}%`, right: `${100 - rangeEnd}%`, top: 0, bottom: 0 }
    : { bottom: `${rangeStart}%`, top: `${100 - rangeEnd}%`, left: 0, right: 0 };

  // Decorative structure (track/range) and the thumbs are built with
  // createElement so the class strings stay plain composition, the same escape
  // switch uses for its thumb -- these carry no typography role.
  const range = React.createElement('span', {
    'data-part': 'range',
    className: classes.range,
    style: rangeStyle,
    ...aria.range,
  });
  const track = React.createElement(
    'span',
    { 'data-part': 'track', id: ids.track, className: classes.track, ...aria.track },
    range,
  );

  const thumbs = values.map((thumbValue, index) => {
    const pct = percentFor(thumbValue, config);
    const thumbStyle: React.CSSProperties = isHorizontal
      ? { left: `${pct}%`, top: '50%', transform: 'translate(-50%, -50%)' }
      : { bottom: `${pct}%`, left: '50%', transform: 'translate(-50%, 50%)' };
    return React.createElement('span', {
      key: index,
      role: 'slider',
      'data-part': 'thumb',
      'data-index': index,
      'data-value': thumbValue,
      tabIndex: disabled ? -1 : 0,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      className: classes.thumb,
      style: thumbStyle,
      ...sliderThumbAria(String(thumbValue), state, config),
    });
  });

  const inputs = sliderFormValue(state, config).map((input, index) =>
    React.createElement('input', {
      key: index,
      type: 'hidden',
      'data-slider-input': '',
      'data-index': index,
      name: input.name,
      value: input.value,
      readOnly: true,
    }),
  );

  return (
    <div
      ref={setRef}
      data-part="root"
      id={ids.root}
      data-step={step}
      data-name={name}
      className={classy(classes.root, className)}
      {...aria.root}
      {...rest}
    >
      {track}
      {thumbs}
      {inputs}
    </div>
  );
});

Slider.displayName = 'Slider';
export default Slider;
