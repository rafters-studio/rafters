/**
 * Editor - block-based document editor
 *
 * A thin React wrapper over the document-editor primitive. The editor is a
 * toolbar and a document surface -- like Google Docs. Everything else
 * (sidebar, command palette, context menu) composes on top.
 *
 * @example
 * ```tsx
 * <Editor
 *   defaultValue={[{ id: '1', type: 'text', content: 'Hello' }]}
 *   onValueChange={(blocks) => save(blocks)}
 * />
 * ```
 */

import { atom } from 'nanostores';
import * as React from 'react';
import {
  type BlockContextMenuControls,
  createBlockContextMenu,
} from '../../primitives/block-context-menu';
import { convertBlockType } from '../../primitives/block-operations';
import {
  type BlockPaletteControls,
  type BlockPaletteItem,
  createBlockPalette,
} from '../../primitives/block-palette';
import classy from '../../primitives/classy';
import {
  type CommandPaletteController,
  createCommandPalette,
} from '../../primitives/command-palette';
import { findBlockElement } from '../../primitives/cursor-tracker';
import {
  createDocumentEditor,
  type DocumentEditorControls,
} from '../../primitives/document-editor';
import {
  BOLD,
  CODE,
  createInlineFormatter,
  type InlineFormatterController,
  ITALIC,
  LINK,
  STRIKETHROUGH,
} from '../../primitives/inline-formatter';
import { adjustToolbarPosition, getFormatButtons } from '../../primitives/inline-toolbar';
import type {
  BaseBlock,
  CleanupFunction,
  Command,
  Direction,
  InlineContent,
  InlineMark,
} from '../../primitives/types';
import { Button } from './button';
import { Container } from './container';
import {
  editorContextMenuClasses,
  editorContextMenuDestructiveClasses,
  editorContextMenuItemClasses,
  editorInlineToolbarButtonActiveClasses,
  editorInlineToolbarButtonClasses,
  editorInlineToolbarClasses,
  editorPaletteCategoryClasses,
  editorPaletteItemClasses,
  editorPaletteLayoutClasses,
  editorPaletteListClasses,
  editorPaletteSearchClasses,
  editorRulePaletteAsideClasses,
  editorSaveActionClasses,
  editorSaveActionsClasses,
  editorSaveDialogClasses,
  editorSaveFieldClasses,
  editorSaveOverlayClasses,
  editorSaveTriggerClasses,
  editorSidebarAsideClasses,
  editorSlashItemClasses,
  editorSlashItemSelectedClasses,
  editorSlashListClasses,
  editorSlashMenuClasses,
  editorSlashSearchClasses,
} from './editor.classes';
import { Separator } from './separator';

// =============================================================================
// Types
// =============================================================================

export type AppliedRule = string | { name: string; config: Record<string, unknown> };

export interface EditorBlock extends BaseBlock {
  rules?: AppliedRule[];
}

export interface EditorProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  defaultValue?: EditorBlock[];
  value?: EditorBlock[];
  onValueChange?: (blocks: EditorBlock[]) => void;
  onValueCommit?: (blocks: EditorBlock[]) => void;
  toolbar?: boolean;
  emptyState?: React.ReactNode;
  disabled?: boolean;
  dir?: Direction;
  className?: string;
  /** Block-palette sidebar. When provided, mounts a categorized, searchable
   *  list of insertable blocks beside the canvas. */
  sidebar?: EditorSidebarConfig;
  /** Rule palette. When provided, mounts a categorized, searchable list of
   *  rules that apply to the focused block, on the opposite side of the canvas. */
  rulePalette?: EditorRulePaletteConfig;
  /** Slash commands. When provided, typing `/` at the start of a block (or after
   *  whitespace) opens a caret-anchored command menu with its own search input. */
  commandPalette?: SlashCommand[];
  /** Block context menu. When true, right-clicking a block opens a menu of
   *  block actions (move up/down, duplicate, delete). */
  blockContextMenu?: boolean;
  /** Inline format toolbar. When true, selecting text shows a floating toolbar
   *  to toggle bold/italic/code/strikethrough/link on the selection. */
  inlineToolbar?: boolean;
  /** Save-as-composite handler. When provided, a "Save as composite" action
   *  opens a dialog collecting name/category/description and fires this with the
   *  current blocks. */
  onSaveAsComposite?: (data: SaveCompositeData) => void | Promise<void>;
}

