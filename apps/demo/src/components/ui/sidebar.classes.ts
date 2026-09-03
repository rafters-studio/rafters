import type { SidebarSide, SidebarVariant } from '@/components/ui/sidebar.behavior';

/**
 * The sidebar view. Class strings only -- no logic, no state reads. The panel
 * carries BOTH axes' data hooks (Spec: one panel, not two): the mobile overlay
 * off-canvas slide keys off `data-mobile`, and the desktop rail collapse keys
 * off `data-state`/`data-collapsible`, each scoped to its breakpoint so a single
 * element serves both viewports.
 *
 * MOTION IS DECLARED, and every declaration below names a motion.jsonl row.
 * This file used to carry three vocabularies at once -- the oracle's literals
 * (`duration-200`), a rafters generic with no curve (`duration-fast` alone),
 * stock Tailwind curves, `animate-pulse`, and `motion-reduce:` escapes on both
 * mechanisms. The six rows sidebar is assigned, and where each lands:
 *
 *   item / active change  color, fast, standard   -> the four button classes
 *   item / hover          color, fast, standard   -> the same four (same
 *                                                    movement, properties, tier
 *                                                    and curve -- one
 *                                                    declaration serves both)
 *   root / expand         slide (x), normal, enter -> panelBaseClasses
 *   root / collapse       slide (x), moderate, exit -> panelBaseClasses
 *   overlay (mobile) / open   normal, spring-smooth -> carried by Sheet
 *   overlay (mobile) / close  moderate, exit        -> carried by Sheet
 *
 * NO `motion-reduce:` anywhere, on either mechanism. The reduced-motion law is
 * written once on the duration and delay leaves; a component-level escape fights
 * it, and `motion-reduce:animate-none` fights it destructively -- `animation:
 * none` resets the whole shorthand and discards the zeroed duration with it.
 */
export interface SidebarClassSet {
  provider: string;
  trigger: string;
  rail: string;
  mobilePanel: string;
  inset: string;
  header: string;
  footer: string;
  content: string;
  group: string;
  groupLabel: string;
  groupAction: string;
  groupContent: string;
  menu: string;
  menuItem: string;
  menuAction: string;
  menuActionShowOnHover: string;
  menuBadge: string;
  menuSkeleton: string;
  menuSkeletonIcon: string;
  menuSkeletonText: string;
  menuSub: string;
  menuSubItem: string;
  separator: string;
}

const providerClasses = 'group/sidebar-wrapper flex min-h-svh w-full';

// The one panel. Mobile: a fixed overlay panel (a modal dialog while open; the
// bind `hidden`s it when closed). Desktop (md:): a sticky rail whose width
// collapses.
//
// motion.jsonl `sidebar / root / expand` (normal, enter) and `sidebar / root /
// collapse` (moderate, exit). The rail stays mounted through both, so this is a
// transition, and the rule matching the state being transitioned INTO owns that
// direction: the base rule is the expanded rail (normal/enter), and
// `data-[state=collapsed]` owns the collapse (moderate/exit).
//
// THE SLIDE HALF CANNOT BE EXPRESSED, and that is a vocabulary gap rather than a
// choice made here. Both rows name the movement `slide (x)` over `transform:
// translate`, and there is NO SLIDE KEYFRAME: all seventeen `--animate-*` keys
// the exporter emits are scale, fade, grow, pulse, spin and caret-blink.
// defaults.ts leaves per-side slide out deliberately rather than approximating a
// shape, and the matrix calls a physical side a defect, so no class exists to
// name and none is invented here.
//
// What IS consumed is the tier and the curve, on the property this rail actually
// moves: it collapses its own `width` (w-64 -> w-12 for the icon rail, -> w-0
// for offcanvas), which is what the rows' structural extent ("rail width")
// describes and what the sibling content reflows against. No literal, no
// physical side, no invented name. Reported on #2302.
//
// `md:`-scoped, because below that breakpoint the same element is the fixed
// mobile overlay, whose presence Sheet owns (see mobilePanelClasses) -- a
// width transition there would time a panel that is `hidden` when closed.
const panelBaseClasses =
  'flex flex-col bg-sidebar text-sidebar-foreground ' +
  'fixed inset-y-0 z-depth-modal h-svh w-72 ' +
  'md:sticky md:top-0 md:z-depth-navigation md:h-svh md:w-64 ' +
  'md:transition-[width] md:duration-normal md:ease-enter ' +
  'md:data-[state=collapsed]:duration-moderate md:data-[state=collapsed]:ease-exit ' +
  'md:data-[state=collapsed]:data-[collapsible=icon]:w-12 ' +
  'md:data-[state=collapsed]:data-[collapsible=offcanvas]:w-0 ' +
  'md:data-[state=collapsed]:data-[collapsible=offcanvas]:overflow-hidden';

const panelSideClasses: Record<SidebarSide, string> = {
  left: 'left-0 border-r border-sidebar-border',
  right: 'right-0 border-l border-sidebar-border',
};

