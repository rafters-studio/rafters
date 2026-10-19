/**
 * Project fixtures for CLI testing
 *
 * Creates temporary directory structures that simulate real projects
 * for testing framework detection, shadcn configuration, etc.
 */

import { randomBytes } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Framework } from '../../src/utils/detect.js';

export type FixtureType =
  | 'nextjs-shadcn-v4'
  | 'nextjs-no-shadcn'
  | 'vite-shadcn-v4'
  | 'vite-no-shadcn'
  | 'remix-shadcn-v4'
  | 'react-router-shadcn-v4'
  | 'astro-shadcn-v4'
  | 'wc-no-shadcn'
  | 'vanilla-no-shadcn'
  | 'empty-project'
  | 'tailwind-v3-error';

interface PackageJson {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface ShadcnComponentsJson {
  $schema: string;
  style: string;
  rsc: boolean;
  tsx: boolean;
  tailwind: {
    config: string;
    css: string;
    baseColor: string;
    cssVariables: boolean;
  };
  aliases: {
    components: string;
    utils: string;
  };
}

/** Build-script decisions for the fixtures' dependencies (pnpm 11 `allowBuilds`). */
const PNPM_BUILD_POLICY = `allowBuilds:
  esbuild: false
  sharp: false
  workerd: false
`;

interface FixtureTemplate {
  packageJson: PackageJson;
  componentsJson?: ShadcnComponentsJson;
  files?: Record<string, string>;
}

const SHADCN_COMPONENTS_JSON: ShadcnComponentsJson = {
  $schema: 'https://ui.shadcn.com/schema.json',
  style: 'default',
  rsc: true,
  tsx: true,
  tailwind: {
    config: 'tailwind.config.ts',
    css: 'src/app/globals.css',
    baseColor: 'slate',
    cssVariables: true,
  },
  aliases: {
    components: '@/components',
    utils: '@/lib/utils',
  },
};

const TEMPLATES: Record<FixtureType, FixtureTemplate> = {
  'nextjs-shadcn-v4': {
    packageJson: {
      name: 'test-nextjs-shadcn',
      version: '0.1.0',
      dependencies: {
        next: '^15.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        tailwindcss: '^4.0.0',
        typescript: '^5.9.0',
      },
    },
    componentsJson: SHADCN_COMPONENTS_JSON,
    files: {
      'src/app/globals.css': '@import "tailwindcss";\n',
      'tailwind.config.ts': 'export default {};\n',
    },
  },

  'nextjs-no-shadcn': {
    packageJson: {
      name: 'test-nextjs-plain',
      version: '0.1.0',
      dependencies: {
        next: '^15.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        tailwindcss: '^4.0.0',
        typescript: '^5.9.0',
      },
    },
    files: {
      'src/app/globals.css': '@import "tailwindcss";\n',
    },
  },

  'vite-shadcn-v4': {
    packageJson: {
      name: 'test-vite-shadcn',
      version: '0.1.0',
      dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        vite: '^6.0.0',
        tailwindcss: '^4.0.0',
        typescript: '^5.9.0',
      },
    },
    componentsJson: {
      ...SHADCN_COMPONENTS_JSON,
      rsc: false,
      tailwind: {
        ...SHADCN_COMPONENTS_JSON.tailwind,
        css: 'src/index.css',
      },
    },
    files: {
      'src/index.css': '@import "tailwindcss";\n',
      'vite.config.ts': 'export default {};\n',
    },
  },

