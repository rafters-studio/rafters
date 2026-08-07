/**
 * Unit tests for rafters add command
 *
 * Following project test strategy:
 * - Property-based testing with zocker for schema-driven validation
 * - Real fixtures over brittle hardcoded mocks
 * - Test behavior, not implementation details
 */

import { describe, expect, it } from 'vitest';
import { zocker } from 'zocker';
import { z } from 'zod';
import {
  type AddOptions,
  collectDependencies,
  getInstalledNames,
  isAlreadyInstalled,
  resolveRegistryUrl,
  substrateProjectPath,
  trackInstalled,
  transformFileContent,
  transformPath,
} from '../../src/commands/add.js';
import type { RaftersConfig } from '../../src/commands/init.js';
import type { RegistryItem } from '../../src/registry/types.js';
import { RegistryItemSchema } from '../../src/registry/types.js';
import { generateRandomItems, registryFixtures } from '../fixtures/registry.js';

describe('transformFileContent', () => {
  it('transforms ../../primitives/ imports to @/lib/primitives/', () => {
    const input = `import classy from '../../primitives/classy';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import classy from '@/lib/primitives/classy';`);
  });

  it('transforms ../primitives/ imports to @/lib/primitives/', () => {
    const input = `import { cn } from '../primitives/cn';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import { cn } from '@/lib/primitives/cn';`);
  });

  it('transforms ./ component imports to @/components/ui/', () => {
    const input = `import { Button } from './button';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import { Button } from '@/components/ui/button';`);
  });

  it('transforms ./ imports to @/lib/primitives/ when fileType is primitive', () => {
    const input = `import type { BlockType } from './types';`;
    const result = transformFileContent(input, null, 'primitive');
    expect(result).toBe(`import type { BlockType } from '@/lib/primitives/types';`);
  });

  it('transforms ./ imports to @/components/ui/ when fileType is component', () => {
    const input = `import type { BlockType } from './types';`;
    const result = transformFileContent(input, null, 'component');
    expect(result).toBe(`import type { BlockType } from '@/components/ui/types';`);
  });

  it('defaults fileType to component when not specified', () => {
    const input = `import type { BlockType } from './types';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import type { BlockType } from '@/components/ui/types';`);
  });

  it('respects custom primitivesPath for primitive fileType', () => {
    const config = {
      framework: 'vite' as const,
      componentsPath: 'src/components/ui',
      primitivesPath: 'src/lib/primitives',
      compositesPath: 'src/composites',
      cssPath: null,
      shadcn: false,
      exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    };
    const input = `import type { BlockType } from './types';`;
    const result = transformFileContent(input, config, 'primitive');
    expect(result).toBe(`import type { BlockType } from '@/lib/primitives/types';`);
  });

  it('transforms ../ component imports to @/components/ui/', () => {
    const input = `import { Card } from '../card';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import { Card } from '@/components/ui/card';`);
  });

  // Parent imports into a discovered substrate kind rewrite to @/<kind>. Kinds
  // are DATA (passed in), so `lib`/`hooks` are not special-cased in code.
  it('transforms ../<kind>/ substrate imports to @/<kind>/', () => {
    expect(
      transformFileContent(`import { cn } from '../lib/utils';`, null, 'component', process.cwd(), {
        substrateKinds: ['lib'],
      }),
    ).toBe(`import { cn } from '@/lib/utils';`);
    expect(
      transformFileContent(
        `import { useMediaQuery } from '../hooks/use-media-query';`,
        null,
        'component',
        process.cwd(),
        { substrateKinds: ['hooks'] },
      ),
    ).toBe(`import { useMediaQuery } from '@/hooks/use-media-query';`);
  });

  // Behavior-layer components are nested (src/components/<name>/<name>.tsx), so
  // they reach substrate through ../../ (two levels), not ../.
  it('transforms nested ../../<kind>/ imports to @/<kind>/', () => {
    expect(
      transformFileContent(
        `import { createBehavior } from '../../lib/contract';`,
        null,
        'component',
        process.cwd(),
        { substrateKinds: ['lib', 'hooks'] },
      ),
    ).toBe(`import { createBehavior } from '@/lib/contract';`);
    expect(
      transformFileContent(
        `import { useMemory } from '../../hooks/use-memory';`,
        null,
        'component',
        process.cwd(),
        { substrateKinds: ['lib', 'hooks'] },
      ),
    ).toBe(`import { useMemory } from '@/hooks/use-memory';`);
  });

  // A substrate file installs to its own dir (derived from its install path),
  // so ITS `./sibling` resolves there -- a lib file's sibling to @/lib.
  it('resolves a substrate file sibling import to its own install dir', () => {
    expect(
      transformFileContent(
        `import type { Slice } from './compose';`,
        null,
        'substrate',
        process.cwd(),
        {
          installPath: 'lib/contract.ts',
        },
      ),
    ).toBe(`import type { Slice } from '@/lib/compose';`);
    expect(
      transformFileContent(
        `import { keyInput } from './key-input';`,
        null,
        'substrate',
        process.cwd(),
        {
          installPath: 'hooks/use-x.ts',
        },
      ),
    ).toBe(`import { keyInput } from '@/hooks/key-input';`);
  });

  it('resolves a substrate file ../primitives import to @/lib/primitives', () => {
    expect(
      transformFileContent(
        `import { createMemory } from '../primitives/memory';`,
        null,
        'substrate',
        process.cwd(),
        { installPath: 'lib/contract.ts' },
      ),
    ).toBe(`import { createMemory } from '@/lib/primitives/memory';`);
  });

  it('collapses a cross-component ../name/name import to flat layout', () => {
    const input = `import { Card } from '../card/card';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import { Card } from '@/components/ui/card';`);
  });

  it('collapses a cross-component ../name/name.suffix import to flat layout', () => {
    const input = `import { gridClasses } from '../grid/grid.classes';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import { gridClasses } from '@/components/ui/grid.classes';`);
  });

  it('handles multiple imports in one file', () => {
    const input = `import classy from '../../primitives/classy';
import { Button } from './button';
import { Card } from '../card';`;

    const result = transformFileContent(input, null);

    expect(result).toContain(`from '@/lib/primitives/classy'`);
    expect(result).toContain(`from '@/components/ui/button'`);
    expect(result).toContain(`from '@/components/ui/card'`);
  });

  it('preserves non-relative imports', () => {
    const input = `import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';`;

    const result = transformFileContent(input, null);

    expect(result).toContain(`from 'react'`);
    expect(result).toContain(`from '@radix-ui/react-dialog'`);
  });

  it('handles double quotes', () => {
    const input = `import classy from "../../primitives/classy";`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import classy from '@/lib/primitives/classy';`);
  });
});

describe('substrate install-path routing', () => {
  const config = {
    framework: 'vite' as const,
    componentsPath: 'src/components/ui',
    primitivesPath: 'src/lib/primitives',
    compositesPath: 'src/composites',
    rulesPath: 'src/lib/rules',
    cssPath: null,
    shadcn: false,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
  };

  it('routes any substrate kind under the source root, derived from componentsPath', () => {
    // The kind is the served path prefix; source root is componentsPath minus
    // components/ui. Works for any kind (lib, hooks, or a new one) with no rule.
    expect(substrateProjectPath('lib/contract.ts', config)).toBe('src/lib/contract.ts');
    expect(substrateProjectPath('hooks/use-memory.ts', config)).toBe('src/hooks/use-memory.ts');
    expect(substrateProjectPath('slices/toggle.ts', config)).toBe('src/slices/toggle.ts');
  });

  it('transformPath still routes primitives to the configured primitives path', () => {
    expect(transformPath('lib/primitives/classy.ts', config)).toBe('src/lib/primitives/classy.ts');
  });
});

describe('collectDependencies', () => {
  it('collects npm dependencies from registry items', () => {
    const items = [registryFixtures.dialogComponent()];
    const { dependencies } = collectDependencies(items);

    // Dependencies are now versioned (e.g., package@version)
    expect(dependencies).toContain('@radix-ui/react-dialog@2.1.0');
  });

  it('includes versioned framework dependencies', () => {
    // Add react dep to fixture for this test
    const button = registryFixtures.buttonComponent();
    button.files[0].dependencies = ['react@19.2.0'];
    const { dependencies } = collectDependencies([button]);

    // Framework deps now included with versions
    expect(dependencies).toContain('react@19.2.0');
  });

  it('deduplicates dependencies across items', () => {
    const items = [registryFixtures.buttonComponent(), registryFixtures.dialogComponent()];
    const { dependencies } = collectDependencies(items);

    // Should not have duplicates
    const uniqueDeps = [...new Set(dependencies)];
    expect(dependencies).toEqual(uniqueDeps);
  });

  it('returns sorted dependencies', () => {
    const items = [registryFixtures.dialogComponent()];
    const { dependencies } = collectDependencies(items);

    const sorted = [...dependencies].sort();
    expect(dependencies).toEqual(sorted);
  });

  it('collects devDependencies from registry items', () => {
    const button = registryFixtures.buttonComponent();
    button.files[0].devDependencies = ['vitest', '@testing-library/react'];
    const { devDependencies } = collectDependencies([button]);
    expect(devDependencies).toContain('vitest');
    expect(devDependencies).toContain('@testing-library/react');
  });

  it('handles items without devDependencies field gracefully', () => {
    // Simulates older registry data that lacks the devDependencies field
    const button = registryFixtures.buttonComponent();
    const file = button.files[0] as Omit<RegistryItem['files'][0], 'devDependencies'>;
    const items = [{ ...button, files: [file as RegistryItem['files'][0]] }];
    const { devDependencies } = collectDependencies(items);
    expect(Array.isArray(devDependencies)).toBe(true);
  });

  // Property-based test: for all valid items, dependencies are extracted
  it('PROPERTY: always returns arrays for dependencies', () => {
    const items = generateRandomItems(20);

    const result = collectDependencies(items);

    expect(Array.isArray(result.dependencies)).toBe(true);
    expect(Array.isArray(result.devDependencies)).toBe(true);
  });
});

describe('isAlreadyInstalled', () => {
  const baseConfig: RaftersConfig = {
    framework: 'react-router',
    componentsPath: 'components/ui',
    primitivesPath: 'lib/primitives',
    compositesPath: 'composites',
    cssPath: null,
    shadcn: false,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    installed: {
      components: ['button', 'card'],
      primitives: ['classy'],
    },
  };

  it('returns true for installed component', () => {
    const item: RegistryItem = {
      name: 'button',
      type: 'ui',
      primitives: ['classy'],
      files: [],
    };
    expect(isAlreadyInstalled(baseConfig, item)).toBe(true);
  });

  it('returns true for installed primitive', () => {
    const item: RegistryItem = {
      name: 'classy',
      type: 'primitive',
      primitives: [],
      files: [],
    };
    expect(isAlreadyInstalled(baseConfig, item)).toBe(true);
  });

  it('returns true for installed rule (not the primitives bucket)', () => {
    const config: RaftersConfig = {
      ...baseConfig,
      installed: { components: [], primitives: [], composites: [], rules: ['email'] },
    };
    const item: RegistryItem = { name: 'email', type: 'rule', primitives: [], files: [] };
    expect(isAlreadyInstalled(config, item)).toBe(true);
  });

  it('returns false for uninstalled component', () => {
    const item: RegistryItem = { name: 'dialog', type: 'ui', primitives: [], files: [] };
    expect(isAlreadyInstalled(baseConfig, item)).toBe(false);
  });

  it('returns false when config is null', () => {
    const item: RegistryItem = { name: 'button', type: 'ui', primitives: [], files: [] };
    expect(isAlreadyInstalled(null, item)).toBe(false);
  });

  it('returns false when installed field is missing', () => {
    const configNoInstalled: RaftersConfig = {
      ...baseConfig,
      installed: undefined,
    };
    const item: RegistryItem = { name: 'button', type: 'ui', primitives: [], files: [] };
    expect(isAlreadyInstalled(configNoInstalled, item)).toBe(false);
  });
});

describe('resolveRegistryUrl', () => {
  const minimal = (registryUrl?: string): RaftersConfig => ({
    framework: 'react-router',
    componentsPath: 'components/ui',
    primitivesPath: 'lib/primitives',
    compositesPath: 'composites',
    cssPath: null,
    shadcn: false,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    registryUrl,
  });

  it('prefers the CLI flag over config', () => {
    const opts: AddOptions = { registryUrl: 'http://flag' };
    expect(resolveRegistryUrl(opts, minimal('http://cfg'))).toBe('http://flag');
  });

  it('falls back to config when no flag is given', () => {
    expect(resolveRegistryUrl({}, minimal('http://cfg'))).toBe('http://cfg');
  });

  it('returns undefined when neither is set (RegistryClient applies the default)', () => {
    expect(resolveRegistryUrl({}, null)).toBeUndefined();
    expect(resolveRegistryUrl({}, minimal(undefined))).toBeUndefined();
  });
});

describe('trackInstalled', () => {
  it('adds components to installed list', () => {
    const config: RaftersConfig = {
      framework: 'react-router',
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
      compositesPath: 'composites',
      cssPath: null,
      shadcn: false,
      exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
      installed: { components: [], primitives: [] },
    };

    const items: RegistryItem[] = [registryFixtures.buttonComponent()];

    trackInstalled(config, items);

    expect(config.installed?.components).toContain('button');
  });

  it('adds primitives to installed list', () => {
    const config: RaftersConfig = {
      framework: 'react-router',
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
      compositesPath: 'composites',
      cssPath: null,
      shadcn: false,
      exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
      installed: { components: [], primitives: [] },
    };

    const items: RegistryItem[] = [registryFixtures.classyPrimitive()];

    trackInstalled(config, items);

    expect(config.installed?.primitives).toContain('classy');
  });

  it('adds rules to the rules bucket, not primitives', () => {
    const config: RaftersConfig = {
      framework: 'react-router',
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
      compositesPath: 'composites',
      cssPath: null,
      shadcn: false,
      exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
      installed: { components: [], primitives: [] },
    };

    const items: RegistryItem[] = [{ name: 'email', type: 'rule', primitives: [], files: [] }];

    trackInstalled(config, items);

    expect(config.installed?.rules).toContain('email');
    expect(config.installed?.primitives).not.toContain('email');
  });

  it('deduplicates when adding same item twice', () => {
    const config: RaftersConfig = {
      framework: 'react-router',
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
      compositesPath: 'composites',
      cssPath: null,
      shadcn: false,
      exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
      installed: { components: ['button'], primitives: ['classy'] },
    };

    const items: RegistryItem[] = [
      registryFixtures.buttonComponent(),
      registryFixtures.classyPrimitive(),
    ];

    trackInstalled(config, items);

    expect(config.installed?.components.filter((c) => c === 'button')).toHaveLength(1);
    expect(config.installed?.primitives.filter((p) => p === 'classy')).toHaveLength(1);
  });

  it('sorts installed lists alphabetically', () => {
    const config: RaftersConfig = {
      framework: 'react-router',
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
      compositesPath: 'composites',
      cssPath: null,
      shadcn: false,
      exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
      installed: { components: [], primitives: [] },
    };

    const items: RegistryItem[] = [
      registryFixtures.dialogComponent(),
      registryFixtures.buttonComponent(),
      registryFixtures.cardComponent(),
    ];

    trackInstalled(config, items);

    expect(config.installed?.components).toEqual(['button', 'card', 'dialog']);
  });

  it('initializes installed field when missing', () => {
    const config: RaftersConfig = {
      framework: 'react-router',
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
      compositesPath: 'composites',
      cssPath: null,
      shadcn: false,
      exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    };

    const items: RegistryItem[] = [registryFixtures.buttonComponent()];

    trackInstalled(config, items);

    expect(config.installed).toBeDefined();
    expect(config.installed?.components).toContain('button');
  });
});

describe('RegistryItemSchema validation', () => {
  // Property-based test: zocker-generated data always validates
  it('PROPERTY: zocker-generated items always parse successfully', () => {
    const items = zocker(z.array(RegistryItemSchema).length(50)).generate();

    for (const item of items) {
      expect(() => RegistryItemSchema.parse(item)).not.toThrow();
    }
  });

  it('validates required fields', () => {
    expect(() =>
      RegistryItemSchema.parse({
        name: 'test',
        type: 'ui',
        primitives: [],
        files: [],
      }),
    ).not.toThrow();
  });

  it('rejects invalid type', () => {
    expect(() =>
      RegistryItemSchema.parse({
        name: 'test',
        type: 'invalid-type',
        primitives: [],
        files: [],
      }),
    ).toThrow();
  });
});

describe('registry fixtures', () => {
  it('generates valid button component fixture', () => {
    const button = registryFixtures.buttonComponent();

    expect(button.name).toBe('button');
    expect(button.type).toBe('ui');
    expect(button.files.length).toBeGreaterThan(0);
    expect(button.files[0].path).toBe('components/ui/button.tsx');
    expect(button.primitives).toContain('classy');
  });

  it('generates valid classy primitive fixture', () => {
    const classy = registryFixtures.classyPrimitive();

    expect(classy.name).toBe('classy');
    expect(classy.type).toBe('primitive');
    expect(classy.files.length).toBeGreaterThan(0);
    expect(classy.files[0].path).toBe('lib/primitives/classy.ts');
  });

  it('generates valid registry index fixture', () => {
    const index = registryFixtures.registryIndex();

    expect(index.name).toBe('rafters');
    expect(index.components).toContain('button');
    expect(index.primitives).toContain('classy');
  });

  // Property-based test: all fixtures validate against schema
  it('PROPERTY: all generated fixtures validate against schema', () => {
    const fixtures = [
      registryFixtures.buttonComponent(),
      registryFixtures.classyPrimitive(),
      registryFixtures.cardComponent(),
      registryFixtures.dialogComponent(),
    ];

    for (const fixture of fixtures) {
      expect(() => RegistryItemSchema.parse(fixture)).not.toThrow();
    }
  });
});

describe('getInstalledNames', () => {
  const baseConfig: RaftersConfig = {
    framework: 'react-router',
    componentsPath: 'components/ui',
    primitivesPath: 'lib/primitives',
    compositesPath: 'composites',
    cssPath: null,
    shadcn: false,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    installed: {
      components: ['button', 'card'],
      primitives: ['classy'],
    },
  };

  it('returns combined components and primitives', () => {
    const names = getInstalledNames(baseConfig);
    expect(names).toContain('button');
    expect(names).toContain('card');
    expect(names).toContain('classy');
    expect(names).toHaveLength(3);
  });

  it('returns sorted names', () => {
    const names = getInstalledNames(baseConfig);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it('deduplicates names that appear in both lists', () => {
    const config: RaftersConfig = {
      ...baseConfig,
      installed: {
        components: ['classy'],
        primitives: ['classy'],
      },
    };
    const names = getInstalledNames(config);
    expect(names).toEqual(['classy']);
  });

  it('returns empty array when config is null', () => {
    expect(getInstalledNames(null)).toEqual([]);
  });

  it('returns empty array when installed field is missing', () => {
    const config: RaftersConfig = { ...baseConfig, installed: undefined };
    expect(getInstalledNames(config)).toEqual([]);
  });

  it('returns empty array when both lists are empty', () => {
    const config: RaftersConfig = {
      ...baseConfig,
      installed: { components: [], primitives: [], composites: [] },
    };
    expect(getInstalledNames(config)).toEqual([]);
  });

  it('includes composites in installed names', () => {
    const config: RaftersConfig = {
      ...baseConfig,
      installed: {
        components: ['button'],
        primitives: ['classy'],
        composites: ['hero-banner'],
      },
    };
    expect(getInstalledNames(config)).toEqual(['button', 'classy', 'hero-banner']);
  });

  // The rules and substrate buckets were silently dropped, so any name living
  // only in one of them was a name `--update-all` could never refresh. Mirrors
  // the composites case above; the expectation is sorted because the function
  // sorts.
  it('includes rules in installed names', () => {
    const config: RaftersConfig = {
      ...baseConfig,
      installed: {
        components: ['button'],
        primitives: ['classy'],
        rules: ['spacing'],
      },
    };
    expect(getInstalledNames(config)).toEqual(['button', 'classy', 'spacing']);
  });

  it('includes substrate in installed names', () => {
    const config: RaftersConfig = {
      ...baseConfig,
      installed: {
        components: ['button'],
        primitives: ['classy'],
        substrate: ['motion'],
      },
    };
    expect(getInstalledNames(config)).toEqual(['button', 'classy', 'motion']);
  });

  it('includes every bucket at once', () => {
    const config: RaftersConfig = {
      ...baseConfig,
      installed: {
        components: ['button'],
        primitives: ['classy'],
        composites: ['hero-banner'],
        rules: ['spacing'],
        substrate: ['motion'],
      },
    };
    expect(getInstalledNames(config)).toEqual([
      'button',
      'classy',
      'hero-banner',
      'motion',
      'spacing',
    ]);
  });
});

describe('composites support', () => {
  const compositeConfig: RaftersConfig = {
    framework: 'vite',
    componentsPath: 'src/components/ui',
    primitivesPath: 'src/lib/primitives',
    compositesPath: 'src/composites',
    cssPath: null,
    shadcn: false,
    exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
    installed: {
      components: [],
      primitives: [],
      composites: ['hero-banner'],
    },
  };

  it('isAlreadyInstalled returns true for installed composite', () => {
    const item: RegistryItem = {
      name: 'hero-banner',
      type: 'composite',
      primitives: [],
      files: [],
    };
    expect(isAlreadyInstalled(compositeConfig, item)).toBe(true);
  });

  it('isAlreadyInstalled returns false for uninstalled composite', () => {
    const item: RegistryItem = {
      name: 'login-form',
      type: 'composite',
      primitives: [],
      files: [],
    };
    expect(isAlreadyInstalled(compositeConfig, item)).toBe(false);
  });

  it('trackInstalled adds composites to installed list', () => {
    const config: RaftersConfig = {
      ...compositeConfig,
      installed: { components: [], primitives: [], composites: [] },
    };
    const items: RegistryItem[] = [
      { name: 'login-form', type: 'composite', primitives: [], files: [] },
      { name: 'hero-banner', type: 'composite', primitives: [], files: [] },
    ];
    trackInstalled(config, items);
    expect(config.installed?.composites).toEqual(['hero-banner', 'login-form']);
  });

  it('trackInstalled deduplicates composites', () => {
    const config: RaftersConfig = {
      ...compositeConfig,
      installed: { components: [], primitives: [], composites: ['hero-banner'] },
    };
    const items: RegistryItem[] = [
      { name: 'hero-banner', type: 'composite', primitives: [], files: [] },
    ];
    trackInstalled(config, items);
    expect(config.installed?.composites).toEqual(['hero-banner']);
  });
});
