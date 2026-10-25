import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { generateBaseSystem, generateNamespaces, SCRIPT_FONTS } from '@rafters/design-tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureTailwindCli,
  init,
  isTailwindCliInstalled,
  promptScripts,
} from '../../src/commands/init.js';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';
import {
  CARRIED_EASING,
  findToken,
  readNamespaceTokens,
  seedStaleMotion,
  STALE_OVERRIDDEN_CELL,
  tokensDir,
} from '../fixtures/stale-motion.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
}));

vi.mock('../../src/utils/update-dependencies.js', () => ({
  updateDependencies: vi.fn().mockResolvedValue(undefined),
}));

describe('isTailwindCliInstalled', () => {
  it('returns a boolean without throwing', () => {
    const result = isTailwindCliInstalled(process.cwd());
    expect(typeof result).toBe('boolean');
  });
});

describe('ensureTailwindCli', () => {
  let savedStdinTTY: boolean | undefined;
  let savedStdoutTTY: boolean | undefined;

  beforeEach(() => {
    savedStdinTTY = process.stdin.isTTY;
    savedStdoutTTY = process.stdout.isTTY;
  });

  afterEach(() => {
    process.stdin.isTTY = savedStdinTTY as boolean;
    process.stdout.isTTY = savedStdoutTTY as boolean;
  });

  function setTTY(interactive: boolean): void {
    const value = interactive ? true : (undefined as unknown as boolean);
    process.stdin.isTTY = value;
    process.stdout.isTTY = value;
  }

  it('throws in non-interactive mode', async () => {
    setTTY(false);

    await expect(ensureTailwindCli(process.cwd())).rejects.toThrow(
      'Standalone CSS export requires @tailwindcss/cli',
    );
  });

  it('throws when user declines install', async () => {
    setTTY(true);
    const { confirm } = await import('@inquirer/prompts');
    vi.mocked(confirm).mockResolvedValue(false);

    await expect(ensureTailwindCli(process.cwd())).rejects.toThrow(
      'Standalone CSS export requires @tailwindcss/cli',
    );
  });

  it('calls updateDependencies when user confirms install', async () => {
    setTTY(true);
    const { confirm } = await import('@inquirer/prompts');
    vi.mocked(confirm).mockResolvedValue(true);
    const { updateDependencies } = await import('../../src/utils/update-dependencies.js');

    // Will throw because @tailwindcss/cli won't actually be resolvable after
    // the mocked install, but we can verify updateDependencies was called
    try {
      await ensureTailwindCli(process.cwd());
    } catch {
      // Expected: post-install verification fails in test environment
    }

    expect(updateDependencies).toHaveBeenCalledWith([], ['@tailwindcss/cli'], {
      cwd: process.cwd(),
    });
  });
});

function sortedNames(tokens: readonly { name: string }[]): string[] {
  return tokens.map((t) => t.name).sort();
}

