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

// Enter: motion-dropdown-in (slower). Exit: motion-dropdown-out (faster).
// Fade from/to declared here; the token carries property/duration/easing.
// starting:opacity-0 emits @starting-style so the enter transition fires on
// mount (no previous computed value without it).
const baseRootClasses =
  'flex w-full flex-col ' +
  'motion-dropdown-in motion-dropdown-out ' +
  'opacity-0 data-[state=open]:opacity-100 ' +
  'starting:opacity-0 ' +
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
