import type { KbdConfig, KbdState } from './kbd.behavior';

export interface KbdClassSet {
  root: string;
}

/**
 * The whole cap: an inline, bordered, muted chip carrying the key text at the
 * code-small type scale. Ported verbatim from the oracle
 * (`src/old/ui/kbd.classes.ts`). Every token is a semantic role utility
 * (`border-border`, `bg-muted`, `ts-code-small`, `text-muted-foreground`) --
 * no raw spacing, color, or z-index utility.
 */
export const kbdBaseClasses =
  'inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 ts-code-small text-muted-foreground shadow-sm';

/**
 * Shape per Spec 01: `kbdClasses(config, state) => { root }`. Kbd carries no
 * variants or sizes, so the projection is the base cap string regardless of
 * config or state -- the same single class string every performance reads.
 */
export function kbdClasses(_config: KbdConfig, _state: KbdState): KbdClassSet {
  return { root: kbdBaseClasses };
}
