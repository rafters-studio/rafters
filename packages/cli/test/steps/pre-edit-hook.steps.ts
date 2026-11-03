/**
 * Steps for the pre-edit hook running the check (#2912).
 *
 * The hook runs with its JSON on stdin against a fixture project. The bin is a
 * stub written into the fixture's node_modules/.bin, so this suite does not
 * depend on @rafters/veneer; the stub reports what it reads on stdin, in the
 * report form the real bin prints.
 */

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from '@playwright/test';
import { execa } from 'execa';
import { createBdd } from 'playwright-bdd';
import { context } from './common.steps.js';

const { Given, When, Then } = createBdd();

const HOOK = join(import.meta.dirname, '../../../../plugin/hooks/pre-edit.sh');
const PAGE = 'src/pages/a.astro';

const BRACKET_LINE = '<div class="w-[50%]">x</div>';
const OTHER_BRACKET_LINE = '<div class="w-[25%]">y</div>';

/** A page with `lines` at the given 1-based line numbers and clean text elsewhere, 12 lines long. */
function pageWith(lines: Record<number, string>): string {
  const page: string[] = [];
  for (let n = 1; n <= 12; n++) page.push(lines[n] ?? `<p>clean ${n}</p>`);
  return `${page.join('\n')}\n`;
}

/** Reports the file on stdin: every bracket and bad fill as an error, in the bin's report form. */
const REPORTING_STUB = `#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { relative } = require('node:path');
const [root, flag, path] = process.argv.slice(2);
if (flag !== '--stdin') { process.stderr.write('expected --stdin\\n'); process.exit(2); }
const file = relative(root, path);
const report = [];
readFileSync(0, 'utf-8').split('\\n').forEach((text, i) => {
  const at = file + ':' + (i + 1) + ':1 ';
  if (/\\w-\\[/.test(text)) report.push(at + 'error rafters(arbitrary-value) a bracket is an arbitrary value', '  help: ' + at + 'error rafters(help) use a token');
  if (text.includes('bg-fill-glass extra')) report.push(at + 'error rafters(invalid-fill) not exactly one bg-fill-* token');
});
process.stdout.write(report.concat(report.length + ' problems').join('\\n') + '\\n');
process.exitCode = report.length > 0 ? 1 : 0;
`;

const NON_ERROR_STUB = `#!/usr/bin/env node
process.stdout.write('src/pages/a.astro:3:1 warning rafters(deprecated) a warning\\n');
process.stdout.write('  help: src/pages/a.astro:1:1 error rafters(help) not a finding\\n');
process.stdout.write('1 error\\n');
process.exitCode = 1;
`;

const COULD_NOT_RUN_STUB = `#!/usr/bin/env node
process.stderr.write('no config at the root\\n');
process.exitCode = 2;
`;

async function createProject(stub: string | null): Promise<void> {
  context.fixturePath = await mkdtemp(join(tmpdir(), 'rafters-fixture-hook-'));
  await mkdir(join(context.fixturePath, '.rafters'));
  await writeFile(join(context.fixturePath, '.rafters/config.rafters.json'), '{}\n');
  await mkdir(join(context.fixturePath, 'src/pages'), { recursive: true });
  if (stub !== null) {
    const binDir = join(context.fixturePath, 'node_modules/.bin');
    await mkdir(binDir, { recursive: true });
    await writeFile(join(binDir, 'rafters-check'), stub, { mode: 0o755 });
  }
}

