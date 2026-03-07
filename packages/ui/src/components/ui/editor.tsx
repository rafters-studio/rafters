/**
 * Block editor component with progressive feature props
 *
 * Scales from a simple textarea replacement to a full block editor via props.
 * Uses vanilla TS primitives (block-handler, block-canvas, editor-toolbar,
 * command-palette, inline-toolbar, inline-formatter) underneath.
 *
 * @cognitive-load 6/10 - Progressive disclosure: simple by default, complex features opt-in
 * @attention-economics Single entry point scales from textarea replacement to full editor
 * @trust-building Consistent undo/redo, selection feedback, keyboard navigation out of the box
 * @accessibility ARIA listbox with multiselectable, activedescendant, keyboard navigation, screen reader support
 * @semantic-meaning Editor = block-based content editing surface with optional chrome
 *
 * @usage-patterns
 * DO: Start with just defaultValue + onValueChange for a minimal editor
 * DO: Add toolbar, sidebar, commandPalette, inlineToolbar props progressively
 * DO: Provide a custom renderBlock for rich block rendering
 * NEVER: Import sub-components directly -- only the Editor is exported
 * NEVER: Use useEffect for state subscriptions -- useSyncExternalStore handles that
 *
 * @example
 * ```tsx
 * <Editor
 *   defaultValue={[{ id: '1', type: 'text', content: 'Hello' }]}
 *   onValueChange={(blocks) => save(blocks)}
 *   toolbar
 * />
 * ```
 */

import { atom } from 'nanostores';
import * as React from 'react';
import { createPortal } from 'react-dom';
import type { BlockContextMenuControls } from '../../primitives/block-context-menu';
import { createBlockContextMenu } from '../../primitives/block-context-menu';
import type { BlockHandlerControls, BlockHandlerState } from '../../primitives/block-handler';
import { createBlockHandler } from '../../primitives/block-handler';
import type { BlockPaletteItem } from '../../primitives/block-palette';
import { createBlockPalette } from '../../primitives/block-palette';
import { createCanvasDropZone } from '../../primitives/canvas-drop-zone';
import classy from '../../primitives/classy';
import type {
  CommandPaletteController,
  CommandPaletteState,
} from '../../primitives/command-palette';
import { createCommandPalette } from '../../primitives/command-palette';
import type { ToolbarButton, ToolbarButtonGroup } from '../../primitives/editor-toolbar';
import { createEditorToolbar } from '../../primitives/editor-toolbar';
import { onEscapeKeyDown } from '../../primitives/escape-keydown';
import { createFocusTrap } from '../../primitives/focus-trap';
import type { InlineFormatterController } from '../../primitives/inline-formatter';
import {
  BOLD,
  CODE,
  createInlineFormatter,
  ITALIC,
  STRIKETHROUGH,
} from '../../primitives/inline-formatter';
import type { AdjustedToolbarPosition } from '../../primitives/inline-toolbar';
import { adjustToolbarPosition, getFormatButtons } from '../../primitives/inline-toolbar';
import { getPortalContainer } from '../../primitives/portal';
import type { RulePaletteItem } from '../../primitives/rule-palette';
import { createRulePalette } from '../../primitives/rule-palette';
import type { CleanupFunction, Command, Direction, InlineMark } from '../../primitives/types';
import { Container } from './container';

// ============================================================================
// Types
// ============================================================================

/**
 * A rule applied to a block. Simple rules are name strings.
 * Parameterized rules carry configuration.
 */
export type AppliedRule = string | { name: string; config: Record<string, unknown> };

/**
 * A single block in the Editor's content tree.
 *
 * Composites consume this type to render and interact with blocks.
 * Import it from the package root:
 * ```ts
 * import type { EditorBlock } from '@rafters/ui';
 * ```
 */
export interface EditorBlock {
  id: string;
  type: string;
  content?: unknown;
  children?: string[];
  parentId?: string;
  meta?: Record<string, unknown>;
  rules?: AppliedRule[];
}

/** Configuration for palette-mode sidebar */
export interface EditorSidebarConfig {
  /** Block palette items */
  items: BlockPaletteItem[];
  /** Category display order */
  categories: string[];
  /** Enable search input (default true) */
  searchable?: boolean;
  /** Custom item renderer for scaled previews */
  renderItem?: (item: BlockPaletteItem) => React.ReactNode;
  /** Custom insert handler for palette activation (click or drop). Overrides default single-block insertion. */
  onItemInsert?: (item: BlockPaletteItem, controls: EditorControls, insertIndex?: number) => void;
}

/** Configuration for rule-palette sidebar */
export interface EditorRulePaletteConfig {
  /** Rule palette items */
  items: RulePaletteItem[];
  /** Category display order */
  categories: string[];
  /** Enable search input (default true) */
  searchable?: boolean;
  /** Custom item renderer */
  renderItem?: (item: RulePaletteItem) => React.ReactNode;
  /**
   * Config field definitions for parameterized rules.
   * Key is the rule ID. Value is an array of field descriptors.
   */
  configFields?: Record<string, RuleConfigField[]>;
  /** Called after a rule is applied to a block */
  onRuleApplied?: (blockId: string, rule: AppliedRule, controls: EditorControls) => void;
}

/** A single field in a rule configuration dialog */
export interface RuleConfigField {
  /** Field key (used as the config property name) */
  name: string;
  /** Display label */
  label: string;
  /** Input type */
  type: 'text' | 'number' | 'select';
  /** Default value */
  defaultValue?: string | number;
  /** Options for select type */
  options?: Array<{ value: string; label: string }>;
}

export interface SlashCommand {
  id: string;
  label: string;
  icon?: React.ReactNode;
  keywords?: string[];
  action: (editor: EditorControls) => void;
}

// SYNC:composite-category - must match CompositeCategorySchema in @rafters/composites/src/manifest.ts
export type CompositeCategory = 'typography' | 'layout' | 'form' | 'widget' | 'media';

/** Metadata for saving the current canvas as a composite. */
export interface SaveCompositeData {
  /** Display name */
  name: string;
  /** Category */
  category: CompositeCategory;
  /** Description */
  description: string;
  /** Current canvas blocks */
  blocks: EditorBlock[];
}

export interface EditorProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  /** Initial blocks for uncontrolled mode */
  defaultValue?: EditorBlock[];
  /** Controlled blocks */
  value?: EditorBlock[];
  /** Called on every block mutation */
  onValueChange?: (blocks: EditorBlock[]) => void;
  /** Called on committed changes (blur, explicit save) */
  onValueCommit?: (blocks: EditorBlock[]) => void;

  /** Show top toolbar with undo/redo and formatting */
  toolbar?: boolean;
  /** Show sidebar for block navigation/properties, or pass config for palette mode */
  sidebar?: boolean | EditorSidebarConfig;
  /** Show rule palette alongside block palette. Requires sidebar to be an EditorSidebarConfig. */
  rulePalette?: EditorRulePaletteConfig;
  /** Enable slash command palette with these commands */
  commandPalette?: SlashCommand[];
  /** Show floating inline formatting toolbar on text selection */
  inlineToolbar?: boolean;
  /** Enable right-click context menu on blocks (rule management, settings, removal) */
  blockContextMenu?: boolean;

  /** Custom block renderer -- receives block + context, returns JSX */
  renderBlock?: (block: EditorBlock, context: BlockRenderContext) => React.ReactNode;
  /** Custom empty state */
  emptyState?: React.ReactNode;

  /** Callback to save current canvas as a composite. When set, adds a "Save as Composite" toolbar button. */
  onSaveAsComposite?: (data: SaveCompositeData) => void | Promise<void>;

  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Text direction for RTL support */
  dir?: Direction;
  /** Additional class name on the root element */
  className?: string;
}

export interface BlockRenderContext {
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isFocused: boolean;
}

