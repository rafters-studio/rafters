import type { CollapsibleConfig, CollapsibleState } from './collapsible.behavior';

export interface CollapsibleClassSet {
  /** The wrapper region. Layout is the consumer's; the wrapper is structural. */
  root: string;
  /** The disclosure trigger button: hover feedback, focus ring, disabled dim. */
  trigger: string;
  /** The revealed region: clips its content and animates the height axis. */
  content: string;
}

// The wrapper owns no visual of its own -- it is the styling anchor for the
// data-state/data-disabled the score projects, which consumers key off. It is
// also the NAMED GROUP the content reveal reads its state from: the score
// projects `data-state` onto the root ONLY (collapsible.behavior.ts's aria gives
// the content nothing but `data-disabled`), so a `data-[state=open]:` variant on
// the content class would match nothing and read as consumed while doing
// nothing. `group` is a marker, not a style; the wrapper still declares no
// visual.
const rootClasses = 'group';

// motion.jsonl `collapsible / trigger / hover` -- color (background, text,
// border), fast, standard. The curve was missing before (a bare `duration-fast`
// left the browser's default ease in place); `motion-reduce:transition-none` is
// gone because the reduced-motion law is written once on the duration leaf and a
// component-level escape only fights it.
const triggerClasses =
  'inline-flex items-center hover:bg-muted ' +
  'transition-colors duration-fast ease-standard ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'ring-offset-background focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

// motion.jsonl `collapsible / content / closed -> open` (reveal (y) + fade,
// normal, enter) and `collapsible / content / open -> closed` (reveal (y) +
// fade, moderate, exit) -- the same pair accordion's panel carries, transcribed
// the same way.
//
// REVEAL IS A TRANSITION, NOT A KEYFRAME (docs/MOTION.md:115): the row's
// `grid-rows / height` property animates as `grid-template-rows` 0fr<->1fr,
// because `height: auto` is not transitionable. `opacity` is the fade half. The
// rule matching the state being transitioned INTO owns that direction's tier and
// curve. The oracle's `animate-collapsible-up/down` are not ported -- they were
// never defined in the token system.
//
// `[&>*]:min-h-0 [&>*]:overflow-hidden` stands in for the inner clip box
// accordion has as `contentInner` and this class set has no part for: without a
// child that may shrink below its min-content height and clips its own overflow,
// the 0fr track cannot collapse and the transition is geometrically inert.
//
// KNOWN GAP, NOT MINE TO FIX: every performance either unmounts the content or
// sets `hidden` on it while closed (collapsible.tsx:206-213 and its Astro/WC
// counterparts). `display: none` blocks transitions outright, so none of the
// below runs until the content stays mounted the way accordion's does (present
// in both states, `inert` when collapsed). Reported on #2277.
const contentClasses =
  'grid [&>*]:min-h-0 [&>*]:overflow-hidden ' +
  'transition-[grid-template-rows,opacity] ' +
  'grid-rows-[minmax(0,0fr)] opacity-0 duration-moderate ease-exit ' +
  'group-data-[state=open]:grid-rows-[minmax(0,1fr)] group-data-[state=open]:opacity-100 ' +
  'group-data-[state=open]:duration-normal group-data-[state=open]:ease-enter';

/** The view: class strings keyed by config/state. No logic. */
export function collapsibleClasses(
  _config: CollapsibleConfig,
  _state: CollapsibleState,
): CollapsibleClassSet {
  return {
    root: rootClasses,
    trigger: triggerClasses,
    content: contentClasses,
  };
}