const panelVariantClasses: Record<SidebarVariant, string> = {
  sidebar: '',
  floating: 'md:m-2 md:h-[calc(100svh-theme(spacing.4))] md:rounded-lg md:border md:shadow-sm',
  inset: 'md:m-2 md:h-[calc(100svh-theme(spacing.4))] md:rounded-lg md:shadow-sm',
};

/** The panel class: the axis-carrying base plus the anchored side and the
 *  surface variant. The single source of the panel class -- every performance
 *  calls this, so side and variant (decoration the score never touches) are the
 *  only arguments. */
export function sidebarPanelClasses(side: SidebarSide, variant: SidebarVariant): string {
  return `${panelBaseClasses} ${panelSideClasses[side]} ${panelVariantClasses[variant]}`.trim();
}

const triggerClasses = 'inline-flex size-7 items-center justify-center';

// The mobile overlay surface: the sidebar fill laid over the merged Sheet's own
// positioning (Sheet owns the modal frame; this only paints the sidebar chrome).
//
// motion.jsonl `sidebar / overlay (mobile) / open` (slide + fade (scrim),
// normal, spring-smooth) and `.../ close` (moderate, exit) are consumed on THE
// NODE THIS CLASS LANDS ON, by Sheet rather than by this string: sidebar.tsx
// passes `classes.mobilePanel` as SheetContent's className, and sheet.classes.ts
// already carries `data-[state=open]:animate-fade-in-normal-spring-smooth
// data-[state=closed]:animate-fade-out-moderate-exit`. Those are the same two
// (shape, tier, curve) triples the generator emits for sidebar's own cells --
// `sidebar-overlay-mobile-open`/`-close` deduplicate onto the identical utility
// names -- so the moment is animated exactly once, on the right element.
//
// Restating them here would put two identical animation shorthands on one node
// and double-drive `opacity`. Reported on #2302 as consumed-by-composition.
//
// PARTIAL, and the missing half is the same vocabulary gap the rail has: the
// rows say `slide + fade (scrim)` and only the FADE runs. defaults.ts says so in
// the cell's own `meaning` -- "the fade is emitted and the slide is not, because
// the vocabulary has no side-agnostic slide shape". Four of sidebar's six rows
// name a slide; none of the four can express it.
const mobilePanelClasses = 'flex h-full w-full flex-col bg-sidebar text-sidebar-foreground';

// The desktop drag rail: a hairline hit target on the collapsing edge. Hidden on
// mobile (the overlay owns dismissal there). NO ROW for the hairline's own hover
// -- the matrix's sidebar rows cover `item`, `root` and the mobile overlay, and
// a drag rail is none of the three -- so the color swap on `hover:after:` is
// instant. Reported on #2302.
const railClasses =
  'absolute inset-y-0 z-depth-navigation hidden w-4 -translate-x-1/2 cursor-ew-resize md:flex ' +
  'after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 hover:after:bg-sidebar-border ' +
  'group-data-[side=left]:-right-4 group-data-[side=right]:left-0';

const insetClasses = 'relative flex min-h-svh w-full flex-1 flex-col bg-background';

const headerClasses = 'flex flex-col gap-2 p-2';
const footerClasses = 'flex flex-col gap-2 p-2';

const contentClasses =
  'flex min-h-0 flex-1 flex-col gap-2 overflow-auto ' +
  'group-data-[collapsible=icon]:overflow-hidden';

const groupClasses = 'relative flex w-full min-w-0 flex-col p-2';

const groupLabelClasses =
  'flex h-8 shrink-0 items-center rounded-md px-2 text-label-small ts-label-small text-sidebar-foreground/70 ' +
  'outline-none ring-sidebar-ring focus-visible:ring-2 ' +
  'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0';

// `sidebar / item / hover` -- color, fast, standard. `transition-transform` was
// the wrong property as well as an incomplete generic: nothing on this button
// transforms; what changes on hover is `background` and `text`, exactly the
// properties the row names.
const groupActionClasses =
  'absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 ' +
  'text-sidebar-foreground outline-none ring-sidebar-ring transition-colors duration-fast ' +
  'ease-standard hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
  'focus-visible:ring-2 after:absolute after:-inset-2 md:after:hidden ' +
  'group-data-[collapsible=icon]:hidden';

const groupContentClasses = 'w-full';

const menuClasses = 'flex w-full min-w-0 flex-col gap-1';

const menuItemClasses = 'group/menu-item relative';

// `sidebar / item / hover` AND `sidebar / item / active change`, both color,
// fast, standard. The two rows assign the same movement, properties, tier and
// curve on the same element, so one `transition-colors` declaration carries
// both: `hover:` paints the first, `data-[active=true]:` the second, and the
// transition times whichever fires. Reported on #2302 -- the active-change row
// is marked `proposed` and unreviewed.
const menuButtonBaseClasses =
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left ' +
  'text-label-medium ts-label-medium outline-none ring-sidebar-ring transition-colors duration-fast ' +
  'ease-standard hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
  'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none ' +
  'aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium ' +
  'data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 ' +
  'group-data-[collapsible=icon]:p-2';

const menuButtonSizeClasses: Record<'default' | 'sm' | 'lg', string> = {
  default: '',
  sm: 'text-label-small ts-label-small',
  lg: 'text-label-medium ts-label-medium group-data-[collapsible=icon]:p-0',
};