/**
 * Imperative handle exposed via ref -- the block mutation API.
 *
 * EditorControls is the single owner of all block CRUD operations:
 * addBlock, removeBlocks, moveBlock, and updateBlock. The block-handler
 * primitive manages selection, focus, undo/redo, and clipboard but
 * never initiates mutations. Composites and external consumers should
 * acquire this handle via `React.useRef<EditorControls>()` and call
 * these methods to modify the block tree.
 *
 * @see block-handler (`primitives/block-handler.ts`) for selection/focus/history state
 *
 * @example
 * ```tsx
 * const editorRef = React.useRef<EditorControls>(null);
 * <Editor ref={editorRef} />
 * // Later:
 * editorRef.current?.addBlock({ id: crypto.randomUUID(), type: 'text', content: '' });
 * ```
 */
export interface EditorControls {
  /** Insert a block at the given index (or append if omitted) */
  addBlock: (block: EditorBlock, index?: number) => void;
  /** Insert multiple blocks at the given index as a single history entry (or append if omitted) */
  addBlocks: (blocks: EditorBlock[], index?: number) => void;
  /** Remove blocks by their IDs */
  removeBlocks: (ids: Set<string>) => void;
  /** Move a block to a new position */
  moveBlock: (id: string, toIndex: number) => void;
  /** Partially update a block's properties (id is preserved) */
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void;
  /** Undo the last mutation (delegated to block-handler history) */
  undo: () => void;
  /** Redo the last undone mutation (delegated to block-handler history) */
  redo: () => void;
  /** Select all blocks */
  selectAll: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Clear both selection and block focus (as if clicking outside the editor) */
  deselect: () => void;
  /** Move focus to the editor canvas */
  focus: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const INITIAL_HANDLER_STATE: BlockHandlerState = {
  selectedIds: new Set<string>(),
  focusedId: undefined,
  canUndo: false,
  canRedo: false,
};

const INITIAL_PALETTE_STATE: CommandPaletteState = {
  isOpen: false,
  query: '',
  filteredCommands: [],
  selectedIndex: -1,
};

const INLINE_TOOLBAR_DIMENSIONS = { width: 320, height: 44 };

// ============================================================================
// Default block renderer
// ============================================================================

function defaultRenderBlock(block: EditorBlock): React.ReactNode {
  const text = String(block.content ?? '');
  return <div className={classy('px-3 py-2 text-sm text-foreground')}>{text || '\u00A0'}</div>;
}

// ============================================================================
// Private sub-components
// ============================================================================

interface ToolbarSectionProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

function EditorToolbarSection({ canUndo, canRedo, onUndo, onRedo }: ToolbarSectionProps) {
  const buttons = React.useMemo(() => {
    const toolbar = createEditorToolbar({
      getHistory: () => ({ canUndo, canRedo }),
      onUndo,
      onRedo,
    });
    return toolbar.getButtons();
  }, [canUndo, canRedo, onUndo, onRedo]);

  const grouped = new Map<ToolbarButtonGroup, ToolbarButton[]>();
  for (const btn of buttons) {
    const group = grouped.get(btn.group);
    if (group) {
      group.push(btn);
    } else {
      grouped.set(btn.group, [btn]);
    }
  }

  return (
    <div
      role="toolbar"
      aria-label="Editor toolbar"
      className={classy('flex items-center gap-1 border-b border-border px-2 py-1')}
    >
      {Array.from(grouped.entries()).map(([group, btns], groupIdx) => (
        <React.Fragment key={group}>
          {groupIdx > 0 && <hr className={classy('mx-1 h-4 w-px border-0 bg-border')} />}
          {btns.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={btn.action}
              disabled={btn.disabled}
              aria-label={btn.label}
              title={`${btn.label} (${btn.shortcut})`}
              className={classy(
                'rounded-md px-2 py-1 text-xs font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
                { 'opacity-50 cursor-not-allowed': btn.disabled },
              )}
            >
              {btn.label}
            </button>
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}

// SYNC:composite-category
const COMPOSITE_CATEGORIES = [
  'typography',
  'layout',
  'form',
  'widget',
  'media',
] as const satisfies readonly CompositeCategory[];

interface SaveCompositeDialogProps {
  blocks: EditorBlock[];
  onSave: (data: SaveCompositeData) => void;
  onCancel: () => void;
}

function SaveCompositeDialog({ blocks, onSave, onCancel }: SaveCompositeDialogProps) {
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState<CompositeCategory>('layout');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState('');
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }
    onSave({
      name: trimmedName,
      category,
      description: description.trim(),
      blocks,
    });
  };

  const portalContainer = getPortalContainer();
  if (!portalContainer) return null;

  return createPortal(
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: modal overlay dismiss is a standard pattern */}
      <div
        className={classy('fixed inset-0 z-50 bg-black/50')}
        onClick={onCancel}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Save as Composite"
        aria-modal="true"
        className={classy(
          'fixed top-1/2 left-1/2 z-50 w-96 -translate-x-1/2 -translate-y-1/2',
          'rounded-lg border border-border bg-background p-6 shadow-lg',
        )}
      >
        <h2 className={classy('mb-4 text-lg font-semibold')}>Save as Composite</h2>
        <form onSubmit={handleSubmit} className={classy('flex flex-col gap-3')}>
          <label className={classy('flex flex-col gap-1 text-sm')}>
            Name
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className={classy(
                'rounded-md border border-border bg-background px-3 py-1.5 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
              )}
            />
          </label>
          <label className={classy('flex flex-col gap-1 text-sm')}>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CompositeCategory)}
              className={classy(
                'rounded-md border border-border bg-background px-3 py-1.5 text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
              )}
            >
              {COMPOSITE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className={classy('flex flex-col gap-1 text-sm')}>
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={classy(
                'rounded-md border border-border bg-background px-3 py-1.5 text-sm resize-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
              )}
            />
          </label>
          {error && (
            <p role="alert" className={classy('text-sm text-destructive')}>
              {error}
            </p>
          )}
          <div className={classy('flex justify-end gap-2 pt-2')}>
            <button
              type="button"
              onClick={onCancel}
              className={classy(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={classy(
                'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors',
                'hover:bg-primary/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
              )}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </>,
    portalContainer,
  );
}

interface SidebarSectionProps {
  blocks: EditorBlock[];
  selectedIds: Set<string>;
  focusedId: string | undefined;
  onFocusBlock: (id: string) => void;
}

function EditorSidebarSection({
  blocks,
  selectedIds,
  focusedId,
  onFocusBlock,
}: SidebarSectionProps) {
  return (
    <nav
      aria-label="Block navigation"
      className={classy('w-48 shrink-0 flex flex-col gap-0.5 border-r border-border p-2')}
    >
      {blocks.map((block, i) => (
        <button
          key={block.id}
          type="button"
          onClick={() => onFocusBlock(block.id)}
          aria-current={focusedId === block.id ? 'true' : undefined}
          className={classy(
            'rounded-md px-2 py-1 text-left text-xs truncate transition-colors',
            'hover:bg-accent hover:text-accent-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
            {
              'bg-accent text-accent-foreground': selectedIds.has(block.id),
              'ring-2 ring-primary-ring': focusedId === block.id,
            },
          )}
        >
          {i + 1}. {block.type}
        </button>
      ))}
    </nav>
  );
}

interface PaletteSidebarProps {
  config: EditorSidebarConfig;
  onActivate: (item: BlockPaletteItem) => void;
  disabled: boolean;
}

function BlockPaletteContent({ config, onActivate, disabled }: PaletteSidebarProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const paletteControlsRef = React.useRef<ReturnType<typeof createBlockPalette> | null>(null);
  const [query, setQuery] = React.useState('');
  const [, forceUpdate] = React.useState(0);

  React.useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const paletteOptions: Parameters<typeof createBlockPalette>[0] = {
      container: containerEl,
      items: config.items,
      categories: config.categories,
      onActivate,
      disabled,
    };
    if (searchRef.current) {
      paletteOptions.searchInput = searchRef.current;
    }
    const palette = createBlockPalette(paletteOptions);
    paletteControlsRef.current = palette;

    // Trigger a re-render so getGroupedItems() is available for the first paint.
    // Without this, paletteControlsRef.current is null during the initial render
    // and the palette items never appear.
    forceUpdate((n) => n + 1);

    return () => {
      palette.destroy();
      paletteControlsRef.current = null;
    };
  }, [config.items, config.categories, onActivate, disabled]);

  React.useEffect(() => {
    paletteControlsRef.current?.setDisabled(disabled);
  }, [disabled]);

  const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    paletteControlsRef.current?.setSearchQuery(value);
    forceUpdate((n) => n + 1);
  }, []);

