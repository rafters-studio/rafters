import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  contrastPlugin,
  generateNamespaces,
  invertPlugin,
  mirrorPlugin,
  scalePlugin,
  statePlugin,
} from '@rafters/design-tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isCarryableMotionValue,
  regenerateMotionNamespace,
} from '../../src/utils/motion-rebuild.js';
import { setAgentMode } from '../../src/utils/ui.js';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';
import {
  CARRIED_EASING,
  findToken,
  RETIRED_DURATION,
  readNamespaceTokens,
  STALE_OVERRIDDEN_CELL,
  seedStaleMotion,
  tokensDir,
} from '../fixtures/stale-motion.js';

const PLUGINS = [scalePlugin, contrastPlugin, statePlugin, invertPlugin, mirrorPlugin];

/**
 * The carry gate is a SECOND declaration of the cell value shape -- the first
 * is the generator's, the third is the Tailwind exporter's `parseCellSpec`.
 * A second declaration drifts, and the drift is exactly what #2208 was: a cell
 * shape moved in 0.3.0 and the code that reads stored cell values did not.
 *
 * This suite is what holds the gate to the generator. The conformance case
 * below goes red the day the cell spec changes again without the gate
 * following, which is the failure mode the gate itself cannot detect.
 */
describe('isCarryableMotionValue (#2208)', () => {
  it('accepts every cell value the current generator emits', () => {
    const cells = generateNamespaces(['motion']).allTokens.filter((t) =>
      t.name.startsWith('motion-cell-'),
    );

    expect(cells.length).toBeGreaterThan(0);
    const rejected = cells
      .filter((t) => !isCarryableMotionValue(t.name, t.value))
      .map((t) => t.name);
    expect(rejected).toEqual([]);
  });

  it('rejects a 0.2.3-shaped cell value', () => {
    expect(isCarryableMotionValue(STALE_OVERRIDDEN_CELL.name, STALE_OVERRIDDEN_CELL.value)).toBe(
      false,
    );
  });

  it('rejects a cell value that is not a string at all', () => {
    expect(isCarryableMotionValue('motion-cell-dialog-content-open', { keyframe: 'fade-in' })).toBe(
      false,
    );
  });

  it('accepts an operator-pinned cell -- an animation shorthand, not JSON', () => {
    // `registry.set` on a cell writes a plain shorthand over the JSON spec, and
    // the exporter emits it verbatim. That is a value the system still accepts,
    // so the gate must not mistake it for a stale shape.
    expect(
      isCarryableMotionValue('motion-cell-dialog-content-open', 'scale-in 200ms ease-out'),
    ).toBe(true);
  });

  it('accepts a period-kind cell value', () => {
    expect(
      isCarryableMotionValue(
        'motion-cell-spinner-root-busy',
        JSON.stringify({ keyframe: 'spin', duration: { kind: 'period', period: 'spin' } }),
      ),
    ).toBe(true);
  });

  it('leaves every non-cell motion token carryable', () => {
    // Easings, durations, periods, keyframes and the semantic namespaces carry
    // plain strings with no composite shape to go stale.
    expect(isCarryableMotionValue('rafters-ease-standard', 'cubic-bezier(0.2, 0, 0, 1)')).toBe(
      true,
    );
    expect(isCarryableMotionValue('rafters-duration-normal', '200ms')).toBe(true);
  });
});

describe('regenerateMotionNamespace: one duration and easing set (#2746)', () => {
  let projectDir = '';

  beforeEach(async () => {
    projectDir = await createFixture('vite-no-shadcn');
    mkdirSync(tokensDir(projectDir), { recursive: true });
    seedStaleMotion(projectDir);
  });

  afterEach(async () => {
    await cleanupFixture(projectDir);
    projectDir = '';
  });

  it('loads a stored file holding retired motion-duration-* / motion-easing-* tokens', () => {
    expect(() => regenerateMotionNamespace(tokensDir(projectDir), PLUGINS)).not.toThrow();
  });

  it('moves an override stored on a retired name onto its rafters-* twin', () => {
    setAgentMode(true);
    const logged = vi.spyOn(console, 'log').mockImplementation(() => {});
    let events: string[] = [];
    try {
      regenerateMotionNamespace(tokensDir(projectDir), PLUGINS);
      // Read before restoring: mockRestore clears the calls.
      events = logged.mock.calls.map(([line]) => String(line));
    } finally {
      logged.mockRestore();
      setAgentMode(false);
    }
    expect(
      events.some(
        (line) =>
          line.includes('motion:override-carried') && line.includes('"rafters-duration-fast"'),
      ),
    ).toBe(true);

    const rebuilt = readNamespaceTokens(projectDir, 'motion');
    expect(
      rebuilt.filter((t) => /^motion-duration-(?!base$)|^motion-easing-/.test(t.name)),
    ).toEqual([]);
    expect(findToken(rebuilt, RETIRED_DURATION.name)).toBeUndefined();

    const leaf = findToken(rebuilt, 'rafters-duration-fast');
    expect(leaf?.value).toBe(RETIRED_DURATION.value);
    expect(leaf?.userOverride).toEqual(RETIRED_DURATION.userOverride);
  });

  it('fails before any write when a retired override and its twin disagree', () => {
    const file = join(tokensDir(projectDir), 'motion.rafters.json');
    const stored = JSON.parse(readFileSync(file, 'utf8')) as { tokens: unknown[] };
    stored.tokens.push({
      name: 'rafters-duration-fast',
      value: '180ms',
      category: 'motion',
      namespace: 'motion',
      userOverride: {
        previousValue: '150ms',
        reason: 'A second, different decision',
        kind: 'designer',
      },
    });
    writeFileSync(file, `${JSON.stringify(stored, null, 2)}\n`, 'utf8');
    const before = readFileSync(file, 'utf8');

    expect(() => regenerateMotionNamespace(tokensDir(projectDir), PLUGINS)).toThrowError(
      /"motion-duration-fast".*"rafters-duration-fast"/,
    );
    expect(readFileSync(file, 'utf8')).toBe(before);
  });

  it('accepts a retired override whose twin holds the same value', () => {
    const file = join(tokensDir(projectDir), 'motion.rafters.json');
    const stored = JSON.parse(readFileSync(file, 'utf8')) as { tokens: unknown[] };
    stored.tokens.push({
      name: 'rafters-duration-fast',
      value: RETIRED_DURATION.value,
      category: 'motion',
      namespace: 'motion',
      userOverride: RETIRED_DURATION.userOverride,
    });
    writeFileSync(file, `${JSON.stringify(stored, null, 2)}\n`, 'utf8');

    expect(() => regenerateMotionNamespace(tokensDir(projectDir), PLUGINS)).not.toThrow();
    const leaf = findToken(readNamespaceTokens(projectDir, 'motion'), 'rafters-duration-fast');
    expect(leaf?.value).toBe(RETIRED_DURATION.value);
  });

  it('carries an override stored on a rafters-* leaf', () => {
    regenerateMotionNamespace(tokensDir(projectDir), PLUGINS);

    const leaf = findToken(readNamespaceTokens(projectDir, 'motion'), CARRIED_EASING.name);
    expect(leaf?.value).toBe(CARRIED_EASING.value);
    expect(leaf?.userOverride).toEqual(CARRIED_EASING.userOverride);
  });
});
