import classy from '../../primitives/classy';
import type { KbdConfig, KbdState } from './kbd.behavior';

export interface KbdClassSet {
  root: string;
}

/**
 * The whole cap: an inline, bordered, muted chip carrying the key text at the
 * code-small type scale. Ported verbatim from the oracle
 * (the old kbd). Every token is a semantic role utility
 * (`border-border`, `bg-muted`, `text-code-small ts-code-small`, `text-muted-foreground`) --
 * no raw spacing, color, or z-index utility.
 */
const kbdStructureClasses =
  'inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-code-small ts-code-small shadow-sm';

/** The cap's base surface; a fill replaces it. */
const kbdSurfaceClasses = 'border-border bg-muted text-muted-foreground';

export const kbdBaseClasses = `${kbdStructureClasses} ${kbdSurfaceClasses}`;

/**
 * Shape per Spec 01: `kbdClasses(config, state) => { root }`. Kbd carries no
 * variants or sizes, so the projection is the base cap string, its surface
 * replaced by a fill when one wins -- the same single class string every performance reads.
 */
export function kbdClasses(config: KbdConfig, _state: KbdState): KbdClassSet {
  return { root: `${kbdStructureClasses} ${classy.fill(config.fill, kbdSurfaceClasses)}` };
}
