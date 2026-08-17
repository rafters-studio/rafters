import * as React from 'react';
import classy from '@rafters/ui/primitives/classy';
import type { OKLCH } from '@rafters/shared';
import { scaleStripClasses } from './scale-strip.classes';

function oklchToCss(oklch: OKLCH): string {
  return `oklch(${oklch.l} ${oklch.c} ${oklch.h})`;
}

export interface ScaleStripProps {
  scale: OKLCH[];
  highlight?: number;
}

export function ScaleStrip({ scale, highlight }: ScaleStripProps) {
  const classes = scaleStripClasses({ highlight }, {});
  return (
    <div data-part="root" className={classy(classes.root)}>
      {scale.map((color, i) => (
        <div
          key={i}
          data-part="stop"
          className={classy(i === highlight ? classes.stopHighlighted : classes.stop)}
          style={{ backgroundColor: oklchToCss(color) }}
        />
      ))}
    </div>
  );
}

ScaleStrip.displayName = 'ScaleStrip';
export default ScaleStrip;
