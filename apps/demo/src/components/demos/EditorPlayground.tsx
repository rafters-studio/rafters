import {
  type CompositeBlock,
  type CompositeFile,
  credentials,
  email,
  findCompatibleConsumers,
  matchRules,
  password,
  registerComposite,
  required,
  searchComposites,
  toBridgeItems,
  toMdx,
  url,
} from '@rafters/composites/client';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Input } from '@/components/ui/input';
import {
  type BlockRenderContext,
  Editor,
  type EditorBlock,
  type EditorControls,
  type EditorSidebarConfig,
  type SlashCommand,
} from '@/components/ui/editor';
import { Kbd } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Blockquote, H1, H2, H3, Muted, P } from '@/components/ui/typography';
import type { BlockPaletteItem } from '@/lib/primitives/block-palette';
import classy from '@/lib/primitives/classy';
import type { InlineContent } from '@/lib/primitives/types';

// ============================================================================
// Sample data
// ============================================================================

const MINIMAL_BLOCKS: EditorBlock[] = [
  { id: 'min-1', type: 'text', content: 'Welcome to the Rafters Editor' },
  { id: 'min-2', type: 'text', content: 'This is a block-based content editor.' },
  {
    id: 'min-3',
    type: 'text',
    content: 'Click a block to select it. Use keyboard to navigate.',
  },
];

const TOOLBAR_BLOCKS: EditorBlock[] = [
  { id: 'tb-1', type: 'text', content: 'Editor with toolbar enabled' },
  { id: 'tb-2', type: 'text', content: 'Try undo/redo after selecting and deleting blocks.' },
  { id: 'tb-3', type: 'text', content: 'The toolbar shows formatting and history controls.' },
];

const SIDEBAR_BLOCKS: EditorBlock[] = [
  { id: 'sb-1', type: 'heading', content: 'Sidebar with block palette' },
  { id: 'sb-2', type: 'text', content: 'Use the sidebar to add new block types.' },
  { id: 'sb-3', type: 'text', content: 'Click an item or drag it onto the canvas.' },
];

const FULL_BLOCKS: EditorBlock[] = [
  { id: 'full-1', type: 'heading', content: 'Full-featured editor' },
  {
    id: 'full-2',
    type: 'text',
    content: 'All features enabled: toolbar, sidebar, slash commands, inline toolbar.',
  },
  { id: 'full-3', type: 'quote', content: 'Select text to see the inline formatting toolbar.' },
  { id: 'full-4', type: 'text', content: 'Type / to open the command palette.' },
];

// Loaded from .composite.json files in src/composites/
import ctaSectionJson from '@/composites/cta-section.composite.json';
import featureGridJson from '@/composites/feature-grid.composite.json';
import heroBannerJson from '@/composites/hero-banner.composite.json';
import loginFormJson from '@/composites/login-form.composite.json';
import profileCardJson from '@/composites/profile-card.composite.json';
import testimonialJson from '@/composites/testimonial.composite.json';

const SAMPLE_COMPOSITES: CompositeFile[] = [
  loginFormJson,
  heroBannerJson,
  profileCardJson,
  featureGridJson,
  testimonialJson,
  ctaSectionJson,
] as CompositeFile[];

// Sidebar palette items derived from composite JSON files via toBridgeItems()
const COMPOSITE_PALETTE_ITEMS = toBridgeItems(SAMPLE_COMPOSITES);
const COMPOSITE_CATEGORIES = [...new Set(SAMPLE_COMPOSITES.map((c) => c.manifest.category))];
const COMPOSITE_MAP = new Map(SAMPLE_COMPOSITES.map((c) => [c.manifest.id, c]));

/** Miniature block preview rendered in sidebar palette */
function BlockPreview({ block }: { block: CompositeBlock }) {
  const content = String(block.content ?? '');
  if (block.type === 'heading') {
    return <div className={classy('truncate font-semibold')}>{content}</div>;
  }
  if (block.type === 'divider') {
    return <hr className={classy('my-0.5 border-border')} />;
  }
  if (block.type === 'blockquote') {
    return (
      <div className={classy('truncate border-l-2 border-primary pl-1 text-muted-foreground italic')}>
        {content}
      </div>
    );
  }
  if (block.type === 'input') {
    return (
      <div className={classy('flex flex-col gap-0.5')}>
        <Label className={classy('text-muted-foreground')}>{content}</Label>
        <Input size="sm" placeholder={content} disabled className={classy('h-5 px-1 py-0')} />
      </div>
    );
  }
  if (block.type === 'button') {
    return (
      <Button size="sm" className={classy('h-5 w-full truncate')}>
        {content}
      </Button>
    );
  }
  return <div className={classy('truncate text-muted-foreground')}>{content}</div>;
}

