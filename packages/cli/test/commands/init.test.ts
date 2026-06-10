import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanSourceCssBlocks,
  ensureTailwindCli,
  isTailwindCliInstalled,
} from '../../src/commands/init.js';

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
