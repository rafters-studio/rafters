/**
 * OKLCH color picker with 2D lightness/chroma area, hue bar, numeric inputs,
 * and preview swatch.
 *
 * @cognitive-load 5/10 - Multi-surface color selection with visual feedback
 * @attention-economics Spatial color: area for L/C, bar for hue, inputs for precision, preview for confirmation
 * @trust-building Immediate visual feedback, gamut tier indicator, precise numeric entry
 * @accessibility Full keyboard navigation, screen reader support, gamut tier announcements
 */
import * as React from 'react';
import { createBehavior, type PartIds } from '../../lib/contract';
import { useMemory } from '../../hooks/use-memory';
import classy from '../../primitives/classy';
import {
  colorPickerBehavior,
  composeColorPickerInteractions,
  DEFAULT_COLOR,
  DEFAULT_MAX_CHROMA,
  effectiveColor,
  gamutLabel,
  getGamutTier,
  barPosFromHue,
  paintColorPicker,
  type ColorPickerConfig,
  type ColorPickerPart,
  type Direction,
  type OklchColor,
} from './color-picker.behavior';
import { colorPickerClasses } from './color-picker.classes';

export type { OklchColor, Direction };

export interface ColorPickerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'defaultValue' | 'onChange'
> {
  value?: OklchColor;
  defaultValue?: OklchColor;
  onValueChange?: (color: OklchColor) => void;
  onValueCommit?: (color: OklchColor) => void;
  maxChroma?: number;
  disabled?: boolean;
  dir?: Direction;
}

export const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>((props, ref) => {
  const {
    className,
    value,
    defaultValue = DEFAULT_COLOR,
    onValueChange,
    onValueCommit,
    maxChroma = DEFAULT_MAX_CHROMA,
    disabled = false,
    dir,
    ...rest
  } = props;

  const config: ColorPickerConfig = {
    value,
    defaultValue,
    maxChroma,
    disabled,
    ...(dir !== undefined ? { dir } : {}),
  };

  const [{ memory, dispatch }] = React.useState(() => createBehavior(colorPickerBehavior, config));
  const state = useMemory(memory);

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const areaCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const areaContainerRef = React.useRef<HTMLDivElement>(null);
  const areaThumbRef = React.useRef<HTMLDivElement>(null);
  const hueCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const hueContainerRef = React.useRef<HTMLDivElement>(null);
  const hueThumbRef = React.useRef<HTMLDivElement>(null);
  const lInputRef = React.useRef<HTMLInputElement>(null);
  const cInputRef = React.useRef<HTMLInputElement>(null);
  const hInputRef = React.useRef<HTMLInputElement>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const gamutLabelRef = React.useRef<HTMLSpanElement>(null);

  const setRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  const latest = React.useRef({ config, onValueChange, onValueCommit });
  latest.current = { config, onValueChange, onValueCommit };

  React.useEffect(() => {
    const ac = areaCanvasRef.current;
    const aCtr = areaContainerRef.current;
    const at = areaThumbRef.current;
    const hc = hueCanvasRef.current;
    const hCtr = hueContainerRef.current;
    const ht = hueThumbRef.current;
    const lI = lInputRef.current;
    const cI = cInputRef.current;
    const hI = hInputRef.current;
    const pv = previewRef.current;
    if (!ac || !aCtr || !at || !hc || !hCtr || !ht || !lI || !cI || !hI || !pv) return;

    return composeColorPickerInteractions({
      areaCanvas: ac,
      areaContainer: aCtr,
      areaThumb: at,
      hueCanvas: hc,
      hueContainer: hCtr,
      hueThumb: ht,
      inputs: { l: lI, c: cI, h: hI },
      preview: pv,
      gamutLabelEl: gamutLabelRef.current,
      getConfig: () => latest.current.config,
      getColor: () => effectiveColor(memory.get(), latest.current.config),
      request: (color) => {
        dispatch('setColor', latest.current.config, { color });
        latest.current.onValueChange?.(color);
      },
      commit: (color) => {
        dispatch('setColor', latest.current.config, { color });
        latest.current.onValueCommit?.(color);
      },
    });
  }, [disabled, dir, maxChroma, dispatch, memory]);

  // Paint on every state change
  React.useEffect(() => {
    const ac = areaCanvasRef.current;
    const at = areaThumbRef.current;
    const hc = hueCanvasRef.current;
    const ht = hueThumbRef.current;
    const lI = lInputRef.current;
    const cI = cInputRef.current;
    const hI = hInputRef.current;
    const pv = previewRef.current;
    if (!ac || !at || !hc || !ht || !lI || !cI || !hI || !pv) return;

    paintColorPicker(effectiveColor(state, config), config, {
      areaCanvas: ac,
      areaThumb: at,
      hueCanvas: hc,
      hueThumb: ht,
      inputs: { l: lI, c: cI, h: hI },
      preview: pv,
      gamutLabelEl: gamutLabelRef.current,
    });
  });

  const uid = React.useId();
  const ids = {} as PartIds<ColorPickerPart>;
  for (const part of Object.keys(colorPickerBehavior.parts) as ColorPickerPart[]) {
    ids[part] = `${uid}-${part}`;
  }
  const aria = colorPickerBehavior.aria(state, config, ids);
  const classes = colorPickerClasses(config, state);

  const color = effectiveColor(state, config);
  const safeMaxChroma = Math.max(maxChroma, 1e-6);
  const tier = getGamutTier(color.l, color.c, color.h);

  return (
    <div
      ref={setRef}
      data-part="root"
      id={ids.root}
      className={classy(classes.root, className)}
      {...aria.root}
      {...rest}
    >
      <div
        ref={areaContainerRef}
        data-part="area"
        id={ids.area}
        className={classes.area}
        {...aria.area}
      >
        <canvas ref={areaCanvasRef} className="absolute inset-0 h-full w-full" />
        <div
          ref={areaThumbRef}
          data-role="thumb"
          aria-hidden="true"
          className={classes.areaThumb}
          style={{ left: `${color.l * 100}%`, top: `${(1 - color.c / safeMaxChroma) * 100}%` }}
        />
      </div>

      <div ref={hueContainerRef} data-part="hue" id={ids.hue} className={classes.hue} {...aria.hue}>
        <canvas ref={hueCanvasRef} className="absolute inset-0 h-full w-full" />
        <div
          ref={hueThumbRef}
          data-role="thumb"
          aria-hidden="true"
          className={classes.hueThumb}
          style={{ left: `${barPosFromHue(color.h) * 100}%` }}
        />
      </div>

      <div className={classes.inputs}>
        <input ref={lInputRef} data-channel="l" className={classes.input} disabled={disabled} />
        <input ref={cInputRef} data-channel="c" className={classes.input} disabled={disabled} />
        <input ref={hInputRef} data-channel="h" className={classes.input} disabled={disabled} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div
          ref={previewRef}
          data-part="preview"
          id={ids.preview}
          className={classes.preview}
          {...aria.preview}
        />
        <span
          ref={gamutLabelRef}
          data-part="gamut-label"
          className={classes.gamutLabel}
          aria-hidden="true"
        >
          {gamutLabel(tier)}
        </span>
      </div>
    </div>
  );
});

ColorPicker.displayName = 'ColorPicker';
export default ColorPicker;
