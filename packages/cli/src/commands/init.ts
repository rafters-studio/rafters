/**
 * rafters init
 *
 * Creates .rafters/ folder with tokens.
 * Detects existing shadcn setup and maps their colors into the registry.
 * Asks about export targets and generates selected formats.
 */

import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { checkbox, confirm, select } from '@inquirer/prompts';
import { generateOKLCHScale, oklchToCSS, SCALE_POSITIONS } from '@rafters/color-utils';
import {
  type ColorDeclaration,
  classifyDeclarations,
  colorsFromClassification,
  contrastPlugin,
  extractShadcnRoot,
  generateBaseSystem,
  invertPlugin,
  loadRegistryFromDir,
  registryToCompiled,
  registryToTailwind,
  registryToTypeScript,
  saveRegistryToDir,
  scalePlugin,
  senseShadcnCss,
  statePlugin,
  TokenRegistry,
  toDTCG,
} from '@rafters/design-tokens';
import type { ColorValue } from '@rafters/shared';

const REGISTRY_PLUGINS = [scalePlugin, contrastPlugin, statePlugin, invertPlugin];

import {
  type ComponentTarget,
  detectProject,
  FRAMEWORK_SPECS,
  type Framework,
  findCssPath,
  frameworkToTarget,
  isSelectableFramework,
  isTailwindV3,
  SELECTABLE_FRAMEWORKS,
  type ShadcnConfig,
} from '../utils/detect.js';
import {
  DEFAULT_EXPORTS,
  EXPORT_CHOICES,
  type ExportConfig,
  FUTURE_EXPORTS,
  selectionsToConfig,
} from '../utils/exports.js';
import { getRaftersPaths, type PathField } from '../utils/paths.js';
import { isAgentMode, log, setAgentMode } from '../utils/ui.js';
import { updateDependencies } from '../utils/update-dependencies.js';
import { bakeAccessibility } from './set.js';

interface InitOptions {
  rebuild?: boolean;
  reset?: boolean;
  agent?: boolean;
  /**
   * Override detected framework. When set, skips the auto-detect + prompt
   * fallback. Valid values: next | vite | remix | react-router | astro |
   * wc | vanilla.
   */
  framework?: string;
}

async function backupCss(cssPath: string): Promise<string> {
  const backupPath = cssPath.replace(/\.css$/, '.backup.css');
  await copyFile(cssPath, backupPath);
  return backupPath;
}

/**
 * Configuration persisted in `.rafters/config.rafters.json`.
 *
 * Path fields accept either a single string (status quo) or an array of
 * entries to support multi-folder layouts (e.g. project + `@shingle/shared`).
 * When multiple entries are provided, the install root is the entry tagged
 * `{ root: true }`, otherwise the first entry whose realpath resolves inside
 * cwd. Local entries always win on collision.
 */
export interface RaftersConfig {
  framework: Framework;
  componentTarget?: ComponentTarget;
  componentsPath: PathField;
  primitivesPath: PathField;
  compositesPath: PathField;
  rulesPath: PathField;
  cssPath: string | null;
  shadcn: boolean;
  exports: ExportConfig;
  darkMode?: 'class' | 'media';
  installed?: {
    components: string[];
    primitives: string[];
    composites: string[];
    rules: string[];
  };
}

async function updateMainCss(cwd: string, cssPath: string, themePath: string): Promise<void> {
  const fullCssPath = join(cwd, cssPath);
  const cssContent = await readFile(fullCssPath, 'utf-8');

  // Calculate relative path from CSS file to theme.css
  const cssDir = join(cwd, cssPath, '..');
  const themeFullPath = join(cwd, themePath);
  const relativeThemePath = relative(cssDir, themeFullPath);

  // Check if already imported
  if (cssContent.includes('.rafters/output/rafters.css')) {
    log({ event: 'init:css_already_imported', cssPath });
    return;
  }

  // Backup the original
  await backupCss(fullCssPath);

  // The theme.css already includes @import "tailwindcss", so we just need to import it
  // Replace the tailwindcss import with our theme import
  let newContent: string;
  if (cssContent.includes('@import "tailwindcss"')) {
    newContent = cssContent.replace('@import "tailwindcss";', `@import "${relativeThemePath}";`);
  } else if (cssContent.includes("@import 'tailwindcss'")) {
    newContent = cssContent.replace("@import 'tailwindcss';", `@import "${relativeThemePath}";`);
  } else {
    // No tailwind import found, prepend the theme import
    newContent = `@import "${relativeThemePath}";\n\n${cssContent}`;
  }

  await writeFile(fullCssPath, newContent);
  log({
    event: 'init:css_updated',
    cssPath,
    themePath: relativeThemePath,
  });
}

