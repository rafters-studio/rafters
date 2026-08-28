/**
 * Resizable panel component for split-pane layouts with drag handles
 *
 * @cognitive-load 3/10 - Familiar split-pane pattern; drag affordance is intuitive
 * @attention-economics Low attention cost: panels remain visible, resize is reversible
 * @trust-building Immediate visual feedback, keyboard accessible, maintains ratios
 * @accessibility Keyboard resizing via arrow keys, proper focus indicators, ARIA attributes
 * @semantic-meaning Layout control: code editors, settings panels, comparison views
 *
 * @usage-patterns
 * DO: Use for content that benefits from adjustable space allocation
 * DO: Provide sensible default sizes and min/max constraints
 * DO: Persist user preferences for panel sizes
 * DO: Support both horizontal and vertical orientations
 * DO: Make handles keyboard accessible
 * NEVER: Nested resizable panels more than 2 levels deep
 * NEVER: Panels smaller than usable minimums
 * NEVER: Resize handles that are too small to target
 *
 * @example
 * ```tsx
 * <Resizable.PanelGroup direction="horizontal">
 *   <Resizable.Panel defaultSize={25} minSize={10}>
 *     <Sidebar />
 *   </Resizable.Panel>
 *   <Resizable.Handle />
 *   <Resizable.Panel defaultSize={75}>
 *     <MainContent />
 *   </Resizable.Panel>
 * </Resizable.PanelGroup>
 * ```
 */
import * as React from 'react';
import { createBehavior, type PartIds } from '@/lib/contract';
import { useMemory } from '@/hooks/use-memory';
import classy from '@/lib/primitives/classy';
import {
  composeResizableInteractions,
  resizableBehavior,
  resizableHandleAria,
  type ResizableConfig,
  type ResizableDirection,
  type ResizablePanelConfig,
  type ResizablePart,
  type ResizableState,
} from '@/components/ui/resizable.behavior';
import { resizableClasses, type ResizableClassSet } from '@/components/ui/resizable.classes';

export type { ResizableDirection };

/**
 * Resizable -- the React performance of the resizable score, a compound in the
 * shadcn/react-resizable-panels shape: `ResizablePanelGroup` provides the
 * context, `ResizablePanel`s hold arbitrary content, and `ResizableHandle`s sit
 * between them. The group reads its panels' sizing from their props to seed the
 * score, assigns each panel/handle its positional index, and composes the ONE
 * pointer/keyboard surface (`composeResizableInteractions`) -- the same
 * composition the WC/Astro bind runs. Uncontrolled: layout is reported through
 * `onLayout`, never shadowed by an external prop.
 *
 * @cognitive-load 3/10 - decision 1, information 1, interaction 1, disruption 0,
 * learning 0. One spatial trade-off along a shared edge; the panel sizes are the
 * only information to read. A universally learned grab/arrow affordance, no
 * workflow disruption, nothing to learn.
 * @attention-economics Near-zero standing cost: both panels stay visible and the
 * edge only draws attention on hover or focus. The control communicates the
 * current allocation continuously without competing for the eye; best when the
 * user, not the layout, should own the space trade-off.
 * @trust-building Immediate, reversible feedback -- the boundary tracks the
 * pointer and every arrow key in real time, min/max clamps keep a panel from
 * vanishing, and the disabled gate freezes an unavailable split while keeping it
 * discoverable.
 * @accessibility Each handle is a role="separator" with aria-valuenow/min/max and
 * aria-orientation, wired to real DOM by the harness (WAI-ARIA Window Splitter).
 * Arrow keys along the group axis resize (Shift x10), Home/End reach the leading
 * panel's bounds; every handle is a tab stop and carries an accessible name.
 * Disabled removes the handles from the tab order and gates all movement.
 */

interface ResizableContextValue {
  direction: ResizableDirection;
  disabled: boolean;
  state: ResizableState;
  config: ResizableConfig;
  classes: ResizableClassSet;
}

const ResizableContext = React.createContext<ResizableContextValue | null>(null);

function useResizableContext(component: string): ResizableContextValue {
  const context = React.useContext(ResizableContext);
  if (!context) {
    throw new Error(`${component} must be used within <ResizablePanelGroup>`);
  }
  return context;
}

/** Internal: the positional index the group injects into each child. */
interface InjectedIndex {
  __resizableIndex?: number;
}

export interface ResizablePanelProps extends React.HTMLAttributes<HTMLDivElement>, InjectedIndex {
  /** Initial size (percent). Defaults to an equal share of the group. */
  defaultSize?: number;
  /** Floor (percent) the panel is clamped to. */
  minSize?: number;
  /** Ceiling (percent) the panel is clamped to. */
  maxSize?: number;
}

