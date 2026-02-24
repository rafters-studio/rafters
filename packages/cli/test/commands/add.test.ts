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
  collectDependencies,
  isAlreadyInstalled,
  trackInstalled,
  transformFileContent,
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

  it('transforms ../ component imports to @/components/ui/', () => {
    const input = `import { Card } from '../card';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import { Card } from '@/components/ui/card';`);
  });

  it('transforms ../lib/ imports to @/lib/', () => {
    const input = `import { cn } from '../lib/utils';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import { cn } from '@/lib/utils';`);
  });

  it('transforms ../hooks/ imports to @/hooks/', () => {
    const input = `import { useMediaQuery } from '../hooks/use-media-query';`;
    const result = transformFileContent(input, null);
    expect(result).toBe(`import { useMediaQuery } from '@/hooks/use-media-query';`);
  });

  it('does not incorrectly transform ../lib/ as component import', () => {
    const input = `import { cn } from '../lib/utils';`;
    const result = transformFileContent(input, null);
    // Should NOT be @/components/ui/lib/utils
    expect(result).not.toContain('@/components/ui/lib');
    expect(result).toBe(`import { cn } from '@/lib/utils';`);
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
    const items: RegistryItem[] = [
      {
        name: 'test-component',
        type: 'registry:ui',
        primitives: [],
        files: [
          {
            path: 'components/ui/test.tsx',
            content: '',
            dependencies: ['react@19.2.0'],
            devDependencies: ['vitest', '@testing-library/react'],
          },
        ],
      },
    ];
    const { devDependencies } = collectDependencies(items);
    expect(devDependencies).toContain('vitest');
    expect(devDependencies).toContain('@testing-library/react');
  });

  it('handles items without devDependencies field gracefully', () => {
    // Simulates older registry data that lacks the devDependencies field
    const items: RegistryItem[] = [
      {
        name: 'old-component',
        type: 'registry:ui',
        primitives: [],
        files: [
          {
            path: 'components/ui/old.tsx',
            content: '',
            dependencies: ['react@19.2.0'],
          } as RegistryItem['files'][0],
        ],
      },
    ];
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
      type: 'registry:ui',
      primitives: ['classy'],
      files: [],
    };
    expect(isAlreadyInstalled(baseConfig, item)).toBe(true);
  });

  it('returns true for installed primitive', () => {
    const item: RegistryItem = {
      name: 'classy',
      type: 'registry:primitive',
      primitives: [],
      files: [],
    };
    expect(isAlreadyInstalled(baseConfig, item)).toBe(true);
  });

  it('returns false for uninstalled component', () => {
    const item: RegistryItem = { name: 'dialog', type: 'registry:ui', primitives: [], files: [] };
    expect(isAlreadyInstalled(baseConfig, item)).toBe(false);
  });

  it('returns false when config is null', () => {
    const item: RegistryItem = { name: 'button', type: 'registry:ui', primitives: [], files: [] };
    expect(isAlreadyInstalled(null, item)).toBe(false);
  });

  it('returns false when installed field is missing', () => {
    const configNoInstalled: RaftersConfig = {
      ...baseConfig,
      installed: undefined,
    };
    const item: RegistryItem = { name: 'button', type: 'registry:ui', primitives: [], files: [] };
    expect(isAlreadyInstalled(configNoInstalled, item)).toBe(false);
  });
});

describe('trackInstalled', () => {
  it('adds components to installed list', () => {
    const config: RaftersConfig = {
      framework: 'react-router',
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
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
      cssPath: null,
      shadcn: false,
      exports: { tailwind: true, typescript: true, dtcg: false, compiled: false },
      installed: { components: [], primitives: [] },
    };

    const items: RegistryItem[] = [registryFixtures.classyPrimitive()];

    trackInstalled(config, items);

    expect(config.installed?.primitives).toContain('classy');
  });

  it('deduplicates when adding same item twice', () => {
    const config: RaftersConfig = {
      framework: 'react-router',
      componentsPath: 'components/ui',
      primitivesPath: 'lib/primitives',
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
        type: 'registry:ui',
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
    expect(button.type).toBe('registry:ui');
    expect(button.files.length).toBeGreaterThan(0);
    expect(button.files[0].path).toBe('components/ui/button.tsx');
    expect(button.primitives).toContain('classy');
  });

  it('generates valid classy primitive fixture', () => {
    const classy = registryFixtures.classyPrimitive();

    expect(classy.name).toBe('classy');
    expect(classy.type).toBe('registry:primitive');
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
