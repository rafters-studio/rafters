#!/usr/bin/env node
/**
 * Rafters CLI
 *
 * Initialize projects with design tokens and run MCP server for AI agents.
 */

import { Command } from 'commander';
import { add } from './commands/add.js';
import { agents } from './commands/agents.js';
import { importCss } from './commands/import.js';
import { init } from './commands/init.js';
import { mcp } from './commands/mcp.js';
import { withErrorHandler } from './utils/ui.js';
import { VERSION } from './version.js';

const program = new Command();

const collect = (value: string, previous: string[]): string[] => [...previous, value];
const MAP_HELP =
  'Map a rafters target to a custom property: a JSON object or target=--property (repeatable). ' +
  'color:<name>=--property adds a colour family assigned to no role, seeded at 500; ' +
  'color:<name>=--prefix-* adds one from the complete scale --prefix-50 through --prefix-950';

program
  .name('rafters')
  .description('Design system CLI - scaffold tokens and serve MCP')
  .version(VERSION);

program
  .command('init')
  .description('Initialize .rafters/ with default tokens and config')
  .option('-r, --rebuild', 'Regenerate output files from existing tokens')
  .option('--reset', 'Re-run generators fresh, replacing persisted tokens')
  .option(
    '--framework <name>',
    'Override framework detection (next|vite|remix|react-router|astro|vanilla)',
  )
  .option('--agent', 'Output JSON for machine consumption')
  .option(
    '--scripts <codes>',
    'Writing systems to support, as comma-separated ISO 15924 codes (e.g. Latn,Arab,Jpan)',
  )
  .option('--css-import <path>', 'Import a stylesheet by --map instead of sensing source CSS')
  .option('--map <entry>', MAP_HELP, collect, [])
  .action(withErrorHandler(init));

program
  .command('import')
  .description('Import a stylesheet into an existing project by mapping its custom properties')
  .requiredOption('--css-import <path>', 'Stylesheet to import')
  .option('--map <entry>', MAP_HELP, collect, [])
  .option('--agent', 'Output JSON for machine consumption')
  .action(withErrorHandler(importCss));

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

program
  .command('agents')
  .description(
    'Write or update the rafters contract block in AGENTS.md for non-Claude-Code agent hosts',
  )
  .action(withErrorHandler(agents));

program.parse();
