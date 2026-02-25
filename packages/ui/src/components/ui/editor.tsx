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
import type { BlockHandlerControls, BlockHandlerState } from '../../primitives/block-handler';
import { createBlockHandler } from '../../primitives/block-handler';
import classy from '../../primitives/classy';
import type {
  CommandPaletteController,
  CommandPaletteState,
} from '../../primitives/command-palette';
import { createCommandPalette } from '../../primitives/command-palette';
import type { ToolbarButton, ToolbarButtonGroup } from '../../primitives/editor-toolbar';
import { createEditorToolbar } from '../../primitives/editor-toolbar';
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
import type { CleanupFunction, Command, Direction, InlineMark } from '../../primitives/types';

// ============================================================================
// Types
// ============================================================================

export interface EditorBlock {
  id: string;
  type: string;
  content: unknown;
  children?: string[];
  parentId?: string;
  meta?: Record<string, unknown>;
}

export interface SlashCommand {
  id: string;
  label: string;
  icon?: React.ReactNode;
  keywords?: string[];
  action: (editor: EditorControls) => void;
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
  /** Show sidebar for block navigation/properties */
  sidebar?: boolean;
  /** Enable slash command palette with these commands */
  commandPalette?: SlashCommand[];
  /** Show floating inline formatting toolbar on text selection */
  inlineToolbar?: boolean;

