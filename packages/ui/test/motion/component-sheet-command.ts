/**
 * The compiled component sheet, handed to a browser spec. `componentSheet`
 * (./component-sheet.ts) runs the REAL Tailwind CLI, which only exists on the
 * node side; a browser spec that needs a computed style off that sheet asks for
 * it through this command and injects the string it gets back.
 *
 * The harness module is loaded through the project's Vite module runner rather
 * than imported here: this file is bundled into vitest.config.ts, and the
 * workspace packages the harness reads export TypeScript source.
 */
import { resolve } from 'node:path';
import type { BrowserCommand } from 'vitest/node';

const harnessOf = (value: unknown): ((component: string) => Promise<unknown>) => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'componentSheet' in value &&
    typeof value.componentSheet === 'function'
  ) {
    const { componentSheet } = value;
    return async (component) => componentSheet(component);
  }
  throw new Error('component-sheet.ts does not export componentSheet');
};

export const componentSheet: BrowserCommand<[component: string]> = async (
  { project },
  component,
) => {
  const harness = harnessOf(
    await project.import<unknown>(resolve(project.config.root, 'test/motion/component-sheet.ts')),
  );
  const css = await harness(component);
  if (typeof css !== 'string') throw new Error('componentSheet did not return a string');
  return css;
};

declare module 'vitest/browser' {
  interface BrowserCommands {
    componentSheet: (component: string) => Promise<string>;
  }
}