export interface EditorControls {
  addBlock: (block: EditorBlock, index?: number) => void;
  addBlocks: (blocks: EditorBlock[], index?: number) => void;
  removeBlocks: (ids: Set<string>) => void;
  moveBlock: (id: string, toIndex: number) => void;
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void;
  getBlocks: () => EditorBlock[];
  focus: () => void;
  deselect: () => void;
}

export interface SlashCommand {
  id: string;
  label: string;
  icon?: React.ReactNode;
  keywords?: string[];
  action: (editor: EditorControls) => void;
}

export interface SaveCompositeData {
  name: string;
  category: string;
  description: string;
  blocks: EditorBlock[];
}

export interface EditorSidebarConfig {
  items: Array<{ id: string; label: string; category: string; keywords?: string[] }>;
  categories: string[];
  searchable?: boolean;
  renderItem?: (item: { id: string; label: string; category: string }) => React.ReactNode;
  onItemInsert?: (
    item: { id: string; label: string; category: string },
    controls: EditorControls,
    insertIndex?: number,
  ) => void;
}

export interface EditorRulePaletteConfig {
  items: Array<{
    id: string;
    label: string;
    category: string;
    keywords?: string[];
    requiresConfig?: boolean;
    compatibleBlockTypes?: string[];
  }>;
  categories: string[];
  searchable?: boolean;
  renderItem?: (item: { id: string; label: string; category: string }) => React.ReactNode;
  configFields?: Record<string, RuleConfigField[]>;
  onRuleApplied?: (blockId: string, rule: AppliedRule, controls: EditorControls) => void;
}

export interface RuleConfigField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  defaultValue?: string | number;
  options?: Array<{ value: string; label: string }>;
}

export interface BlockRenderContext {
  index: number;
  total: number;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  isFocused: boolean;
}

// =============================================================================
// Block rendering
// =============================================================================

function renderInlineContent(content: string | InlineContent[] | undefined): React.ReactNode {
  if (content === undefined) return '\u00A0';
  if (typeof content === 'string') return content || '\u00A0';

  return content.map((segment, i) => {
    let node: React.ReactNode = segment.text;
    const marks = segment.marks ?? [];

    if (marks.includes('code')) node = <code key={`c${i}`}>{node}</code>;
    if (marks.includes('link') && segment.href) {
      node = (
        <a key={`l${i}`} href={segment.href}>
          {node}
        </a>
      );
    }
    if (marks.includes('strikethrough')) node = <del key={`s${i}`}>{node}</del>;
    if (marks.includes('italic')) node = <em key={`i${i}`}>{node}</em>;
    if (marks.includes('bold')) node = <strong key={`b${i}`}>{node}</strong>;

    return node;
  });
}

