/**
 * Registry fixtures generated from Zod schemas using zocker
 *
 * Following project test strategy: property-based testing with zocker
 * for schema-driven validation. Real fixtures over brittle hardcoded mocks.
 */

import { zocker } from 'zocker';
import {
  RegistryFileSchema,
  RegistryIndexSchema,
  RegistryItemSchema,
} from '../../src/registry/types.js';

/**
 * Create fixture factory with override support
 * Pattern from test/utils/index.ts
 */
export function createFixtureFactory<T>(generator: () => T, _baseSeed = 42) {
  return {
    generate(overrides?: Partial<T>): T {
      const base = generator();
      return overrides ? { ...base, ...overrides } : base;
    },
    generateMany(count: number): T[] {
      return Array.from({ length: count }, () => this.generate());
    },
  };
}

// Base generators from Zod schemas
const registryFileGenerator = zocker(RegistryFileSchema).setSeed(42);
const registryItemGenerator = zocker(RegistryItemSchema).setSeed(42);
const registryIndexGenerator = zocker(RegistryIndexSchema).setSeed(42);

/**
 * Factory for generating registry files from schema
 */
export const registryFileFactory = createFixtureFactory(() => registryFileGenerator.generate());

/**
 * Factory for generating registry items from schema
 */
export const registryItemFactory = createFixtureFactory(() => registryItemGenerator.generate());

/**
 * Factory for generating registry index from schema
 */
export const registryIndexFactory = createFixtureFactory(() => registryIndexGenerator.generate());

/**
 * Pre-configured fixtures for common test scenarios
 * These use the factories with specific overrides for readable tests
 */
export const registryFixtures = {
  /**
   * Button component with classy primitive dependency
   */
  buttonComponent: () =>
    registryItemFactory.generate({
      name: 'button',
      type: 'ui',
      primitives: ['classy'],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/button.tsx',
          content: `import classy from '../../primitives/classy';
export const Button = () => <button>Click me</button>;`,
          dependencies: [],
          devDependencies: [],
        }),
      ],
    }),

  /**
   * Classy primitive (class name utility)
   */
  classyPrimitive: () =>
    registryItemFactory.generate({
      name: 'classy',
      type: 'primitive',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'lib/primitives/classy.ts',
          content: `export default function classy(...classes: string[]) { return classes.filter(Boolean).join(' '); }`,
          dependencies: [],
          devDependencies: [],
        }),
      ],
    }),

  /**
   * Card component (no dependencies)
   */
  cardComponent: () =>
    registryItemFactory.generate({
      name: 'card',
      type: 'ui',
      primitives: [],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/card.tsx',
          content: `export const Card = () => <div>Card</div>;`,
          dependencies: [],
          devDependencies: [],
        }),
      ],
    }),

  /**
   * Dialog component with external npm dependency
   */
  dialogComponent: () =>
    registryItemFactory.generate({
      name: 'dialog',
      type: 'ui',
      primitives: ['classy'],
      files: [
        registryFileFactory.generate({
          path: 'components/ui/dialog.tsx',
          content: `import * as DialogPrimitive from '@radix-ui/react-dialog';
export const Dialog = DialogPrimitive.Root;`,
          dependencies: ['@radix-ui/react-dialog@2.1.0'],
          devDependencies: [],
        }),
      ],
    }),

  /**
   * Registry index for testing
   */
  registryIndex: () =>
    registryIndexFactory.generate({
      name: 'rafters',
      homepage: 'https://rafters.studio',
      components: ['button', 'card', 'dialog'],
      primitives: ['classy'],
    }),
};

/**
 * Generate random valid registry items for property-based testing
 */
export function generateRandomItems(count: number) {
  return registryItemFactory.generateMany(count);
}
