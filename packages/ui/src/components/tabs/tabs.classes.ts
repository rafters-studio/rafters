import type { TabsConfig, TabsState } from './tabs.behavior';

export interface TabsClassSet {
  /** The wrapper: stacks the list above its panels (or beside, when vertical). */
  root: string;
  /** The [role="tablist"] rail. */
  list: string;
  /** Each [role="tab"] trigger, including its data-state styling. */
  trigger: string;
  /** Each [role="tabpanel"]: focusable, so it carries a focus ring. */
  panel: string;
}

const rootHorizontalClasses = 'flex flex-col gap-2';
const rootVerticalClasses = 'flex flex-row gap-2';

const listBaseClasses =
  'inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground';
const listHorizontalClasses = 'h-10';
const listVerticalClasses = 'h-auto flex-col';

const triggerBaseClasses = [
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5',
  'text-label-medium ts-label-medium ring-offset-background cursor-pointer',
  // Motion intent indicator-move: the active pill travels along the rail's main
  // axis. Duration and easing come from tokens; motion-reduce opts out entirely.
  'transition-all duration-fast motion-reduce:transition-none',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
].join(' ');

// State-driven styling: the score projects data-state onto every trigger, so
// one class string serves all three performances with no conditional applying.
const triggerStateClasses = [
  'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
  'data-[state=inactive]:text-muted-foreground hover:bg-muted hover:text-foreground',
].join(' ');

const panelClasses = [
  'ring-offset-background',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
].join(' ');

/** The view: class strings keyed by config/state. No logic. */
export function tabsClasses(config: TabsConfig, _state: TabsState): TabsClassSet {
  const vertical = config.orientation === 'vertical';
  return {
    root: vertical ? rootVerticalClasses : rootHorizontalClasses,
    list: `${listBaseClasses} ${vertical ? listVerticalClasses : listHorizontalClasses}`,
    trigger: `${triggerBaseClasses} ${triggerStateClasses}`,
    panel: panelClasses,
  };
}
