import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateBaseSystem, generateNamespaces } from '@rafters/design-tokens';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanSourceCssBlocks,
  ensureTailwindCli,
  init,
  isTailwindCliInstalled,
} from '../../src/commands/init.js';
import { cleanupFixture, createFixture } from '../fixtures/projects.js';

vi.mock('@inquirer/prompts', () => ({
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('../../src/utils/update-dependencies.js', () => ({
  updateDependencies: vi.fn().mockResolvedValue(undefined),
}));

describe('isTailwindCliInstalled', () => {
  it('returns a boolean without throwing', () => {
    const result = isTailwindCliInstalled();
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

describe('cleanSourceCssBlocks (#1647 -- import must clean theme-inline and :root layers)', () => {
  it('removes @theme inline blocks entirely', () => {
    const css = `@import "x.css";

@theme inline {
	--color-background: var(--background);
	--color-foreground: var(--foreground);
}

.keep { color: red; }
`;
    const out = cleanSourceCssBlocks(css);
    expect(out).not.toContain('@theme inline');
    expect(out).not.toContain('--color-background');
    expect(out).toContain('.keep { color: red; }');
  });

  it('strips all custom properties from :root but keeps other declarations', () => {
    const css = `:root {
	/* alias layer */
	--huttspawn-background: var(--color-sand-100);
	--huttspawn-primary: var(--color-blaze-500);
	color-scheme: dark;
}
`;
    const out = cleanSourceCssBlocks(css);
    expect(out).not.toContain('--huttspawn-background');
    expect(out).not.toContain('--huttspawn-primary');
    expect(out).toContain('color-scheme: dark;');
    expect(out).toContain(':root');
  });

  it('removes a :root block entirely when only custom properties (and comments) remain', () => {
    const css = `.before { display: block; }

:root {
	/* Huttspawn light mode tokens */
	--a: 1;
	--b: var(--color-mud-900);
}

.after { display: flex; }
`;
    const out = cleanSourceCssBlocks(css);
    expect(out).not.toContain(':root');
    expect(out).not.toContain('--a: 1');
    expect(out).toContain('.before { display: block; }');
    expect(out).toContain('.after { display: flex; }');
  });

  it('cleans :root nested inside @media and drops the emptied @media shell', () => {
    const css = `@media (prefers-color-scheme: dark) {
	:root {
		--surface: black;
	}
}

.keep { color: blue; }
`;
    const out = cleanSourceCssBlocks(css);
    expect(out).not.toContain('--surface');
    expect(out).not.toContain('@media (prefers-color-scheme: dark)');
    expect(out).toContain('.keep { color: blue; }');
  });

  it('leaves plain @theme blocks alone', () => {
    const css = `@theme {
	--font-sans: "Inter", sans-serif;
}
`;
    const out = cleanSourceCssBlocks(css);
    expect(out).toContain('@theme {');
    expect(out).toContain('--font-sans');
  });

  it('handles multi-line custom property values', () => {
    const css = `:root {
	--gradient: linear-gradient(
		to bottom,
		red,
		blue
	);
	color-scheme: light;
}
`;
    const out = cleanSourceCssBlocks(css);
    expect(out).not.toContain('--gradient');
    expect(out).not.toContain('linear-gradient');
    expect(out).toContain('color-scheme: light;');
  });
});

/**
 * The stored motion namespace as a pre-0.3.0 rafters left it: a cell whose
 * value predates `duration.kind` (0.2.3 wrote `durationTier`, which the
 * Tailwind exporter now reads as `duration.kind null`), an easing whose name
 * has since been retired from the enum (which fails TokenSchema on load), and
 * one still-current easing carrying a designer override.
 */
const STALE_MOTION_FILE = {
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
  ],
};

type StoredToken = { name: string; value: string; userOverride: unknown };

function tokensDir(projectDir: string): string {
  return join(projectDir, '.rafters', 'tokens');
}

function readNamespaceTokens(projectDir: string, namespace: string): StoredToken[] {
  const file = JSON.parse(
    readFileSync(join(tokensDir(projectDir), `${namespace}.rafters.json`), 'utf8'),
  ) as { tokens: StoredToken[] };
  return file.tokens;
}

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

  function seedStaleMotion(): void {
    writeFileSync(
      join(tokensDir(projectDir), 'motion.rafters.json'),
      `${JSON.stringify(STALE_MOTION_FILE, null, 2)}\n`,
      'utf8',
    );
  }

  it('regenerates motion instead of reloading stale tokens', async () => {
    seedStaleMotion();

    await expect(init({ rebuild: true, agent: true })).resolves.not.toThrow();

    const rebuilt = readNamespaceTokens(projectDir, 'motion');
    const generated = generateNamespaces(['motion']).allTokens;
    expect(sortedNames(rebuilt)).toEqual(sortedNames(generated));
  }, 60000);

  it('drops stored motion tokens the generator no longer emits', async () => {
    seedStaleMotion();

    await init({ rebuild: true, agent: true });

    const names = sortedNames(readNamespaceTokens(projectDir, 'motion'));
    expect(names).not.toContain('motion-easing-ease-in');

    const cell = readNamespaceTokens(projectDir, 'motion').find(
      (t) => t.name === 'motion-cell-dialog-content-open',
    );
    expect(cell?.value).toContain('"duration"');
    expect(cell?.value).not.toContain('durationTier');
  }, 60000);

  it('carries a userOverride and its value onto the regenerated token', async () => {
    seedStaleMotion();

    await init({ rebuild: true, agent: true });

    const overridden = readNamespaceTokens(projectDir, 'motion').find(
      (t) => t.name === 'motion-easing-standard',
    );
    expect(overridden?.userOverride).toEqual(STALE_MOTION_FILE.tokens[2].userOverride);
    // The override's value is what the token emits -- carrying the record
    // without the value would leave the token claiming a decision it no
    // longer applies.
    expect(overridden?.value).toBe(STALE_MOTION_FILE.tokens[2].value);
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