export function ResizablePanel({
  defaultSize,
  minSize,
  maxSize,
  __resizableIndex = 0,
  className,
  children,
  style,
  ...rest
}: ResizablePanelProps) {
  const { state, config, classes } = useResizableContext('ResizablePanel');
  const size = state.sizes[__resizableIndex] ?? config.panels[__resizableIndex]?.defaultSize ?? 0;
  return (
    <div
      data-part="panel"
      data-index={__resizableIndex}
      className={classy(classes.panel, className)}
      style={{ flexBasis: `${size}%`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface ResizableHandleProps extends React.HTMLAttributes<HTMLDivElement>, InjectedIndex {
  /** Render the grip affordance (a draggable-looking chip). */
  withHandle?: boolean;
  /** Individually disable this handle (in addition to a disabled group). */
  disabled?: boolean;
}

export function ResizableHandle({
  withHandle = false,
  disabled = false,
  __resizableIndex = 0,
  className,
  'aria-label': ariaLabel = 'Resize',
  ...rest
}: ResizableHandleProps) {
  const {
    disabled: groupDisabled,
    state,
    config,
    classes,
  } = useResizableContext('ResizableHandle');
  const effectiveDisabled = disabled || groupDisabled;
  const aria = resizableHandleAria(String(__resizableIndex), state, config);
  return (
    <div
      role="separator"
      data-part="handle"
      data-index={__resizableIndex}
      data-value={__resizableIndex}
      data-disabled={effectiveDisabled || undefined}
      tabIndex={effectiveDisabled ? -1 : 0}
      aria-label={ariaLabel}
      className={classy(classes.handle, className)}
      {...aria}
      {...rest}
    >
      {withHandle && (
        <div className={classes.grip}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={classes.gripIcon}
            aria-hidden="true"
          >
            <title>Drag handle</title>
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </div>
      )}
    </div>
  );
}

export interface ResizablePanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: ResizableDirection;
  /** Fires on every committed resize with the sizes the layout now holds. */
  onLayout?: (sizes: number[]) => void;
  disabled?: boolean;
}

/** Panel sizing configs read from the group's Panel children, in DOM order. */
function readPanelConfigs(children: React.ReactNode): ResizablePanelConfig[] {
  const panels = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<ResizablePanelProps> =>
      React.isValidElement(child) && child.type === ResizablePanel,
  );
  const share = panels.length > 0 ? 100 / panels.length : 100;
  return panels.map((panel) => ({
    defaultSize: panel.props.defaultSize ?? share,
    minSize: panel.props.minSize ?? 0,
    maxSize: panel.props.maxSize ?? 100,
  }));
}

export function ResizablePanelGroup({
  direction = 'horizontal',
  onLayout,
  disabled = false,
  className,
  children,
  ...rest
}: ResizablePanelGroupProps) {
  const panelConfigs = readPanelConfigs(children);
  const config: ResizableConfig = { direction, panels: panelConfigs, disabled };

  const { memory, dispatch } = React.useMemo(() => createBehavior(resizableBehavior, config), []);
  const state = useMemory(memory);

  const rootRef = React.useRef<HTMLDivElement | null>(null);

  // Effect-composed interactions must read the CURRENT config and callback, so
  // those ride in a ref rather than being captured stale.
  const latest = React.useRef({ config, onLayout });
  latest.current = { config, onLayout };

  const commit = React.useCallback(
    (sizes: number[]) => {
      if (!dispatch('setSizes', latest.current.config, { sizes })) return;
      latest.current.onLayout?.(sizes);
    },
    [dispatch],
  );

  // Compose the ONE pointer/keyboard surface -- the same composition the bind
  // runs. Re-created only when direction/disabled change (interactive fixes its
  // mode at create; panels are read live via getConfig).
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return composeResizableInteractions({
      root,
      getConfig: () => latest.current.config,
      getSizes: () => memory.get().sizes,
      commit,
    });
  }, [direction, disabled, commit, memory]);

  const uid = React.useId();
  const ids = {} as PartIds<ResizablePart>;
  for (const part of Object.keys(resizableBehavior.parts) as ResizablePart[])
    ids[part] = `${uid}-${part}`;
  const aria = resizableBehavior.aria(state, config, ids);
  const classes = resizableClasses(config, state);

  const contextValue: ResizableContextValue = {
    direction,
    disabled,
    state,
    config,
    classes,
  };

  // Assign each panel/handle its positional index by cloning the direct
  // children -- deterministic (children render in order) and pure (derived from
  // the children prop), no runtime registration.
  let panelIndex = 0;
  let handleIndex = 0;
  const decorated = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === ResizablePanel) {
      return React.cloneElement(child as React.ReactElement<InjectedIndex>, {
        __resizableIndex: panelIndex++,
      });
    }
    if (child.type === ResizableHandle) {
      return React.cloneElement(child as React.ReactElement<InjectedIndex>, {
        __resizableIndex: handleIndex++,
      });
    }
    return child;
  });

  return (
    <ResizableContext.Provider value={contextValue}>
      <div
        ref={rootRef}
        data-part="root"
        id={ids.root}
        data-direction={direction}
        className={classy(classes.root, className)}
        {...aria.root}
        {...rest}
      >
        {decorated}
      </div>
    </ResizableContext.Provider>
  );
}

export default ResizablePanelGroup;
