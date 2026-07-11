/**
 * Kbd -- decoration for the static score.
 *
 * No config, no state: the oracle ships kbd with no variants and no sizes
 * across all three old-tree targets (astro/react/wc) -- one fixed token
 * class string wrapping a semantic <kbd>. This performance ports that
 * decision rather than inventing knobs no consumer asked for, so there is
 * no `kbd.behavior.ts`: a Config/State pair with zero fields is ceremony
 * nothing downstream reads (Spec 01 -- a static with no real aria
 * projection needs no behavior file; native <kbd> is self-describing, the
 * same reasoning that leaves Container's `as`-driven landmarks unprojected).
 *
 * `bg-muted` + `text-muted-foreground` is the token system's own paired
 * role (fill-resolver.ts: `muted` is a PAIRED_SURFACE_ROLES member whose
 * foreground word IS `muted-foreground`) -- not the bg-*-subtle/solid-
 * foreground contrast defect the oracle audit warns about elsewhere.
 * `text-code-small` is the typography composite the token registry maps to
 * 'kbd' by name (`design-tokens` defaults: `'code-small': ['code-inline',
 * 'kbd']`), so it replaces the oracle's identical class verbatim -- not a
 * repoint, a straight port.
 */
export interface KbdClassSet {
  root: string;
}

const rootClasses =
  'inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 text-code-small text-muted-foreground shadow-sm';

export function kbdClasses(): KbdClassSet {
  return { root: rootClasses };
}