describe('rafters init --rebuild -- motion namespace (#2208)', () => {
  let projectDir = '';
  let originalCwd = '';

  beforeEach(async () => {
    originalCwd = process.cwd();
    projectDir = await createFixture('vite-no-shadcn');
    process.chdir(projectDir);
    await init({ agent: true });
  }, 60000);

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupFixture(projectDir);
    projectDir = '';
  });

  it('regenerates motion instead of reloading stale tokens', async () => {
    seedStaleMotion(projectDir);

    await expect(init({ rebuild: true, agent: true })).resolves.not.toThrow();

    const rebuilt = readNamespaceTokens(projectDir, 'motion');
    const generated = generateNamespaces(['motion']).allTokens;
    expect(sortedNames(rebuilt)).toEqual(sortedNames(generated));
  }, 60000);

  it('drops stored motion tokens the generator no longer emits', async () => {
    seedStaleMotion(projectDir);

    await init({ rebuild: true, agent: true });

    const rebuilt = readNamespaceTokens(projectDir, 'motion');
    expect(sortedNames(rebuilt)).not.toContain('motion-easing-ease-in');

    const cell = findToken(rebuilt, 'motion-cell-dialog-content-open');
    expect(cell?.value).toContain('"duration"');
    expect(cell?.value).not.toContain('durationTier');
  }, 60000);

  it('carries a userOverride and its value onto the regenerated token', async () => {
    seedStaleMotion(projectDir);

    await init({ rebuild: true, agent: true });

    const overridden = findToken(readNamespaceTokens(projectDir, 'motion'), CARRIED_EASING.name);
    expect(overridden?.userOverride).toEqual(CARRIED_EASING.userOverride);
    // The override's value is what the token emits -- carrying the record
    // without the value would leave the token claiming a decision it no
    // longer applies.
    expect(overridden?.value).toBe(CARRIED_EASING.value);
  }, 60000);

  it('refuses to carry an override whose value shape the generator no longer emits', async () => {
    seedStaleMotion(projectDir);

    // The carry is the second way the #2208 failure gets in: a 0.2.3-shaped
    // cell value is still a plain string to TokenSchema, so an override on
    // that token would write it straight back over the regenerated cell and
    // the exporter would throw on it exactly as before.
    await expect(init({ rebuild: true, agent: true })).resolves.not.toThrow();

    const cell = findToken(readNamespaceTokens(projectDir, 'motion'), STALE_OVERRIDDEN_CELL.name);
    expect(cell?.value).toContain('"duration"');
    expect(cell?.value).not.toContain('durationTier');
    // Both halves go: a token holding the regenerated value while still
    // claiming the override would assert a decision over a shape that no
    // longer exists.
    expect(cell?.userOverride).toBeNull();
  }, 60000);

  it('still refuses a rebuild with no stored tokens at all', async () => {
    for (const file of readdirSync(tokensDir(projectDir))) {
      rmSync(join(tokensDir(projectDir), file));
    }

    // Regenerating motion must not manufacture a system out of an empty
    // tokens directory -- that would turn this refusal into a rebuild off
    // one namespace.
    await expect(init({ rebuild: true, agent: true })).rejects.toThrow('No tokens found');
  }, 60000);

  it('leaves init --reset regenerating the whole default system', async () => {
    await init({ reset: true, agent: true });

    const files = readdirSync(tokensDir(projectDir)).filter((f) => f.endsWith('.rafters.json'));
    const written = files.flatMap((f) => readNamespaceTokens(projectDir, f.replace(/\..*$/, '')));

    // Unique names, not raw generator output: the registry is keyed by name,
    // so what reaches disk is the deduplicated set.
    const defaults = generateBaseSystem({});
    expect(written.length).toBe(new Set(sortedNames(defaults.allTokens)).size);
    expect(files.length).toBe(defaults.metadata.namespaces.length);
  }, 60000);
});