  /** Custom block renderer -- receives block + context, returns JSX */
  renderBlock?: (block: EditorBlock, context: BlockRenderContext) => React.ReactNode;
  /** Custom empty state */
  emptyState?: React.ReactNode;

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

/** Imperative handle exposed via ref */
export interface EditorControls {
  addBlock: (block: EditorBlock, index?: number) => void;
  removeBlocks: (ids: Set<string>) => void;
  moveBlock: (id: string, toIndex: number) => void;
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void;
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  clearSelection: () => void;
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
  const text =
    typeof block.content === 'string'
      ? block.content
      : block.content != null
        ? String(block.content)
        : '';
  return <div className="px-3 py-2 text-sm text-foreground">{text || '\u00A0'}</div>;
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
  const toolbar = createEditorToolbar({
    getHistory: () => ({ canUndo, canRedo }),
    onUndo,
    onRedo,
  });
  const buttons = toolbar.getButtons();

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
      className="flex items-center gap-1 border-b border-border px-2 py-1"
    >
      {Array.from(grouped.entries()).map(([group, btns], groupIdx) => (
        <React.Fragment key={group}>
          {groupIdx > 0 && <hr className="mx-1 h-4 w-px border-0 bg-border" />}
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
      className="flex w-48 shrink-0 flex-col gap-0.5 border-r border-border p-2"
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
  const portalContainer = getPortalContainer();
  if (!portalContainer) return null;

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
      className="rounded-lg border border-border bg-popover shadow-lg"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '288px',
        zIndex: 50,
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
        className="w-full border-b border-border bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        placeholder="Type a command..."
      />
      <div
        id={listboxId}
        role="listbox"
        aria-label="Commands"
        className="max-h-48 overflow-y-auto p-1"
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
            <span className="font-medium">{cmd.label}</span>
            {cmd.description && (
              <span className="ml-2 text-muted-foreground">{cmd.description}</span>
            )}
          </div>
        ))}
        {state.filteredCommands.length === 0 && (
          <div className="px-3 py-1.5 text-sm text-muted-foreground">No commands found</div>
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
      className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 50,
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
    <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
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
      commandPalette,
      inlineToolbar = false,
      renderBlock,
      emptyState,
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

    // Ref for isControlled to avoid stale closure in updateBlocks
    const isControlledRef = React.useRef(isControlled);
    isControlledRef.current = isControlled;

    // ----- Handler + canvas refs -----
    const canvasRef = React.useRef<HTMLDivElement>(null);
    const handlerRef = React.useRef<BlockHandlerControls | null>(null);

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

    // ----- Stable block mutation function -----
    const updateBlocks = React.useCallback((next: EditorBlock[], commit = false) => {
      blocksAtomRef.current.set(next);
      if (!isControlledRef.current) {
        setUncontrolled(next);
      }
      callbacksRef.current.onValueChange?.(next);
      if (commit) {
        callbacksRef.current.onValueCommit?.(next);
      }
    }, []);

    // ----- CRUD methods -----
    const addBlock = React.useCallback(
      (block: EditorBlock, index?: number) => {
        const current = blocksAtomRef.current.get();
        const next = [...current];
        if (index !== undefined && index >= 0 && index <= next.length) {
          next.splice(index, 0, block);
        } else {
          next.push(block);
        }
        updateBlocks(next, true);
      },
      [updateBlocks],
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

    // ----- useSyncExternalStore for handler state -----
    const handlerState = React.useSyncExternalStore(
      (cb) => {
        const h = handlerRef.current;
        if (!h) return () => {};
        return h.$state.subscribe(cb);
      },
      () => handlerRef.current?.$state.get() ?? INITIAL_HANDLER_STATE,
      () => INITIAL_HANDLER_STATE,
    );

    // ----- Primitive lifecycle (DOM side effects) -----
    React.useEffect(() => {
      const canvasEl = canvasRef.current;
      if (!canvasEl || disabled) return;

      const cleanups: CleanupFunction[] = [];

      // Convert SlashCommands to palette-aware callback
      const hasCommandPalette = commandPalette && commandPalette.length > 0;
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
      cleanups.push(() => {
        handler.destroy();
        handlerRef.current = null;
      });

      // Command palette primitive
      if (hasCommandPalette) {
        const commands: Command[] = commandPalette.map((sc) => {
          const cmd: Command = {
            id: sc.id,
            label: sc.label,
            action: () => {
              // action will be called via the overlay's onExecute
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

      return () => {
        for (const cleanup of cleanups) cleanup();
      };
      // Only re-run when structural config changes, not on every blocks change
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disabled, inlineToolbar, commandPalette, updateBlocks]);

    // ----- Sync controlled value into atom -----
    React.useEffect(() => {
      if (isControlled && controlledValue) {
        blocksAtomRef.current.set(controlledValue);
      }
    }, [isControlled, controlledValue]);

    // ----- Imperative handle -----
    React.useImperativeHandle(ref, () => ({
      addBlock,
      removeBlocks,
      moveBlock,
      updateBlock,
      undo: () => handlerRef.current?.undo(),
      redo: () => handlerRef.current?.redo(),
      selectAll: () => handlerRef.current?.selectAll(),
      clearSelection: () => handlerRef.current?.clearSelection(),
      focus: () => canvasRef.current?.focus(),
    }));

    // ----- Command palette handlers -----
    const handlePaletteQuery = React.useCallback((query: string) => {
      paletteRef.current?.setQuery(query);
      setPaletteState(paletteRef.current?.getState() ?? INITIAL_PALETTE_STATE);
    }, []);

    const handlePaletteSelect = React.useCallback((index: number) => {
      const palette = paletteRef.current;
      if (!palette) return;
      // Navigate to the index by selecting first then stepping
      palette.selectFirst();
      for (let i = 0; i < index; i++) {
        palette.selectNext();
      }
      setPaletteState(palette.getState());
    }, []);

    const editorControlsRef = React.useRef<EditorControls | null>(null);
    editorControlsRef.current = {
      addBlock,
      removeBlocks,
      moveBlock,
      updateBlock,
      undo: () => handlerRef.current?.undo(),
      redo: () => handlerRef.current?.redo(),
      selectAll: () => handlerRef.current?.selectAll(),
      clearSelection: () => handlerRef.current?.clearSelection(),
      focus: () => canvasRef.current?.focus(),
    };

    const handlePaletteExecute = React.useCallback(() => {
      const palette = paletteRef.current;
      if (!palette) return;
      const state = palette.getState();
      const cmd = state.filteredCommands[state.selectedIndex];
      if (cmd && commandPalette) {
        const slashCmd = commandPalette.find((sc) => sc.id === cmd.id);
        if (slashCmd && editorControlsRef.current) {
          slashCmd.action(editorControlsRef.current);
        }
      }
      palette.close();
      setPaletteState(INITIAL_PALETTE_STATE);
    }, [commandPalette]);

    const handlePaletteClose = React.useCallback(() => {
      paletteRef.current?.close();
      setPaletteState(INITIAL_PALETTE_STATE);
    }, []);

    // ----- Inline toolbar handler -----
    const handleFormat = React.useCallback((mark: InlineMark) => {
      formatterRef.current?.toggleFormat(mark);
      setActiveFormats(formatterRef.current?.getActiveFormats() ?? []);
    }, []);

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

    return (
      <div
        {...props}
        aria-disabled={disabled || undefined}
        dir={dir}
        className={classy(
          'flex flex-col rounded-lg border border-border bg-background',
          { 'opacity-50 pointer-events-none': disabled },
          className,
        )}
      >
        {toolbar && (
          <EditorToolbarSection
            canUndo={handlerState.canUndo}
            canRedo={handlerState.canRedo}
            onUndo={() => handlerRef.current?.undo()}
            onRedo={() => handlerRef.current?.redo()}
          />
        )}
        <div className="flex flex-1">
          {sidebar && (
            <EditorSidebarSection
              blocks={blocks}
              selectedIds={handlerState.selectedIds}
              focusedId={handlerState.focusedId}
              onFocusBlock={handleSidebarFocusBlock}
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
            className="flex flex-1 flex-col gap-0.5 p-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-ring"
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
      </div>
    );
  },
);

Editor.displayName = 'Editor';

export default Editor;
