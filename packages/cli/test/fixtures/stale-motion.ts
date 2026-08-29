/**
 * A stored motion namespace as a pre-0.3.0 rafters left it (#2208).
 *
 * Shared by the two regeneration paths' tests -- `init --rebuild` and `add`'s
 * post-install regen -- because the defect is one defect and the fixture that
 * reproduces it must be one fixture.
 *
 * Four tokens, one per way a stale motion file breaks the current CLI:
 *   1. a cell whose value predates `duration.kind` (0.2.3 wrote `durationTier`,
 *      which the Tailwind exporter reads as `duration.kind null` and throws on);
 *   2. an easing whose name has since been retired from the enum, which fails
 *      TokenSchema on load, before the exporter is ever reached;
 *   3. a still-current easing carrying a designer override, which must survive;
 *   4. a 0.2.3-shaped cell that ALSO carries a designer override -- the carry
 *      path's own way of reintroducing (1), by writing the stale value back
 *      over a correctly regenerated cell.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const STALE_MOTION_FILE = {
  namespace: 'motion',
  generatedAt: '2026-04-17T19:57:12.919Z',
  tokens: [
    {
      name: 'motion-cell-dialog-content-open',
      value: JSON.stringify({ keyframe: 'scale-in', durationTier: 'normal', curve: 'enter' }),
      category: 'motion',
      namespace: 'motion',
      userOverride: null,
    },
    {
      name: 'motion-easing-ease-in',
      value: 'cubic-bezier(0.42, 0, 1, 1)',
      category: 'motion',
      namespace: 'motion',
      easingName: 'ease-in',
      easingCurve: [0.42, 0, 1, 1],
      userOverride: null,
    },
    {
      name: 'motion-easing-standard',
      value: 'cubic-bezier(0.2, 0, 0, 1)',
      category: 'motion',
      namespace: 'motion',
      easingName: 'standard',
      easingCurve: [0.2, 0, 0, 1],
      userOverride: {
        previousValue: 'cubic-bezier(0.4, 0, 0.2, 1)',
        reason: 'Brand curve settles harder than the system default',
        kind: 'designer',
      },
    },
    {
      name: 'motion-cell-dialog-overlay-open',
      value: JSON.stringify({ keyframe: 'fade-in', durationTier: 'normal', curve: 'enter' }),
      category: 'motion',
      namespace: 'motion',
      userOverride: {
        previousValue: JSON.stringify({
          keyframe: 'fade-in',
          durationTier: 'fast',
          curve: 'enter',
        }),
        reason: 'Overlay was arriving faster than the panel it sits behind',
        kind: 'designer',
      },
    },
  ],
};

/** The still-current easing whose designer override must survive a rebuild. */
export const CARRIED_EASING = STALE_MOTION_FILE.tokens[2];

/** The 0.2.3-shaped cell whose override must NOT drag its stale value back. */
export const STALE_OVERRIDDEN_CELL = STALE_MOTION_FILE.tokens[3];

export type StoredToken = { name: string; value: string; userOverride: unknown };

export function tokensDir(projectDir: string): string {
  return join(projectDir, '.rafters', 'tokens');
}

/** Overwrite the project's motion namespace with the pre-0.3.0 fixture. */
export function seedStaleMotion(projectDir: string): void {
  writeFileSync(
    join(tokensDir(projectDir), 'motion.rafters.json'),
    `${JSON.stringify(STALE_MOTION_FILE, null, 2)}\n`,
    'utf8',
  );
}

export function readNamespaceTokens(projectDir: string, namespace: string): StoredToken[] {
  const file = JSON.parse(
    readFileSync(join(tokensDir(projectDir), `${namespace}.rafters.json`), 'utf8'),
  ) as { tokens: StoredToken[] };
  return file.tokens;
}

export function findToken(tokens: StoredToken[], name: string): StoredToken | undefined {
  return tokens.find((t) => t.name === name);
}