/** Rich visual preview for sidebar palette items showing actual composite blocks */
function renderPaletteItem(item: BlockPaletteItem): React.ReactNode {
  const composite = COMPOSITE_MAP.get(item.id);
  if (!composite) return item.label;

  // Skip container-only blocks (grid wrappers) and limit to 4 visible blocks
  const visibleBlocks = composite.blocks.filter((b) => !b.children?.length).slice(0, 4);
  const hasMore = composite.blocks.filter((b) => !b.children?.length).length > 4;

  return (
    <div className={classy('flex flex-col gap-1')}>
      <span className={classy('font-medium')}>{composite.manifest.name}</span>
      <div className={classy('flex flex-col gap-0.5 rounded border border-border bg-muted/30 p-1')}>
        {visibleBlocks.map((block) => (
          <BlockPreview key={block.id} block={block} />
        ))}
        {hasMore && (
          <div className={classy('text-muted-foreground text-center')}>...</div>
        )}
      </div>
    </div>
  );
}

/** Insert all blocks from a composite when a palette item is activated or dropped */
function handleCompositeInsert(
  item: BlockPaletteItem,
  controls: EditorControls,
  insertIndex?: number,
) {
  const composite = COMPOSITE_MAP.get(item.id);
  if (!composite) {
    controls.addBlock({ id: crypto.randomUUID(), type: item.id, content: '' }, insertIndex);
    return;
  }
  for (let i = 0; i < composite.blocks.length; i++) {
    const block = composite.blocks[i];
    if (!block) continue;
    controls.addBlock(
      {
        id: crypto.randomUUID(),
        type: block.type,
        content: block.content ?? '',
        children: block.children,
        parentId: block.parentId,
        meta: block.meta,
      },
      insertIndex !== undefined ? insertIndex + i : undefined,
    );
  }
}

const SIDEBAR_CONFIG: EditorSidebarConfig = {
  items: COMPOSITE_PALETTE_ITEMS,
  categories: COMPOSITE_CATEGORIES,
  searchable: true,
  renderItem: renderPaletteItem,
  onItemInsert: handleCompositeInsert,
};

// ============================================================================
// Editable block renderer
// ============================================================================

function DragHandle({
  blockId,
  index,
  onMove,
}: {
  blockId: string;
  index: number;
  onMove: (id: string, toIndex: number) => void;
}) {
  const handleDragStart = React.useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('application/x-editor-block-id', blockId);
      e.dataTransfer.setData('application/x-editor-block-index', String(index));
      e.dataTransfer.effectAllowed = 'move';
    },
    [blockId, index],
  );

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-editor-block-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      e.currentTarget.closest('[data-block-row]')?.classList.add('border-t-2', 'border-t-primary');
    }
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.currentTarget.closest('[data-block-row]')?.classList.remove('border-t-2', 'border-t-primary');
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget
        .closest('[data-block-row]')
        ?.classList.remove('border-t-2', 'border-t-primary');
      const draggedId = e.dataTransfer.getData('application/x-editor-block-id');
      if (draggedId && draggedId !== blockId) {
        onMove(draggedId, index);
      }
    },
    [blockId, index, onMove],
  );

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label="Drag to reorder"
      className={classy(
        'flex shrink-0 cursor-grab items-center border-0 bg-transparent px-1 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 hover:text-muted-foreground active:cursor-grabbing',
      )}
    >
      <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor" aria-hidden="true">
        <circle cx="3" cy="4" r="1.5" />
        <circle cx="9" cy="4" r="1.5" />
        <circle cx="3" cy="10" r="1.5" />
        <circle cx="9" cy="10" r="1.5" />
        <circle cx="3" cy="16" r="1.5" />
        <circle cx="9" cy="16" r="1.5" />
      </svg>
    </button>
  );
}