function DocumentBlock({ block }: { block: EditorBlock }) {
  const content = renderInlineContent(block.content);

  switch (block.type) {
    case 'heading': {
      const level = (block.meta?.level as number) ?? 1;
      const Tag = `h${Math.min(Math.max(level, 1), 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
      return <Tag data-block-id={block.id}>{content}</Tag>;
    }
    case 'text':
      return <p data-block-id={block.id}>{content}</p>;
    case 'code':
      return (
        <pre data-block-id={block.id}>
          <code>{String(block.content ?? '')}</code>
        </pre>
      );
    case 'quote':
      return <blockquote data-block-id={block.id}>{content}</blockquote>;
    case 'divider':
      return <hr data-block-id={block.id} />;
    case 'image':
      return (
        <figure data-block-id={block.id}>
          <img src={(block.meta?.src as string) ?? ''} alt={(block.meta?.alt as string) ?? ''} />
        </figure>
      );
    case 'list': {
      const Tag = block.meta?.ordered ? 'ol' : 'ul';
      return <Tag data-block-id={block.id} />;
    }
    case 'list-item':
      return <li data-block-id={block.id}>{content}</li>;
    default:
      return <p data-block-id={block.id}>{content}</p>;
  }
}

function DefaultEmptyState() {
  return (
    <Container as="div" padding="8">
      <p className={classy('text-muted-foreground text-center text-sm')}>
        No blocks yet. Start typing.
      </p>
    </Container>
  );
}

interface PaletteAsideProps {
  label: string;
  asideClasses: string;
  searchable: boolean;
  searchLabel: string;
  searchPlaceholder: string;
  groups: Map<string, BlockPaletteItem[]>;
  listRef: React.RefObject<HTMLDivElement | null>;
  renderItem?:
    | ((item: { id: string; label: string; category: string }) => React.ReactNode)
    | undefined;
  onSearch: (query: string) => void;
}

/**
 * A palette pane: an optional search input over a category-grouped, selectable
 * item list. The block-palette primitive (mounted by the caller into listRef)
 * owns ARIA + event delegation; this renders only the markup it scans. Shared
 * by the block sidebar and the rule palette.
 */
function PaletteAside({
  label,
  asideClasses,
  searchable,
  searchLabel,
  searchPlaceholder,
  groups,
  listRef,
  renderItem,
  onSearch,
}: PaletteAsideProps) {
  return (
    <aside aria-label={label} className={classy(asideClasses)}>
      {searchable && (
        <input
          type="search"
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          className={classy(editorPaletteSearchClasses)}
          onChange={(event) => onSearch(event.target.value)}
        />
      )}
      <div ref={listRef} className={classy(editorPaletteListClasses)}>
        {Array.from(groups.entries()).map(([category, items]) => (
          <div key={category} role="presentation">
            <div className={classy(editorPaletteCategoryClasses)}>{category}</div>
            {items.map((item) => (
              <div
                key={item.id}
                data-palette-item=""
                data-palette-id={item.id}
                role="option"
                aria-selected="false"
                draggable
                tabIndex={-1}
                className={classy(editorPaletteItemClasses)}
              >
                {renderItem ? renderItem(item) : item.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

// =============================================================================
// Block type toolbar
// =============================================================================

interface BlockTypeOption {
  value: string;
  label: string;
  meta?: Record<string, unknown>;
}

const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  { value: 'text', label: 'Paragraph' },
  { value: 'heading-1', label: 'Heading 1', meta: { level: 1 } },
  { value: 'heading-2', label: 'Heading 2', meta: { level: 2 } },
  { value: 'heading-3', label: 'Heading 3', meta: { level: 3 } },
  { value: 'heading-4', label: 'Heading 4', meta: { level: 4 } },
  { value: 'quote', label: 'Blockquote' },
  { value: 'code', label: 'Code Block' },
];

function blockToTypeValue(block: EditorBlock | undefined): string {
  if (!block) return 'text';
  if (block.type === 'heading') return `heading-${(block.meta?.level as number) ?? 1}`;
  return block.type;
}

interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  focusedBlock?: EditorBlock | undefined;
  onChangeBlockType?:
    | ((blockId: string, type: string, meta?: Record<string, unknown>) => void)
    | undefined;
}

function EditorToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  focusedBlock,
  onChangeBlockType,
}: ToolbarProps) {
  return (
    <Container as="div" padding="1" className="border-b border-border">
      <div
        role="toolbar"
        aria-label="Editor toolbar"
        className={classy('inline-flex items-center')}
      >
        {focusedBlock && onChangeBlockType && (
          <>
            <select
              value={blockToTypeValue(focusedBlock)}
              onChange={(e) => {
                const option = BLOCK_TYPE_OPTIONS.find((o) => o.value === e.target.value);
                if (!option) return;
                const type = option.value.startsWith('heading') ? 'heading' : option.value;
                onChangeBlockType(focusedBlock.id, type, option.meta);
              }}
              aria-label="Block type"
              className={classy(
                'rounded-md border border-input bg-background px-2 py-1 text-xs font-medium',
              )}
            >
              {BLOCK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Separator orientation="vertical" className="mx-1 h-4" />
          </>
        )}
        <Button variant="ghost" size="xs" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          Undo
        </Button>
        <Button variant="ghost" size="xs" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
          Redo
        </Button>
      </div>
    </Container>
  );
}

interface ContextMenuItemDef {
  id: string;
  label: string;
  destructive?: boolean;
}

/** Default block right-click actions. */
const CONTEXT_MENU_ITEMS: ContextMenuItemDef[] = [
  { id: 'move-up', label: 'Move up' },
  { id: 'move-down', label: 'Move down' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'delete', label: 'Delete', destructive: true },
];

/** Inline marks the format toolbar can toggle. */
const INLINE_FORMATS = [BOLD, ITALIC, CODE, STRIKETHROUGH, LINK];

// =============================================================================
// Editor component
// =============================================================================

export const Editor = React.forwardRef<EditorControls, EditorProps>(
  (
    {
      className,
      value: controlledValue,
      defaultValue,
      onValueChange,
      onValueCommit,
      toolbar = false,
      emptyState,
      disabled = false,
      dir,
      sidebar,
      rulePalette,
      commandPalette,
      blockContextMenu,
      inlineToolbar,
      onSaveAsComposite,
      ...props
    },
    ref,
  ) => {
    // -- State --
    const [uncontrolled, setUncontrolled] = React.useState<EditorBlock[]>(defaultValue ?? []);
    const isControlled = controlledValue !== undefined;
    const blocks = isControlled ? controlledValue : uncontrolled;

    const blocksAtomRef = React.useRef(atom<EditorBlock[]>(blocks));
    const callbacksRef = React.useRef({ onValueChange, onValueCommit });
    callbacksRef.current = { onValueChange, onValueCommit };

    // -- Refs --
    const canvasRef = React.useRef<HTMLDivElement>(null);
    const docEditorRef = React.useRef<DocumentEditorControls | null>(null);
    const sidebarRef = React.useRef<HTMLDivElement>(null);
    const paletteRef = React.useRef<BlockPaletteControls | null>(null);
    const [paletteGroups, setPaletteGroups] = React.useState<Map<string, BlockPaletteItem[]>>(
      () => new Map(),
    );
    const rulePaletteRef = React.useRef<HTMLDivElement>(null);
    const rulePaletteControlsRef = React.useRef<BlockPaletteControls | null>(null);
    const [rulePaletteGroups, setRulePaletteGroups] = React.useState<
      Map<string, BlockPaletteItem[]>
    >(() => new Map());
    const slashControllerRef = React.useRef<CommandPaletteController | null>(null);
    const slashInputRef = React.useRef<HTMLInputElement>(null);
    const [slashOpen, setSlashOpen] = React.useState(false);
    const [slashCommands, setSlashCommands] = React.useState<Command[]>([]);
    const [slashSelectedIndex, setSlashSelectedIndex] = React.useState(-1);
    const [slashPosition, setSlashPosition] = React.useState<{ top: number; left: number }>({
      top: 0,
      left: 0,
    });
    const contextMenuRef = React.useRef<HTMLDivElement>(null);
    const contextMenuControllerRef = React.useRef<BlockContextMenuControls | null>(null);
    const [contextMenuOpen, setContextMenuOpen] = React.useState(false);
    const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
    const [saveName, setSaveName] = React.useState('');
    const [saveCategory, setSaveCategory] = React.useState('');
    const [saveDescription, setSaveDescription] = React.useState('');
    const inlineFormatterRef = React.useRef<InlineFormatterController | null>(null);
    const [toolbarOpen, setToolbarOpen] = React.useState(false);
    const [toolbarPosition, setToolbarPosition] = React.useState<{ top: number; left: number }>({
      top: 0,
      left: 0,
    });
    const [activeFormats, setActiveFormats] = React.useState<InlineMark[]>([]);

    // -- Toolbar state --
    const [focusedBlockId, setFocusedBlockId] = React.useState<string | null>(null);
    // Mirror of focusedBlockId for the palette's activation closure, so insert
    // position stays current without re-running the palette mount effect.
    const focusedBlockIdRef = React.useRef<string | null>(null);
    focusedBlockIdRef.current = focusedBlockId;
    const [canUndo, setCanUndo] = React.useState(false);
    const [canRedo, setCanRedo] = React.useState(false);

    // -- Block mutation --
    const updateBlocks = React.useCallback(
      (next: EditorBlock[], commit = false) => {
        blocksAtomRef.current.set(next);
        if (!isControlled) setUncontrolled(next);
        callbacksRef.current.onValueChange?.(next);
        if (commit) callbacksRef.current.onValueCommit?.(next);
      },
      [isControlled],
    );

    // -- CRUD --
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
        const next = blocksAtomRef.current.get().filter((b) => !ids.has(b.id));
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
        next.splice(Math.min(Math.max(toIndex, 0), next.length), 0, moved);
        updateBlocks(next, true);
      },
      [updateBlocks],
    );

    const updateBlock = React.useCallback(
      (id: string, updates: Partial<EditorBlock>) => {
        const next = blocksAtomRef.current
          .get()
          .map((b) => (b.id === id ? { ...b, ...updates, id: b.id } : b));
        updateBlocks(next, false);
      },
      [updateBlocks],
    );

    const handleChangeBlockType = React.useCallback(
      (blockId: string, newType: string, meta?: Record<string, unknown>) => {
        const next = convertBlockType(blocksAtomRef.current.get(), blockId, newType, meta);
        updateBlocks(next as EditorBlock[]);
      },
      [updateBlocks],
    );

    // -- Imperative handle --
    const controlsRef = React.useRef<EditorControls | null>(null);
    controlsRef.current = {
      addBlock,
      addBlocks,
      removeBlocks,
      moveBlock,
      updateBlock,
      getBlocks: () => blocksAtomRef.current.get(),
      focus: () => canvasRef.current?.focus(),
      deselect: () => {},
    };
    React.useImperativeHandle(ref, () => controlsRef.current as EditorControls, []);

    // -- Document editor primitive lifecycle --
    React.useEffect(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || disabled) return;

      const cleanups: CleanupFunction[] = [];

      const docEditor = createDocumentEditor({
        container: canvasEl,
        initialBlocks: blocksAtomRef.current.get(),
        onBlocksChange: (newBlocks) => updateBlocks(newBlocks as EditorBlock[]),
      });
      docEditorRef.current = docEditor;

      // Sync undo/redo state
      const unsubState = docEditor.$state.subscribe((s) => {
        setCanUndo(s.canUndo);
        setCanRedo(s.canRedo);
      });
      cleanups.push(unsubState);

      // Track focused block for toolbar
      const trackFocus = () => {
        const sel = window.getSelection();
        if (!sel || !canvasEl.contains(sel.anchorNode)) {
          setFocusedBlockId(null);
          return;
        }
        const blockEl = findBlockElement(sel.anchorNode);
        setFocusedBlockId(blockEl?.getAttribute('data-block-id') ?? null);
      };
      document.addEventListener('selectionchange', trackFocus);
      cleanups.push(() => document.removeEventListener('selectionchange', trackFocus));

      cleanups.push(() => {
        docEditor.destroy();
        docEditorRef.current = null;
      });

      return () => {
        for (const cleanup of cleanups) cleanup();
      };
    }, [disabled, updateBlocks]);

    // -- Sync controlled value to atom --
    React.useEffect(() => {
      if (isControlled && controlledValue) {
        blocksAtomRef.current.set(controlledValue);
      }
    }, [isControlled, controlledValue]);

    // -- Sidebar block-palette lifecycle --
    // Mirrors the document-editor mount pattern: React renders the item groups
    // into sidebarRef, the primitive owns ARIA + event delegation on the same
    // container. Activation inserts after the focused block (or appends).
    React.useEffect(() => {
      const sidebarEl = sidebarRef.current;
      if (!sidebarEl || !sidebar) return;

      const palette = createBlockPalette({
        container: sidebarEl,
        items: sidebar.items,
        categories: sidebar.categories,
        disabled,
        onActivate: (item) => {
          const focusedId = focusedBlockIdRef.current;
          const current = blocksAtomRef.current.get();
          const insertIndex = focusedId
            ? current.findIndex((b) => b.id === focusedId) + 1
            : undefined;
          sidebar.onItemInsert?.(item, controlsRef.current as EditorControls, insertIndex);
        },
      });
      paletteRef.current = palette;
      setPaletteGroups(palette.getGroupedItems());

      return () => {
        palette.destroy();
        paletteRef.current = null;
      };
    }, [sidebar, disabled]);

    // -- Rule palette lifecycle --
    // Same mount pattern as the sidebar, but activation applies a rule to the
    // focused block (gated by compatibleBlockTypes) instead of inserting one.
    React.useEffect(() => {
      const listEl = rulePaletteRef.current;
      if (!listEl || !rulePalette) return;

      const palette = createBlockPalette({
        container: listEl,
        items: rulePalette.items,
        categories: rulePalette.categories,
        disabled,
        onActivate: (item) => {
          const focusedId = focusedBlockIdRef.current;
          if (!focusedId) return;
          const block = blocksAtomRef.current.get().find((b) => b.id === focusedId);
          if (!block) return;
          const compatible = rulePalette.items.find((r) => r.id === item.id)?.compatibleBlockTypes;
          if (compatible && compatible.length > 0 && !compatible.includes(block.type)) return;
          rulePalette.onRuleApplied?.(focusedId, item.id, controlsRef.current as EditorControls);
        },
      });
      rulePaletteControlsRef.current = palette;
      setRulePaletteGroups(palette.getGroupedItems());

      return () => {
        palette.destroy();
        rulePaletteControlsRef.current = null;
      };
    }, [rulePalette, disabled]);

    // -- Slash command menu lifecycle --
    // The command-palette primitive owns '/'-trigger detection (preventDefaulted,
    // so '/' never enters the document), filtering, and execute. The rendered
    // menu carries its own search input, so typing never touches the canvas; it
    // is anchored at the caret.
    React.useEffect(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || disabled || !commandPalette) return;

      const toCommand = (sc: SlashCommand): Command => {
        const command: Command = {
          id: sc.id,
          label: sc.label,
          action: () => sc.action(controlsRef.current as EditorControls),
        };
        if (sc.keywords) command.keywords = sc.keywords;
        return command;
      };

      const controller = createCommandPalette({
        container: canvasEl,
        trigger: '/',
        commands: commandPalette.map(toCommand),
        onOpen: () => {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            setSlashPosition({ top: rect.bottom, left: rect.left });
          }
          const state = controller.getState();
          setSlashCommands(state.filteredCommands);
          setSlashSelectedIndex(state.selectedIndex);
          setSlashOpen(true);
        },
        onClose: () => setSlashOpen(false),
        onSelect: (_command, index) => {
          setSlashCommands(controller.getState().filteredCommands);
          setSlashSelectedIndex(index);
        },
      });
      slashControllerRef.current = controller;

      return () => {
        controller.cleanup();
        slashControllerRef.current = null;
      };
    }, [commandPalette, disabled]);

    // Focus the slash menu's search input when it opens.
    React.useEffect(() => {
      if (slashOpen) slashInputRef.current?.focus();
    }, [slashOpen]);

    // -- Block context menu lifecycle --
    // The primitive listens for right-clicks on the canvas, resolves the block
    // via [data-block-id], and shows/positions the consumer-rendered menu. The
    // menu element is always rendered (the primitive toggles its hidden state);
    // onAction maps the chosen item to a block mutation via the editor controls.
    React.useEffect(() => {
      const canvasEl = canvasRef.current;
      const menuEl = contextMenuRef.current;
      if (!canvasEl || !menuEl || disabled || !blockContextMenu) return;

      const controller = createBlockContextMenu({
        container: canvasEl,
        menu: menuEl,
        onOpen: () => setContextMenuOpen(true),
        onClose: () => setContextMenuOpen(false),
        onAction: (itemId, blockId) => {
          const controls = controlsRef.current;
          if (!controls) return;
          const current = blocksAtomRef.current.get();
          const index = current.findIndex((b) => b.id === blockId);
          if (index === -1) return;
          switch (itemId) {
            case 'delete':
              controls.removeBlocks(new Set([blockId]));
              break;
            case 'duplicate': {
              const block = current[index];
              if (block) controls.addBlock({ ...block, id: crypto.randomUUID() }, index + 1);
              break;
            }
            case 'move-up':
              controls.moveBlock(blockId, index - 1);
              break;
            case 'move-down':
              controls.moveBlock(blockId, index + 1);
              break;
          }
        },
      });
      contextMenuControllerRef.current = controller;

      return () => {
        controller.destroy();
        contextMenuControllerRef.current = null;
      };
    }, [blockContextMenu, disabled]);

    // -- Inline format toolbar lifecycle --
    // On a non-collapsed selection within the canvas, show a floating toolbar at
    // the selection rect; buttons toggle marks via the inline-formatter. (The
    // applied marks persist to block.content through the document-editor
    // reconcile read-path.)
    React.useEffect(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || disabled || !inlineToolbar) return;

      const formatter = createInlineFormatter({ container: canvasEl, formats: INLINE_FORMATS });
      inlineFormatterRef.current = formatter;

      const handleSelectionChange = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
          setToolbarOpen(false);
          return;
        }
        const range = selection.getRangeAt(0);
        if (!canvasEl.contains(range.commonAncestorContainer)) {
          setToolbarOpen(false);
          return;
        }
        const rect = range.getBoundingClientRect();
        const buttons = getFormatButtons();
        const pos = adjustToolbarPosition(
          { x: rect.left, y: rect.top },
          { width: buttons.length * 40, height: 40 },
        );
        setToolbarPosition({ top: pos.y, left: pos.x });
        setActiveFormats(formatter.getActiveFormats());
        setToolbarOpen(true);
      };
      document.addEventListener('selectionchange', handleSelectionChange);

      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
        formatter.cleanup();
        inlineFormatterRef.current = null;
      };
    }, [inlineToolbar, disabled]);

    const focusedBlock = focusedBlockId ? blocks.find((b) => b.id === focusedBlockId) : undefined;

    const canvas = (
      <Container
        as="div"
        padding="4"
        ref={canvasRef}
        role="textbox"
        aria-multiline="true"
        aria-label="Document editor"
        tabIndex={disabled ? -1 : 0}
        suppressContentEditableWarning
        className={classy('outline-none h-full')}
      >
        {blocks.length === 0 && (emptyState ?? <DefaultEmptyState />)}
        {blocks.map((block) => (
          <DocumentBlock key={block.id} block={block} />
        ))}
      </Container>
    );

    // -- Render --
    return (
      <Container
        as="section"
        gap="0"
        query={false}
        {...props}
        aria-label="Editor"
        aria-disabled={disabled || undefined}
        dir={dir}
        className={classy({ 'opacity-50 pointer-events-none': disabled }, className)}
      >
        {toolbar && (
          <EditorToolbar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={() => docEditorRef.current?.undo()}
            onRedo={() => docEditorRef.current?.redo()}
            focusedBlock={focusedBlock}
            onChangeBlockType={handleChangeBlockType}
          />
        )}
        {onSaveAsComposite && (
          <button
            type="button"
            aria-label="Save as composite"
            className={classy(editorSaveTriggerClasses)}
            onClick={() => setSaveDialogOpen(true)}
          >
            Save as composite
          </button>
        )}
        {sidebar || rulePalette ? (
          <div className={classy(editorPaletteLayoutClasses)}>
            {sidebar && (
              <PaletteAside
                label="Block palette"
                asideClasses={editorSidebarAsideClasses}
                searchable={sidebar.searchable ?? false}
                searchLabel="Search blocks"
                searchPlaceholder="Search blocks"
                groups={paletteGroups}
                listRef={sidebarRef}
                renderItem={sidebar.renderItem}
                onSearch={(query) => {
                  const palette = paletteRef.current;
                  if (!palette) return;
                  palette.setSearchQuery(query);
                  setPaletteGroups(palette.getGroupedItems());
                }}
              />
            )}
            {canvas}
            {rulePalette && (
              <PaletteAside
                label="Rule palette"
                asideClasses={editorRulePaletteAsideClasses}
                searchable={rulePalette.searchable ?? false}
                searchLabel="Search rules"
                searchPlaceholder="Search rules"
                groups={rulePaletteGroups}
                listRef={rulePaletteRef}
                renderItem={rulePalette.renderItem}
                onSearch={(query) => {
                  const palette = rulePaletteControlsRef.current;
                  if (!palette) return;
                  palette.setSearchQuery(query);
                  setRulePaletteGroups(palette.getGroupedItems());
                }}
              />
            )}
          </div>
        ) : (
          canvas
        )}
        {slashOpen && (
          <div
            role="dialog"
            aria-label="Slash commands"
            className={classy(editorSlashMenuClasses)}
            style={{ top: slashPosition.top, left: slashPosition.left }}
          >
            <input
              ref={slashInputRef}
              type="search"
              aria-label="Search commands"
              placeholder="Search commands"
              className={classy(editorSlashSearchClasses)}
              onChange={(event) => {
                const controller = slashControllerRef.current;
                if (!controller) return;
                controller.setQuery(event.target.value);
                const state = controller.getState();
                setSlashCommands(state.filteredCommands);
                setSlashSelectedIndex(state.selectedIndex);
              }}
              onKeyDown={(event) => {
                const controller = slashControllerRef.current;
                if (!controller) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  controller.selectNext();
                  setSlashSelectedIndex(controller.getState().selectedIndex);
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  controller.selectPrevious();
                  setSlashSelectedIndex(controller.getState().selectedIndex);
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  controller.execute();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  controller.close();
                }
              }}
            />
            <div role="listbox" aria-label="Commands" className={classy(editorSlashListClasses)}>
              {slashCommands.map((command, index) => (
                <div
                  key={command.id}
                  role="option"
                  aria-selected={index === slashSelectedIndex}
                  tabIndex={-1}
                  className={classy(
                    editorSlashItemClasses,
                    index === slashSelectedIndex ? editorSlashItemSelectedClasses : '',
                  )}
                  onMouseDown={(event) => {
                    // mousedown (not click) so the input's blur doesn't close the
                    // menu before the command runs.
                    event.preventDefault();
                    command.action();
                    slashControllerRef.current?.close();
                  }}
                >
                  {command.label}
                </div>
              ))}
            </div>
          </div>
        )}
        {blockContextMenu && (
          <div
            ref={contextMenuRef}
            hidden={!contextMenuOpen}
            className={classy(editorContextMenuClasses)}
          >
            {CONTEXT_MENU_ITEMS.map((item) => (
              <div
                key={item.id}
                role="menuitem"
                data-menu-item-id={item.id}
                tabIndex={-1}
                className={classy(
                  editorContextMenuItemClasses,
                  item.destructive ? editorContextMenuDestructiveClasses : '',
                )}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
        {toolbarOpen && (
          <div
            role="toolbar"
            aria-label="Text formatting"
            className={classy(editorInlineToolbarClasses)}
            style={{ top: toolbarPosition.top, left: toolbarPosition.left }}
          >
            {getFormatButtons().map((button) => (
              <button
                key={button.format}
                type="button"
                aria-label={button.label}
                aria-pressed={activeFormats.includes(button.format)}
                className={classy(
                  editorInlineToolbarButtonClasses,
                  activeFormats.includes(button.format)
                    ? editorInlineToolbarButtonActiveClasses
                    : '',
                )}
                onMouseDown={(event) => {
                  // mousedown + preventDefault so the selection survives while the
                  // format is toggled.
                  event.preventDefault();
                  const formatter = inlineFormatterRef.current;
                  if (!formatter) return;
                  formatter.toggleFormat(button.format);
                  setActiveFormats(formatter.getActiveFormats());
                }}
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
        {onSaveAsComposite && saveDialogOpen && (
          <div className={classy(editorSaveOverlayClasses)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Save as composite"
              className={classy(editorSaveDialogClasses)}
            >
              <input
                aria-label="Composite name"
                placeholder="Name"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                className={classy(editorSaveFieldClasses)}
              />
              <input
                aria-label="Composite category"
                placeholder="Category"
                value={saveCategory}
                onChange={(event) => setSaveCategory(event.target.value)}
                className={classy(editorSaveFieldClasses)}
              />
              <textarea
                aria-label="Composite description"
                placeholder="Description"
                value={saveDescription}
                onChange={(event) => setSaveDescription(event.target.value)}
                className={classy(editorSaveFieldClasses)}
              />
              <div className={classy(editorSaveActionsClasses)}>
                <button
                  type="button"
                  className={classy(editorSaveActionClasses)}
                  onClick={() => setSaveDialogOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saveName.trim() === ''}
                  className={classy(editorSaveActionClasses)}
                  onClick={() => {
                    void onSaveAsComposite({
                      name: saveName.trim(),
                      category: saveCategory.trim(),
                      description: saveDescription.trim(),
                      blocks: blocksAtomRef.current.get(),
                    });
                    setSaveDialogOpen(false);
                    setSaveName('');
                    setSaveCategory('');
                    setSaveDescription('');
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
    );
  },
);

Editor.displayName = 'Editor';

export default Editor;
