#!/usr/bin/env node
/**
 * MCP-only entry point for the bundled Claude Code plugin.
 *
 * This is NOT the CLI (`src/index.ts`). It registers only `rafters mcp` and
 * `--version`, deliberately never importing `add`/`init`, so the single-file
 * bundle carries only what the MCP server needs. tsup bundles this entry into
 * `plugin/bin/rafters-mcp.bundle.mjs` (see tsup.config.ts's third target).
 */
import { Command } from 'commander';
import { mcp } from './commands/mcp.js';
import { VERSION } from './version.js';

const program = new Command();
program.name('rafters').version(VERSION);
program
  .command('mcp')
  .option('--project-root <path>', 'Explicit project root (skips .rafters/ discovery)')
  .action(mcp);
program.parse();
