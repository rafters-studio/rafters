import {
  type CompositeBlock,
  type CompositeFile,
  instantiateBlocks,
  registerComposite,
  serializeToComposite,
  toBridgeItems,
} from '@rafters/composites';
import {
  type EditorSerializer,
  htmlSerializer,
  jsonSerializer,
  mdxSerializer,
  textSerializer,
} from '@rafters/ui';
import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import {
  Editor,
  type EditorBlock,
  type EditorControls,
  type EditorRulePaletteConfig,
  type EditorSidebarConfig,
  type SaveCompositeData,
  type SlashCommand,
} from '@/components/ui/editor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Blockquote, H1, H2, H3, Muted, P } from '@/components/ui/typography';
import type { BlockPaletteItem } from '@/lib/primitives/block-palette';
import classy from '@/lib/primitives/classy';

// ============================================================================
// Sample data
// ============================================================================

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
const resolveComposite = (id: string) => COMPOSITE_MAP.get(id) ?? null;

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
      <div
        className={classy('truncate border-l-2 border-primary pl-1 text-muted-foreground italic')}
      >
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
        {hasMore && <div className={classy('text-muted-foreground text-center')}>...</div>}
      </div>
    </div>
  );
}

/** Insert all blocks from a composite when a palette item is activated or dropped.
 * Uses instantiateBlocks to generate fresh IDs and remap parent/child references. */
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
  const blocks = instantiateBlocks(composite.blocks, { resolveComposite });
  controls.addBlocks(blocks, insertIndex);
}

const SIDEBAR_CONFIG: EditorSidebarConfig = {
  items: COMPOSITE_PALETTE_ITEMS,
  categories: COMPOSITE_CATEGORIES,
  searchable: true,
  renderItem: renderPaletteItem,
  onItemInsert: handleCompositeInsert,
};

const RULE_PALETTE_CONFIG: EditorRulePaletteConfig = {
  items: [
    { id: 'required', label: 'Required', category: 'Validation', keywords: ['mandatory'] },
    {
      id: 'min-length',
      label: 'Min Length',
      category: 'Validation',
      requiresConfig: true,
      compatibleBlockTypes: ['input'],
    },
    {
      id: 'max-length',
      label: 'Max Length',
      category: 'Validation',
      requiresConfig: true,
      compatibleBlockTypes: ['input'],
    },
    {
      id: 'email',
      label: 'Email',
      category: 'Type',
      keywords: ['format'],
      compatibleBlockTypes: ['input'],
    },
    {
      id: 'url',
      label: 'URL',
      category: 'Type',
      keywords: ['link', 'format'],
      compatibleBlockTypes: ['input'],
    },
    {
      id: 'password',
      label: 'Password',
      category: 'Type',
      keywords: ['secret'],
      compatibleBlockTypes: ['input'],
    },
  ],
  categories: ['Validation', 'Type'],
  searchable: true,
  configFields: {
    'min-length': [{ name: 'min', label: 'Minimum characters', type: 'number', defaultValue: 1 }],
    'max-length': [{ name: 'max', label: 'Maximum characters', type: 'number', defaultValue: 255 }],
  },
};

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

// ============================================================================
// Serialization
// ============================================================================

type SerializerFormat = 'json' | 'mdx' | 'html' | 'text';

const SERIALIZERS: Record<SerializerFormat, EditorSerializer> = {
  json: jsonSerializer,
  mdx: mdxSerializer,
  html: htmlSerializer,
  text: textSerializer,
};

const FORMAT_LABELS: Record<SerializerFormat, string> = {
  json: 'JSON',
  mdx: 'MDX',
  html: 'HTML',
  text: 'Plain Text',
};

// ============================================================================
// Editor page
// ============================================================================

