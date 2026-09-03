import type { NavigationMenuConfig, NavigationMenuState } from './navigation-menu.behavior';

export interface NavigationMenuClassSet {
  root: string;
  list: string;
  item: string;
  trigger: string;
  triggerChevron: string;
  content: string;
  link: string;
  viewportWrapper: string;
  viewport: string;
  indicator: string;
  indicatorArrow: string;
}

const rootClasses = 'relative z-10 flex max-w-max flex-1 items-center justify-center';

const listClasses = 'group flex flex-1 list-none items-center justify-center gap-1';

// The item is the hover/focus SCOPE for its own panel (#2148): trigger and
// content are siblings inside it, and the panel is absolutely positioned flush
// against the item's bottom edge, so the pointer never crosses a gap travelling
// from trigger to panel -- which matters here, because navigation-menu's close
// carries no linger to forgive a flicker. The named group is a marker, not a
// style: `relative` is still the only declaration the item makes.
const itemClasses = 'relative group/navigation-item';

// motion.jsonl `navigation-menu / trigger / hover` -- color (background, text,
// border), fast, standard. Composed generics on a transition. Replaces
// `motion-hover`, one of the 13 semantic motion tokens deleted by ruling
// (2026-08-02) that kept compiling by accident.
const triggerClasses =
  'group inline-flex h-11 @md:h-10 w-max items-center justify-center rounded-md ' +
  'bg-background px-4 py-2 text-label-medium ts-label-medium cursor-pointer ' +
  'transition-colors duration-fast ease-standard ' +
  'hover:bg-accent hover:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed ' +
  'data-[state=open]:bg-accent-subtle';

// NO ROW. The matrix gives accordion and select a `chevron / open <-> closed`
// rotate row; navigation-menu has none, so the flip is instant. `motion-toggle`
// used to sit here, borrowing the panel's item-change tier on the reasoning that
// "the chevron turns with the panel it announces" -- which is deriving an
// assignment nobody made, on top of a retired token. A moment with no row does
// not move (docs/MOTION.md:150). Reported on #2293: if the chevron should turn,
// motion.jsonl needs the row.
const triggerChevronClasses = 'ml-1 h-3 w-3 group-data-[state=open]:rotate-180';

// MOTION IS CSS AND TOKENS ONLY (#2148). The hover-intent delay that used to be
// a JavaScript timer reading the `hover-intent` delay token through the DOM is
// now `transition-delay` on the reveal rule, and the reveal itself is the item's
// native `:hover` / `:focus-within` -- so the panel opens on a JS-off page.
//
// THE CELL IS THE SPEC. These utilities are the consumption of two rows of
// packages/ui/docs/spec/matrix/motion.jsonl -- navigation-menu / panel /
// "closed -> open" (moderate, enter, delay hover-intent) and navigation-menu /
// panel / "open -> closed" (fast, exit, NO delay).
//
// PARTIAL: both rows name the movement `fade + zoom`, and only the FADE runs
// here. The zoom half would need a scale on a reveal that has to work with
// JavaScript disabled, and the rows' `extent-pop` is carried by the scale-in /
// scale-out KEYFRAMES rather than named by a class -- so on a transition path
// there is nothing to attach it to, and nothing here should name it. The
// generator still emits `navigation-menu-panel-open`/`-close` as scale cells;
// they go unreferenced because this panel consumes its presence as a transition.
// Reported on #2293.
//
// The old
// `createMenuHoverIntent` reused the hover-intent delay for its CLOSE timer as
// well; that was drift against the matrix, and the close is now immediate --
// still animated over the fast/exit cell, just not held back.
//
// The CLOSED cell is the base rule and the OPEN cell is the reveal rule, which
// is how a CSS transition already works: whichever rule currently applies owns
// the duration/curve/delay of the change into it.
//
// The `data-[state=open]` path is the JS-on half: keyboard opening (ArrowDown,
// Enter/Space), a controlled `value`, and a tap on a device with no hover all
// reach the panel through the score rather than through `:hover`. It carries the
// open cell's duration and curve, but NOT the hover-intent delay: that delay
// filters accidental pointer transit, and there is no accidental ArrowDown. The
// hover path keeps its delay regardless, because `group-hover` is the rule that
// declares it and nothing in the data-state group competes for transition-delay.
//
// `data-dismissed` is the WCAG 1.4.13 dismissal flag, raised by an Escape
// keydown (or by a click that closed the panel) and cleared by a deliberate
// reopen or by the pointer/focus leaving the menu. It is raised on THE DISMISSED
// PANEL, never on the root: a root-scoped force-hide blanked every panel in the
// bar at once, so after Escape a hover onto a SIBLING trigger revealed nothing
// until the pointer left the whole nav -- a dead zone the retired hover-intent
// never had. It has to win against reveal rules that are one class-level more
// specific, hence the important form: after Escape the focus returns to the
// trigger, so `:focus-within` still matches and only a force-hide can put the
// panel back down.
//
// `pointer-events` rides the transition (`transition-[opacity,pointer-events]` +
// `transition-discrete`) instead of being switched by the reveal rule, the same
// way tooltip's and hover-card's do and for the same reason: a rule that owns
// both makes the panel click-through the instant `:hover` drops, while it is
// still most of the way opaque. On the transition it flips only once the fade
// passes its halfway point, so what is visible is what is clickable. The reveal
// rules re-state `transition-property: opacity` so the flip back to `auto` on
// OPEN is immediate rather than half a fade late.
//
// NO `hidden` on the panel and no component-level reduced-motion escape.
// `hidden` is UA-stylesheet `display: none` -- it pulls the panel out of the
// accessibility tree and out of rendering, which both breaks the aria-labelledby
// announcement and kills the transition. Reduced motion is the token sheet's own
// responsibility (the exporter's REDUCED_MOTION_ZEROED set), never a
// component-level media query.
const contentClasses =
  'absolute left-0 top-full w-max rounded-md border bg-popover p-2 text-popover-foreground shadow-lg ' +
  'opacity-0 pointer-events-none transition-[opacity,pointer-events] transition-discrete ' +
  'duration-fast ease-exit ' +
  'group-hover/navigation-item:opacity-100 group-hover/navigation-item:pointer-events-auto ' +
  'group-hover/navigation-item:transition-opacity ' +
  'group-hover/navigation-item:duration-moderate group-hover/navigation-item:ease-enter ' +
  'group-hover/navigation-item:delay-hover-intent ' +
  'group-focus-within/navigation-item:opacity-100 ' +
  'group-focus-within/navigation-item:pointer-events-auto ' +
  'group-focus-within/navigation-item:transition-opacity ' +
  'group-focus-within/navigation-item:duration-moderate ' +
  'group-focus-within/navigation-item:ease-enter ' +
  'group-focus-within/navigation-item:delay-hover-intent ' +
  'data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto ' +
  'data-[state=open]:transition-opacity ' +
  'data-[state=open]:duration-moderate data-[state=open]:ease-enter ' +
  'data-[dismissed=true]:opacity-0! ' +
  'data-[dismissed=true]:pointer-events-none!';

