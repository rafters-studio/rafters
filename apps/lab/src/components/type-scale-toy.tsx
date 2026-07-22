import * as React from 'react';

/*
 * TYPE TOY 1 -- the baseline-grid demonstrator.
 *
 * This is a custom component (src/components), so raw type values are allowed:
 * the toy exists to SEE the decisions before they become generator output.
 *
 * Three things it proves:
 *  1. SCALE is --spacing-seeded and grid-snapped. Every size is calc(--spacing * N),
 *     so a modular-ish ramp lands on 4px multiples (Material 3's rounding rule).
 *  2. LEADING is an absolute spacing LENGTH, not a unitless ratio. Length leading
 *     snaps every line to the vertical rhythm; unitless (1.2) drifts off it. The
 *     grid overlay makes the drift visible -- toggle the two columns.
 *  3. text-box-trim sits the cap-height on the grid line by trimming the half-
 *     leading above/below the glyph box (Chrome/Edge 133+, Safari 18.2+).
 */

type Role = {
  name: string;
  /** font-size in --spacing multiples */
  size: number;
  /** line-height in --spacing multiples (baseline-grid rows) */
  leading: number;
  /** letter-spacing in em (optical: tighter as it grows) */
  tracking: number;
  weight: number;
};

// --spacing = 0.25rem = 4px. Sizes and leadings are grid multiples.
const ROLES: readonly Role[] = [
  { name: 'display-lg', size: 14, leading: 16, tracking: -0.02, weight: 700 },
  { name: 'display', size: 11, leading: 13, tracking: -0.02, weight: 700 },
  { name: 'display-sm', size: 8, leading: 10, tracking: -0.015, weight: 700 },
  { name: 'headline', size: 6, leading: 8, tracking: -0.01, weight: 600 },
  { name: 'title', size: 5, leading: 7, tracking: -0.005, weight: 600 },
  { name: 'body', size: 4, leading: 6, tracking: 0, weight: 400 },
  { name: 'body-sm', size: 3.5, leading: 5, tracking: 0, weight: 400 },
  { name: 'caption', size: 3, leading: 4, tracking: 0.01, weight: 400 },
];

const GRID_ROW = 4; // --spacing multiples per grid line (4 * 4px = 16px rows)

function len(mult: number): string {
  return `calc(var(--spacing) * ${mult})`;
}

function Line({ role, trim, unitless }: { role: Role; trim: boolean; unitless: boolean }) {
  const style: React.CSSProperties = {
    fontSize: len(role.size),
    lineHeight: unitless ? '1.2' : len(role.leading),
    letterSpacing: `${role.tracking}em`,
    fontWeight: role.weight,
    margin: 0,
    // text-box-trim: cap-height to alphabetic baseline, so the box == the glyphs
    textBoxTrim: trim ? 'trim-both' : 'normal',
    textBoxEdge: trim ? 'cap alphabetic' : 'auto',
  } as React.CSSProperties;
  return <p style={style}>{role.name} — Sphinx of black quartz, judge my vow.</p>;
}

function Column({ title, trim, unitless }: { title: string; trim: boolean; unitless: boolean }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p
        style={{
          fontSize: len(3),
          lineHeight: len(GRID_ROW),
          fontWeight: 600,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          opacity: 0.6,
          margin: 0,
        }}
      >
        {title}
      </p>
      <div
        style={{
          // baseline grid: a line every GRID_ROW spacing units
          backgroundImage:
            'repeating-linear-gradient(to bottom, color-mix(in oklch, currentColor 18%, transparent) 0, color-mix(in oklch, currentColor 18%, transparent) 1px, transparent 1px, transparent ' +
            len(GRID_ROW) +
            ')',
          display: 'flex',
          flexDirection: 'column',
          gap: len(GRID_ROW),
          paddingTop: '1px',
        }}
      >
        {ROLES.map((role) => (
          <Line key={role.name} role={role} trim={trim} unitless={unitless} />
        ))}
      </div>
    </div>
  );
}

export function TypeScaleToy() {
  const [trim, setTrim] = React.useState(true);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: len(6) }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: len(2), fontSize: len(3.5) }}>
        <input type="checkbox" checked={trim} onChange={(e) => setTrim(e.target.checked)} />
        text-box-trim (cap-height sits on the grid line)
      </label>
      <div style={{ display: 'flex', gap: len(8) }}>
        <Column title="leading as length — snaps" trim={trim} unitless={false} />
        <Column title="unitless 1.2 — drifts" trim={trim} unitless={true} />
      </div>
    </div>
  );
}
