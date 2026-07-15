/**
 * The TypeScript exporter must emit SYNTACTICALLY VALID TypeScript for every
 * namespace the generators produce -- including hyphenated ones
 * (typography-composite), which broke the demo's generated rafters.ts as an
 * unquoted object key.
 */
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { tokensToTypeScript } from '../../src/exporters/typescript.js';
import { generateBaseSystem } from '../../src/generators/index.js';
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
});