// The link is a second interactive surface inside the same component, and its
// hover is the same movement, properties, tier and curve the `trigger / hover`
// row assigns -- so it carries that row rather than a value invented for it. The
// matrix has no separate `link` row; reported on #2293.
const linkClasses =
  'block select-none space-y-1 rounded-md p-3 no-underline outline-none ' +
  'transition-colors duration-fast ease-standard ' +
  'hover:bg-accent hover:text-accent-foreground ' +
  'active:bg-muted active:text-foreground ' +
  'focus-visible:bg-accent focus-visible:text-accent-foreground ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'data-[active]:bg-accent-subtle';

const viewportWrapperClasses = 'absolute left-0 top-full';

// NO DISTINCT MOMENT for motion.jsonl `navigation-menu / panel / open -> open
// (item change)` (crossfade + size morph, moderate*, standard*, extent
// structural (panel delta), and an EMPTY `properties` list).
//
// That row describes shadcn's shared viewport: one surface that stays put and
// morphs between panel sizes while the open item changes. #2148 replaced that
// architecture with one panel per item, absolutely positioned flush under its
// own item -- so an item change IS panel-A's `open -> closed` plus panel-B's
// `closed -> open`, both already consumed on `contentClasses` above. The
// viewport survives only as the shadcn-compatible surface: no panel portals
// into it (navigation-menu.tsx:417-426 renders it with no content of its own,
// and the Astro performance has no viewport at all), so nothing it holds has a
// size that could morph.
//
// Consuming the row a second time here would be one row driving two moments --
// the vocabulary drift the animation-key dedup exists to prevent. Reported on
// #2293 rather than resolved: the row and the component disagree about whether
// this moment exists, and that disagreement belongs to the matrix.
const viewportClasses =
  'h-min w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg';

// NO ROW. The indicator is a marker that mounts while some panel is open and
// unmounts when none is (navigation-menu.tsx:437-452); nothing computes a
// position for it, so there is no travel to time. It carried `motion-toggle`
// (retired) on the claim that it consumed the item-change row -- see the
// viewport note above for why that row has no moment here. Reported on #2293.
const indicatorClasses =
  'absolute bottom-0 z-10 flex h-2.5 items-end justify-center overflow-hidden';

const indicatorArrowClasses = 'top-full h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md';

export function navigationMenuClasses(
  _config: NavigationMenuConfig,
  _state: NavigationMenuState,
): NavigationMenuClassSet {
  return {
    root: rootClasses,
    list: listClasses,
    item: itemClasses,
    trigger: triggerClasses,
    triggerChevron: triggerChevronClasses,
    content: contentClasses,
    link: linkClasses,
    viewportWrapper: viewportWrapperClasses,
    viewport: viewportClasses,
    indicator: indicatorClasses,
    indicatorArrow: indicatorArrowClasses,
  };
}

/** shadcn-compatible export: the trigger's class string, for consumers who
 *  style a NavigationMenuLink as a trigger. */
export function navigationMenuTriggerStyle(): string {
  return triggerClasses;
}
