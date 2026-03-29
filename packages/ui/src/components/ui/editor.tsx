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
import { convertBlockType } from '../../primitives/block-operations';
import classy from '../../primitives/classy';
import { findBlockElement } from '../../primitives/cursor-tracker';
import {
  createDocumentEditor,
  type DocumentEditorControls,
} from '../../primitives/document-editor';
import type { BaseBlock, CleanupFunction, Direction, InlineContent } from '../../primitives/types';
import { Button } from './button';
import { Container } from './container';
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

    // -- Toolbar state --
    const [focusedBlockId, setFocusedBlockId] = React.useState<string | null>(null);
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

    const focusedBlock = focusedBlockId ? blocks.find((b) => b.id === focusedBlockId) : undefined;

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
      </Container>
    );
  },
);

Editor.displayName = 'Editor';

export default Editor;