/**
 * Check if running in an interactive terminal
 */
function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Resolve the framework to use, in priority order:
 *   1. explicit `--framework` flag (validated against SELECTABLE_FRAMEWORKS)
 *   2. auto-detection
 *   3. interactive prompt when detection returns `unknown` and we have a TTY
 *   4. fallback to `unknown` (non-interactive + undetectable)
 */
async function resolveFramework(
  detected: Framework,
  flag: string | undefined,
  agentMode: boolean,
): Promise<Framework> {
  if (flag) {
    if (!isSelectableFramework(flag)) {
      throw new Error(
        `Unknown --framework "${flag}". Valid values: ${SELECTABLE_FRAMEWORKS.join(', ')}.`,
      );
    }
    return flag;
  }

  if (detected !== 'unknown') return detected;

  if (agentMode || !isInteractive()) return 'unknown';

  const picked = await select({
    message: "Couldn't auto-detect your framework. Which one is this?",
    choices: SELECTABLE_FRAMEWORKS.map((value) => ({
      name: FRAMEWORK_SPECS[value].label ?? value,
      value,
    })),
  });
  return picked;
}

/**
 * Prompt user for export format selections
 * Returns defaults if not in an interactive terminal
 */
async function promptExportFormats(existingConfig?: ExportConfig): Promise<ExportConfig> {
  // Non-interactive: use existing config or defaults
  if (!isInteractive()) {
    return existingConfig ?? DEFAULT_EXPORTS;
  }

  // Build choices with existing config as defaults if available
  const choices = EXPORT_CHOICES.map((choice) => ({
    name: choice.name,
    value: choice.value,
    checked: existingConfig ? existingConfig[choice.value] : choice.checked,
  }));

  // Add future exports as disabled options
  const allChoices = [
    ...choices,
    ...FUTURE_EXPORTS.map((choice) => ({
      name: `${choice.name} (${choice.disabled})`,
      value: choice.value,
      checked: false,
      disabled: true,
    })),
  ];

  const selections = await checkbox({
    message: 'What would you like to export?',
    choices: allChoices,
    required: true,
  });

  return selectionsToConfig(selections);
}

/**
 * Check if @tailwindcss/cli is installed (required for compiled CSS output)
 */
export function isTailwindCliInstalled(): boolean {
  const require = createRequire(import.meta.url);
  try {
    require.resolve('@tailwindcss/cli/package.json');
    return true;
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code === 'MODULE_NOT_FOUND') {
      return false;
    }
    throw err;
  }
}

/**
 * Prompt to install @tailwindcss/cli (required for compiled CSS output).
 * In non-interactive/agent mode, throws with install instructions.
 */
export async function ensureTailwindCli(cwd: string): Promise<void> {
  if (!isInteractive() || isAgentMode()) {
    throw new Error(
      'Standalone CSS export requires @tailwindcss/cli. Install it as a dev dependency in your project.',
    );
  }

  const shouldInstall = await confirm({
    message: 'Standalone CSS requires @tailwindcss/cli. Install it now?',
    default: true,
  });

  if (!shouldInstall) {
    throw new Error('Standalone CSS export requires @tailwindcss/cli.');
  }

  await updateDependencies([], ['@tailwindcss/cli'], { cwd });

  if (!isTailwindCliInstalled()) {
    throw new Error(
      '@tailwindcss/cli was installed but cannot be resolved. Try installing at the workspace root.',
    );
  }
}

/**
 * Generate output files based on export config.
 *
 * Exported so `rafters import --apply` (and any other command that materialises
 * tokens into outputs) can share the exact same emission path -- the contract
 * is: same registry + same exports config = same files on disk.
 */