async function runHook(toolName: string, path: string, toolInput: object): Promise<void> {
  const filePath = join(context.fixturePath, path);
  const result = await execa('bash', [HOOK], {
    input: JSON.stringify({
      tool_name: toolName,
      tool_input: { file_path: filePath, ...toolInput },
    }),
    reject: false,
  });
  context.commandResult = {
    exitCode: result.exitCode ?? -1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

const write = (path: string, content: string): Promise<void> => runHook('Write', path, { content });

const edit = (oldString: string, newString: string, replaceAll = false): Promise<void> =>
  runHook('Edit', PAGE, { old_string: oldString, new_string: newString, replace_all: replaceAll });

function hookOutput(): {
  permissionDecision?: string;
  permissionDecisionReason?: string;
  additionalContext?: string;
} {
  const stdout = context.commandResult?.stdout ?? '';
  expect(context.commandResult?.exitCode, context.commandResult?.stderr).toBe(0);
  if (stdout === '') return {};
  return JSON.parse(stdout).hookSpecificOutput;
}

function denyReason(): string {
  const output = hookOutput();
  expect(output.permissionDecision).toBe('deny');
  return output.permissionDecisionReason ?? '';
}

Given('a project with the rafters-check bin', async () => {
  await createProject(REPORTING_STUB);
});

Given(
  'a project with the rafters-check bin and src\\/pages\\/a.astro holding a bracket value on line 3',
  async () => {
    await createProject(REPORTING_STUB);
    await writeFile(join(context.fixturePath, PAGE), pageWith({ 3: BRACKET_LINE }));
  },
);

Given(
  'a project with the rafters-check bin and src\\/pages\\/a.astro holding a bracket value on lines 3 and 5',
  async () => {
    await createProject(REPORTING_STUB);
    await writeFile(
      join(context.fixturePath, PAGE),
      pageWith({ 3: BRACKET_LINE, 5: OTHER_BRACKET_LINE }),
    );
  },
);

Given('a project whose rafters-check reports a warning and a help line on line 3', async () => {
  await createProject(NON_ERROR_STUB);
});

Given('a project whose rafters-check exits 2', async () => {
  await createProject(COULD_NOT_RUN_STUB);
  await writeFile(join(context.fixturePath, PAGE), pageWith({}));
});

Given('a project with no rafters-check bin', async () => {
  await createProject(null);
});

When('an agent makes an Edit on line 9 with clean text', async () => {
  await edit('<p>clean 9</p>', '<p>still clean</p>');
});

When('an agent makes an Edit on line 3 that keeps the bracket', async () => {
  await edit(BRACKET_LINE, '<div class="w-[50%]">changed</div>');
});

When('an agent makes an Edit on line 3 that removes the bracket', async () => {
  await edit(BRACKET_LINE, '<div>x</div>');
});

When('an agent makes a Write with the bracket anywhere', async () => {
  await write(PAGE, `<p>clean</p>\n${BRACKET_LINE}\n<p>clean</p>\n`);
});

When(
  'an agent makes an Edit spanning lines 3 to 5 that removes only the bracket on line 5',
  async () => {
    await edit(
      `${BRACKET_LINE}\n<p>clean 4</p>\n${OTHER_BRACKET_LINE}`,
      `${BRACKET_LINE}\n<p>clean 4</p>\n<div>y</div>`,
    );
  },
);

When('an agent makes an Edit with replace_all that writes a new bracket over both', async () => {
  await edit('w-[', 'h-[', true);
});

When('an agent makes a clean edit', async () => {
  await edit('<p>clean 9</p>', '<p>still clean</p>');
});

When(
  'an agent writes src\\/pages\\/{word} with Card fill="bg-fill-glass extra"',
  async ({}, file: string) => {
    await write(`src/pages/${file}`, '<Card fill="bg-fill-glass extra">b</Card>\n');
  },
);

When('an agent writes src\\/pages\\/{word} with class="flex"', async ({}, file: string) => {
  await write(`src/pages/${file}`, '<section class="flex">c</section>\n');
});

When('an agent writes src\\/pages\\/{word} with class="w-[50px]"', async ({}, file: string) => {
  await write(`src/pages/${file}`, '<section class="w-[50px]">e</section>\n');
});

When('an agent writes src\\/pages\\/{word} with clean text', async ({}, file: string) => {
  await write(`src/pages/${file}`, 'export const clean = 1;\n');
});

Then('the hook does not deny', async () => {
  expect(hookOutput().permissionDecision).toBeUndefined();
});

Then('the hook denies, naming line {int}', async ({}, line: number) => {
  expect(denyReason()).toContain(`${PAGE}:${line}:1 error rafters(arbitrary-value)`);
});

Then('the hook denies, naming its line', async () => {
  const reason = denyReason();
  expect(reason).toContain(`${PAGE}:2:1 error rafters(arbitrary-value)`);
  expect(reason).not.toContain('help:');
  expect(reason).not.toContain('problems');
});

Then('the hook denies, naming rafters\\({word})', async ({}, code: string) => {
  expect(denyReason()).toContain(`rafters(${code})`);
});

Then('the hook denies with LAYOUT IS SOLVED', async () => {
  expect(denyReason()).toContain('LAYOUT IS SOLVED');
});

Then('the hook denies with NO ARBITRARY VALUES', async () => {
  expect(denyReason()).toContain('NO ARBITRARY VALUES');
});

Then('it does not emit permissionDecision allow', async () => {
  expect(context.commandResult?.stdout).not.toContain('permissionDecision');
});

Then('the agent is told the check could not run', async () => {
  const note = hookOutput().additionalContext ?? '';
  expect(note).toContain('could not run');
  expect(note).toContain('no config at the root');
});

Then('the hook prints nothing', async () => {
  expect(context.commandResult?.stdout).toBe('');
  expect(context.commandResult?.stderr).toBe('');
});