describe('rafters init -- writing systems and the Noto stack (#2742)', () => {
  let projectDir = '';
  let originalCwd = '';

  async function readJson(path: string): Promise<Record<string, unknown>> {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf-8'));
    if (typeof parsed !== 'object' || parsed === null) throw new Error(`not an object: ${path}`);
    return parsed as Record<string, unknown>;
  }

  async function readFonts(): Promise<{ scripts?: unknown; imports?: unknown }> {
    const config = await readJson(join(projectDir, '.rafters/config.rafters.json'));
    const fonts: unknown = config.fonts;
    if (typeof fonts !== 'object' || fonts === null) throw new Error('config has no fonts');
    return fonts;
  }

  function fontSans(): { value: unknown; userOverride?: unknown } | undefined {
    return findToken(readNamespaceTokens(projectDir, 'typography'), 'font-sans');
  }

  async function updateDependenciesMock() {
    const { updateDependencies } = await import('../../src/utils/update-dependencies.js');
    return vi.mocked(updateDependencies);
  }

  beforeEach(async () => {
    originalCwd = process.cwd();
    projectDir = await createFixture('vite-no-shadcn');
    process.chdir(projectDir);
    (await updateDependenciesMock()).mockClear();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await cleanupFixture(projectDir);
    projectDir = '';
  });

  it('--agent --scripts writes the scripts, the imports, installs them, and emits font-sans', async () => {
    await init({ agent: true, scripts: 'Latn,Arab,Hebr,Jpan' });

    const packages = [
      '@fontsource-variable/noto-sans',
      '@fontsource-variable/noto-sans-arabic',
      '@fontsource-variable/noto-sans-hebrew',
      '@fontsource-variable/noto-sans-jp',
    ];
    const fonts = await readFonts();
    expect(fonts.scripts).toEqual(['Latn', 'Arab', 'Hebr', 'Jpan']);
    expect(fonts.imports).toEqual(packages);
    expect(await updateDependenciesMock()).toHaveBeenCalledWith(packages, [], { cwd: projectDir });

    const css = await readFile(join(projectDir, '.rafters/output/rafters.css'), 'utf-8');
    expect(css).toContain(
      "--rafters-font-sans: 'Noto Sans Variable', 'Noto Sans Arabic Variable', 'Noto Sans Hebrew Variable', 'Noto Sans JP Variable', sans-serif",
    );
  }, 60000);

  it('--agent without --scripts uses DEFAULT_SCRIPTS', async () => {
    await init({ agent: true });

    const fonts = await readFonts();
    expect(fonts.scripts).toEqual(['Latn', 'Grek', 'Cyrl']);
    expect(fonts.imports).toEqual(['@fontsource-variable/noto-sans']);
    expect(fontSans()?.value).toBe("'Noto Sans Variable', sans-serif");
  }, 60000);

  it('--scripts Latn,Klingon fails naming Klingon and writes nothing', async () => {
    await expect(init({ agent: true, scripts: 'Latn,Klingon' })).rejects.toThrow(/Klingon/);

    expect(readdirSync(projectDir)).not.toContain('.rafters');
    expect(await updateDependenciesMock()).not.toHaveBeenCalled();
  });

  it('keeps a CSS-imported font-sans and records both import sets', async () => {
    const googleUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap';
    await writeFile(
      join(projectDir, 'src/index.css'),
      `@import url("${googleUrl}");\n@import "tailwindcss";\n`,
    );

    await init({ agent: true, scripts: 'Latn,Arab' });

    expect(fontSans()?.value).toBe('Inter');
    expect((await readFonts()).imports).toEqual([
      googleUrl,
      '@fontsource-variable/noto-sans',
      '@fontsource-variable/noto-sans-arabic',
    ]);
    expect(await updateDependenciesMock()).toHaveBeenCalledWith(
      ['@fontsource-variable/noto-sans', '@fontsource-variable/noto-sans-arabic'],
      [],
      { cwd: projectDir },
    );
  }, 60000);

  describe('--rebuild', () => {
    async function setFonts(scripts: unknown, imports: string[] = []): Promise<void> {
      const path = join(projectDir, '.rafters/config.rafters.json');
      const config = await readJson(path);
      config.fonts = { path: null, imports, scripts };
      await writeFile(path, JSON.stringify(config, null, 2));
    }

    it('reproduces the stack and imports from fonts.scripts', async () => {
      await init({ agent: true });
      const googleUrl = 'https://fonts.googleapis.com/css2?family=Inter';
      await setFonts(['Latn', 'Kore'], [googleUrl, '@fontsource-variable/noto-sans-thai']);
      (await updateDependenciesMock()).mockClear();

      await init({ agent: true, rebuild: true });

      const stack = "'Noto Sans Variable', 'Noto Sans KR Variable', sans-serif";
      expect(fontSans()?.value).toBe(stack);
      expect(fontSans()?.userOverride ?? null).toBeNull();
      const css = await readFile(join(projectDir, '.rafters/output/rafters.css'), 'utf-8');
      expect(css).toContain(`--rafters-font-sans: ${stack}`);
      expect((await readFonts()).imports).toEqual([
        googleUrl,
        '@fontsource-variable/noto-sans',
        '@fontsource-variable/noto-sans-kr',
      ]);
      expect(await updateDependenciesMock()).toHaveBeenCalledWith(
        ['@fontsource-variable/noto-sans', '@fontsource-variable/noto-sans-kr'],
        [],
        { cwd: projectDir },
      );
    }, 60000);

    it("keeps a project's own font-sans", async () => {
      await writeFile(
        join(projectDir, 'src/index.css'),
        '@import url("https://fonts.googleapis.com/css2?family=Inter");\n@import "tailwindcss";\n',
      );
      await init({ agent: true });
      expect(fontSans()?.value).toBe('Inter');
      await setFonts(['Latn', 'Arab']);

      await init({ agent: true, rebuild: true });

      expect(fontSans()?.value).toBe('Inter');
      expect((await readFonts()).imports).toEqual([
        '@fontsource-variable/noto-sans',
        '@fontsource-variable/noto-sans-arabic',
      ]);
    }, 60000);

    it('fails on an unknown stored code and writes nothing', async () => {
      await init({ agent: true });
      await setFonts(['Latn', 'Klingon']);
      const configPath = join(projectDir, '.rafters/config.rafters.json');
      const cssPath = join(projectDir, '.rafters/output/rafters.css');
      const configBefore = await readFile(configPath, 'utf-8');
      const cssBefore = await readFile(cssPath, 'utf-8');
      const tokensBefore = readdirSync(tokensDir(projectDir))
        .sort()
        .map((f) => readFileSync(join(tokensDir(projectDir), f), 'utf-8'));

      await expect(init({ agent: true, rebuild: true })).rejects.toThrow(/Klingon/);

      expect(await readFile(configPath, 'utf-8')).toBe(configBefore);
      expect(await readFile(cssPath, 'utf-8')).toBe(cssBefore);
      expect(
        readdirSync(tokensDir(projectDir))
          .sort()
          .map((f) => readFileSync(join(tokensDir(projectDir), f), 'utf-8')),
      ).toEqual(tokensBefore);
    }, 60000);

    it('fails in agent mode when the fonts do not install, and writes nothing', async () => {
      await init({ agent: true });
      await setFonts(['Latn', 'Arab']);
      const configPath = join(projectDir, '.rafters/config.rafters.json');
      const configBefore = await readFile(configPath, 'utf-8');
      const tokensBefore = readdirSync(tokensDir(projectDir))
        .sort()
        .map((f) => readFileSync(join(tokensDir(projectDir), f), 'utf-8'));
      (await updateDependenciesMock()).mockRejectedValueOnce(new Error('install failed'));

      await expect(init({ agent: true, rebuild: true })).rejects.toThrow(
        'pnpm add @fontsource-variable/noto-sans @fontsource-variable/noto-sans-arabic',
      );

      expect(await readFile(configPath, 'utf-8')).toBe(configBefore);
      expect(
        readdirSync(tokensDir(projectDir))
          .sort()
          .map((f) => readFileSync(join(tokensDir(projectDir), f), 'utf-8')),
      ).toEqual(tokensBefore);
    }, 60000);
  });

  describe('a failed font install', () => {
    let savedStdinTTY: boolean | undefined;
    let savedStdoutTTY: boolean | undefined;

    function setTTY(interactive: boolean): void {
      const value = interactive ? true : (undefined as unknown as boolean);
      process.stdin.isTTY = value;
      process.stdout.isTTY = value;
    }

    async function promptsMock() {
      const prompts = await import('@inquirer/prompts');
      return { checkbox: vi.mocked(prompts.checkbox), confirm: vi.mocked(prompts.confirm) };
    }

    /** Interactive init: exports, then writing systems (Latin group + Arabic). */
    async function answerInteractive(continueWithoutFonts: boolean): Promise<void> {
      setTTY(true);
      const { checkbox, confirm } = await promptsMock();
      checkbox.mockReset();
      confirm.mockReset();
      checkbox
        .mockResolvedValueOnce(['tailwind', 'typescript'])
        .mockResolvedValueOnce([['Latn', 'Grek', 'Cyrl'], ['Arab']]);
      confirm.mockResolvedValueOnce(continueWithoutFonts);
      (await updateDependenciesMock()).mockRejectedValueOnce(new Error('install failed'));
    }

    beforeEach(() => {
      savedStdinTTY = process.stdin.isTTY;
      savedStdoutTTY = process.stdout.isTTY;
    });

    afterEach(() => {
      process.stdin.isTTY = savedStdinTTY as boolean;
      process.stdout.isTTY = savedStdoutTTY as boolean;
    });

    it('interactive, yes: names the packages, continues without them, and falls back to sans-serif', async () => {
      await answerInteractive(true);

      await init({});

      const { confirm } = await promptsMock();
      const question = confirm.mock.calls[0]?.[0];
      expect(question?.message).toBe(
        'Could not install @fontsource-variable/noto-sans, @fontsource-variable/noto-sans-arabic. Continue without these fonts?',
      );
      expect(question?.default).toBe(false);
      const fonts = await readFonts();
      expect(fonts.scripts).toEqual(['Latn', 'Grek', 'Cyrl', 'Arab']);
      expect(fonts.imports).toEqual([]);
      expect(fontSans()?.value).toBe('sans-serif');
      const css = await readFile(join(projectDir, '.rafters/output/rafters.css'), 'utf-8');
      expect(css).toContain('--rafters-font-sans: sans-serif');
    }, 60000);

    it('interactive, no: exits with an error and writes nothing', async () => {
      await answerInteractive(false);

      await expect(init({})).rejects.toThrow('Could not install the fonts');

      expect(readdirSync(projectDir)).not.toContain('.rafters');
    }, 60000);

    it('agent mode: fails naming the packages and the pnpm add command, and writes nothing', async () => {
      (await updateDependenciesMock()).mockRejectedValueOnce(new Error('install failed'));

      const attempt = init({ agent: true, scripts: 'Latn,Hebr' });

      await expect(attempt).rejects.toThrow(
        'pnpm add @fontsource-variable/noto-sans @fontsource-variable/noto-sans-hebrew',
      );
      expect(readdirSync(projectDir)).not.toContain('.rafters');
    }, 60000);
  });
});