export async function generateOutputs(
  cwd: string,
  paths: ReturnType<typeof getRaftersPaths>,
  registry: TokenRegistry,
  exports: ExportConfig,
  shadcn: ShadcnConfig | null,
  darkMode: 'class' | 'media' = 'class',
): Promise<string[]> {
  const outputs: string[] = [];

  // Tailwind CSS (with @import "tailwindcss")
  if (exports.tailwind) {
    const tailwindCss = registryToTailwind(registry, { includeImport: !shadcn, darkMode });
    await writeFile(join(paths.output, 'rafters.css'), tailwindCss);
    outputs.push('rafters.css');
  }

  // TypeScript constants
  if (exports.typescript) {
    const typescriptSrc = registryToTypeScript(registry, { includeJSDoc: true });
    await writeFile(join(paths.output, 'rafters.ts'), typescriptSrc);
    outputs.push('rafters.ts');
  }

  // DTCG JSON (W3C Design Tokens)
  if (exports.dtcg) {
    const dtcgJson = toDTCG([...registry.list()]);
    await writeFile(join(paths.output, 'rafters.json'), JSON.stringify(dtcgJson, null, 2));
    outputs.push('rafters.json');
  }

  // Compiled CSS (processed by Tailwind, no @import)
  if (exports.compiled) {
    if (!isTailwindCliInstalled()) {
      log({ event: 'init:prompting_exports' }); // stop spinner before prompt
      await ensureTailwindCli(cwd);
    }
    log({ event: 'init:compiling_css' });
    const compiledCss = await registryToCompiled(registry, { includeImport: !shadcn });
    await writeFile(join(paths.output, 'rafters.standalone.css'), compiledCss);
    outputs.push('rafters.standalone.css');
  }

  return outputs;
}

async function regenerateFromExisting(
  cwd: string,
  paths: ReturnType<typeof getRaftersPaths>,
  shadcn: ShadcnConfig | null,
  isAgentMode: boolean,
  framework: Framework,
): Promise<void> {
  log({ event: 'init:regenerate', cwd });

  // Load existing config for export settings
  let existingConfig: RaftersConfig | null = null;
  try {
    const configContent = await readFile(paths.config, 'utf-8');
    existingConfig = JSON.parse(configContent) as RaftersConfig;
  } catch {
    // No config file, will use defaults
  }

  // Refresh framework and paths from fresh detection
  if (framework !== 'unknown' && existingConfig) {
    const frameworkPaths = FRAMEWORK_SPECS[framework].components;
    existingConfig.framework = framework;
    existingConfig.componentsPath = frameworkPaths.components;
    existingConfig.primitivesPath = frameworkPaths.primitives;
    existingConfig.compositesPath = frameworkPaths.composites;
    existingConfig.rulesPath = frameworkPaths.rules;
  }

  // Load all tokens from .rafters/tokens/
  const registry = loadRegistryFromDir(paths.tokens, REGISTRY_PLUGINS);

  if (registry.size() === 0) {
    throw new Error('No tokens found. Cannot regenerate without existing tokens.');
  }

  // Get unique namespaces for logging
  const namespaces = [...new Set(registry.list().map((t) => t.namespace))];

  log({
    event: 'init:loaded',
    tokenCount: registry.size(),
    namespaces,
  });

  // Prompt for exports (or use existing config in agent mode / non-interactive)
  let exports: ExportConfig;
  if (isAgentMode) {
    exports = existingConfig?.exports ?? DEFAULT_EXPORTS;
    log({ event: 'init:exports_default', exports });
  } else {
    // Stop spinner before prompting (if interactive)
    if (isInteractive()) {
      log({ event: 'init:prompting_exports' });
    }
    exports = await promptExportFormats(existingConfig?.exports);
    log({ event: 'init:exports_selected', exports });
  }

  // Ensure output directory exists
  await mkdir(paths.output, { recursive: true });

  // Generate outputs
  const outputs = await generateOutputs(cwd, paths, registry, exports, shadcn);

  // Update config with new export settings (create if missing)
  if (existingConfig) {
    existingConfig.exports = exports;
    await writeFile(paths.config, JSON.stringify(existingConfig, null, 2));
  } else {
    const frameworkPaths = FRAMEWORK_SPECS[framework].components;
    const newConfig: RaftersConfig = {
      framework,
      componentsPath: frameworkPaths.components,
      primitivesPath: frameworkPaths.primitives,
      compositesPath: frameworkPaths.composites,
      rulesPath: frameworkPaths.rules,
      cssPath: null,
      shadcn: !!shadcn,
      exports,
      installed: { components: [], primitives: [], composites: [], rules: [] },
    };
    await writeFile(paths.config, JSON.stringify(newConfig, null, 2));
  }

  log({
    event: 'init:complete',
    outputs,
    path: paths.output,
  });
}