const menuButtonOutlineClasses =
  'bg-background shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-none';

/** The menu button class: base signature plus the size and (optional) outline
 *  variant. */
export function sidebarMenuButtonClasses(
  variant: 'default' | 'outline' = 'default',
  size: 'default' | 'sm' | 'lg' = 'default',
): string {
  return [
    menuButtonBaseClasses,
    menuButtonSizeClasses[size],
    variant === 'outline' ? menuButtonOutlineClasses : '',
  ]
    .filter(Boolean)
    .join(' ');
}

// `sidebar / item / hover` -- color, fast, standard. Same `transition-transform`
// mis-naming groupAction carried, corrected the same way.
const menuActionClasses =
  'absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 ' +
  'text-sidebar-foreground outline-none ring-sidebar-ring transition-colors duration-fast ' +
  'ease-standard hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
  'focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground ' +
  'after:absolute after:-inset-2 md:after:hidden group-data-[collapsible=icon]:hidden';

const menuActionShowOnHoverClasses =
  'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 ' +
  'data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground ' +
  'md:opacity-0';

const menuBadgeClasses =
  'pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center ' +
  'rounded-md px-1 text-label-small ts-label-small tabular-nums text-sidebar-foreground ' +
  'peer-hover/menu-button:text-sidebar-accent-foreground ' +
  'peer-data-[active=true]/menu-button:text-sidebar-accent-foreground ' +
  'group-data-[collapsible=icon]:hidden';

// NO SIDEBAR ROW for the loading placeholder. The matrix assigns the moment
// once, as `skeleton / root / waiting` -- a loop taking `period-shimmer`, which
// the generator emits as the `animate-pulse-shimmer` utility. These two are a
// sidebar-flavoured skeleton and borrow that cell rather than invent a period of
// their own; reported on #2302 so the matrix can decide whether sidebar wants a
// row.
//
// What is gone: stock Tailwind's `animate-pulse` (whose duration is a literal
// nothing in this system can retune) and `motion-reduce:animate-none`. A loop is
// exempt from the reduced-motion zero BY DESIGN -- work loops slow, they never
// stop -- and `animate-none` would win destructively anyway, resetting the whole
// shorthand and discarding the leaf's zeroed duration with it.
const menuSkeletonClasses = 'flex h-8 items-center gap-2 rounded-md px-2';
const menuSkeletonIconClasses =
  'size-4 shrink-0 animate-pulse-shimmer rounded-md bg-sidebar-accent';
const menuSkeletonTextClasses =
  'h-4 max-w-[--skeleton-width] flex-1 animate-pulse-shimmer rounded-md bg-sidebar-accent';

const menuSubClasses =
  'ml-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border py-0.5 pl-2.5 ' +
  'group-data-[collapsible=icon]:hidden';

const menuSubItemClasses = 'relative';

// `sidebar / item / hover` and `sidebar / item / active change` again -- a
// submenu entry is an item. Same one declaration for both rows.
const menuSubButtonBaseClasses =
  'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 ' +
  'text-sidebar-foreground outline-none ring-sidebar-ring transition-colors duration-fast ' +
  'ease-standard hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ' +
  'focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none ' +
  'aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent ' +
  'data-[active=true]:text-sidebar-accent-foreground';

const menuSubButtonSizeClasses: Record<'sm' | 'md', string> = {
  sm: 'text-label-small ts-label-small',
  md: 'text-label-medium ts-label-medium',
};

/** The submenu button class: base signature plus size. */
export function sidebarMenuSubButtonClasses(size: 'sm' | 'md' = 'md'): string {
  return `${menuSubButtonBaseClasses} ${menuSubButtonSizeClasses[size]}`;
}

const separatorClasses = 'mx-2 h-px w-auto bg-sidebar-border';

/** The side/variant-independent class set. The panel class is NOT here (it
 *  depends on side + variant, produced by `sidebarPanelClasses`), and the
 *  variant-bearing button classes are their own functions. Everything below is
 *  invariant across side, variant, and state. */
export function sidebarClasses(): SidebarClassSet {
  return {
    provider: providerClasses,
    trigger: triggerClasses,
    rail: railClasses,
    mobilePanel: mobilePanelClasses,
    inset: insetClasses,
    header: headerClasses,
    footer: footerClasses,
    content: contentClasses,
    group: groupClasses,
    groupLabel: groupLabelClasses,
    groupAction: groupActionClasses,
    groupContent: groupContentClasses,
    menu: menuClasses,
    menuItem: menuItemClasses,
    menuAction: menuActionClasses,
    menuActionShowOnHover: menuActionShowOnHoverClasses,
    menuBadge: menuBadgeClasses,
    menuSkeleton: menuSkeletonClasses,
    menuSkeletonIcon: menuSkeletonIconClasses,
    menuSkeletonText: menuSkeletonTextClasses,
    menuSub: menuSubClasses,
    menuSubItem: menuSubItemClasses,
    separator: separatorClasses,
  };
}

export { panelSideClasses, panelVariantClasses };