  'vite-no-shadcn': {
    packageJson: {
      name: 'test-vite-plain',
      version: '0.1.0',
      dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        vite: '^6.0.0',
        tailwindcss: '^4.0.0',
        typescript: '^5.9.0',
      },
    },
    files: {
      'src/index.css': '@import "tailwindcss";\n',
      'vite.config.ts': 'export default {};\n',
    },
  },

  'remix-shadcn-v4': {
    packageJson: {
      name: 'test-remix-shadcn',
      version: '0.1.0',
      dependencies: {
        '@remix-run/node': '^2.0.0',
        '@remix-run/react': '^2.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        '@remix-run/dev': '^2.0.0',
        tailwindcss: '^4.0.0',
        typescript: '^5.9.0',
      },
    },
    componentsJson: {
      ...SHADCN_COMPONENTS_JSON,
      rsc: false,
      tailwind: {
        ...SHADCN_COMPONENTS_JSON.tailwind,
        css: 'app/tailwind.css',
      },
    },
    files: {
      'app/tailwind.css': '@import "tailwindcss";\n',
    },
  },

  'astro-shadcn-v4': {
    packageJson: {
      name: 'test-astro-shadcn',
      version: '0.1.0',
      dependencies: {
        astro: '^5.0.0',
      },
      devDependencies: {
        tailwindcss: '^4.0.0',
        typescript: '^5.9.0',
      },
    },
    componentsJson: {
      ...SHADCN_COMPONENTS_JSON,
      rsc: false,
      tailwind: {
        ...SHADCN_COMPONENTS_JSON.tailwind,
        css: 'src/styles/global.css',
      },
    },
    files: {
      'src/styles/global.css': '@import "tailwindcss";\n',
    },
  },

  'react-router-shadcn-v4': {
    packageJson: {
      name: 'test-react-router-shadcn',
      version: '0.1.0',
      dependencies: {
        'react-router': '^7.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        tailwindcss: '^4.0.0',
        typescript: '^5.9.0',
      },
    },
    componentsJson: {
      ...SHADCN_COMPONENTS_JSON,
      rsc: false,
      tailwind: {
        ...SHADCN_COMPONENTS_JSON.tailwind,
        css: 'app/app.css',
      },
    },
    files: {
      'app/app.css': '@import "tailwindcss";\n',
    },
  },

  'wc-no-shadcn': {
    packageJson: {
      name: 'test-wc',
      version: '0.1.0',
      dependencies: {
        lit: '^3.0.0',
      },
      devDependencies: {
        tailwindcss: '^4.0.0',
        typescript: '^5.9.0',
      },
    },
    files: {
      'src/index.css': '@import "tailwindcss";\n',
    },
  },

  'vanilla-no-shadcn': {
    packageJson: {
      name: 'test-vanilla',
      version: '0.1.0',
      devDependencies: {
        tailwindcss: '^4.0.0',
        typescript: '^5.9.0',
      },
    },
    files: {
      'src/index.css': '@import "tailwindcss";\n',
    },
  },

  'empty-project': {
    packageJson: {
      name: 'test-empty',
      version: '0.1.0',
    },
  },

  'tailwind-v3-error': {
    packageJson: {
      name: 'test-tailwind-v3',
      version: '0.1.0',
      dependencies: {
        next: '^15.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
      },
      devDependencies: {
        tailwindcss: '^3.4.0',
        typescript: '^5.9.0',
      },
    },
    files: {
      'tailwind.config.js':
        'module.exports = { content: ["./src/**/*.{js,ts,jsx,tsx}"], theme: { extend: {} }, plugins: [] };\n',
    },
  },
};

/**
 * Generate a unique fixture directory path
 */
function getFixturePath(type: FixtureType): string {
  const id = randomBytes(4).toString('hex');
  return join(tmpdir(), `rafters-fixture-${type}-${id}`);
}

/**
 * Create a fixture directory with the specified project configuration
 */
export async function createFixture(type: FixtureType): Promise<string> {
  const template = TEMPLATES[type];
  if (!template) {
    throw new Error(`Unknown fixture type: ${type}`);
  }

  const fixturePath = getFixturePath(type);

  // Create root directory
  await mkdir(fixturePath, { recursive: true });

  // Write package.json
  await writeFile(join(fixturePath, 'package.json'), JSON.stringify(template.packageJson, null, 2));

  // A real pnpm 11 project records its build-script decisions; without them
  // `pnpm add` exits non-zero on ERR_PNPM_IGNORED_BUILDS, and `rafters init`
  // installs its fonts with `pnpm add` (#2742). No `packages:` key, so the
  // fixture is not a workspace root.
  await writeFile(join(fixturePath, 'pnpm-workspace.yaml'), PNPM_BUILD_POLICY);

  // Write components.json if shadcn is configured
  if (template.componentsJson) {
    await writeFile(
      join(fixturePath, 'components.json'),
      JSON.stringify(template.componentsJson, null, 2),
    );
  }

  // Write additional files
  if (template.files) {
    for (const [relativePath, content] of Object.entries(template.files)) {
      const filePath = join(fixturePath, relativePath);
      const dirPath = join(filePath, '..');
      await mkdir(dirPath, { recursive: true });
      await writeFile(filePath, content);
    }
  }

  return fixturePath;
}