async function resetToDefaults(
  cwd: string,
  paths: ReturnType<typeof getRaftersPaths>,
  shadcn: ShadcnConfig | null,
  isAgentMode: boolean,
  framework: Framework,
): Promise<void> {
  log({ event: 'init:reset', cwd });

  // Load existing config for export settings + shadcn flag
  let existingConfig: RaftersConfig | null = null;
  try {
    const configContent = await readFile(paths.config, 'utf-8');
    existingConfig = JSON.parse(configContent) as RaftersConfig;
  } catch {
    // No config file, will use defaults
  }

  // Refresh framework and paths from fresh detection
  if (framework !== 'unknown' && existingConfig) {
    const frameworkPaths = FRAMEWORK_SPECS[framework].components;
    existingConfig.framework = framework;
    existingConfig.componentsPath = frameworkPaths.components;
    existingConfig.primitivesPath = frameworkPaths.primitives;
    existingConfig.compositesPath = frameworkPaths.composites;
    existingConfig.rulesPath = frameworkPaths.rules;
  }

  // Load existing tokens to check for userOverride backups
  let existingTokens: ReturnType<TokenRegistry['list']> = [];
  try {
    existingTokens = loadRegistryFromDir(paths.tokens, REGISTRY_PLUGINS).list();
  } catch {
    // No existing tokens directory; nothing to back up.
  }

  // Back up any tokens with userOverride before replacing
  const overriddenTokens = existingTokens.filter((t) => t.userOverride);
  if (overriddenTokens.length > 0) {
    const backup = {
      resetAt: new Date().toISOString(),
      reason: 'rafters init --reset',
      overrides: overriddenTokens.map((t) => ({
        name: t.name,
        value: t.value,
        userOverride: t.userOverride,
        namespace: t.namespace,
      })),
    };
    await mkdir(paths.output, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(paths.output, `reset-${timestamp}.json`);
    await writeFile(backupPath, JSON.stringify(backup, null, 2));
    log({
      event: 'init:reset_backup',
      path: backupPath,
      overrideCount: overriddenTokens.length,
    });
  }

  // Prompt for exports (or use existing config in agent mode / non-interactive)
  let exports: ExportConfig;
  if (isAgentMode) {
    exports = existingConfig?.exports ?? DEFAULT_EXPORTS;
    log({ event: 'init:exports_default', exports });
  } else {
    if (isInteractive()) {
      log({ event: 'init:prompting_exports' });
    }
    exports = await promptExportFormats(existingConfig?.exports);
    log({ event: 'init:exports_selected', exports });
  }

  // Generate a fresh default system. `--reset` is install-time-only;
  // re-importing source CSS is `rafters import` territory.
  const system = generateBaseSystem({});
  const registry = new TokenRegistry(system.allTokens, REGISTRY_PLUGINS);

  log({
    event: 'init:reset_generated',
    tokenCount: registry.size(),
  });

  // Clear stale namespace files before saving fresh registry
  await rm(paths.tokens, { recursive: true, force: true });
  await mkdir(paths.tokens, { recursive: true });
  saveRegistryToDir(paths.tokens, registry);

  const allTokensToSave = registry.list();
  const namespaceCount = new Set(allTokensToSave.map((t) => t.namespace)).size;
  log({
    event: 'init:registry_saved',
    path: paths.tokens,
    namespaceCount,
  });

  // Ensure output directory exists
  await mkdir(paths.output, { recursive: true });

  // Generate outputs
  const outputs = await generateOutputs(cwd, paths, registry, exports, shadcn);

  // Update config with new export settings (create if missing)
  if (existingConfig) {
    existingConfig.exports = exports;
    await writeFile(paths.config, JSON.stringify(existingConfig, null, 2));
  } else {
    const frameworkPaths = FRAMEWORK_SPECS[framework].components;
    const newConfig: RaftersConfig = {
      framework,
      componentsPath: frameworkPaths.components,
      primitivesPath: frameworkPaths.primitives,
      compositesPath: frameworkPaths.composites,
      rulesPath: frameworkPaths.rules,
      cssPath: null,
      shadcn: !!shadcn,
      exports,
      installed: { components: [], primitives: [], composites: [], rules: [] },
    };
    await writeFile(paths.config, JSON.stringify(newConfig, null, 2));
  }

  log({
    event: 'init:complete',
    outputs,
    path: paths.output,
  });
}

export async function init(options: InitOptions): Promise<void> {
  setAgentMode(options.agent ?? false);
  const isAgentMode = options.agent ?? false;

  const cwd = process.cwd();
  const paths = getRaftersPaths(cwd);

  log({ event: 'init:start', cwd });

  // Detect project configuration
  const project = await detectProject(cwd);
  const { framework: detectedFramework, shadcn, tailwindVersion, astroHasReact } = project;

  log({
    event: 'init:detected',
    framework: detectedFramework,
    tailwindVersion,
    hasShadcn: !!shadcn,
  });

  // Resolve final framework: --framework flag > detected > interactive prompt > unknown
  const framework = await resolveFramework(detectedFramework, options.framework, isAgentMode);

  if (framework !== detectedFramework) {
    log({
      event: 'init:framework_resolved',
      detected: detectedFramework,
      resolved: framework,
      source: options.framework ? 'flag' : 'prompt',
    });
  }

  // Error if Tailwind v3 is detected
  if (isTailwindV3(tailwindVersion)) {
    throw new Error('Tailwind v3 detected. Rafters requires Tailwind v4.');
  }

  // Check if .rafters/ already exists
  const raftersExists = existsSync(paths.root);

  // --reset without .rafters/ is an error
  if (options.reset && !raftersExists) {
    throw new Error('Nothing to reset. No .rafters/ directory found.');
  }

  // --reset takes precedence over --rebuild
  if (raftersExists && options.reset) {
    await resetToDefaults(cwd, paths, shadcn, isAgentMode, framework);
    return;
  }

  if (raftersExists && !options.rebuild) {
    throw new Error(
      '.rafters/ directory already exists. Use --rebuild to regenerate output files, or --reset to start from defaults.',
    );
  }

  // If --rebuild and rafters exists, regenerate from existing config
  if (raftersExists && options.rebuild) {
    await regenerateFromExisting(cwd, paths, shadcn, isAgentMode, framework);
    return;
  }

  // Fresh initialization

  // Prompt for export formats (use defaults in agent mode or non-interactive)
  let exports: ExportConfig;
  if (isAgentMode) {
    exports = DEFAULT_EXPORTS;
    log({ event: 'init:exports_default', exports });
  } else {
    // Stop spinner before prompting (if interactive)
    if (isInteractive()) {
      log({ event: 'init:prompting_exports' });
    }
    exports = await promptExportFormats();
    log({ event: 'init:exports_selected', exports });
  }

  // Phase A: install-time generation produces pure defaults. The import
  // step (sense + prompt + apply against the user's source CSS) runs
  // later in this same init invocation -- there is no separate command.
  const system = generateBaseSystem({});
  const registry = new TokenRegistry(system.allTokens, REGISTRY_PLUGINS);

  log({
    event: 'init:generated',
    tokenCount: registry.size(),
  });

  // Create directories
  await mkdir(paths.tokens, { recursive: true });
  await mkdir(paths.output, { recursive: true });

  // Save registry to .rafters/tokens/
  saveRegistryToDir(paths.tokens, registry);
  const allTokensToSave = registry.list();

  const namespaceCount = new Set(allTokensToSave.map((t) => t.namespace)).size;
  log({
    event: 'init:registry_saved',
    path: paths.tokens,
    namespaceCount,
  });

  // Generate outputs based on export config
  const outputs = await generateOutputs(cwd, paths, registry, exports, shadcn);

  // Find and update the main CSS file (if not using shadcn which has its own CSS path).
  // `project.cssPath` is computed against the auto-detected framework; if the
  // resolved framework differs, re-walk under the new framework.
  let detectedCssPath: string | null = null;
  if (!shadcn && exports.tailwind) {
    detectedCssPath =
      framework === detectedFramework ? project.cssPath : findCssPath(cwd, framework);
    if (detectedCssPath) {
      await updateMainCss(cwd, detectedCssPath, '.rafters/output/rafters.css');
    } else {
      log({
        event: 'init:css_not_found',
        message: 'No main CSS file found. Add @import ".rafters/output/rafters.css" manually.',
        searchedLocations: FRAMEWORK_SPECS[framework].cssLocations,
      });
    }
  } else if (shadcn?.tailwind?.css) {
    detectedCssPath = shadcn.tailwind.css;
  }

  // Determine component target (which file variant to install)
  let componentTarget: ComponentTarget = frameworkToTarget(framework);

  if (framework === 'astro' && astroHasReact && isInteractive() && !isAgentMode) {
    componentTarget = await select({
      message: 'This Astro project has React integration. Install components as:',
      choices: [
        {
          name: 'Astro components (zero client JS, server-rendered)',
          value: 'astro' as ComponentTarget,
        },
        {
          name: 'React components (client islands with client:load)',
          value: 'react' as ComponentTarget,
        },
      ],
    });
  }

  // Create config file with detected settings and export selections
  const frameworkPaths = FRAMEWORK_SPECS[framework].components;
  const config: RaftersConfig = {
    framework: framework,
    componentTarget,
    componentsPath: frameworkPaths.components,
    primitivesPath: frameworkPaths.primitives,
    compositesPath: frameworkPaths.composites,
    rulesPath: frameworkPaths.rules,
    cssPath: detectedCssPath,
    shadcn: !!shadcn,
    exports,
    installed: {
      components: [],
      primitives: [],
      composites: [],
      rules: [],
    },
  };
  await writeFile(paths.config, JSON.stringify(config, null, 2));

  // Sense source CSS, then prompt-and-apply each shadcn semantic color.
  // Each accepted color becomes two registry ops: `define` a new family
  // from the imported OKLCH seed, then `set` the matching semantic to a
  // ColorReference at family@500. Defining a new family avoids the
  // blast-radius of remapping an existing one (e.g. neutral) where every
  // dependent semantic would re-color.
  if (detectedCssPath) {
    try {
      const sourceCss = await readFile(join(cwd, detectedCssPath), 'utf-8');
      const summary = senseShadcnCss(sourceCss);
      if (summary.totalDeclarations > 0) {
        log({
          event: 'init:import_sensed',
          cssPath: detectedCssPath,
          ...summary,
        });

        const classification = classifyDeclarations(extractShadcnRoot(sourceCss));
        const semanticColors = colorsFromClassification(classification).filter(
          (c) => c.namespace === 'semantic',
        );

        const toImport: ColorDeclaration[] = [];
        for (const color of semanticColors) {
          const accept = isAgentMode
            ? true
            : await confirm({
                message: `Import --${color.name}: ${color.value}?`,
                default: true,
              });
          if (accept) toImport.push(color);
        }

        if (toImport.length > 0) {
          for (const color of toImport) {
            const familyName = `imported-${color.name}`;
            const reason = `imported from --${color.name} in ${detectedCssPath}`;
            // `generateOKLCHScale` keys results by position name; the
            // ColorValue schema wants a positional `OKLCH[]`. Map through
            // `SCALE_POSITIONS` to get canonical order.
            const scaleByPos = generateOKLCHScale(color.oklch);
            const scale = SCALE_POSITIONS.map((pos) => scaleByPos[pos]).filter(
              (v): v is NonNullable<typeof v> => v !== undefined,
            );

            // Per-position primitive tokens. The Tailwind exporter renders
            // `--color-<family>-<position>: oklch(...)` from these; the
            // semantic's ColorReference resolves to them via `var()`.
            // Without these, `var(--color-imported-primary-600)` is a
            // dangling reference in the output CSS.
            for (const position of SCALE_POSITIONS) {
              const oklch = scaleByPos[position];
              if (!oklch) continue;
              registry.define({
                name: `${familyName}-${position}`,
                namespace: 'color',
                category: 'color',
                value: oklchToCSS(oklch),
                userOverride: null,
              });
            }

            // Family token carries the scale + WCAG ladder so the state
            // and contrast plugins can walk it at cascade time.
            const familyValue = bakeAccessibility({ name: familyName, scale }) as ColorValue;
            registry.define({
              name: familyName,
              namespace: 'color',
              category: 'color',
              value: familyValue,
              userOverride: null,
            });

            // The seed lightness lands at position 600 -- see
            // `generateLightnessProgression` in `@rafters/color-utils`
            // (`baseIndex = 6`). Pointing the semantic at family@600
            // preserves the user's exact OKLCH; pointing at 500 would
            // render a lighter shade than what they wrote.
            registry.set(color.name, { family: familyName, position: '600' }, { reason });
          }

          // Persist the imports and re-emit outputs so the on-disk state
          // reflects the apply step. Phase A's earlier save + generate
          // produced the defaults; this pass overwrites with the imported
          // overrides cascaded through their dependents.
          saveRegistryToDir(paths.tokens, registry);
          await generateOutputs(cwd, paths, registry, exports, shadcn);
          log({
            event: 'init:import_applied',
            count: toImport.length,
            cssPath: detectedCssPath,
          });
        }
      }
    } catch (err) {
      // File vanishing between detection and now is a legitimate soft skip.
      // Other failures (permission, IO) propagate so the user sees them.
      if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) throw err;
    }
  }

  log({
    event: 'init:complete',
    outputs: [...outputs, 'config.rafters.json'],
    path: paths.output,
  });
}
