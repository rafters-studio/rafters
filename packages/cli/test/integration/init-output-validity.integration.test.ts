/**
 * Per-fixture install-output validity (#1524).
 *
 * Runs `rafters init --agent` against each shipping framework fixture,
 * then runs `assertCssIsValid` on the generated `rafters.css`. Catches
 * regressions where init exits cleanly but produces CSS with dangling
 * refs, missing canonical surface tokens, or syntax errors.
 *
 * Fixture coverage is incremental: extended as #1519 lands the
 * remaining `react-router` / `vanilla` fixtures.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupFixture, createFixture, INSTALL_FRESH_FIXTURES } from '../fixtures/projects.js';
import { analyzeCss, assertCssIsValid } from '../utils/css-validity.js';
import { execCli, readFixtureFile } from './helpers.js';

// Sanity range for declared --rafters-* / --color-* declarations. The
// default grayscale + showcase palette system lands well inside this.
// Tightens when #1524 adds explicit per-fixture expectations.
const EXPECTED_TOKEN_RANGE: [number, number] = [200, 2000];

describe('init produces a valid design system per fixture', () => {
  let fixturePath = '';

  afterEach(async () => {
    if (fixturePath) {
      await cleanupFixture(fixturePath);
      fixturePath = '';
    }
  });

  for (const type of INSTALL_FRESH_FIXTURES) {
    it(`generates valid rafters.css for ${type}`, async () => {
      fixturePath = await createFixture(type);
      const result = await execCli(fixturePath, ['init', '--agent']);

      expect(result.exitCode, `init failed:\n${result.stdout}\n${result.stderr}`).toBe(0);

      const css = await readFixtureFile(fixturePath, '.rafters/output/rafters.css');
      assertCssIsValid(css, EXPECTED_TOKEN_RANGE);
    });
  }

  it('catches a deliberately broken output (negative case)', () => {
    // Lock the assertion: if someone short-circuits the helper, this
    // test fails. The fixture-driven cases above would silently pass.
    const brokenCss = `:root {
      --rafters-background: #fff;
      --rafters-foreground: #000;
      --rafters-primary: var(--color-empire-500);
      --rafters-destructive: #c00;
      --rafters-border: #ccc;
    }`;
    expect(() => assertCssIsValid(brokenCss)).toThrow(/dangling var\(\) refs.*--color-empire-500/);

    const report = analyzeCss(brokenCss);
    expect(report.danglingRefs).toEqual(['--color-empire-500']);
  });
});
