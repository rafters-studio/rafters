import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyPreset,
  loadRegistryFromDir,
  saveRegistryToDir,
  TokenParseError,
  TokenRegistry,
} from '../src/index.js';

const EFFICIENT: Record<string, string> = {
  'rafters-duration-fast': '150ms',
  'rafters-duration-moderate': '250ms',
  'rafters-duration-normal': '350ms',
  'rafters-duration-slow': '500ms',
};

// Values are deliberately fake and obviously so. The mechanics are under test,
// not the numbers -- there is no measured row for any intent preset yet.
const FAKE_PRESET: Record<string, string> = {
  'rafters-duration-fast': '999ms',
  'rafters-duration-moderate': '999ms',
  'rafters-duration-normal': '999ms',
  'rafters-duration-slow': '999ms',
};

const leaf = (name: string, value: string) => ({
  name,
  value,
  category: 'motion',
  namespace: 'motion',
  userOverride: null,
});

const freshRegistry = (): TokenRegistry =>
  new TokenRegistry(
    Object.entries(EFFICIENT).map(([n, v]) => leaf(n, v)),
    [],
  );

const pinModerate = (registry: TokenRegistry): void => {
  registry.set('rafters-duration-moderate', '220ms', {
    reason: 'brand sits low in the band',
    kind: 'designer',
  });
};

describe('naive preset apply (documented failure mode)', () => {
  it('clobbers a designer pin and destroys its attribution', () => {
    const registry = freshRegistry();
    pinModerate(registry);

    // The naive apply Studio must NOT ship: set() every token in the value-set.
    for (const [name, value] of Object.entries(FAKE_PRESET)) {
      registry.set(name, value, { reason: 'apply preset', kind: 'preset' });
    }

    const moderate = registry.get('rafters-duration-moderate');
    expect(moderate?.value).toBe('999ms');
    // The pin survives only as previousValue, filed under the PRESET's reason
    // and the PRESET's provenance. Nothing on the token says a designer chose
    // 220ms -- that attribution is gone.
    expect(moderate?.userOverride?.previousValue).toBe('220ms');
    expect(moderate?.userOverride?.reason).toBe('apply preset');
    expect(moderate?.userOverride?.kind).toBe('preset');
  });

  it('erases even the one step of history on a second apply', () => {
    const registry = freshRegistry();
    pinModerate(registry);
    for (let pass = 0; pass < 2; pass++) {
      for (const [name, value] of Object.entries(FAKE_PRESET)) {
        registry.set(name, value, { reason: 'apply preset', kind: 'preset' });
      }
    }
    const moderate = registry.get('rafters-duration-moderate');
    expect(moderate?.userOverride?.previousValue).toBe('999ms');
  });
});

describe('applyPreset', () => {
  it('preserves the designer pin and moves everything else', () => {
    const registry = freshRegistry();
    pinModerate(registry);

    const result = applyPreset(registry, FAKE_PRESET, { reason: 'apply preset' });

    expect(result.skipped).toEqual(['rafters-duration-moderate']);
    expect(result.applied).toEqual([
      'rafters-duration-fast',
      'rafters-duration-normal',
      'rafters-duration-slow',
    ]);
    expect(result.unknown).toEqual([]);

    const moderate = registry.get('rafters-duration-moderate');
    expect(moderate?.value).toBe('220ms');
    expect(moderate?.userOverride?.kind).toBe('designer');
    expect(moderate?.userOverride?.reason).toBe('brand sits low in the band');

    for (const name of result.applied) {
      const token = registry.get(name);
      expect(token?.value).toBe('999ms');
      expect(token?.userOverride?.kind).toBe('preset');
    }
  });

  it('is idempotent for the pin across repeated applies', () => {
    const registry = freshRegistry();
    pinModerate(registry);
    applyPreset(registry, FAKE_PRESET, { reason: 'apply preset' });
    applyPreset(registry, FAKE_PRESET, { reason: 'apply preset again' });
    expect(registry.get('rafters-duration-moderate')?.value).toBe('220ms');
  });

  it('treats a legacy override without kind as unattributed and overwrites it', () => {
    // Absent provenance means unknown, not designer. Overrides written before
    // the kind field existed carry no claim on the value, and this helper does
    // not sniff the reason string for a "designer:" prefix.
    const registry = freshRegistry();
    registry.set('rafters-duration-moderate', '220ms', { reason: 'designer: brand tune' });

    const result = applyPreset(registry, FAKE_PRESET, { reason: 'apply preset' });

    expect(result.skipped).toEqual([]);
    expect(registry.get('rafters-duration-moderate')?.value).toBe('999ms');
  });

  it('reports value-set entries the registry does not know', () => {
    const registry = freshRegistry();
    const result = applyPreset(
      registry,
      { 'rafters-duration-fast': '10ms', 'rafters-duration-nonexistent': '10ms' },
      { reason: 'apply preset' },
    );
    expect(result.unknown).toEqual(['rafters-duration-nonexistent']);
    expect(result.applied).toEqual(['rafters-duration-fast']);
  });
});

describe('override provenance persistence', () => {
  const TEST_TMP_ROOT = join(import.meta.dirname, '..', 'node_modules', '.test-tmp');
  let tmpDir: string;

  beforeEach(() => {
    mkdirSync(TEST_TMP_ROOT, { recursive: true });
    tmpDir = mkdtempSync(join(TEST_TMP_ROOT, 'provenance-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('survives the save -> disk -> load roundtrip', () => {
    const registry = freshRegistry();
    pinModerate(registry);
    applyPreset(registry, FAKE_PRESET, { reason: 'apply preset' });
    saveRegistryToDir(tmpDir, registry);

    const reloaded = loadRegistryFromDir(tmpDir);
    const moderate = reloaded.get('rafters-duration-moderate');
    expect(moderate?.value).toBe('220ms');
    expect(moderate?.userOverride?.kind).toBe('designer');
    expect(reloaded.get('rafters-duration-fast')?.userOverride?.kind).toBe('preset');
  });

  it('still skips the reloaded designer pin on a later apply', () => {
    const registry = freshRegistry();
    pinModerate(registry);
    saveRegistryToDir(tmpDir, registry);

    const reloaded = loadRegistryFromDir(tmpDir);
    const result = applyPreset(reloaded, FAKE_PRESET, { reason: 'apply preset' });
    expect(result.skipped).toEqual(['rafters-duration-moderate']);
    expect(reloaded.get('rafters-duration-moderate')?.value).toBe('220ms');
  });

  it('rejects an unknown provenance kind at schema level', () => {
    expect(
      () =>
        new TokenRegistry([
          {
            ...leaf('rafters-duration-fast', '150ms'),
            userOverride: { previousValue: '150ms', reason: 'whatever', kind: 'nonsense' },
          },
        ]),
    ).toThrow(TokenParseError);
  });

  it('loads a legacy override with no kind unchanged', () => {
    const registry = new TokenRegistry([
      {
        ...leaf('rafters-duration-fast', '111ms'),
        userOverride: { previousValue: '150ms', reason: 'legacy tweak' },
      },
    ]);
    const token = registry.get('rafters-duration-fast');
    expect(token?.value).toBe('111ms');
    expect(token?.userOverride?.kind).toBeUndefined();
  });
});