export default function EditorPlayground() {
  const editorRef = React.useRef<EditorControls>(null);
  const [blocks, setBlocks] = React.useState<EditorBlock[]>(FULL_BLOCKS);
  const [savedComposite, setSavedComposite] = React.useState<string | null>(null);
  const [exportFormat, setExportFormat] = React.useState<SerializerFormat>('mdx');
  const [showExport, setShowExport] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [importFormat, setImportFormat] = React.useState<SerializerFormat>('mdx');
  const [showImport, setShowImport] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const slashCommands = React.useMemo(() => makeSlashCommands(), []);

  const exported = React.useMemo(() => {
    if (!showExport) return '';
    try {
      return SERIALIZERS[exportFormat].serialize(blocks);
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [blocks, exportFormat, showExport]);

  const handleSaveAsComposite = React.useCallback(async (data: SaveCompositeData) => {
    try {
      const composite = serializeToComposite(data.blocks, {
        name: data.name,
        category: data.category,
        description: data.description,
      });
      registerComposite(composite);
      setSavedComposite(JSON.stringify(composite, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save composite.';
      setSavedComposite(`Error: ${message}`);
    }
  }, []);

  function handleImport() {
    setImportError(null);
    try {
      const result = SERIALIZERS[importFormat].deserialize(importText);
      setBlocks(result.blocks);
      setImportText('');
      setShowImport(false);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <Container as="main" size="5xl" padding="6">
      <header className={classy('flex items-center justify-between py-8')}>
        <H1>Editor</H1>
        <div className={classy('flex items-center gap-2')}>
          <Button
            variant={showImport ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowImport(!showImport);
              setShowExport(false);
            }}
          >
            Import
          </Button>
          <Button
            variant={showExport ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setShowExport(!showExport);
              setShowImport(false);
            }}
          >
            Export
          </Button>
        </div>
      </header>

      {/* Import panel */}
      {showImport && (
        <div className={classy('mb-6 rounded-lg border border-border bg-muted/20 p-4')}>
          <div className={classy('flex items-center justify-between mb-3')}>
            <H3>Import content</H3>
            <div className={classy('flex gap-1')}>
              {(Object.keys(SERIALIZERS) as SerializerFormat[]).map((fmt) => (
                <Button
                  key={fmt}
                  variant={importFormat === fmt ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => setImportFormat(fmt)}
                >
                  {FORMAT_LABELS[fmt]}
                </Button>
              ))}
            </div>
          </div>
          <textarea
            className={classy(
              'min-h-32 w-full rounded-md border border-input bg-background p-3',
              'font-mono text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring',
            )}
            placeholder={`Paste ${FORMAT_LABELS[importFormat]} content here...`}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          {importError && <P className={classy('text-destructive text-sm mt-2')}>{importError}</P>}
          <div className={classy('flex gap-2 mt-3')}>
            <Button onClick={handleImport} disabled={!importText.trim()} size="sm">
              Load into editor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowImport(false);
                setImportText('');
                setImportError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Export panel */}
      {showExport && (
        <div className={classy('mb-6 rounded-lg border border-border bg-muted/20 p-4')}>
          <div className={classy('flex items-center justify-between mb-3')}>
            <H3>Export</H3>
            <div className={classy('flex gap-1')}>
              {(Object.keys(SERIALIZERS) as SerializerFormat[]).map((fmt) => (
                <Button
                  key={fmt}
                  variant={exportFormat === fmt ? 'default' : 'outline'}
                  size="xs"
                  onClick={() => setExportFormat(fmt)}
                >
                  {FORMAT_LABELS[fmt]}
                </Button>
              ))}
            </div>
          </div>
          <pre
            className={classy(
              'overflow-auto rounded-md border border-border bg-background p-4',
              'font-mono text-sm whitespace-pre-wrap break-all',
              'max-h-96',
            )}
          >
            {exported}
          </pre>
        </div>
      )}

      {/* Composite save notification */}
      {savedComposite && (
        <div className={classy('mb-6 rounded-lg border border-border bg-muted/20 p-4')}>
          <div className={classy('flex items-center gap-2 mb-2')}>
            <Badge variant="default">Saved as composite</Badge>
            <Button variant="outline" size="xs" onClick={() => setSavedComposite(null)}>
              Dismiss
            </Button>
          </div>
          <pre
            className={classy(
              'max-h-48 overflow-auto rounded-md bg-background p-3 text-xs font-mono text-muted-foreground',
            )}
          >
            {savedComposite}
          </pre>
        </div>
      )}

      {/* The editor */}
      <Editor
        ref={editorRef}
        defaultValue={blocks}
        onValueChange={setBlocks}
        toolbar
        sidebar={SIDEBAR_CONFIG}
        rulePalette={RULE_PALETTE_CONFIG}
        commandPalette={slashCommands}
        inlineToolbar
        blockContextMenu
        onSaveAsComposite={handleSaveAsComposite}
      />

      <footer className={classy('mt-16 pb-8 border-t border-border pt-8')}>
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
