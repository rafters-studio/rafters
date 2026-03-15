/**
 * OKLCH color picker with 2D lightness/chroma area, hue bar, numeric inputs, and preview
 *
 * @cognitive-load 5/10 - Multi-surface color selection with visual feedback
 * @attention-economics Spatial color: area for L/C, bar for hue, inputs for precision, preview for confirmation
 * @trust-building Immediate visual feedback, gamut tier indicator, precise numeric entry
 * @accessibility Full keyboard navigation, screen reader support, gamut tier announcements
 * @semantic-meaning Color selection: design tools, theming, customization
 *
 * @usage-patterns
 * DO: Show gamut tier to indicate color reproducibility
 * DO: Provide numeric inputs for precise color entry
 * DO: Give immediate visual feedback on color changes
 * DO: Support both pointer and keyboard interaction
 * NEVER: Hide the preview swatch, disable keyboard navigation, ignore gamut boundaries
 *
 * @example
 * ```tsx
 * <ColorPicker
 *   defaultValue={{ l: 0.7, c: 0.15, h: 250 }}
 *   onValueChange={(color) => console.log(color)}
 * />
 * ```
 */
import * as React from 'react';
import classy from '../../primitives/classy';
import type { ColorPickerStateControls } from '../../primitives/color-picker';
import { createColorPickerState, getGamutTier } from '../../primitives/color-picker';
import { barPosFromHue } from '../../primitives/oklch-gamut';
import type { Direction, GamutTier, OklchColor } from '../../primitives/types';

export interface ColorPickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** Controlled OKLCH color value */
  value?: OklchColor;
  /** Default color for uncontrolled usage */
  defaultValue?: OklchColor;
  /** Called on every color change (pointer move, keyboard, input) */
  onValueChange?: (color: OklchColor) => void;
  /** Called when a change is committed (pointer up, input blur/Enter) */
  onValueCommit?: (color: OklchColor) => void;
  /** Maximum chroma for the area y-axis @default 0.4 */
  maxChroma?: number;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Text direction for RTL support */
  dir?: Direction;
}

const DEFAULT_COLOR: OklchColor = { l: 0.7, c: 0.15, h: 250 };

const INPUT_CLASS =
  'w-full min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring';

const GAMUT_LABELS: Record<GamutTier, string> = {
  gold: 'sRGB',
  silver: 'P3',
  fail: 'Out of gamut',
};

function colorChanged(a: OklchColor | undefined, b: OklchColor | undefined): boolean {
  return a?.l !== b?.l || a?.c !== b?.c || a?.h !== b?.h;
}

