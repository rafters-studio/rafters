/**
 * The JSON report is the only channel veneer reads, so this proves the channel
 * end to end: run one a11y file in the browser project as a child vitest, hold
 * on to each test's `task.meta.axe` as it arrived from the browser, and
 * deep-equal it against what the JSON reporter wrote for that test.
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { z } from 'zod';

const A11Y_FILE = 'test/components/badge/badge.a11y.tsx';
const REPORT = '.vitest/json/report-roundtrip.json';
// node:path, not `new URL(..., import.meta.url)`: under happy-dom the global
// URL resolves relative paths against the fake location, not the file.
const PACKAGE_ROOT = resolve(import.meta.dirname, '..', '..');

const ruleSchema = z.object({ id: z.string(), tags: z.array(z.string()) }).loose();
const axeSchema = z
  .object({
    passes: z.array(ruleSchema),
    violations: z.array(ruleSchema),
    incomplete: z.array(ruleSchema),
    inapplicable: z.array(ruleSchema),
  })
  .loose();

/** What the child sends back: each test's meta.axe as the main process received it. */
const capturedSchema = z.record(z.string(), axeSchema);

const reportSchema = z.object({
  testResults: z.array(
    z.object({
      name: z.string(),
      assertionResults: z.array(
        z.object({ title: z.string(), status: z.string(), meta: z.object({ axe: axeSchema }) }),
      ),
    }),
  ),
});

// Runs in node from the package root, so bare specifiers resolve from here.
// The captured metas travel back over IPC; stdout belongs to vitest's logger.
const script = `
  import { createVitest } from 'vitest/node';
  const vitest = await createVitest('test', {
    watch: false,
    project: ['browser'],
    reporters: [['json', { outputFile: ${JSON.stringify(REPORT)} }]],
  });
  await vitest.start([${JSON.stringify(A11Y_FILE)}]);
  const captured = {};
  for (const file of vitest.state.getFiles()) {
    for (const task of file.tasks) captured[task.name] = task.meta.axe;
  }
  process.send(captured);
  await vitest.close();
`;

test('the JSON report carries task.meta.axe verbatim for every a11y test', async () => {
  const child = spawn(process.execPath, ['--input-type=module', '--eval', script], {
    cwd: PACKAGE_ROOT,
    stdio: ['ignore', 'ignore', 'inherit', 'ipc'],
  });
  // Whichever comes first: the message, or an exit (whose payload fails the parse).
  const [message] = await Promise.race([once(child, 'message'), once(child, 'exit')]);
  const captured = capturedSchema.parse(message);
  const report = reportSchema.parse(
    JSON.parse(await readFile(resolve(PACKAGE_ROOT, REPORT), 'utf8')),
  );

  const badge = report.testResults.find((file) => file.name.endsWith(A11Y_FILE));
  expect(badge).toBeDefined();
  if (!badge) return;
  expect(badge.assertionResults.length).toBeGreaterThan(0);
  expect(Object.keys(captured)).toHaveLength(badge.assertionResults.length);

  for (const result of badge.assertionResults) {
    expect(result.status).toBe('passed');
    expect(result.meta.axe).toEqual(captured[result.title]);
    expect(Object.keys(result.meta.axe)).toEqual(
      expect.arrayContaining(['passes', 'violations', 'incomplete', 'inapplicable']),
    );
    expect(result.meta.axe.passes.every((rule) => Array.isArray(rule.tags))).toBe(true);
  }

  // Real layout: axe decided color-contrast (under wcag2aa) instead of
  // filing it as incomplete the way it must without a rendered page.
  const first = badge.assertionResults[0];
  expect(first?.meta.axe.passes.some((rule) => rule.tags.includes('wcag2aa'))).toBe(true);
  expect(first?.meta.axe.passes.map((rule) => rule.id)).toContain('color-contrast');
}, 120_000);
