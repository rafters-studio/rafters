import * as React from 'react';
import classy from '@rafters/ui/primitives/classy';
import type { OKLCH } from '@rafters/shared';
import { wcagMatrixClasses } from './wcag-matrix.classes';

const SCALE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function oklchToCss(oklch: OKLCH): string {
  return `oklch(${oklch.l} ${oklch.c} ${oklch.h})`;
}

export interface WcagMatrixProps {
  scale: OKLCH[];
  aaPairs: number[][];
  aaaPairs: number[][];
}

export function WcagMatrix({ scale, aaPairs, aaaPairs }: WcagMatrixProps) {
  const classes = wcagMatrixClasses({}, {});
  const aaSet = new Set(aaPairs.map(([a, b]) => `${a}-${b}`));
  const aaaSet = new Set(aaaPairs.map(([a, b]) => `${a}-${b}`));

  function cellLevel(row: number, col: number): string {
    if (aaaSet.has(`${row}-${col}`) || aaaSet.has(`${col}-${row}`)) return 'AAA';
    if (aaSet.has(`${row}-${col}`) || aaSet.has(`${col}-${row}`)) return 'AA';
    return '';
  }

  return (
    <div data-part="root" className={classy(classes.root)}>
      <div data-part="header" className={classy(classes.header)}>
        <div />
        {SCALE_LABELS.map((label) => (
          <div key={label} className={classy(classes.headerCell)}>
            {label}
          </div>
        ))}
      </div>
      {scale.map((_, row) => (
        <div key={SCALE_LABELS[row]} data-part="row" className={classy(classes.row)}>
          <div className={classy(classes.rowLabel)}>{SCALE_LABELS[row]}</div>
          {scale.map((_, col) => {
            const level = cellLevel(row, col);
            return (
              <div
                key={col}
                data-part="cell"
                className={classy(level ? classes.cell : classes.cellEmpty)}
                style={
                  level
                    ? { backgroundColor: oklchToCss(scale[row] ?? { l: 0, c: 0, h: 0 }) }
                    : undefined
                }
              >
                {level ? (
                  <span
                    className={classy(classes.cellLabel)}
                    style={{ color: oklchToCss(scale[col] ?? { l: 1, c: 0, h: 0 }) }}
                  >
                    {level}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

WcagMatrix.displayName = 'WcagMatrix';
export default WcagMatrix;