  const grouped = paletteControlsRef.current?.getGroupedItems();
  const renderItem = config.renderItem;
  const searchable = config.searchable !== false;

  return (
    <div className={classy('flex flex-1 flex-col')}>
      {searchable && (
        <div className={classy('border-b border-border p-2')}>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search blocks..."
            aria-label="Search blocks"
            disabled={disabled}
            className={classy(
              'w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none',
              'placeholder:text-muted-foreground',
              'focus-visible:ring-2 focus-visible:ring-primary-ring',
              { 'opacity-50 cursor-not-allowed': disabled },
            )}
          />
        </div>
      )}
      <div
        ref={containerRef}
        tabIndex={disabled ? -1 : 0}
        className={classy('flex flex-1 flex-col gap-1 overflow-y-auto p-2')}
      >
        {grouped &&
          Array.from(grouped.entries()).map(([category, categoryItems]) => (
            <div key={category}>
              <div
                role="presentation"
                className={classy(
                  'px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider',
                )}
              >
                {category}
              </div>
              {categoryItems.map((item) => (
                // biome-ignore lint/a11y/useFocusableInteractive: focus managed via aria-activedescendant on block-palette container
                <div
                  key={item.id}
                  data-palette-item=""
                  data-palette-id={item.id}
                  draggable={!disabled}
                  role="option"
                  aria-selected="false"
                  className={classy(
                    'rounded-md px-2 py-1 text-xs cursor-pointer transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
                    { 'opacity-50 cursor-not-allowed': disabled },
                  )}
                >
                  {renderItem ? renderItem(item) : item.label}
                </div>
              ))}
            </div>
          ))}
        {grouped && grouped.size === 0 && (
          <div className={classy('px-2 py-1 text-xs text-muted-foreground')}>No blocks found</div>
        )}
      </div>
    </div>
  );
}