/**
 * Extract plain text from onChange payload.
 * Heading onChange returns string, P/Blockquote return InlineContent[].
 */
function toPlainText(content: string | InlineContent[] | unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return (content as InlineContent[]).map((c) => c.text).join('');
  }
  return String(content);
}

/**
 * Editable block that avoids React/contentEditable cursor conflicts.
 * Uses a stable initial ref for children so React never touches the DOM
 * after mount - contentEditable owns the text, onChange syncs the data model.
 */
function EditableBlockRenderer({
  block,
  context,
  onUpdate,
  onMove,
}: {
  block: EditorBlock;
  context: BlockRenderContext;
  onUpdate: (id: string, content: string) => void;
  onMove: (id: string, toIndex: number) => void;
}) {
  // Stable initial content - never changes, so React never re-renders the text node
  const [initialContent] = React.useState(() => String(block.content ?? ''));

  const handleChange = React.useCallback(
    (content: string | InlineContent[] | unknown) => {
      onUpdate(block.id, toPlainText(content));
    },
    [block.id, onUpdate],
  );

  if (block.type === 'divider') {
    return (
      <div data-block-row="" className={classy('group flex items-center gap-1')}>
        <DragHandle blockId={block.id} index={context.index} onMove={onMove} />
        <Separator className={classy('flex-1')} />
      </div>
    );
  }

  if (block.type === 'heading') {
    return (
      <div data-block-row="" className={classy('group flex items-start gap-1')}>
        <DragHandle blockId={block.id} index={context.index} onMove={onMove} />
        <H2 editable onChange={handleChange} className={classy('flex-1')}>
          {initialContent || '\u00A0'}
        </H2>
      </div>
    );
  }

  if (block.type === 'quote') {
    return (
      <div data-block-row="" className={classy('group flex items-start gap-1')}>
        <DragHandle blockId={block.id} index={context.index} onMove={onMove} />
        <Blockquote editable onChange={handleChange} className={classy('mt-0 flex-1')}>
          {initialContent || '\u00A0'}
        </Blockquote>
      </div>
    );
  }

  if (block.type === 'input') {
    const inputType = (block.meta as Record<string, unknown>)?.inputType as string | undefined;
    return (
      <div data-block-row="" className={classy('group flex items-start gap-1')}>
        <DragHandle blockId={block.id} index={context.index} onMove={onMove} />
        <div className={classy('flex flex-1 flex-col gap-1')}>
          <Label className={classy('text-sm font-medium')}>{initialContent}</Label>
          <Input type={inputType ?? 'text'} placeholder={initialContent} disabled />
        </div>
      </div>
    );
  }

  if (block.type === 'button') {
    return (
      <div data-block-row="" className={classy('group flex items-start gap-1')}>
        <DragHandle blockId={block.id} index={context.index} onMove={onMove} />
        <Button className={classy('flex-1')}>{initialContent}</Button>
      </div>
    );
  }

  return (
    <div data-block-row="" className={classy('group flex items-start gap-1')}>
      <DragHandle blockId={block.id} index={context.index} onMove={onMove} />
      <P editable onChange={handleChange} className={classy('flex-1')}>
        {initialContent || '\u00A0'}
      </P>
    </div>
  );
}

/** Clear editor selection and focus when clicking outside the editor container */
function useOutsideDeselect(
  containerRef: React.RefObject<HTMLElement | null>,
  editorRef: React.RefObject<EditorControls | null>,
) {
  React.useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        editorRef.current?.deselect();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [containerRef, editorRef]);
}

function useEditableRenderBlock(editorRef: React.RefObject<EditorControls | null>) {
  const handleMove = React.useCallback(
    (id: string, toIndex: number) => editorRef.current?.moveBlock(id, toIndex),
    [editorRef],
  );

  return React.useCallback(
    (block: EditorBlock, context: BlockRenderContext) => (
      <EditableBlockRenderer
        block={block}
        context={context}
        onUpdate={(id, content) => editorRef.current?.updateBlock(id, { content })}
        onMove={handleMove}
      />
    ),
    [editorRef, handleMove],
  );
}

