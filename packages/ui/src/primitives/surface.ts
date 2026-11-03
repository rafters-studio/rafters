/**
 * Surface -- what a component paints, resolved at render from its `fill` and
 * `surface` props (FR-RAF-FILL-003, FR-RAF-FILL-004).
 *
 * This file imports nothing: veneer compiles it on its own to run FILL_SHAPE,
 * so the export's name and this path are a contract.
 */

/**
 * A fill is exactly one token with the reserved `bg-fill-` prefix. This is a
 * shape check, never a list of names: the registry owns which fills exist.
 */
export const FILL_SHAPE = /^bg-fill-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * Every surface's literal class, by surface name (FR-RAF-FILL-004). Each is
 * the `bg-surface-<name>` fill the exporter writes from the registry, so the
 * names here are the ones the semantic defaults measure.
 */
export const SURFACE_CLASSES: Readonly<Record<string, string>> = {
  background: 'bg-surface-background',
  card: 'bg-surface-card',
  panel: 'bg-surface-panel',
  popover: 'bg-surface-popover',
  surface: 'bg-surface-surface',
  primary: 'bg-surface-primary',
  'primary-subtle': 'bg-surface-primary-subtle',
  secondary: 'bg-surface-secondary',
  'secondary-subtle': 'bg-surface-secondary-subtle',
  muted: 'bg-surface-muted',
  accent: 'bg-surface-accent',
  'accent-subtle': 'bg-surface-accent-subtle',
  destructive: 'bg-surface-destructive',
  'destructive-subtle': 'bg-surface-destructive-subtle',
  success: 'bg-surface-success',
  'success-subtle': 'bg-surface-success-subtle',
  warning: 'bg-surface-warning',
  'warning-subtle': 'bg-surface-warning-subtle',
  info: 'bg-surface-info',
  'info-subtle': 'bg-surface-info-subtle',
  alert: 'bg-surface-alert',
  'alert-subtle': 'bg-surface-alert-subtle',
  highlight: 'bg-surface-highlight',
  input: 'bg-surface-input',
  selection: 'bg-surface-selection',
  sidebar: 'bg-surface-sidebar',
  'sidebar-primary': 'bg-surface-sidebar-primary',
  'sidebar-accent': 'bg-surface-sidebar-accent',
  'sidebar-item': 'bg-surface-sidebar-item',
  nav: 'bg-surface-nav',
  table: 'bg-surface-table',
  'table-header': 'bg-surface-table-header',
  tooltip: 'bg-surface-tooltip',
  overlay: 'bg-surface-overlay',
  code: 'bg-surface-code',
  badge: 'bg-surface-badge',
  avatar: 'bg-surface-avatar',
};

/**
 * Surface precedence for the `fill` prop (FR-RAF-FILL-003): a fill that is
 * exactly one `bg-fill-*` token wins and replaces `base` (the variant's or the
 * base's surface classes) outright; a fill and a surface never join. Any other
 * non-empty value is dropped with a warning and `base` stands.
 */
export function resolveFill(value: unknown, base = ''): string {
  if (value === undefined || value === null || value === '') return base;
  if (typeof value === 'string' && FILL_SHAPE.test(value)) return value;
  console.warn(
    `surface: fill '${String(value)}' dropped -- fill takes exactly one bg-fill-* token`,
  );
  return base;
}

/**
 * The `surface` prop (FR-RAF-FILL-004): a surface name picks its literal
 * `bg-surface-<name>` class, which replaces `base` at the base slot of the
 * fill, variant, base precedence. An unknown name leaves `base` standing.
 */
export function resolveSurface(name: unknown, base = ''): string {
  if (typeof name !== 'string' || !Object.hasOwn(SURFACE_CLASSES, name)) return base;
  return SURFACE_CLASSES[name] ?? base;
}
