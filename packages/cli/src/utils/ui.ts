/**
 * CLI UI utilities
 *
 * Pretty output for humans, JSON for agents.
 */

import ora, { type Ora } from 'ora';

export interface UIContext {
  agent: boolean;
  spinner: Ora | null;
}

const context: UIContext = {
  agent: false,
  spinner: null,
};

export function setAgentMode(agent: boolean): void {
  context.agent = agent;
}

export function isAgentMode(): boolean {
  return context.agent;
}

/**
 * Log an event - JSON for agents, pretty for humans
 */
export function log(event: Record<string, unknown>): void {
  if (context.agent) {
    console.log(JSON.stringify(event));
    return;
  }

  // Human-friendly output based on event type
  const eventType = event.event as string;

  switch (eventType) {
    // Init events
    case 'init:start':
      context.spinner = ora('Initializing rafters...').start();
      break;

    case 'init:detected':
      context.spinner?.succeed('Project detected');
      console.log(`  Framework: ${event.framework}`);
      console.log(`  Tailwind: v${event.tailwindVersion}`);
      if (event.hasShadcn) {
        console.log('  shadcn/ui: detected');
      }
      context.spinner = ora('Generating tokens...').start();
      break;

    case 'init:generated':
      context.spinner?.succeed(`Generated ${event.tokenCount} tokens`);
      context.spinner = ora('Saving registry...').start();
      break;

    case 'init:registry_saved':
      context.spinner?.succeed(`Saved ${event.namespaceCount} namespaces`);
      break;

    case 'init:css_updated':
      console.log(`  Updated: ${event.cssPath}`);
      break;

    case 'init:css_not_found':
      console.log(`\n  Note: ${event.message}`);
      break;

    case 'init:css_already_imported':
      console.log(`  CSS already configured: ${event.cssPath}`);
      break;

    case 'init:regenerate':
      context.spinner?.stop();
      context.spinner = ora('Regenerating from existing config...').start();
      break;

    case 'init:loaded':
      context.spinner?.succeed(`Loaded ${event.tokenCount} tokens`);
      break;

    case 'init:existing_design_detected':
      context.spinner?.info('Existing design system detected');
      console.log(`  Found design decisions in ${event.cssPath}`);
      console.log('');
      console.log('  Your existing CSS has design decisions that should be');
      console.log('  migrated intentionally, not automatically.');
      console.log('');
      console.log('  Ask your AI agent: "Onboard my existing design system to Rafters"');
      console.log('');
      context.spinner = ora('Finishing up...').start();
      break;

    case 'init:prompting_exports':
      // Stop spinner before interactive prompt
      context.spinner?.succeed('Configuration ready');
      break;

    case 'init:exports_default':
      context.spinner?.succeed('Configuration ready');
      console.log('  Using default exports (agent mode)');
      context.spinner = ora('Generating outputs...').start();
      break;

    case 'init:exports_selected':
      console.log('  Exports configured');
      context.spinner = ora('Generating outputs...').start();
      break;

    case 'init:compiling_css':
      if (context.spinner) {
        context.spinner.text = 'Compiling CSS with Tailwind...';
      }
      break;

    case 'init:complete': {
      context.spinner?.succeed('Done!');
      context.spinner = null;
      console.log(`\n  Output: ${event.path}`);
      const outputs = event.outputs as string[];
      for (const file of outputs) {
        console.log(`    - ${file}`);
      }
      console.log('');
      // Release stdin so process can exit after inquirer prompts
      if (process.stdin.unref) process.stdin.unref();
      break;
    }

    // Add events
    case 'add:start': {
      const components = event.components as string[];
      context.spinner = ora(`Adding ${components.join(', ')}...`).start();
      break;
    }

    case 'add:installed': {
      context.spinner?.succeed(`Installed ${event.component}`);
      const files = event.files as string[];
      for (const file of files) {
        console.log(`    ${file}`);
      }
      context.spinner = ora('Installing...').start();
      break;
    }

    case 'add:skip':
      context.spinner?.warn(`Skipped ${event.component} (already exists)`);
      context.spinner = ora('Installing...').start();
      break;

    case 'add:dependencies': {
      context.spinner?.succeed('Files written');
      const deps = event.dependencies as string[];
      const devDeps = event.devDependencies as string[];
      const skippedDeps = (event.skipped as string[] | undefined) ?? [];
      if (deps.length > 0 || devDeps.length > 0) {
        console.log('  Dependencies installed:');
        for (const dep of deps) {
          console.log(`    ${dep}`);
        }
        for (const dep of devDeps) {
          console.log(`    ${dep} (dev)`);
        }
      }
      if (skippedDeps.length > 0) {
        console.log('  Dependencies skipped (already installed or internal):');
        for (const dep of skippedDeps) {
          console.log(`    ${dep}`);
        }
      }
      break;
    }

    case 'add:deps:no-package-json':
      console.warn(`  Warning: ${event.message}`);
      break;

    case 'add:deps:dry-run': {
      const dryDeps = event.dependencies as string[];
      console.log('  [dry-run] Would install:');
      for (const dep of dryDeps) {
        console.log(`    ${dep}`);
      }
      break;
    }

    case 'add:deps:install-failed':
      context.spinner?.fail('Failed to install dependencies');
      console.log(`  ${event.message}`);
      if (event.suggestion) {
        console.log(`  ${event.suggestion}`);
      }
      break;

    case 'add:complete':
      context.spinner?.succeed(
        `Added ${event.installed} component${(event.installed as number) !== 1 ? 's' : ''}`,
      );
      if ((event.skipped as number) > 0) {
        console.log(`  Skipped: ${event.skipped} (use --overwrite to replace)`);
      }
      console.log('');
      break;

    case 'add:hint':
      console.log(`\n  ${event.message}`);
      break;

    case 'add:warning':
      console.warn(`  Warning: ${event.message}`);
      break;

    case 'add:error':
      context.spinner?.fail(event.message as string);
      break;

    // Import events
    case 'import:scanning':
      context.spinner = ora('Scanning for design tokens...').start();
      break;

    case 'import:no_source_detected':
      context.spinner?.fail('No design tokens detected');
      console.log(`  ${event.message}`);
      if (event.suggestion) {
        console.log(`  ${event.suggestion}`);
      }
      break;

    case 'import:no_rafters_dir':
      console.error(`${event.message}`);
      break;

    case 'import:pending_exists':
      context.spinner?.stop();
      console.log(`  ${event.message}`);
      console.log(`  Existing file: ${event.path}`);
      break;

    case 'import:failed': {
      context.spinner?.fail(`Import failed (source: ${event.source ?? 'unknown'})`);
      const warnings = (event.warnings as Array<{ level: string; message: string }>) ?? [];
      for (const w of warnings) {
        console.log(`  [${w.level}] ${w.message}`);
      }
      break;
    }

    case 'import:complete': {
      const conf = Math.round((event.confidence as number) * 100);
      context.spinner?.succeed(
        `Imported ${event.tokensCreated} tokens from ${event.source} (${conf}% confidence)`,
      );
      if ((event.skipped as number) > 0) {
        console.log(`  Skipped: ${event.skipped}`);
      }
      console.log(`  Written: ${event.path}`);
      console.log('');
      console.log(`  ${event.nextStep}`);
      console.log('');
      break;
    }

    case 'import:existing_detected':
      context.spinner?.info('Existing design tokens detected');
      console.log(
        `  Source: ${event.source} (${Math.round((event.confidence as number) * 100)}% confidence)`,
      );
      console.log(`  Found in: ${event.sourcePaths}`);
      console.log('');
      break;

    case 'import:declined':
      console.log('  Skipped import. You can run `rafters import` later.');
      console.log('');
      break;

    default:
      // Fallback for unknown events
      if (context.spinner) {
        context.spinner.text = eventType;
      } else {
        console.log(event);
      }
  }
}

/**
 * Log an error
 */
export function error(message: string): void {
  if (context.agent) {
    console.error(JSON.stringify({ event: 'error', message }));
    return;
  }

  context.spinner?.fail(message);
  context.spinner = null;
}

/**
 * Stop spinner on unexpected exit
 */
export function cleanup(): void {
  context.spinner?.stop();
  context.spinner = null;
}

/**
 * Wrap an async action so thrown errors are logged cleanly
 * instead of dumping a stack trace.
 *
 * Set DEBUG=1 to also print the full stack trace for diagnostics.
 */
export function withErrorHandler<T extends (...args: never[]) => Promise<void>>(
  action: T,
): (...args: Parameters<T>) => Promise<void> {
  return async (...args: Parameters<T>) => {
    try {
      await action(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error(message);
      if (process.env.DEBUG && err instanceof Error && err.stack) {
        console.error(err.stack);
      }
      process.exitCode = 1;
    }
  };
}
