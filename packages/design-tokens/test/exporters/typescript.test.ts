/**
 * The TypeScript exporter must emit SYNTACTICALLY VALID TypeScript for every
 * namespace the generators produce -- including hyphenated ones
 * (typography-composite), which broke the demo's generated rafters.ts as an
 * unquoted object key.
 */
import { hexToOKLCH } from '@rafters/color-utils';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { tokensToTypeScript } from '../../src/exporters/typescript.js';
import { generateBaseSystem } from '../../src/generators/index.js';
import { importColorFamily } from '../../src/importers/color.js';
import type { Token } from '@rafters/shared';

function assertParses(source: string): void {
  const file = ts.createSourceFile('tokens.ts', source, ts.ScriptTarget.Latest, true);
  const diagnostics = (file as unknown as { parseDiagnostics: ts.DiagnosticWithLocation[] })
    .parseDiagnostics;
  expect(diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))).toEqual([]);
}

const hyphenated: Token[] = [
  {
    name: 'display-large',
    namespace: 'typography-composite',
    value: '{"fontSize":"3.5rem"}',
    semanticMeaning: 'Largest display text',
  } as unknown as Token,
  {
    name: '4',
    namespace: 'spacing',
    value: '1rem',
  } as unknown as Token,
];

describe('tokensToTypeScript', () => {
  it('quotes hyphenated namespace keys and bracket-accesses their types', () => {
    const source = tokensToTypeScript(hyphenated, { includeJSDoc: true });
    expect(source).toContain(`'typography-composite': {`);
    expect(source).toContain(`keyof (typeof tokens['typography-composite'])`);
    expect(source).toContain('export type TypographyCompositeToken');
    assertParses(source);
  });

  it('keeps plain namespaces as bare keys with dot access', () => {
    const source = tokensToTypeScript(hyphenated);
    expect(source).toContain('  spacing: {');
    expect(source).toContain('keyof (typeof tokens.spacing);');
  });

  it('emits valid TypeScript for the full generated base system', () => {
    const system = generateBaseSystem({});
    assertParses(tokensToTypeScript(system.allTokens, { includeJSDoc: true }));
  });

  /**
   * Pins the family-summary `oklch()` literal (colorValue.scale[5], the
   * exporter's "base color") emitted for a ColorValue token, through the
   * #2147 migration from a hand-rolled `toFixed(3)/toFixed(3)/toFixed(1)`
   * template literal to `oklchToCSS(baseColor, { precision: 3 })`.
   *
   * L and C are byte-identical to before (both were already toFixed(3)).
   * H is NOT byte-identical: oklchToCSS applies one `precision` to every
   * channel, so H moves from 1 decimal place to 3 ("180.0" -> "180.000",
   * "0.0" -> "0.000"). The color VALUE is unchanged -- only the trailing
   * zeros in H's string differ. There is no single `oklchToCSS` call that
   * reproduces the old mixed per-channel precision; see issue #2147.
   *
   * Alpha is byte-identical too: the old formatter never emitted a fourth
   * channel at all, so the exporter forces `alpha: 1` before calling
   * `oklchToCSS` -- the same trick `tailwind.ts` already uses -- rather
   * than letting an imported color's alpha < 1 flow through. The fixtures
   * above never carry alpha, so they don't exercise it; the
   * `imported-primary` case below does, and pins the alpha-dropping
   * behavior.
   *
   * `zinc` is anchored to the hardcoded `DEFAULT_NEUTRAL_SCALE`; the
   * `silver-true-glacier` assertion additionally exercises a non-zero
   * chroma and tracks `DEFAULT_COLOR_PALETTE_BASES` -- retuning that
   * palette's hue/chroma is expected to move this literal too.
   */
  it('produces byte-identical L/C precision after the oklchToCSS migration (H gains trailing zeros)', () => {
    const system = generateBaseSystem({});
    const source = tokensToTypeScript(system.allTokens);
    expect(source).toContain("'zinc': 'oklch(0.552 0.000 0.000)'");
    expect(source).toContain("'silver-true-glacier': 'oklch(0.645 0.120 180.000)'");
  });

  it('drops alpha for a full-precision, alpha-carrying imported seed, exactly as the old formatter did', () => {
    const seed = hexToOKLCH('rgba(59, 130, 246, 0.5)');
    const tokens = importColorFamily('imported-primary', '500', seed);
    const source = tokensToTypeScript(tokens);
    expect(source).toContain("'imported-primary': 'oklch(0.623 0.188 259.815)'");
  });
});
