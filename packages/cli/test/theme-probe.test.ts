/**
 * The theme mapping probe has a test of its own (#2825): fed a row whose theme
 * key no utility reads, it fails and names the row and its probe utility.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  generateBaseSystem,
  REGISTRY_PLUGINS,
  registryToCompiled,
  THEME_MAPPING,
  type ThemeMappingRow,
  TokenRegistry,
} from '@rafters/design-tokens';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CompiledSheet, parseCompiled, probeRow, rowLabel } from './steps/theme-probe.js';

const row = THEME_MAPPING.find((r) => r.token.source === '^spacing-base$');
if (!row) throw new Error('THEME_MAPPING has no spacing-base row');
const spacingBase: ThemeMappingRow = row;

describe('theme mapping probe', () => {
  const dir = mkdtempSync(join(tmpdir(), 'theme-probe-'));
  let sheet: CompiledSheet;

  beforeAll(async () => {
    const tokens = generateBaseSystem().allTokens.map((t) =>
      t.name === 'spacing-base' ? { ...t, value: spacingBase.probeValue } : t,
    );
    const candidates = join(dir, 'candidates.txt');
    writeFileSync(candidates, spacingBase.probes.map((p) => p.utility).join('\n'));
    const css = await registryToCompiled(new TokenRegistry(tokens, REGISTRY_PLUGINS), {
      minify: false,
      contentSources: [candidates],
    });
    sheet = parseCompiled(css);
  }, 60_000);

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('passes the row as the exporter maps it', () => {
    expect(probeRow(spacingBase, sheet)).toEqual([]);
  });

  it('fails a row whose theme key is changed, naming the row and its probe utility', () => {
    const changed: ThemeMappingRow = { ...spacingBase, keys: [{ key: '--spacing-base' }] };
    const failures = probeRow(changed, sheet);
    expect(failures.length).toBeGreaterThan(0);
    for (const probe of spacingBase.probes) {
      expect(failures.some((f) => f.startsWith(`${rowLabel(changed)}: ${probe.utility} `))).toBe(
        true,
      );
    }
    expect(failures[0]).toContain("does not read the row's theme key");
  });

  it('fails a row whose probe value the utility does not reach', () => {
    const failures = probeRow({ ...spacingBase, probeValue: '9.99rem' }, sheet);
    expect(failures[0]).toMatch(/^spacing row \/\^spacing-base\$\/: p-8 padding resolves to/);
  });
});