function makeSlashCommands(): SlashCommand[] {
  return [
    {
      id: 'text',
      label: 'Text',
      keywords: ['paragraph', 'p'],
      action: (e) => e.addBlock({ id: crypto.randomUUID(), type: 'text', content: '' }),
    },
    {
      id: 'heading',
      label: 'Heading',
      keywords: ['h1', 'title'],
      action: (e) => e.addBlock({ id: crypto.randomUUID(), type: 'heading', content: '' }),
    },
    {
      id: 'quote',
      label: 'Quote',
      keywords: ['blockquote'],
      action: (e) => e.addBlock({ id: crypto.randomUUID(), type: 'quote', content: '' }),
    },
    {
      id: 'divider',
      label: 'Divider',
      keywords: ['hr', 'separator'],
      action: (e) => e.addBlock({ id: crypto.randomUUID(), type: 'divider', content: '' }),
    },
  ];
}

// ============================================================================
// Block state panel
// ============================================================================

/** Convert EditorBlocks to CompositeBlocks for the serializer */
function toCompositeBlocks(blocks: EditorBlock[]): CompositeBlock[] {
  return blocks.map((b) => ({
    id: b.id,
    type: b.type,
    content: b.content,
  }));
}

function BlockStatePanel({ blocks }: { blocks: EditorBlock[] }) {
  const [view, setView] = React.useState<'hidden' | 'json' | 'mdx'>('hidden');
  const mdxOutput = React.useMemo(() => toMdx(toCompositeBlocks(blocks)), [blocks]);

  return (
    <div className={classy('mt-4')}>
      <div className={classy('flex gap-2')}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView((v) => (v === 'json' ? 'hidden' : 'json'))}
        >
          {view === 'json' ? 'Hide' : 'Show'} Block State ({blocks.length} blocks)
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView((v) => (v === 'mdx' ? 'hidden' : 'mdx'))}
        >
          {view === 'mdx' ? 'Hide' : 'Show'} MDX Output
        </Button>
      </div>
      {view === 'json' && (
        <pre
          className={classy(
            'mt-2 max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs font-mono text-muted-foreground',
          )}
        >
          {JSON.stringify(blocks, null, 2)}
        </pre>
      )}
      {view === 'mdx' && (
        <pre
          className={classy(
            'mt-2 max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs font-mono text-muted-foreground',
          )}
        >
          {mdxOutput || '(empty)'}
        </pre>
      )}
    </div>
  );
}

// ============================================================================
// Tab demos
// ============================================================================

function MinimalDemo() {
  const editorRef = React.useRef<EditorControls>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = React.useState<EditorBlock[]>(MINIMAL_BLOCKS);
  const renderBlock = useEditableRenderBlock(editorRef);
  useOutsideDeselect(containerRef, editorRef);

  return (
    <div className={classy('space-y-4')}>
      <div>
        <P className={classy('text-sm text-muted-foreground')}>
          Just <Kbd>defaultValue</Kbd> and <Kbd>onValueChange</Kbd>. A textarea replacement with
          block structure.
        </P>
      </div>
      <div ref={containerRef}>
        <Editor
          ref={editorRef}
          defaultValue={blocks}
          onValueChange={setBlocks}
          renderBlock={renderBlock}
        />
      </div>
      <BlockStatePanel blocks={blocks} />
    </div>
  );
}

function ToolbarDemo() {
  const editorRef = React.useRef<EditorControls>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = React.useState<EditorBlock[]>(TOOLBAR_BLOCKS);
  const renderBlock = useEditableRenderBlock(editorRef);
  useOutsideDeselect(containerRef, editorRef);

  return (
    <div className={classy('space-y-4')}>
      <div>
        <P className={classy('text-sm text-muted-foreground')}>
          Adds the <Kbd>toolbar</Kbd> prop. Undo/redo and formatting buttons appear above the
          canvas.
        </P>
      </div>
      <div ref={containerRef}>
        <Editor
          ref={editorRef}
          defaultValue={blocks}
          onValueChange={setBlocks}
          toolbar
          renderBlock={renderBlock}
        />
      </div>
      <BlockStatePanel blocks={blocks} />
    </div>
  );
}