describe('promptScripts (#2742)', () => {
  it('asks the writing-systems question with Latin, Greek and Cyrillic preselected', async () => {
    const { checkbox } = await import('@inquirer/prompts');
    vi.mocked(checkbox).mockResolvedValueOnce([['Latn', 'Grek', 'Cyrl'], ['Arab']]);

    const scripts = await promptScripts();

    expect(scripts).toEqual(['Latn', 'Grek', 'Cyrl', 'Arab']);
    const call = vi.mocked(checkbox).mock.calls.at(-1)?.[0];
    expect(call?.message).toBe('Which writing systems will this project support?');
    const choices = (call?.choices ?? []) as ReadonlyArray<{ value: string[]; checked?: boolean }>;
    expect(choices.filter((c) => c.checked).map((c) => c.value)).toEqual([
      ['Latn', 'Grek', 'Cyrl'],
    ]);
    expect(choices.flatMap((c) => c.value)).toEqual(Object.keys(SCRIPT_FONTS));
  });
});

describe('rafters init -- preact (#2744)', () => {
  let projectDir = '';
  let originalCwd = '';

  beforeEach(async () => {
    originalCwd = process.cwd();
    projectDir = await createFixture('vite-no-shadcn');
    process.chdir(projectDir);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    process.chdir(originalCwd);
    await cleanupFixture(projectDir);
    projectDir = '';
  });

  it('prints the preact/compat alias requirement once', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await init({ agent: true, framework: 'preact' });

    const notes = logSpy.mock.calls
      .map(([line]) => (typeof line === 'string' ? line : ''))
      .filter((line) => line.includes('"init:framework_note"'));
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain('preact/compat');
    expect(notes[0]).toContain('@preact/preset-vite');
  }, 60000);
});

