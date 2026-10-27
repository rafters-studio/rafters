import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { BrowserCommand } from 'vitest/node';

type DesignTokens = typeof import('@rafters/design-tokens');

/**
 * Browser-lane command: compile a real Tailwind + design-tokens sheet for the
 * given class string, server side. The browser test page loads no compiled
 * sheet, so a spec that asserts computed style injects this result as a
 * <style>. `registryToCompiled` shells out to the Tailwind CLI, which cannot
 * run in the page, hence a command. design-tokens ships TS source, so it is
 * loaded through the project's Vite module runner, not a static import.
 */
export const compileCss: BrowserCommand<[classes: string], Promise<string>> = async (
  context,
  classes,
) => {
  const { generateBaseSystem, REGISTRY_PLUGINS, registryToCompiled, TokenRegistry } =
    await context.project.import<DesignTokens>('@rafters/design-tokens');
  const fixtureDir = mkdtempSync(join(tmpdir(), 'rafters-compile-css-'));
  try {
    writeFileSync(
      join(fixtureDir, 'probe.classes.ts'),
      `export const x = ${JSON.stringify(classes)};\n`,
    );
    const registry = new TokenRegistry(generateBaseSystem({}).allTokens, REGISTRY_PLUGINS);
    return await registryToCompiled(registry, { contentSources: [fixtureDir] });
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
};
