#!/usr/bin/env node
/**
 * Rafters CLI
 *
 * Initialize projects with design tokens and run MCP server for AI agents.
 */

import { Command } from 'commander';
import { add } from './commands/add.js';
import { importCommand } from './commands/import.js';
import { init } from './commands/init.js';
import { mcp } from './commands/mcp.js';
import { studio } from './commands/studio.js';
import { withErrorHandler } from './utils/ui.js';

const program = new Command();

program
  .name('rafters')
  .description('Design system CLI - scaffold tokens and serve MCP')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize .rafters/ with default tokens and config')
  .option('-r, --rebuild', 'Regenerate output files from existing tokens')
  .option('--reset', 'Re-run generators fresh, replacing persisted tokens')
  .option('--agent', 'Output JSON for machine consumption')
  .action(withErrorHandler(init));

program
  .command('import')
  .description('Import existing design tokens (Tailwind v4, shadcn, generic CSS)')
  .option('--force', 'Overwrite existing .rafters/import-pending.json')
  .option('--importer <id>', 'Force a specific importer (tailwind-v4, shadcn, generic-css)')
  .option('--agent', 'Output JSON for machine consumption')
  .action(withErrorHandler(importCommand));

program
  .command('add')
  .description('Add rafters components to the project')
  .argument('[components...]', 'Component names to add')
  .option('--list', 'List available components')
  .option('--overwrite', 'Overwrite existing component files')
  .option('--update', 'Re-fetch named components from registry')
  .option('--update-all', 'Re-fetch all installed components from registry')
  .option('--registry-url <url>', 'Custom registry URL')
  .option('--agent', 'Output JSON for machine consumption')
  .action(withErrorHandler(add));

program
  .command('mcp')
  .description('Start MCP server for AI agent access (stdio)')
  .option('--project-root <path>', 'Explicit project root (skips .rafters/ discovery)')
  .action(mcp);

program.command('studio').description('Open Studio UI for visual token editing').action(studio);

program.parse();