describe('rafters init -- Tailwind v4 required (#2804)', () => {
  let projectDir = '';
  let originalCwd = '';
  let savedStdinTTY: boolean | undefined;
  let savedStdoutTTY: boolean | undefined;

  beforeEach(async () => {
    originalCwd = process.cwd();
    savedStdinTTY = process.stdin.isTTY;
    savedStdoutTTY = process.stdout.isTTY;
    projectDir = await createFixture('empty-project');
    process.chdir(projectDir);
    vi.clearAllMocks();
  });

  afterEach(async () => {
    process.stdin.isTTY = savedStdinTTY as boolean;
    process.stdout.isTTY = savedStdoutTTY as boolean;
    process.chdir(originalCwd);
    await cleanupFixture(projectDir);
    projectDir = '';
  });

  it('init asks no question before it refuses', async () => {
    process.stdin.isTTY = true;
    process.stdout.isTTY = true;
    const prompts = await import('@inquirer/prompts');

    await expect(init({})).rejects.toThrow(
      "Tailwind CSS v4 isn't installed. Rafters needs it. Install it first (https://tailwindcss.com/docs/installation), then run rafters init again.",
    );
    expect(vi.mocked(prompts.select)).not.toHaveBeenCalled();
    expect(vi.mocked(prompts.confirm)).not.toHaveBeenCalled();
    expect(vi.mocked(prompts.checkbox)).not.toHaveBeenCalled();
  });
});