function SidebarDemo() {
  const editorRef = React.useRef<EditorControls>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = React.useState<EditorBlock[]>(SIDEBAR_BLOCKS);
  const renderBlock = useEditableRenderBlock(editorRef);
  useOutsideDeselect(containerRef, editorRef);

  return (
    <div className={classy('space-y-4')}>
      <div>
        <P className={classy('text-sm text-muted-foreground')}>
          Adds <Kbd>sidebar</Kbd> with a block palette. Categories: Basic and Media. Click to add,
          drag to insert at position.
        </P>
      </div>
      <div ref={containerRef}>
        <Editor
          ref={editorRef}
          defaultValue={blocks}
          onValueChange={setBlocks}
          sidebar={SIDEBAR_CONFIG}
          renderBlock={renderBlock}
        />
      </div>
      <BlockStatePanel blocks={blocks} />
    </div>
  );
}

function FullDemo() {
  const editorRef = React.useRef<EditorControls>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = React.useState<EditorBlock[]>(FULL_BLOCKS);
  const slashCommands = React.useMemo(() => makeSlashCommands(), []);
  const renderBlock = useEditableRenderBlock(editorRef);
  useOutsideDeselect(containerRef, editorRef);

  return (
    <div className={classy('space-y-4')}>
      <div>
        <P className={classy('text-sm text-muted-foreground')}>
          All features: <Kbd>toolbar</Kbd>, <Kbd>sidebar</Kbd> (palette), <Kbd>commandPalette</Kbd>{' '}
          (type <Kbd>/</Kbd>), and <Kbd>inlineToolbar</Kbd> (select text).
        </P>
      </div>
      <div ref={containerRef}>
        <Editor
          ref={editorRef}
          defaultValue={blocks}
          onValueChange={setBlocks}
          toolbar
          sidebar={SIDEBAR_CONFIG}
          commandPalette={slashCommands}
          inlineToolbar
          renderBlock={renderBlock}
        />
      </div>
      <BlockStatePanel blocks={blocks} />
    </div>
  );
}

// ============================================================================
// Composites demo - registry, bridge, rules, validation
// ============================================================================

const RULE_VALIDATORS = {
  email,
  password,
  required,
  url,
  credentials,
} as const;