export const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue = DEFAULT_COLOR,
      onValueChange,
      onValueCommit,
      maxChroma = 0.4,
      disabled = false,
      dir,
      ...props
    },
    ref,
  ) => {
    const safeMaxChroma = Math.max(maxChroma, 1e-6);
    const areaCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const areaContainerRef = React.useRef<HTMLDivElement>(null);
    const hueCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const hueContainerRef = React.useRef<HTMLDivElement>(null);
    const lInputRef = React.useRef<HTMLInputElement>(null);
    const cInputRef = React.useRef<HTMLInputElement>(null);
    const hInputRef = React.useRef<HTMLInputElement>(null);
    const areaThumbRef = React.useRef<HTMLDivElement>(null);
    const hueThumbRef = React.useRef<HTMLDivElement>(null);
    const previewRef = React.useRef<HTMLDivElement>(null);

    const callbacksRef = React.useRef({ onValueChange, onValueCommit });
    callbacksRef.current = { onValueChange, onValueCommit };

    const lastColorRef = React.useRef(controlledValue ?? defaultValue);
    const [pickerState, setPickerState] = React.useState<ColorPickerStateControls | null>(null);

    React.useEffect(() => {
      const ac = areaCanvasRef.current;
      const aCtr = areaContainerRef.current;
      const hc = hueCanvasRef.current;
      const hCtr = hueContainerRef.current;
      const lI = lInputRef.current;
      const cI = cInputRef.current;
      const hI = hInputRef.current;
      const at = areaThumbRef.current;
      const ht = hueThumbRef.current;
      const pv = previewRef.current;
      if (!ac || !aCtr || !hc || !hCtr || !lI || !cI || !hI || !at || !ht || !pv) return;

      const state = createColorPickerState({
        areaCanvas: ac,
        areaContainer: aCtr,
        hueCanvas: hc,
        hueContainer: hCtr,
        inputs: { l: lI, c: cI, h: hI },
        preview: pv,
        areaThumb: at,
        hueThumb: ht,
        initialColor: lastColorRef.current,
        maxChroma: safeMaxChroma,
        disabled,
        ...(dir !== undefined ? { dir } : {}),
        onColorChange: (c) => callbacksRef.current.onValueChange?.(c),
        onColorCommit: (c) => callbacksRef.current.onValueCommit?.(c),
      });

      hCtr.setAttribute('aria-valuemin', '0');
      hCtr.setAttribute('aria-valuemax', '360');
      hCtr.setAttribute('aria-valuenow', String(Math.round(lastColorRef.current.h)));
      hCtr.setAttribute('aria-label', 'Hue');
      aCtr.setAttribute('aria-label', 'Lightness and chroma');

      setPickerState(state);
      return () => {
        lastColorRef.current = state.$color.get();
        state.destroy();
        setPickerState(null);
      };
    }, [disabled, dir, safeMaxChroma]);

    const subscribe = React.useCallback(
      (cb: () => void) => (pickerState ? pickerState.$color.listen(cb) : () => {}),
      [pickerState],
    );
    const atomColor = React.useSyncExternalStore(
      subscribe,
      () => pickerState?.$color.get() ?? lastColorRef.current,
      () => lastColorRef.current,
    );

    const isControlled = controlledValue !== undefined;
    const color = isControlled ? controlledValue : atomColor;

    const prevControlledRef = React.useRef(controlledValue);
    if (isControlled && pickerState && colorChanged(controlledValue, prevControlledRef.current)) {
      pickerState.pushColor(controlledValue);
    }
    prevControlledRef.current = controlledValue;

    React.useEffect(() => {
      hueContainerRef.current?.setAttribute('aria-valuenow', String(Math.round(color.h)));
    }, [color.h]);

    const gamutTier = getGamutTier(color.l, color.c, color.h);

    return (
      // biome-ignore lint/a11y/useSemanticElements: fieldset adds unwanted default styling; role="group" on div is standard for composite widgets
      <div
        ref={ref}
        role="group"
        aria-label="Color picker"
        aria-disabled={disabled || undefined}
        className={classy(
          'flex w-full flex-col',
          { 'opacity-50 pointer-events-none': disabled },
          className,
        )}
        {...props}
      >
        {/* Color area (2D: lightness x chroma) */}
        <div
          ref={areaContainerRef}
          className="relative aspect-square w-full cursor-crosshair overflow-hidden rounded-lg"
        >
          <canvas ref={areaCanvasRef} className="absolute inset-0 h-full w-full" />
          <div
            ref={areaThumbRef}
            aria-hidden="true"
            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{
              left: `${color.l * 100}%`,
              top: `${(1 - color.c / safeMaxChroma) * 100}%`,
            }}
          />
        </div>

        {/* Hue bar (1D: hue spectrum) */}
        <div
          ref={hueContainerRef}
          className="relative mt-3 h-4 w-full cursor-pointer overflow-hidden rounded-full"
        >
          <canvas ref={hueCanvasRef} className="absolute inset-0 h-full w-full" />
          <div
            ref={hueThumbRef}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{ left: `${barPosFromHue(color.h) * 100}%` }}
          />
        </div>

        {/* Numeric inputs */}
        <div className="mt-3 flex gap-2">
          <input ref={lInputRef} className={INPUT_CLASS} disabled={disabled} />
          <input ref={cInputRef} className={INPUT_CLASS} disabled={disabled} />
          <input ref={hInputRef} className={INPUT_CLASS} disabled={disabled} />
        </div>

        {/* Preview swatch */}
        <div className="mt-3 flex items-center gap-2">
          <div
            ref={previewRef}
            className="h-8 w-8 rounded-md border border-border"
            data-gamut-tier={gamutTier}
          />
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            {GAMUT_LABELS[gamutTier]}
          </span>
        </div>
      </div>
    );
  },
);

ColorPicker.displayName = 'ColorPicker';

export default ColorPicker;
