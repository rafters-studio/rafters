/**
 * rafters import
 *
 * Scans the project for existing design tokens (CSS custom properties,
 * Tailwind v4 @theme blocks, shadcn variables), maps them to rafters
 * tokens via the onboard orchestrator, and writes the result to
 * `.rafters/import-pending.json` for user review.
 *
 * Designers / developers review the pending file (via Studio once the
 * review UI ships, or by editing the JSON) and accept/reject/modify
 * each token before it lands in the registry.
 */

import { existsSync } from 'node:fs';
import { relative } from 'node:path';
import { onboard, previewOnboard } from '../onboard/orchestrator.js';
import { toImportPending, writeImportPending } from '../onboard/writer.js';
import { getRaftersPaths } from '../utils/paths.js';
import { log, setAgentMode } from '../utils/ui.js';

interface ImportOptions {
  force?: boolean;
  agent?: boolean;
  importer?: string;
}

export async function importCommand(options: ImportOptions): Promise<void> {
  if (options.agent) {
    setAgentMode(true);
  }

  const cwd = process.cwd();
  const paths = getRaftersPaths(cwd);

  if (!existsSync(paths.root)) {
    log({
      event: 'import:no_rafters_dir',
      message: 'No .rafters/ directory found. Run `rafters init` first.',
    });
    process.exitCode = 1;
    return;
  }

  if (existsSync(paths.importPending) && !options.force) {
    log({
      event: 'import:pending_exists',
      path: relative(cwd, paths.importPending),
      message: 'An import-pending.json already exists. Use --force to overwrite.',
    });
    process.exitCode = 1;
    return;
  }

  log({ event: 'import:scanning' });

  // Preview first -- surfaces what was detected even if no tokens come out
  const preview = await previewOnboard(cwd);
  if (preview.length === 0) {
    log({
      event: 'import:no_source_detected',
      message: 'No compatible design token source found',
      suggestion: 'Ensure your project has CSS files with custom properties or @theme blocks',
    });
    process.exitCode = 1;
    return;
  }

  const result = await onboard(cwd, options.importer ? { forceImporter: options.importer } : {});

  if (!result.success) {
    log({
      event: 'import:failed',
      source: result.source,
      warnings: result.warnings,
    });
    process.exitCode = 1;
    return;
  }

  const doc = toImportPending(result, cwd);
  await writeImportPending(paths.importPending, doc);

  log({
    event: 'import:complete',
    path: relative(cwd, paths.importPending),
    source: result.source,
    confidence: result.confidence,
    tokensCreated: result.stats.tokensCreated,
    skipped: result.stats.skipped,
    nextStep:
      'Review and accept tokens in .rafters/import-pending.json, then run `rafters init --rebuild`',
  });
}