/**
 * Clean up a fixture directory
 * Idempotent - safe to call multiple times
 */
export async function cleanupFixture(path: string): Promise<void> {
  try {
    await rm(path, { recursive: true, force: true });
  } catch {
    // Ignore errors - directory may already be cleaned up
  }
}

/**
 * Run a function with a fixture, automatically cleaning up afterward
 */
export async function withFixture<T>(
  type: FixtureType,
  fn: (path: string) => Promise<T>,
): Promise<T> {
  const fixturePath = await createFixture(type);
  try {
    return await fn(fixturePath);
  } finally {
    await cleanupFixture(fixturePath);
  }
}

/**
 * Get the expected detection results for a fixture type
 */
export function getExpectedDetection(type: FixtureType): {
  framework: Framework;
  hasShadcn: boolean;
  tailwindVersion: string | null;
  isTailwindV3: boolean;
} {
  switch (type) {
    case 'nextjs-shadcn-v4':
      return { framework: 'next', hasShadcn: true, tailwindVersion: '4.0.0', isTailwindV3: false };
    case 'nextjs-no-shadcn':
      return { framework: 'next', hasShadcn: false, tailwindVersion: '4.0.0', isTailwindV3: false };
    case 'vite-shadcn-v4':
      return { framework: 'vite', hasShadcn: true, tailwindVersion: '4.0.0', isTailwindV3: false };
    case 'vite-no-shadcn':
      return { framework: 'vite', hasShadcn: false, tailwindVersion: '4.0.0', isTailwindV3: false };
    case 'remix-shadcn-v4':
      return { framework: 'remix', hasShadcn: true, tailwindVersion: '4.0.0', isTailwindV3: false };
    case 'react-router-shadcn-v4':
      return {
        framework: 'react-router',
        hasShadcn: true,
        tailwindVersion: '4.0.0',
        isTailwindV3: false,
      };
    case 'astro-shadcn-v4':
      return { framework: 'astro', hasShadcn: true, tailwindVersion: '4.0.0', isTailwindV3: false };
    // `wc` detects from `lit` (or `@lit/*`) without React.
    case 'wc-no-shadcn':
      return { framework: 'wc', hasShadcn: false, tailwindVersion: '4.0.0', isTailwindV3: false };
    // `vanilla` has no package.json signature; it stays a `--framework` / prompt pick.
    case 'vanilla-no-shadcn':
      return {
        framework: 'unknown',
        hasShadcn: false,
        tailwindVersion: '4.0.0',
        isTailwindV3: false,
      };
    case 'empty-project':
      return { framework: 'unknown', hasShadcn: false, tailwindVersion: null, isTailwindV3: false };
    case 'tailwind-v3-error':
      return { framework: 'next', hasShadcn: false, tailwindVersion: '3.4.0', isTailwindV3: true };
  }
}

/**
 * All available fixture types for iteration
 */
export const ALL_FIXTURE_TYPES: FixtureType[] = [
  'nextjs-shadcn-v4',
  'nextjs-no-shadcn',
  'vite-shadcn-v4',
  'vite-no-shadcn',
  'remix-shadcn-v4',
  'react-router-shadcn-v4',
  'astro-shadcn-v4',
  'wc-no-shadcn',
  'vanilla-no-shadcn',
  'empty-project',
  'tailwind-v3-error',
];

/**
 * Fixtures that produce a fresh `rafters init` install end-to-end from
 * a clean state. Excludes `empty-project` (no detection signal) and
 * `tailwind-v3-error` (init is supposed to refuse before generating
 * outputs). Integration tests that assert generated-output validity
 * iterate this list.
 */
export const INSTALL_FRESH_FIXTURES: FixtureType[] = [
  'nextjs-shadcn-v4',
  'nextjs-no-shadcn',
  'vite-shadcn-v4',
  'vite-no-shadcn',
  'remix-shadcn-v4',
  'react-router-shadcn-v4',
  'astro-shadcn-v4',
  'wc-no-shadcn',
  'vanilla-no-shadcn',
];
