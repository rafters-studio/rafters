import * as React from 'react';
import classy from '@rafters/ui/primitives/classy';
import type { OKLCH } from '@rafters/shared';
import type { ColorSwatchSize } from './color-swatch.behavior';
import { colorSwatchClasses } from './color-swatch.classes';

function oklchToCss(oklch: OKLCH): string {
  return `oklch(${oklch.l} ${oklch.c} ${oklch.h})`;
}

export interface ColorSwatchProps {
  color: OKLCH;
  textColor?: OKLCH;
  size?: ColorSwatchSize;
  children?: React.ReactNode;
}

export function ColorSwatch({ color, textColor, size, children }: ColorSwatchProps) {
  const classes = colorSwatchClasses({ size }, {});
  return (
    <div
      data-part="root"
      className={classy(classes.root)}
      style={{
        backgroundColor: oklchToCss(color),
        ...(textColor ? { color: oklchToCss(textColor) } : {}),
      }}
    >
      {children}
    </div>
  );
}

ColorSwatch.displayName = 'ColorSwatch';
export default ColorSwatch;