function EditorPaletteSidebar(props: PaletteSidebarProps) {
  return (
    <aside
      aria-label="Block palette"
      className={classy('w-48 shrink-0 flex flex-col border-r border-border')}
    >
      <BlockPaletteContent {...props} />
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Rule palette sidebar
// ---------------------------------------------------------------------------

interface RulePaletteSidebarProps {
  config: EditorRulePaletteConfig;
  onActivate: (item: RulePaletteItem) => void;
  disabled: boolean;
}

function EditorRulePaletteSidebar({ config, onActivate, disabled }: RulePaletteSidebarProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const paletteControlsRef = React.useRef<ReturnType<typeof createRulePalette> | null>(null);
  const [query, setQuery] = React.useState('');
  const [, forceUpdate] = React.useState(0);

  React.useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    const paletteOptions: Parameters<typeof createRulePalette>[0] = {
      container: containerEl,
      items: config.items,
      categories: config.categories,
      onActivate,
      disabled,
    };
    if (searchRef.current) {
      paletteOptions.searchInput = searchRef.current;
    }
    const palette = createRulePalette(paletteOptions);
    paletteControlsRef.current = palette;
    forceUpdate((n) => n + 1);

    return () => {
      palette.destroy();
      paletteControlsRef.current = null;
    };
  }, [config.items, config.categories, onActivate, disabled]);

  React.useEffect(() => {
    paletteControlsRef.current?.setDisabled(disabled);
  }, [disabled]);

  const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    paletteControlsRef.current?.setSearchQuery(value);
    forceUpdate((n) => n + 1);
  }, []);

  const grouped = paletteControlsRef.current?.getGroupedItems();
  const renderItem = config.renderItem;
  const searchable = config.searchable !== false;

  return (
    <div className={classy('flex flex-1 flex-col')}>
      {searchable && (
        <div className={classy('border-b border-border p-2')}>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search rules..."
            aria-label="Search rules"
            disabled={disabled}
            className={classy(
              'w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none',
              'placeholder:text-muted-foreground',
              'focus-visible:ring-2 focus-visible:ring-primary-ring',
              { 'opacity-50 cursor-not-allowed': disabled },
            )}
          />
        </div>
      )}
      <div
        ref={containerRef}
        tabIndex={disabled ? -1 : 0}
        className={classy('flex flex-1 flex-col gap-1 overflow-y-auto p-2')}
      >
        {grouped &&
          Array.from(grouped.entries()).map(([category, categoryItems]) => (
            <div key={category}>
              <div
                role="presentation"
                className={classy(
                  'px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider',
                )}
              >
                {category}
              </div>
              {categoryItems.map((item) => (
                // biome-ignore lint/a11y/useFocusableInteractive: focus managed via aria-activedescendant on rule-palette container
                <div
                  key={item.id}
                  data-rule-item=""
                  data-rule-id={item.id}
                  draggable={!disabled}
                  role="option"
                  aria-selected="false"
                  className={classy(
                    'rounded-md px-2 py-1 text-xs cursor-pointer transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
                    { 'opacity-50 cursor-not-allowed': disabled },
                  )}
                >
                  {renderItem ? renderItem(item) : item.label}
                </div>
              ))}
            </div>
          ))}
        {grouped && grouped.size === 0 && (
          <div className={classy('px-2 py-1 text-xs text-muted-foreground')}>No rules found</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabbed palette sidebar (block + rule)
// ---------------------------------------------------------------------------

type PaletteTab = 'blocks' | 'rules';

interface TabbedPaletteSidebarProps {
  blockConfig: EditorSidebarConfig;
  ruleConfig: EditorRulePaletteConfig;
  onBlockActivate: (item: BlockPaletteItem) => void;
  onRuleActivate: (item: RulePaletteItem) => void;
  disabled: boolean;
}

function EditorTabbedPaletteSidebar({
  blockConfig,
  ruleConfig,
  onBlockActivate,
  onRuleActivate,
  disabled,
}: TabbedPaletteSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<PaletteTab>('blocks');

  return (
    <aside
      aria-label="Editor palettes"
      className={classy('w-48 shrink-0 flex flex-col border-r border-border')}
    >
      <div
        role="tablist"
        aria-label="Palette tabs"
        className={classy('flex border-b border-border')}
      >
        <button
          type="button"
          role="tab"
          id="palette-tab-blocks"
          aria-selected={activeTab === 'blocks'}
          aria-controls="palette-panel-blocks"
          onClick={() => setActiveTab('blocks')}
          disabled={disabled}
          className={classy(
            'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-ring',
            {
              'border-b-2 border-primary text-foreground': activeTab === 'blocks',
              'text-muted-foreground hover:text-foreground': activeTab !== 'blocks',
              'opacity-50 cursor-not-allowed': disabled,
            },
          )}
        >
          Blocks
        </button>
        <button
          type="button"
          role="tab"
          id="palette-tab-rules"
          aria-selected={activeTab === 'rules'}
          aria-controls="palette-panel-rules"
          onClick={() => setActiveTab('rules')}
          disabled={disabled}
          className={classy(
            'flex-1 px-2 py-1.5 text-xs font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-ring',
            {
              'border-b-2 border-primary text-foreground': activeTab === 'rules',
              'text-muted-foreground hover:text-foreground': activeTab !== 'rules',
              'opacity-50 cursor-not-allowed': disabled,
            },
          )}
        >
          Rules
        </button>
      </div>
      <div
        id="palette-panel-blocks"
        role="tabpanel"
        aria-labelledby="palette-tab-blocks"
        hidden={activeTab !== 'blocks'}
        className={classy('flex flex-1 flex-col', { hidden: activeTab !== 'blocks' })}
      >
        {activeTab === 'blocks' && (
          <BlockPaletteContent
            config={blockConfig}
            onActivate={onBlockActivate}
            disabled={disabled}
          />
        )}
      </div>
      <div
        id="palette-panel-rules"
        role="tabpanel"
        aria-labelledby="palette-tab-rules"
        hidden={activeTab !== 'rules'}
        className={classy('flex flex-1 flex-col', { hidden: activeTab !== 'rules' })}
      >
        {activeTab === 'rules' && (
          <EditorRulePaletteSidebar
            config={ruleConfig}
            onActivate={onRuleActivate}
            disabled={disabled}
          />
        )}
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Rule config dialog
// ---------------------------------------------------------------------------

interface RuleConfigDialogProps {
  rule: RulePaletteItem;
  fields: RuleConfigField[];
  anchorId: string;
  onConfirm: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}

function RuleConfigDialog({ rule, fields, anchorId, onConfirm, onCancel }: RuleConfigDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const [values, setValues] = React.useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      initial[field.name] = field.defaultValue ?? '';
    }
    return initial;
  });

  React.useEffect(() => {
    const dialogEl = dialogRef.current;
    if (!dialogEl) return;

    const cleanups: CleanupFunction[] = [];

    // Position near the anchor block
    const anchorEl = document.getElementById(anchorId);
    if (anchorEl) {
      const anchorRect = anchorEl.getBoundingClientRect();
      dialogEl.style.position = 'fixed';
      dialogEl.style.top = `${anchorRect.bottom + 8}px`;
      dialogEl.style.left = `${anchorRect.left}px`;
    }

    // Focus trap
    cleanups.push(createFocusTrap(dialogEl));

    // Escape to cancel
    cleanups.push(onEscapeKeyDown(() => onCancel()));

    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [anchorId, onCancel]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onConfirm(values);
  };

  const portalContainer = getPortalContainer();
  if (!portalContainer) return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Configure ${rule.label}`}
      className={classy(
        'fixed z-depth-popover w-64 rounded-lg border border-border bg-popover p-3 shadow-lg',
      )}
    >
      <div className={classy('mb-2 text-xs font-medium text-foreground')}>{rule.label}</div>
      <form onSubmit={handleSubmit}>
        {fields.map((field) => (
          <div key={field.name} className={classy('mb-2')}>
            <label
              htmlFor={`rule-config-${field.name}`}
              className={classy('mb-1 block text-xs text-muted-foreground')}
            >
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                id={`rule-config-${field.name}`}
                value={String(values[field.name] ?? '')}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}
                className={classy(
                  'w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none',
                  'focus-visible:ring-2 focus-visible:ring-primary-ring',
                )}
              >
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`rule-config-${field.name}`}
                type={field.type}
                value={String(values[field.name] ?? '')}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                  }))
                }
                className={classy(
                  'w-full rounded-md border border-border bg-transparent px-2 py-1 text-xs outline-none',
                  'focus-visible:ring-2 focus-visible:ring-primary-ring',
                )}
              />
            )}
          </div>
        ))}
        <div className={classy('flex justify-end gap-1')}>
          <button
            type="button"
            onClick={onCancel}
            className={classy(
              'rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
            )}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={classy(
              'rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground transition-colors',
              'hover:bg-primary/90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
            )}
          >
            Apply
          </button>
        </div>
      </form>
    </div>,
    portalContainer,
  );
}

// ---------------------------------------------------------------------------
// Block context menu overlay
// ---------------------------------------------------------------------------

interface ContextMenuOverlayState {
  blockId: string;
  position: { x: number; y: number };
}

interface ContextMenuOverlayProps {
  state: ContextMenuOverlayState;
  block: EditorBlock | undefined;
  onAction: (actionId: string) => void;
}

function BlockContextMenuOverlay({ state, block, onAction }: ContextMenuOverlayProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  const portalContainer = getPortalContainer();
  if (!portalContainer || !block) return null;

  const appliedRules = block.rules ?? [];
  const hasRules = appliedRules.length > 0;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Block actions"
      className={classy(
        'fixed z-depth-popover w-52 rounded-lg border border-border bg-popover py-1 shadow-lg',
      )}
      style={{
        left: `${state.position.x}px`,
        top: `${state.position.y}px`,
      }}
    >
      {hasRules && (
        <>
          <div
            role="presentation"
            className={classy(
              'px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider',
            )}
          >
            Rules
          </div>
          {appliedRules.map((rule, i) => {
            const ruleName = typeof rule === 'string' ? rule : rule.name;
            const hasConfig = typeof rule === 'object';
            return (
              <React.Fragment key={`${ruleName}-${i}`}>
                <div
                  role="menuitem"
                  tabIndex={-1}
                  data-menu-item-id={`edit-rule:${ruleName}`}
                  onPointerDown={() => onAction(`edit-rule:${ruleName}`)}
                  className={classy(
                    'flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:bg-accent',
                  )}
                >
                  <span>{ruleName}</span>
                  {hasConfig && (
                    <span className={classy('text-xs text-muted-foreground')}>configured</span>
                  )}
                </div>
                <div
                  role="menuitem"
                  tabIndex={-1}
                  data-menu-item-id={`remove-rule:${ruleName}`}
                  onPointerDown={() => onAction(`remove-rule:${ruleName}`)}
                  className={classy(
                    'px-3 py-1.5 pl-6 text-xs text-destructive cursor-pointer',
                    'hover:bg-accent',
                    'focus-visible:outline-none focus-visible:bg-accent',
                  )}
                >
                  Remove rule
                </div>
              </React.Fragment>
            );
          })}
          <hr className={classy('my-1 border-border')} />
        </>
      )}
      <div
        role="menuitem"
        tabIndex={-1}
        data-menu-item-id="remove-block"
        onPointerDown={() => onAction('remove-block')}
        className={classy(
          'px-3 py-1.5 text-sm text-destructive cursor-pointer',
          'hover:bg-accent',
          'focus-visible:outline-none focus-visible:bg-accent',
        )}
      >
        Remove block
      </div>
    </div>,
    portalContainer,
  );
}

interface CommandPaletteOverlayProps {
  state: CommandPaletteState;
  position: { x: number; y: number };
  onQuery: (query: string) => void;
  onSelect: (index: number) => void;
  onExecute: () => void;
  onClose: () => void;
}

function CommandPaletteOverlay({
  state,
  position,
  onQuery,
  onSelect,
  onExecute,
  onClose,
}: CommandPaletteOverlayProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const portalContainer = getPortalContainer();
  if (!portalContainer) return null;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onExecute();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (state.selectedIndex + 1) % Math.max(state.filteredCommands.length, 1);
      onSelect(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev =
        state.selectedIndex <= 0 ? state.filteredCommands.length - 1 : state.selectedIndex - 1;
      onSelect(prev);
    }
  };

  const listboxId = 'editor-command-palette-listbox';
  const activeOptionId =
    state.selectedIndex >= 0 ? `editor-command-palette-option-${state.selectedIndex}` : undefined;

  return createPortal(
    <div
      className={classy(
        'fixed z-depth-popover w-72 rounded-lg border border-border bg-popover shadow-lg',
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={state.query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded="true"
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-label="Search commands"
        className={classy(
          'w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground',
        )}
        placeholder="Type a command..."
      />
      <div
        id={listboxId}
        role="listbox"
        aria-label="Commands"
        className={classy('max-h-48 overflow-y-auto p-1')}
      >
        {state.filteredCommands.map((cmd, i) => (
          // biome-ignore lint/a11y/useFocusableInteractive: focus managed via aria-activedescendant on combobox input
          <div
            key={cmd.id}
            id={`editor-command-palette-option-${i}`}
            role="option"
            aria-selected={i === state.selectedIndex}
            onPointerDown={() => {
              onSelect(i);
              onExecute();
            }}
            className={classy('cursor-pointer rounded-md px-3 py-1.5 text-sm', {
              'bg-accent text-accent-foreground': i === state.selectedIndex,
            })}
          >
            <span className={classy('font-medium')}>{cmd.label}</span>
            {cmd.description && (
              <span className={classy('ml-2 text-muted-foreground')}>{cmd.description}</span>
            )}
          </div>
        ))}
        {state.filteredCommands.length === 0 && (
          <div className={classy('px-3 py-1.5 text-sm text-muted-foreground')}>
            No commands found
          </div>
        )}
      </div>
    </div>,
    portalContainer,
  );
}

interface InlineToolbarOverlayProps {
  position: AdjustedToolbarPosition;
  activeFormats: InlineMark[];
  onFormat: (mark: InlineMark) => void;
}

function InlineToolbarOverlay({ position, activeFormats, onFormat }: InlineToolbarOverlayProps) {
  const portalContainer = getPortalContainer();
  if (!portalContainer) return null;

  const buttons = getFormatButtons();

  return createPortal(
    <div
      role="toolbar"
      aria-label="Text formatting"
      className={classy(
        'fixed z-depth-popover flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg',
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {buttons.map((btn) => {
        const isActive = activeFormats.includes(btn.format);
        return (
          <button
            key={btn.format}
            type="button"
            onClick={() => onFormat(btn.format)}
            aria-pressed={isActive}
            aria-label={btn.label}
            title={`${btn.label} (${btn.shortcut})`}
            className={classy(
              'rounded-md px-2 py-1 text-xs font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
              { 'bg-accent text-accent-foreground': isActive },
            )}
          >
            {btn.label}
          </button>
        );
      })}
    </div>,
    portalContainer,
  );
}

function DefaultEmptyState() {
  return (
    <div className={classy('flex items-center justify-center p-8 text-sm text-muted-foreground')}>
      No blocks yet. Start editing to add content.
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export const Editor = React.forwardRef<EditorControls, EditorProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue,
      onValueChange,
      onValueCommit,
      toolbar = false,
      sidebar = false,
      rulePalette,
      commandPalette,
      inlineToolbar = false,
      blockContextMenu = false,
      renderBlock,
      emptyState,
      onSaveAsComposite,
      disabled = false,
      dir,
      ...props
    },
    ref,
  ) => {
    // ----- Controlled / uncontrolled -----
    const [uncontrolled, setUncontrolled] = React.useState<EditorBlock[]>(defaultValue ?? []);
    const isControlled = controlledValue !== undefined;
    const blocks = isControlled ? controlledValue : uncontrolled;

    // Stable $blocks atom -- created once
    const blocksAtomRef = React.useRef(atom<EditorBlock[]>(blocks));

    // Refs for latest callbacks to avoid stale closures
    const callbacksRef = React.useRef({ onValueChange, onValueCommit });
    callbacksRef.current = { onValueChange, onValueCommit };

    // ----- Handler + canvas refs -----
    const canvasRef = React.useRef<HTMLDivElement>(null);
    const handlerRef = React.useRef<BlockHandlerControls | null>(null);

    // ----- Save composite dialog state -----
    const [showSaveDialog, setShowSaveDialog] = React.useState(false);

    // ----- Inline toolbar state -----
    const [inlineToolbarPos, setInlineToolbarPos] = React.useState<AdjustedToolbarPosition | null>(
      null,
    );
    const [activeFormats, setActiveFormats] = React.useState<InlineMark[]>([]);
    const formatterRef = React.useRef<InlineFormatterController | null>(null);

    // ----- Command palette state -----
    const [paletteState, setPaletteState] =
      React.useState<CommandPaletteState>(INITIAL_PALETTE_STATE);
    const [palettePosition, setPalettePosition] = React.useState<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });
    const paletteRef = React.useRef<CommandPaletteController | null>(null);

    // ----- Rule config dialog state -----
    const [ruleDialogState, setRuleDialogState] = React.useState<{
      rule: RulePaletteItem;
      blockId: string;
    } | null>(null);

    // ----- Context menu state -----
    const [blockContextMenuState, setContextMenuState] =
      React.useState<ContextMenuOverlayState | null>(null);
    const blockContextMenuRef = React.useRef<BlockContextMenuControls | null>(null);

    // ----- Stable block mutation function -----
    const updateBlocks = React.useCallback(
      (next: EditorBlock[], commit = false) => {
        blocksAtomRef.current.set(next);
        if (!isControlled) {
          setUncontrolled(next);
        }
        callbacksRef.current.onValueChange?.(next);
        if (commit) {
          callbacksRef.current.onValueCommit?.(next);
        }
      },
      [isControlled],
    );

    // ----- CRUD methods -----
    const addBlocks = React.useCallback(
      (newBlocks: EditorBlock[], index?: number) => {
        if (newBlocks.length === 0) return;
        const current = blocksAtomRef.current.get();
        const next = [...current];
        if (index !== undefined && index >= 0 && index <= next.length) {
          next.splice(index, 0, ...newBlocks);
        } else {
          next.push(...newBlocks);
        }
        updateBlocks(next, true);
      },
      [updateBlocks],
    );

    const addBlock = React.useCallback(
      (block: EditorBlock, index?: number) => addBlocks([block], index),
      [addBlocks],
    );

    const removeBlocks = React.useCallback(
      (ids: Set<string>) => {
        const current = blocksAtomRef.current.get();
        const next = current.filter((b) => !ids.has(b.id));
        updateBlocks(next, true);
      },
      [updateBlocks],
    );

    const moveBlock = React.useCallback(
      (id: string, toIndex: number) => {
        const current = blocksAtomRef.current.get();
        const fromIndex = current.findIndex((b) => b.id === id);
        if (fromIndex === -1) return;
        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        if (!moved) return;
        const insertAt = Math.min(Math.max(toIndex, 0), next.length);
        next.splice(insertAt, 0, moved);
        updateBlocks(next, true);
      },
      [updateBlocks],
    );

    const updateBlock = React.useCallback(
      (id: string, updates: Partial<EditorBlock>) => {
        const current = blocksAtomRef.current.get();
        const next = current.map((b) => (b.id === id ? { ...b, ...updates, id: b.id } : b));
        updateBlocks(next, false);
      },
      [updateBlocks],
    );

    // ----- Handler state bridged via stable atom -----
    // The handler is created in an effect (after mount), so useSyncExternalStore
    // cannot subscribe to it directly (handlerRef is null at subscribe time).
    // Instead, we use a stable atom created once and bridge updates in the effect.
    const $handlerStateRef = React.useRef(atom<BlockHandlerState>({ ...INITIAL_HANDLER_STATE }));
    const handlerState = React.useSyncExternalStore(
      (cb) => $handlerStateRef.current.subscribe(cb),
      () => $handlerStateRef.current.get(),
      () => INITIAL_HANDLER_STATE,
    );

    // Stable identity for commandPalette prop -- avoids effect teardown when
    // consumers pass an inline array. Keyed by sorted command IDs.
    const commandPaletteRef = React.useRef(commandPalette);
    const commandPaletteKey = commandPalette?.map((c) => c.id).join(',') ?? '';
    const prevKeyRef = React.useRef(commandPaletteKey);
    if (commandPaletteKey !== prevKeyRef.current) {
      commandPaletteRef.current = commandPalette;
      prevKeyRef.current = commandPaletteKey;
    }

    // Stable identity for sidebar config prop -- avoids full effect teardown
    // when consumers pass an inline object literal. Keyed by stringified
    // item IDs + categories so the effect only re-runs on meaningful changes.
    const sidebarRef = React.useRef(sidebar);
    const sidebarKey = React.useMemo(() => {
      if (typeof sidebar !== 'object' || sidebar === null) return String(sidebar);
      const itemIds = sidebar.items.map((i) => i.id).join(',');
      const cats = sidebar.categories.join(',');
      return `${itemIds}|${cats}|${sidebar.searchable ?? true}`;
    }, [sidebar]);
    const prevSidebarKeyRef = React.useRef(sidebarKey);
    if (sidebarKey !== prevSidebarKeyRef.current) {
      sidebarRef.current = sidebar;
      prevSidebarKeyRef.current = sidebarKey;
    }

    // ----- Primitive lifecycle (DOM side effects) -----
    // biome-ignore lint/correctness/useExhaustiveDependencies: commandPaletteKey and sidebarKey trigger re-creation when props change; actual data read from refs
    React.useEffect(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || disabled) return;

      const cleanups: CleanupFunction[] = [];

      // Convert SlashCommands to palette-aware callback
      const cmds = commandPaletteRef.current;
      const hasCommandPalette = cmds && cmds.length > 0;
      const onSlashCommand = hasCommandPalette
        ? (position: { x: number; y: number }) => {
            setPalettePosition(position);
            paletteRef.current?.open();
            setPaletteState(paletteRef.current?.getState() ?? INITIAL_PALETTE_STATE);
          }
        : undefined;

      // Create block handler
      // Adapter satisfies BlockHandlerOptions.$blocks which expects mutable arrays,
      // while nanostore atoms expose readonly arrays in their subscribe callback.
      const $blocksAdapter = {
        get: () => blocksAtomRef.current.get() as EditorBlock[],
        subscribe: (cb: (value: EditorBlock[]) => void) =>
          blocksAtomRef.current.subscribe((v) => cb(v as EditorBlock[])),
      };
      const handlerOptions: Parameters<typeof createBlockHandler>[0] = {
        container: canvasEl,
        $blocks: $blocksAdapter,
        onBlocksChange: (newBlocks) => {
          updateBlocks(newBlocks as EditorBlock[]);
        },
      };
      if (onSlashCommand) {
        handlerOptions.onSlashCommand = onSlashCommand;
      }
      const handler = createBlockHandler(handlerOptions);
      handlerRef.current = handler;

      // Bridge handler state into the stable atom so useSyncExternalStore picks it up
      const unsubHandlerState = handler.$state.subscribe((s) => {
        $handlerStateRef.current.set(s);
      });
      cleanups.push(unsubHandlerState);

      cleanups.push(() => {
        handler.destroy();
        handlerRef.current = null;
        $handlerStateRef.current.set({ ...INITIAL_HANDLER_STATE });
      });

      // Command palette primitive
      if (hasCommandPalette) {
        const commands: Command[] = cmds.map((sc) => {
          const cmd: Command = {
            id: sc.id,
            label: sc.label,
            action: () => {
              // No-op: the primitive's execute path is not used. Instead,
              // handlePaletteExecute looks up the original SlashCommand by ID
              // and calls its action with the full EditorControls handle.
            },
          };
          if (sc.keywords) {
            cmd.keywords = sc.keywords;
          }
          return cmd;
        });

        const palette = createCommandPalette({
          container: canvasEl,
          commands,
          onOpen: () => {
            setPaletteState(palette.getState());
          },
          onClose: () => {
            setPaletteState(INITIAL_PALETTE_STATE);
          },
          onSelect: () => {
            setPaletteState(palette.getState());
          },
        });
        paletteRef.current = palette;
        cleanups.push(() => {
          palette.cleanup();
          paletteRef.current = null;
        });
      }

      // Inline formatter + selection listener
      if (inlineToolbar) {
        const formatter = createInlineFormatter({
          container: canvasEl,
          formats: [BOLD, ITALIC, CODE, STRIKETHROUGH],
        });
        formatterRef.current = formatter;
        cleanups.push(() => {
          formatter.cleanup();
          formatterRef.current = null;
        });

        const handleSelectionChange = () => {
          const sel = window.getSelection();
          if (!sel || sel.isCollapsed || !canvasEl.contains(sel.anchorNode)) {
            setInlineToolbarPos(null);
            return;
          }
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const pos = adjustToolbarPosition(
            { x: rect.left + rect.width / 2 - INLINE_TOOLBAR_DIMENSIONS.width / 2, y: rect.top },
            INLINE_TOOLBAR_DIMENSIONS,
          );
          setInlineToolbarPos(pos);
          setActiveFormats(formatter.getActiveFormats());
        };
        document.addEventListener('selectionchange', handleSelectionChange);
        cleanups.push(() => document.removeEventListener('selectionchange', handleSelectionChange));
      }

      // Canvas drop zone for palette sidebar drag-to-insert
      if (sidebarRef.current && typeof sidebarRef.current === 'object') {
        const dropZone = createCanvasDropZone({
          container: canvasEl,
          accept: (data) => {
            // Accept objects that look like a BlockPaletteItem (have an id field)
            return data !== null && typeof data === 'object' && 'id' in data;
          },
          onDrop: (data, insertIndex) => {
            // data may arrive as parsed JSON from either MIME type
            const item = data as BlockPaletteItem;
            if (!item.id) return;
            const cfg = typeof sidebarRef.current === 'object' ? sidebarRef.current : null;
            if (cfg?.onItemInsert && controlsRef.current) {
              cfg.onItemInsert(item, controlsRef.current, insertIndex);
            } else {
              addBlock(
                {
                  id: crypto.randomUUID(),
                  type: item.id,
                  content: '',
                },
                insertIndex,
              );
            }
          },
        });
        cleanups.push(() => dropZone.destroy());
      }

      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    }, [disabled, inlineToolbar, commandPaletteKey, updateBlocks, sidebarKey, addBlock]);

    // ----- Sync controlled value into atom -----
    React.useEffect(() => {
      if (isControlled && controlledValue) {
        blocksAtomRef.current.set(controlledValue);
      }
    }, [isControlled, controlledValue]);

    // ----- Imperative handle -----
    // biome-ignore lint/style/noNonNullAssertion: ref is assigned via useEffect before any consumer reads it
    const controlsRef = React.useRef<EditorControls>(null!);
    const controls = React.useMemo<EditorControls>(
      () => ({
        addBlock,
        addBlocks,
        removeBlocks,
        moveBlock,
        updateBlock,
        undo: () => handlerRef.current?.undo(),
        redo: () => handlerRef.current?.redo(),
        selectAll: () => handlerRef.current?.selectAll(),
        clearSelection: () => handlerRef.current?.clearSelection(),
        deselect: () => handlerRef.current?.handleCanvasBackgroundClick(),
        focus: () => canvasRef.current?.focus(),
      }),
      [addBlock, addBlocks, removeBlocks, moveBlock, updateBlock],
    );
    // Sync controls into the ref inside an effect to avoid mutating a ref during render
    // (React 19 purity requirement).
    React.useEffect(() => {
      controlsRef.current = controls;
    }, [controls]);
    React.useImperativeHandle(ref, () => controls, [controls]);

    // ----- Command palette handlers -----
    const handlePaletteQuery = React.useCallback((query: string) => {
      paletteRef.current?.setQuery(query);
      setPaletteState(paletteRef.current?.getState() ?? INITIAL_PALETTE_STATE);
    }, []);

    const handlePaletteSelect = React.useCallback((index: number) => {
      const palette = paletteRef.current;
      if (!palette) return;
      // The command-palette primitive only exposes selectFirst/selectNext/selectPrevious,
      // so we step to the target index. Fine for small command lists.
      palette.selectFirst();
      for (let i = 0; i < index; i++) {
        palette.selectNext();
      }
      setPaletteState(palette.getState());
    }, []);

    const handlePaletteExecute = React.useCallback(() => {
      const palette = paletteRef.current;
      if (!palette) return;
      const state = palette.getState();
      const cmd = state.filteredCommands[state.selectedIndex];
      if (cmd && commandPaletteRef.current) {
        const slashCmd = commandPaletteRef.current.find((sc) => sc.id === cmd.id);
        if (slashCmd && controlsRef.current) {
          slashCmd.action(controlsRef.current);
        }
      }
      palette.close();
      setPaletteState(INITIAL_PALETTE_STATE);
    }, []);

    const handlePaletteClose = React.useCallback(() => {
      paletteRef.current?.close();
      setPaletteState(INITIAL_PALETTE_STATE);
    }, []);

    // ----- Inline toolbar handler -----
    const handleFormat = React.useCallback((mark: InlineMark) => {
      formatterRef.current?.toggleFormat(mark);
      setActiveFormats(formatterRef.current?.getActiveFormats() ?? []);
    }, []);

    // ----- Rule application helpers -----
    const applyRuleToBlock = React.useCallback(
      (blockId: string, ruleItem: RulePaletteItem, config?: Record<string, unknown>) => {
        const current = blocksAtomRef.current.get();
        const block = current.find((b) => b.id === blockId);
        if (!block) return;

        const existingRules = block.rules ?? [];
        // Prevent duplicate simple rules
        const alreadyApplied = existingRules.some((r) =>
          typeof r === 'string' ? r === ruleItem.id : r.name === ruleItem.id,
        );
        if (alreadyApplied && !config) return;

        const rule: AppliedRule = config ? { name: ruleItem.id, config } : ruleItem.id;

        // If parameterized and already exists, update config
        if (alreadyApplied && config) {
          const updatedRules = existingRules.map((r) =>
            typeof r === 'object' && r.name === ruleItem.id ? rule : r,
          );
          updateBlock(blockId, { rules: updatedRules });
        } else {
          updateBlock(blockId, { rules: [...existingRules, rule] });
        }

        const rpConfig = typeof rulePalette === 'object' ? rulePalette : null;
        if (rpConfig?.onRuleApplied && controlsRef.current) {
          rpConfig.onRuleApplied(blockId, rule, controlsRef.current);
        }
      },
      [updateBlock, rulePalette],
    );

    const handleRuleActivate = React.useCallback(
      (item: RulePaletteItem) => {
        // When activated from palette (click/Enter), apply to focused block
        const focusedId = $handlerStateRef.current.get().focusedId;
        if (!focusedId) return;

        const rpConfig = typeof rulePalette === 'object' ? rulePalette : null;
        const fields = rpConfig?.configFields?.[item.id];
        if (item.requiresConfig && fields && fields.length > 0) {
          setRuleDialogState({ rule: item, blockId: focusedId });
        } else {
          applyRuleToBlock(focusedId, item);
        }
      },
      [applyRuleToBlock, rulePalette],
    );

    const handleRuleConfigConfirm = React.useCallback(
      (config: Record<string, unknown>) => {
        if (ruleDialogState) {
          applyRuleToBlock(ruleDialogState.blockId, ruleDialogState.rule, config);
          setRuleDialogState(null);
        }
      },
      [ruleDialogState, applyRuleToBlock],
    );

    const handleRuleConfigCancel = React.useCallback(() => {
      setRuleDialogState(null);
    }, []);

    // ----- Rule drop on blocks (drag from rule palette onto block elements) -----
    React.useEffect(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || disabled || !rulePalette) return;

      const handleRuleDragOver = (event: DragEvent) => {
        // Check if this is a rule drag (has the rule MIME type)
        if (!event.dataTransfer?.types.includes('application/x-rafters-rule')) return;

        // Find the closest block element
        const target = event.target as HTMLElement;
        const blockEl = target.closest('[data-block-id]') as HTMLElement | null;
        if (!blockEl) return;

        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = 'copy';
        }
        blockEl.setAttribute('data-rule-drop-target', 'true');
      };

      const handleRuleDragLeave = (event: DragEvent) => {
        const target = event.target as HTMLElement;
        const blockEl = target.closest('[data-block-id]') as HTMLElement | null;
        if (blockEl) {
          blockEl.removeAttribute('data-rule-drop-target');
        }
      };

      const handleRuleDrop = (event: DragEvent) => {
        const target = event.target as HTMLElement;
        const blockEl = target.closest('[data-block-id]') as HTMLElement | null;
        if (!blockEl) return;

        blockEl.removeAttribute('data-rule-drop-target');

        const ruleJson = event.dataTransfer?.getData('application/x-rafters-rule');
        if (!ruleJson) return;

        event.preventDefault();

        let ruleItem: RulePaletteItem;
        try {
          ruleItem = JSON.parse(ruleJson) as RulePaletteItem;
        } catch {
          return;
        }

        const blockId = blockEl.getAttribute('data-block-id');
        if (!blockId) return;

        // Check compatibility
        if (ruleItem.compatibleBlockTypes && ruleItem.compatibleBlockTypes.length > 0) {
          const block = blocksAtomRef.current.get().find((b) => b.id === blockId);
          if (block && !ruleItem.compatibleBlockTypes.includes(block.type)) {
            // Incompatible - no-op (block element briefly flashes via CSS)
            blockEl.setAttribute('data-rule-rejected', 'true');
            setTimeout(() => blockEl.removeAttribute('data-rule-rejected'), 600);
            return;
          }
        }

        // Parameterized rule: open config dialog
        const rpConfig = typeof rulePalette === 'object' ? rulePalette : null;
        const fields = rpConfig?.configFields?.[ruleItem.id];
        if (ruleItem.requiresConfig && fields && fields.length > 0) {
          setRuleDialogState({ rule: ruleItem, blockId });
        } else {
          applyRuleToBlock(blockId, ruleItem);
        }
      };

      canvasEl.addEventListener('dragover', handleRuleDragOver);
      canvasEl.addEventListener('dragleave', handleRuleDragLeave);
      canvasEl.addEventListener('drop', handleRuleDrop);

      return () => {
        canvasEl.removeEventListener('dragover', handleRuleDragOver);
        canvasEl.removeEventListener('dragleave', handleRuleDragLeave);
        canvasEl.removeEventListener('drop', handleRuleDrop);
      };
    }, [disabled, rulePalette, applyRuleToBlock]);

    // ----- Block context menu primitive -----
    React.useEffect(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || disabled || !blockContextMenu) return;

      // Create an off-screen menu element for the primitive to manage
      const menuEl = document.createElement('div');
      document.body.appendChild(menuEl);

      const ctxMenu = createBlockContextMenu({
        container: canvasEl,
        menu: menuEl,
        onAction: (itemId, blockId) => {
          if (itemId === 'remove-block') {
            const current = blocksAtomRef.current.get();
            const block = current.find((b) => b.id === blockId);
            if (block) {
              // Collect children to remove too
              const idsToRemove = new Set<string>([blockId]);
              if (block.children) {
                for (const childId of block.children) idsToRemove.add(childId);
              }
              removeBlocks(idsToRemove);
            }
          } else if (itemId.startsWith('remove-rule:')) {
            const ruleName = itemId.slice('remove-rule:'.length);
            const current = blocksAtomRef.current.get();
            const block = current.find((b) => b.id === blockId);
            if (block?.rules) {
              const updatedRules = block.rules.filter((r) =>
                typeof r === 'string' ? r !== ruleName : r.name !== ruleName,
              );
              updateBlock(blockId, { rules: updatedRules });
            }
          } else if (itemId.startsWith('edit-rule:')) {
            const ruleName = itemId.slice('edit-rule:'.length);
            const ruleItem = rulePalette?.items.find((r) => r.id === ruleName);
            if (ruleItem?.requiresConfig) {
              setRuleDialogState({ rule: ruleItem, blockId });
            }
          }
          setContextMenuState(null);
        },
        onOpen: (blockId, position) => {
          setContextMenuState({ blockId, position });
        },
        onClose: () => {
          setContextMenuState(null);
        },
      });
      blockContextMenuRef.current = ctxMenu;

      return () => {
        ctxMenu.destroy();
        menuEl.remove();
        blockContextMenuRef.current = null;
        setContextMenuState(null);
      };
    }, [disabled, blockContextMenu, removeBlocks, updateBlock, rulePalette]);

    // ----- Block click handler -----
    const handleBlockClick = React.useCallback(
      (blockId: string, event: React.MouseEvent) => {
        if (disabled) return;
        canvasRef.current?.focus();
        handlerRef.current?.handleBlockClick(blockId, {
          meta: event.metaKey || event.ctrlKey,
          shift: event.shiftKey,
        });
      },
      [disabled],
    );

    // ----- Build block context -----
    const buildContext = React.useCallback(
      (block: EditorBlock, index: number): BlockRenderContext => ({
        index,
        total: blocks.length,
        isFirst: index === 0,
        isLast: index === blocks.length - 1,
        isSelected: handlerState.selectedIds.has(block.id),
        isFocused: handlerState.focusedId === block.id,
      }),
      [blocks.length, handlerState.selectedIds, handlerState.focusedId],
    );

    const render = renderBlock ?? defaultRenderBlock;

    // ----- Sidebar focus handler -----
    const handleSidebarFocusBlock = React.useCallback((id: string) => {
      handlerRef.current?.handleBlockClick(id, { meta: false, shift: false });
      canvasRef.current?.focus();
    }, []);

    // ----- Palette sidebar handlers -----
    const handlePaletteActivate = React.useCallback(
      (item: BlockPaletteItem) => {
        const cfg = typeof sidebarRef.current === 'object' ? sidebarRef.current : null;
        if (cfg?.onItemInsert && controlsRef.current) {
          cfg.onItemInsert(item, controlsRef.current);
        } else {
          addBlock({
            id: crypto.randomUUID(),
            type: item.id,
            content: '',
          });
        }
      },
      [addBlock],
    );

    const handleSaveComposite = React.useCallback(
      async (data: SaveCompositeData) => {
        try {
          await onSaveAsComposite?.(data);
          setShowSaveDialog(false);
        } catch {
          // Keep dialog open so user knows the save failed
        }
      },
      [onSaveAsComposite],
    );

    // Determine sidebar mode
    const sidebarConfig = typeof sidebar === 'object' && sidebar !== null ? sidebar : null;

    return (
      <Container
        {...props}
        as="section"
        padding="0"
        query={false}
        aria-label="Editor"
        aria-disabled={disabled || undefined}
        dir={dir}
        className={classy(
          'flex flex-col rounded-lg border border-border bg-background',
          { 'opacity-50 pointer-events-none': disabled },
          className,
        )}
      >
        {toolbar && (
          <div className={classy('flex items-center')}>
            <EditorToolbarSection
              canUndo={handlerState.canUndo}
              canRedo={handlerState.canRedo}
              onUndo={() => handlerRef.current?.undo()}
              onRedo={() => handlerRef.current?.redo()}
            />
            {onSaveAsComposite && (
              <button
                type="button"
                onClick={() => setShowSaveDialog(true)}
                disabled={blocks.length === 0}
                aria-label="Save as Composite"
                className={classy(
                  'ml-auto mr-2 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring',
                  { 'opacity-50 cursor-not-allowed': blocks.length === 0 },
                )}
              >
                Save as Composite
              </button>
            )}
          </div>
        )}
        <div className={classy('flex flex-1')}>
          {sidebar === true && (
            <EditorSidebarSection
              blocks={blocks}
              selectedIds={handlerState.selectedIds}
              focusedId={handlerState.focusedId}
              onFocusBlock={handleSidebarFocusBlock}
            />
          )}
          {sidebarConfig && rulePalette && (
            <EditorTabbedPaletteSidebar
              blockConfig={sidebarConfig}
              ruleConfig={rulePalette}
              onBlockActivate={handlePaletteActivate}
              onRuleActivate={handleRuleActivate}
              disabled={disabled}
            />
          )}
          {sidebarConfig && !rulePalette && (
            <EditorPaletteSidebar
              config={sidebarConfig}
              onActivate={handlePaletteActivate}
              disabled={disabled}
            />
          )}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard handled by block-handler primitive on this container */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by block-handler primitive on this container */}
          {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-activedescendant used when listbox role is active */}
          <div
            ref={canvasRef}
            role={blocks.length > 0 ? 'listbox' : undefined}
            aria-multiselectable={blocks.length > 0 ? 'true' : undefined}
            aria-activedescendant={
              handlerState.focusedId ? `editor-block-${handlerState.focusedId}` : undefined
            }
            aria-label="Editor blocks"
            tabIndex={disabled ? -1 : 0}
            className={classy(
              'flex flex-1 flex-col gap-0.5 p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-ring',
            )}
            onClick={(e) => {
              // Only clear when clicking canvas background, not blocks
              if (e.target === e.currentTarget && !disabled) {
                handlerRef.current?.clearSelection();
              }
            }}
          >
            {blocks.length === 0 && (emptyState ?? <DefaultEmptyState />)}
            {blocks.map((block, index) => {
              const ctx = buildContext(block, index);
              return (
                // biome-ignore lint/a11y/useFocusableInteractive: focus managed by block-handler primitive via aria-activedescendant
                // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handled by block-handler primitive on parent container
                <div
                  key={block.id}
                  id={`editor-block-${block.id}`}
                  role="option"
                  aria-selected={ctx.isSelected}
                  data-block-id={block.id}
                  data-selected={ctx.isSelected || undefined}
                  data-focused={ctx.isFocused || undefined}
                  onClick={(e) => handleBlockClick(block.id, e)}
                  className={classy('rounded-md border border-transparent transition-colors', {
                    'border-primary bg-primary/5': ctx.isSelected,
                    'ring-2 ring-primary-ring': ctx.isFocused,
                  })}
                >
                  {render(block, ctx)}
                </div>
              );
            })}
          </div>
        </div>
        {commandPalette && paletteState.isOpen && (
          <CommandPaletteOverlay
            state={paletteState}
            position={palettePosition}
            onQuery={handlePaletteQuery}
            onSelect={handlePaletteSelect}
            onExecute={handlePaletteExecute}
            onClose={handlePaletteClose}
          />
        )}
        {inlineToolbar && inlineToolbarPos && (
          <InlineToolbarOverlay
            position={inlineToolbarPos}
            activeFormats={activeFormats}
            onFormat={handleFormat}
          />
        )}
        {ruleDialogState &&
          (() => {
            const fields = rulePalette?.configFields?.[ruleDialogState.rule.id];
            if (!fields) return null;
            return (
              <RuleConfigDialog
                rule={ruleDialogState.rule}
                fields={fields}
                anchorId={`editor-block-${ruleDialogState.blockId}`}
                onConfirm={handleRuleConfigConfirm}
                onCancel={handleRuleConfigCancel}
              />
            );
          })()}
        {blockContextMenu && blockContextMenuState && (
          <BlockContextMenuOverlay
            state={blockContextMenuState}
            block={blocks.find((b) => b.id === blockContextMenuState.blockId)}
            onAction={(actionId) => {
              const ctxMenu = blockContextMenuRef.current;
              if (ctxMenu) {
                // Find the menu element's matching item and trigger action
                const blockId = blockContextMenuState.blockId;
                if (actionId === 'remove-block') {
                  const block = blocks.find((b) => b.id === blockId);
                  if (block) {
                    const idsToRemove = new Set<string>([blockId]);
                    if (block.children) {
                      for (const childId of block.children) idsToRemove.add(childId);
                    }
                    removeBlocks(idsToRemove);
                  }
                } else if (actionId.startsWith('remove-rule:')) {
                  const ruleName = actionId.slice('remove-rule:'.length);
                  const block = blocks.find((b) => b.id === blockId);
                  if (block?.rules) {
                    const updatedRules = block.rules.filter((r) =>
                      typeof r === 'string' ? r !== ruleName : r.name !== ruleName,
                    );
                    updateBlock(blockId, { rules: updatedRules });
                  }
                } else if (actionId.startsWith('edit-rule:')) {
                  const ruleName = actionId.slice('edit-rule:'.length);
                  const ruleItem = rulePalette?.items.find((r) => r.id === ruleName);
                  if (ruleItem?.requiresConfig) {
                    setRuleDialogState({ rule: ruleItem, blockId });
                  }
                }
                setContextMenuState(null);
                ctxMenu.close();
              }
            }}
          />
        )}
        {showSaveDialog && onSaveAsComposite && (
          <SaveCompositeDialog
            blocks={blocks}
            onSave={handleSaveComposite}
            onCancel={() => setShowSaveDialog(false)}
          />
        )}
      </Container>
    );
  },
);

Editor.displayName = 'Editor';

export default Editor;
