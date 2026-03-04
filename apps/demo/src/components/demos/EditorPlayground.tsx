import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import {
  type BlockRenderContext,
  Editor,
  type EditorBlock,
  type EditorControls,
  type EditorSidebarConfig,
  type SlashCommand,
} from '@/components/ui/editor';
import { Kbd } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Blockquote, H1, H2, Muted, P } from '@/components/ui/typography';
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

const PALETTE_ITEMS: EditorSidebarConfig['items'] = [
  { id: 'text', label: 'Text Block', category: 'Basic', keywords: ['paragraph'] },
  { id: 'heading', label: 'Heading', category: 'Basic', keywords: ['title', 'h1'] },
  { id: 'quote', label: 'Quote', category: 'Basic', keywords: ['blockquote'] },
  { id: 'image', label: 'Image', category: 'Media', keywords: ['picture', 'photo'] },
  { id: 'divider', label: 'Divider', category: 'Media', keywords: ['separator', 'hr'] },
];

const SIDEBAR_CONFIG: EditorSidebarConfig = {
  items: PALETTE_ITEMS,
  categories: ['Basic', 'Media'],
  searchable: true,
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

function BlockStatePanel({ blocks }: { blocks: EditorBlock[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={classy('mt-4')}>
      <Button variant="outline" size="sm" onClick={() => setOpen((prev) => !prev)}>
        {open ? 'Hide' : 'Show'} Block State ({blocks.length} blocks)
      </Button>
      {open && (
        <pre
          className={classy(
            'mt-2 max-h-64 overflow-auto rounded-md bg-muted p-4 text-xs font-mono text-muted-foreground',
          )}
        >
          {JSON.stringify(blocks, null, 2)}
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
