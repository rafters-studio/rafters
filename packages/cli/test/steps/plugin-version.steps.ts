/**
 * Steps for the plugin's session-start version check (#2932).
 *
 * The hook runs from a copy of the plugin's hooks folder in a fixture plugin,
 * with a stub bundle and a stub curl first on PATH, so no network is used.
 */

import { copyFile, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { execa } from 'execa';
import { createBdd } from 'playwright-bdd';
import { context } from './common.steps.js';

const { Given, When, Then } = createBdd();

const HOOK = join(import.meta.dirname, '../../../../plugin/hooks/version-check.sh');

let stubBin = '';

Given(
  'an installed plugin at {word} whose bundle reports {word} and a registry whose latest is {word}',
  async ({}, declared: string, running: string, latest: string) => {
    context.fixturePath = await mkdtemp(join(tmpdir(), 'rafters-fixture-plugin-'));
    const plugin = join(context.fixturePath, 'plugin');
    stubBin = join(context.fixturePath, 'stubs');
    await mkdir(join(plugin, 'hooks'), { recursive: true });
    await mkdir(join(plugin, 'bin'));
    await mkdir(join(plugin, '.claude-plugin'));
    await mkdir(stubBin);
    await copyFile(HOOK, join(plugin, 'hooks/version-check.sh'));
    await writeFile(
      join(plugin, '.claude-plugin/plugin.json'),
      JSON.stringify({ name: 'rafters', version: declared }),
    );
    await writeFile(join(plugin, 'bin/rafters'), `#!/bin/sh\nprintf '%s\\n' '${running}'\n`, {
      mode: 0o755,
    });
    const curl =
      latest === 'unreachable'
        ? '#!/bin/sh\nexit 22\n'
        : `#!/bin/sh\nprintf '%s' '{"name":"rafters","version":"${latest}"}'\n`;
    await writeFile(join(stubBin, 'curl'), curl, { mode: 0o755 });
  },
);

When('the session starts', async () => {
  const result = await execa('bash', [join(context.fixturePath, 'plugin/hooks/version-check.sh')], {
    env: { PATH: `${stubBin}:${process.env.PATH ?? ''}` },
    extendEnv: false,
    reject: false,
  });
  context.commandResult = {
    exitCode: result.exitCode ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
});

function sessionContext(): string {
  expect(context.commandResult?.exitCode, context.commandResult?.stderr).toBe(0);
  const parsed: unknown = JSON.parse(context.commandResult?.stdout ?? '');
  const output = (parsed as { hookSpecificOutput: { additionalContext: string } })
    .hookSpecificOutput;
  return output.additionalContext;
}

Then(
  'the agent is told the plugin is {word} and {word} is released',
  async ({}, plugin: string, released: string) => {
    const text = sessionContext();
    expect(text).toContain(`the installed plugin is version ${plugin}`);
    expect(text).toContain(`rafters ${released} is released`);
  },
);

Then('the agent is told the bundle reports {word}', async ({}, running: string) => {
  expect(sessionContext()).toContain(`the bundled MCP artifact reports ${running}`);
});
