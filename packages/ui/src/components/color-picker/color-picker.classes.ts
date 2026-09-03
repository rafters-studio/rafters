import type { ColorPickerConfig, ColorPickerState } from './color-picker.behavior';

export interface ColorPickerClassSet {
  root: string;
  area: string;
  areaThumb: string;
  hue: string;
  hueThumb: string;
  inputs: string;
  input: string;
  preview: string;
  gamutLabel: string;
}

// ROOT / CLOSED -> OPEN -- "fade" (opacity) at duration-moderate, ease-enter.
// ROOT / OPEN -> CLOSED -- "fade" (opacity) at duration-fast, ease-exit.
//
// Both are presence changes, so both are keyframes named as one class each and
// keyed off the state that drives them. The two triples the rows assign are
// already emitted -- `animate-fade-in-moderate-enter` and
// `animate-fade-out-fast-exit` -- because the cell keys are deduplicated by the
// MOTION, not by the moment (packages/design-tokens/src/exporters/tailwind.ts):
// sharing a name with command/content or avatar/image is the mechanism working,
// not a borrowed cell.
//
// The old semantic dropdown-in / dropdown-out motion pair is gone (a
// per-component motion token is the thing the matrix replaced), and the
// unconditional `opacity-0` base went with it: it was the transition's start
// value, and with a keyframe carrying its own `from`, it would otherwise leave
// the picker permanently invisible wherever nothing sets `data-state`. Neither
// deleted utility is spelled out here -- Tailwind extracts candidates from this
// file's whole SOURCE TEXT, comments included, so naming one in prose would
// ship its rule to every consumer that installs the component.
//
// Nothing in color-picker's own sources projects `data-state`: the behavior has
// no open/closed axis, because the picker is a surface a popup opens rather than
// a popup itself. The rows are still color-picker's own (motion.jsonl, anchored
// popup, both baseline) -- the attribute comes from the composing surface, the
// same way the matrix records the cell against the part that fades.
const baseRootClasses =
  'flex w-full flex-col ' +
  'data-[state=open]:animate-fade-in-moderate-enter ' +
  'data-[state=closed]:animate-fade-out-fast-exit ' +
  'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none';

const baseAreaClasses = 'relative aspect-square w-full cursor-crosshair overflow-hidden rounded-lg';

const baseAreaThumbClasses =
  'pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 ' +
  'rounded-full border-2 border-white shadow-md';

const baseHueClasses = 'relative mt-3 h-4 w-full cursor-pointer overflow-hidden rounded-full';

const baseHueThumbClasses =
  'pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 ' +
  'rounded-full border-2 border-white shadow-md';

const baseInputsClasses = 'mt-3 flex gap-2';

const baseInputClasses =
  'w-full min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm ' +
  'motion-focus ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring';

const basePreviewClasses = 'h-8 w-8 rounded-md border border-border';

const baseGamutLabelClasses = 'text-xs text-muted-foreground';

export function colorPickerClasses(
  _config: ColorPickerConfig,
  _state?: ColorPickerState,
): ColorPickerClassSet {
  return {
    root: baseRootClasses,
    area: baseAreaClasses,
    areaThumb: baseAreaThumbClasses,
    hue: baseHueClasses,
    hueThumb: baseHueThumbClasses,
    inputs: baseInputsClasses,
    input: baseInputClasses,
    preview: basePreviewClasses,
    gamutLabel: baseGamutLabelClasses,
  };
}
