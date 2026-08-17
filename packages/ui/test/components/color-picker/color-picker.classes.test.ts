import { describe, expect, it } from 'vitest';
import {
  colorPickerBehavior,
  DEFAULT_MAX_CHROMA,
  type ColorPickerConfig,
} from '../../../src/components/color-picker/color-picker.behavior';
import { colorPickerClasses } from '../../../src/components/color-picker/color-picker.classes';

const base: ColorPickerConfig = {
  maxChroma: DEFAULT_MAX_CHROMA,
  disabled: false,
};

function classesFor(config: ColorPickerConfig) {
  return colorPickerClasses(config, colorPickerBehavior.initialState(config));
}

describe('color picker classes', () => {
  it('root carries the flex column shape, motion tokens, and data-disabled dimming', () => {
    const { root } = classesFor(base);
    expect(root).toContain('flex');
    expect(root).toContain('flex-col');
    expect(root).toContain('w-full');
    expect(root).toContain('motion-dropdown-in');
    expect(root).toContain('motion-dropdown-out');
    expect(root).toContain('data-[state=open]:opacity-100');
    expect(root).toContain('starting:opacity-0');
    expect(root).toContain('data-[disabled]:opacity-50');
    expect(root).toContain('data-[disabled]:pointer-events-none');
  });

  it('area carries the aspect-square crosshair surface', () => {
    const { area } = classesFor(base);
    expect(area).toContain('aspect-square');
    expect(area).toContain('cursor-crosshair');
    expect(area).toContain('overflow-hidden');
    expect(area).toContain('rounded-lg');
  });

  it('area thumb is pointer-events-none with border and shadow', () => {
    const { areaThumb } = classesFor(base);
    expect(areaThumb).toContain('pointer-events-none');
    expect(areaThumb).toContain('rounded-full');
    expect(areaThumb).toContain('border-2');
    expect(areaThumb).toContain('border-white');
    expect(areaThumb).toContain('shadow-md');
  });

  it('hue carries the bar shape with rounded-full', () => {
    const { hue } = classesFor(base);
    expect(hue).toContain('h-4');
    expect(hue).toContain('w-full');
    expect(hue).toContain('cursor-pointer');
    expect(hue).toContain('rounded-full');
  });

  it('hue thumb matches area thumb pattern', () => {
    const { hueThumb } = classesFor(base);
    expect(hueThumb).toContain('pointer-events-none');
    expect(hueThumb).toContain('rounded-full');
    expect(hueThumb).toContain('border-2');
    expect(hueThumb).toContain('border-white');
  });

  it('inputs container carries flex gap', () => {
    const { inputs } = classesFor(base);
    expect(inputs).toContain('flex');
    expect(inputs).toContain('gap-2');
  });

  it('input carries border, background, focus ring, and motion-focus', () => {
    const { input } = classesFor(base);
    expect(input).toContain('border');
    expect(input).toContain('border-border');
    expect(input).toContain('bg-background');
    expect(input).toContain('rounded-md');
    expect(input).toContain('motion-focus');
    expect(input).toContain('focus-visible:ring-2');
    expect(input).toContain('focus-visible:ring-primary-ring');
  });

  it('preview carries the swatch shape', () => {
    const { preview } = classesFor(base);
    expect(preview).toContain('h-8');
    expect(preview).toContain('w-8');
    expect(preview).toContain('rounded-md');
    expect(preview).toContain('border-border');
  });

  it('gamut label is muted text', () => {
    const { gamutLabel } = classesFor(base);
    expect(gamutLabel).toContain('text-xs');
    expect(gamutLabel).toContain('text-muted-foreground');
  });
});