function CompositesDemo() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [validationInput, setValidationInput] = React.useState('');
  const [selectedRule, setSelectedRule] = React.useState<keyof typeof RULE_VALIDATORS>('email');

  // Register composites on mount
  React.useMemo(() => {
    for (const composite of SAMPLE_COMPOSITES) {
      registerComposite(composite);
    }
  }, []);

  // Bridge: convert to palette items
  const paletteItems = React.useMemo(() => toBridgeItems(SAMPLE_COMPOSITES), []);

  // Registry search
  const searchResults = React.useMemo(
    () => (searchQuery.length > 0 ? searchComposites(searchQuery) : []),
    [searchQuery],
  );

  // Rule matching: find what consumes login-form's output
  const loginForm = SAMPLE_COMPOSITES[0];
  const consumers = React.useMemo(
    () => findCompatibleConsumers(loginForm, SAMPLE_COMPOSITES),
    [loginForm],
  );

  // Rule match detail between login-form and profile-card
  const profileCard = SAMPLE_COMPOSITES[2];
  const ruleMatch = React.useMemo(
    () => matchRules(loginForm, profileCard),
    [loginForm, profileCard],
  );

  // Built-in rule validation
  const validationResult = React.useMemo(() => {
    const schema = RULE_VALIDATORS[selectedRule];
    const result = schema.safeParse(
      selectedRule === 'credentials'
        ? (() => {
            try {
              return JSON.parse(validationInput);
            } catch {
              return validationInput;
            }
          })()
        : validationInput,
    );
    return result;
  }, [selectedRule, validationInput]);

  // MDX from login-form blocks
  const loginMdx = React.useMemo(() => toMdx(loginForm.blocks), [loginForm]);

  return (
    <div className={classy('space-y-8')}>
      <P className={classy('text-sm text-muted-foreground')}>
        Composites package in action: registry, bridge, rule matching, serialization, and built-in
        validation rules.
      </P>

      {/* Bridge: palette items */}
      <div>
        <H3 className={classy('mb-3')}>Bridge: Palette Items</H3>
        <P className={classy('mb-2 text-sm text-muted-foreground')}>
          <Kbd>toBridgeItems()</Kbd> converts composite manifests into sidebar palette items.
        </P>
        <div className={classy('flex flex-wrap gap-2')}>
          {paletteItems.map((item) => (
            <Badge key={item.id} variant="secondary">
              {item.label} ({item.category})
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      {/* Registry search */}
      <div>
        <H3 className={classy('mb-3')}>Registry: Fuzzy Search</H3>
        <P className={classy('mb-2 text-sm text-muted-foreground')}>
          Registered {SAMPLE_COMPOSITES.length} composites. Search by name or keyword.
        </P>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder='Try "login", "form", or "hero"'
          className={classy(
            'w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm',
          )}
        />
        {searchResults.length > 0 && (
          <div className={classy('mt-2 flex flex-wrap gap-2')}>
            {searchResults.map((c) => (
              <Badge key={c.manifest.id} variant="outline">
                {c.manifest.name}
              </Badge>
            ))}
          </div>
        )}
        {searchQuery.length > 0 && searchResults.length === 0 && (
          <Muted className={classy('mt-2')}>No results</Muted>
        )}
      </div>

      <Separator />

      {/* Rule matching */}
      <div>
        <H3 className={classy('mb-3')}>Rules: I/O Compatibility</H3>
        <P className={classy('mb-2 text-sm text-muted-foreground')}>
          <Kbd>matchRules()</Kbd> checks if one composite's output satisfies another's input.
        </P>
        <div className={classy('space-y-2')}>
          <div className={classy('flex items-center gap-2')}>
            <Badge>Login Form</Badge>
            <span className={classy('text-sm text-muted-foreground')}>outputs:</span>
            {loginForm.output.map((o) => (
              <Badge key={o} variant="secondary">
                {o}
              </Badge>
            ))}
          </div>
          <div className={classy('flex items-center gap-2')}>
            <Badge>Profile Card</Badge>
            <span className={classy('text-sm text-muted-foreground')}>needs:</span>
            {profileCard.input.map((i) => (
              <Badge key={i} variant="secondary">
                {i}
              </Badge>
            ))}
          </div>
          <div className={classy('flex items-center gap-2')}>
            <span className={classy('text-sm')}>Compatible:</span>
            <Badge variant={ruleMatch.compatible ? 'default' : 'destructive'}>
              {ruleMatch.compatible ? 'Yes' : 'No'}
            </Badge>
            <span className={classy('text-sm text-muted-foreground')}>
              matched: [{ruleMatch.matched.join(', ')}]
            </span>
          </div>
          <div className={classy('flex items-center gap-2')}>
            <span className={classy('text-sm text-muted-foreground')}>
              All consumers of Login Form output:
            </span>
            {consumers.map((c) => (
              <Badge key={c.manifest.id} variant="outline">
                {c.manifest.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* MDX serialization */}
      <div>
        <H3 className={classy('mb-3')}>Serializer: toMdx()</H3>
        <P className={classy('mb-2 text-sm text-muted-foreground')}>
          Login Form blocks serialized to MDX output.
        </P>
        <pre
          className={classy(
            'max-h-40 overflow-auto rounded-md bg-muted p-4 text-xs font-mono text-muted-foreground',
          )}
        >
          {loginMdx}
        </pre>
      </div>

      <Separator />

      {/* Built-in rule validation */}
      <div>
        <H3 className={classy('mb-3')}>Built-in Rules: Validation</H3>
        <P className={classy('mb-2 text-sm text-muted-foreground')}>
          Zod schemas for common I/O rules. Test them live.
        </P>
        <div className={classy('flex flex-wrap gap-4')}>
          <div>
            <Label className={classy('mb-1 text-sm')}>Rule</Label>
            <select
              value={selectedRule}
              onChange={(e) => {
                setSelectedRule(e.target.value as keyof typeof RULE_VALIDATORS);
                setValidationInput('');
              }}
              className={classy(
                'block w-40 rounded-md border border-input bg-background px-3 py-2 text-sm',
              )}
            >
              <option value="email">email</option>
              <option value="password">password</option>
              <option value="required">required</option>
              <option value="url">url</option>
              <option value="credentials">credentials</option>
            </select>
          </div>
          <div className={classy('flex-1')}>
            <Label className={classy('mb-1 text-sm')}>Input</Label>
            <input
              type="text"
              value={validationInput}
              onChange={(e) => setValidationInput(e.target.value)}
              placeholder={
                selectedRule === 'credentials'
                  ? '{"email":"a@b.com","password":"12345678"}'
                  : selectedRule === 'email'
                    ? 'user@example.com'
                    : selectedRule === 'url'
                      ? 'https://example.com'
                      : selectedRule === 'password'
                        ? '8+ characters'
                        : 'any non-empty string'
              }
              className={classy(
                'block w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
              )}
            />
          </div>
        </div>
        {validationInput.length > 0 && (
          <div className={classy('mt-2')}>
            <Badge variant={validationResult.success ? 'default' : 'destructive'}>
              {validationResult.success ? 'Valid' : 'Invalid'}
            </Badge>
            {!validationResult.success && (
              <Muted className={classy('mt-1 text-xs')}>
                {validationResult.error.issues[0]?.message}
              </Muted>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main playground
// ============================================================================

export default function EditorPlayground() {
  return (
    <Container as="main" size="5xl" padding="6">
      <header className={classy('py-12')}>
        <Badge variant="outline" size="sm" className={classy('mb-4')}>
          Playground
        </Badge>
        <H1 className={classy('mb-4')}>Editor</H1>
        <Muted className={classy('max-w-2xl')}>
          Block-based content editor with progressive feature disclosure. Start minimal, add
          toolbar, sidebar, slash commands, and inline formatting as needed.
        </Muted>
      </header>

      <Separator className={classy('mb-8')} />

      <Tabs defaultValue="minimal">
        <TabsList>
          <TabsTrigger value="minimal">Minimal</TabsTrigger>
          <TabsTrigger value="toolbar">Toolbar</TabsTrigger>
          <TabsTrigger value="sidebar">Sidebar</TabsTrigger>
          <TabsTrigger value="full">Full</TabsTrigger>
          <TabsTrigger value="composites">Composites</TabsTrigger>
        </TabsList>

        <TabsContent value="minimal">
          <Card className={classy('mt-4')}>
            <CardHeader>
              <CardTitle>Minimal Editor</CardTitle>
              <CardDescription>
                No chrome. Blocks, selection, keyboard navigation. A structured textarea.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MinimalDemo />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="toolbar">
          <Card className={classy('mt-4')}>
            <CardHeader>
              <CardTitle>Toolbar Editor</CardTitle>
              <CardDescription>Top toolbar with undo/redo and formatting controls.</CardDescription>
            </CardHeader>
            <CardContent>
              <ToolbarDemo />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sidebar">
          <Card className={classy('mt-4')}>
            <CardHeader>
              <CardTitle>Sidebar Editor</CardTitle>
              <CardDescription>
                Block palette sidebar for discovering and inserting block types.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SidebarDemo />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="full">
          <Card className={classy('mt-4')}>
            <CardHeader>
              <CardTitle>Full Editor</CardTitle>
              <CardDescription>
                Kitchen sink: toolbar, palette sidebar, slash commands, and inline formatting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FullDemo />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="composites">
          <Card className={classy('mt-4')}>
            <CardHeader>
              <CardTitle>Composites</CardTitle>
              <CardDescription>
                Registry, bridge, rule matching, MDX serialization, and built-in validation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompositesDemo />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator className={classy('mt-16 mb-8')} />

      <footer className={classy('pb-8')}>
        <div className={classy('flex items-center justify-between')}>
          <div className={classy('flex gap-6')}>
            <a
              href="/"
              className={classy(
                'text-sm text-muted-foreground hover:text-foreground transition-colors',
              )}
            >
              Home
            </a>
            <a
              href="/gallery"
              className={classy(
                'text-sm text-muted-foreground hover:text-foreground transition-colors',
              )}
            >
              Component Gallery
            </a>
          </div>
          <Muted>Rafters Design Intelligence Protocol</Muted>
        </div>
      </footer>
    </Container>
  );
}
