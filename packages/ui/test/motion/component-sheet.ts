/**
 * Shared harness for the motion compile suites: point the REAL Tailwind CLI
 * (`registryToCompiled`, the same harness
 * packages/design-tokens/test/exporters/motion-utilities.test.ts uses) at a REAL
 * component directory and read the emitted sheet.
 *
 * Tailwind scans the component directory, not a fixture built from the
 * evaluated class strings. A `.classes.ts` value is a chain of `'...' + '...'`,
 * and a candidate that a `+` splits mid-token exists in the runtime string while
 * existing NOWHERE in the source Tailwind actually reads; compiling the runtime
 * string would pass over exactly that bug.
 *
 * ONE SHEET PER COMPONENT, deliberately: components share plain utilities, so a
 * sheet compiled from several directories lets one component's intact candidate
 * stand in for another's broken one.
 */
import { resolve } from 'node:path';
import { generateBaseSystem } from '@rafters/design-tokens/generators/index';
import {
  contrastPlugin,
  invertPlugin,
  registryToCompiled,
  scalePlugin,
  statePlugin,
  TokenRegistry,
} from '@rafters/design-tokens';

/** Tailwind escapes every character outside [A-Za-z0-9_-] with a backslash, so
 *  `data-[state=open]:opacity-100` is emitted as
 *  `.data-\[state\=open\]\:opacity-100`. Reconstructing the selector from the
 *  candidate is what makes "did this compile" answerable per candidate. */
export const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

/** `import.meta.dirname`, not `new URL(..., import.meta.url)`: under Vite the
 *  module's url is a dev-server path, so the URL form silently resolves to
 *  `/src/components/...` and Tailwind scans nothing at all. */
const componentDir = (name: string): string =>
  resolve(import.meta.dirname, '../../src/components', name);

const compiled = new Map<string, Promise<string>>();

/** The compiled sheet for one component directory, memoized per component. */
export function componentSheet(component: string): Promise<string> {
  const existing = compiled.get(component);
  if (existing) return existing;
  const pending = (async () => {
    const system = generateBaseSystem({});
    const registry = new TokenRegistry(system.allTokens, [
      scalePlugin,
      contrastPlugin,
      statePlugin,
      invertPlugin,
    ]);
    return registryToCompiled(registry, { contentSources: [componentDir(component)] });
  })();
  compiled.set(component, pending);
  return pending;
}
