/**
 * buildEditorHarness (FR-EDITOR-004) -- the no-dev-server Playwright harness.
 *
 * This repo has no e2e dev server (see test/presence/presence-exit.e2e.ts:
 * "There is no dev server in this repo and a spec may not start one"). So we
 * compile the REAL `bindEditor` (via `harness-entry.ts`) into an injectable
 * IIFE with esbuild and hand it to `page.setContent`. `buildEditorHarness`
 * seeds BOTH `doc` and `sel`: `caret` selects the initial `state.sel`,
 * defaulting to the start of the first block -- the boundary-key and
 * selection-restore tests need a specific caret, not just a specific document.
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

interface SeedCaret {
  blockId: string;
  offset: number;
}

interface SeedBlock {
  id: string;
  type: string;
  content?: string;
}

export interface EditorHarnessOptions {
  blocks: SeedBlock[];
  /** Initial `state.sel`; defaults to the start of the first block. */
  caret?: SeedCaret;
}

const ENTRY = fileURLToPath(new URL('./harness-entry.ts', import.meta.url));

let bundlePromise: Promise<string> | null = null;

/** Bundle the real `bindEditor` once and reuse it across every test in a run. */
async function bundleBindEditor(): Promise<string> {
  if (bundlePromise === null) {
    bundlePromise = build({
      entryPoints: [ENTRY],
      bundle: true,
      format: 'iife',
      globalName: 'RaftersEditor',
      platform: 'browser',
      write: false,
    }).then((result) => {
      const file = result.outputFiles[0];
      if (file === undefined) throw new Error('buildEditorHarness: esbuild produced no output');
      return file.text;
    });
  }
  return bundlePromise;
}

export async function buildEditorHarness(options: EditorHarnessOptions): Promise<string> {
  const script = await bundleBindEditor();
  const caret = options.caret ?? { blockId: options.blocks[0]?.id ?? '', offset: 0 };

  const doc = JSON.stringify(options.blocks);
  const sel = JSON.stringify(caret);

  return `<!doctype html>
<meta charset="utf-8">
<style>
  [data-part="root"] { white-space: pre-wrap; outline: none; min-height: 1em; }
  [data-block-id] { min-height: 1em; }
</style>
<div id="editor"></div>
<script>${script}</script>
<script>
  (function () {
    var root = document.getElementById('editor');
    root.dataset.initialDoc = ${JSON.stringify(doc)};
    root.dataset.caret = ${JSON.stringify(sel)};
    window.__editorTeardown = RaftersEditor.bindEditor(root);
    root.focus();
  })();
</script>`;
}
