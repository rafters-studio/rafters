/**
 * The real-Tailwind harness the motion compile checks share: compile the sheet
 * a consumer's Tailwind would emit for one component directory, and name the
 * selector a candidate compiles to.
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
 *  candidate is what makes "did this compile" answerable per candidate rather
 *  than per file. */
export const escapeCandidate = (candidate: string): string =>
  `.${candidate.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)}`;

/** Tailwind scans the REAL component directories, not a fixture built from the
 *  evaluated class strings. The distinction is the whole point: a
 *  `.classes.ts` value is a chain of `'...' + '...'`, and a candidate that a
 *  `+` splits mid-token exists in the runtime string while existing NOWHERE in
 *  the source Tailwind actually reads. Compiling the runtime string would pass
 *  over exactly that bug.
 *
 *  `import.meta.dirname`, not `new URL(..., import.meta.url)`: under Vite the
 *  module's url is a dev-server path, so the URL form silently resolves to
 *  `/src/components/...` and Tailwind scans nothing at all. */
const componentDir = (name: string) => resolve(import.meta.dirname, '../../src/components', name);

/** ONE SHEET PER COMPONENT, deliberately: components share plain utilities
 *  (`opacity-0`, `duration-fast`, `transition-discrete`), so a single sheet
 *  compiled from several directories lets one component's intact candidate
 *  stand in for another's broken one. Compiled separately, each component's
 *  sweep answers only for itself. */
const compiled = new Map<string, Promise<string>>();

export const componentSheet = (component: string): Promise<string> => {
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
};
