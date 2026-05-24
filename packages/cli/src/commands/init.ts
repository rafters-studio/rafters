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
import { SCALE_POSITIONS, tryParseColor } from '@rafters/color-utils';
import {
  type ColorDeclaration,
  classifyDeclarations,
  colorsFromClassification,
  contrastPlugin,
  type DetectedFont,
  detectFonts,
  extractShadcnRoot,
  extractThemeBlocks,
  generateBaseSystem,
  importColorFamily,
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
import type { OKLCH } from '@rafters/shared';

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
 * Slug a font family name into a CSS-identifier-safe token suffix.
 * `Aurabesh` -> `aurabesh`. `JetBrains Mono` -> `jetbrains-mono`.
 * `Source Sans 3` -> `source-sans-3`.
 */
function slugifyFontName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Heuristic: does a token's value look like a font stack (literal family
 * name + optional fallbacks) rather than a length / weight number /
 * `var()` ref? Used to pick out the base-family typography tokens from
 * the broader typography namespace (sizes, weights, line-heights).
 */
function isFontStackValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.startsWith('var(')) return false;
  if (/[,'"]/.test(value)) return true;
  return /\b(sans-serif|serif|monospace|cursive|fantasy|system-ui|ui-(?:sans-serif|serif|monospace|rounded))\b/.test(
    value,
  );
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
    let sourceCss: string | null = null;
    try {
      sourceCss = await readFile(join(cwd, detectedCssPath), 'utf-8');
    } catch (err) {
      // File vanishing between detection and now is a legitimate soft skip.
      // Other failures (permission, IO) propagate so the user sees them.
      if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) throw err;
    }
    if (sourceCss !== null) {
      const summary = senseShadcnCss(sourceCss);
      if (summary.totalDeclarations > 0) {
        log({
          event: 'init:import_sensed',
          cssPath: detectedCssPath,
          ...summary,
        });

        const classification = classifyDeclarations(extractShadcnRoot(sourceCss));
        const colorDecls = colorsFromClassification(classification);
        const nonColorDecls = [
          ...classification.byNamespace.typography,
          ...classification.byNamespace.spacing,
          ...classification.byNamespace.radius,
          ...classification.byNamespace.shadow,
        ];

        const toImportColors: ColorDeclaration[] = [];
        for (const color of colorDecls) {
          const accept = isAgentMode
            ? true
            : await confirm({
                message: `Import --${color.name}: ${color.value}?`,
                default: true,
              });
          if (accept) toImportColors.push(color);
        }

        const toImportNonColors: typeof nonColorDecls = [];
        for (const decl of nonColorDecls) {
          const accept = isAgentMode
            ? true
            : await confirm({
                message: `Import --${decl.name}: ${decl.value}?`,
                default: true,
              });
          if (accept) toImportNonColors.push(decl);
        }

        if (toImportColors.length + toImportNonColors.length > 0) {
          // Color + semantic: family-create + per-position + (when semantic)
          // reseat the rafters semantic at family@500.
          for (const color of toImportColors) {
            const familyName = `imported-${color.name}`;
            const reason = `imported from --${color.name} in ${detectedCssPath}`;
            // `:root` declarations (`--primary: <color>`) carry no position
            // -- the designer said "primary is this color," not "primary's
            // scale-700 is this color." Seed the new one-off family at 500
            // and reseat the semantic there. 500 here is an internal
            // convention for the imported-<name> family, not an assumption
            // about what the designer wanted.
            for (const t of importColorFamily(familyName, '500', color.oklch)) {
              registry.define(t);
            }
            // Only shadcn-canonical names (the `semantic` namespace) get an
            // automatic semantic-set. Non-canonical color primitives (e.g.
            // `--brand-empire`) are imported as families and left for the
            // designer to assign to a semantic later via `rafters set` or
            // Studio.
            if (color.namespace === 'semantic') {
              registry.set(color.name, { family: familyName, position: '500' }, { reason });
            }
          }

          // Typography / spacing / radius / shadow: direct `registry.set` if
          // the source name matches a rafters token. Source names that
          // don't match (e.g. `--font-display-bold` when rafters only ships
          // `font-sans`, `font-mono`, etc.) are skipped -- the designer
          // would need to `rafters set` an arbitrary new name, which goes
          // through `define` not `set`, and that's a different shape we
          // can wire later if real consumers ask for it.
          const skipped: string[] = [];
          for (const decl of toImportNonColors) {
            const reason = `imported from --${decl.name} in ${detectedCssPath}`;
            if (registry.has(decl.name)) {
              registry.set(decl.name, decl.value, { reason });
            } else {
              skipped.push(decl.name);
            }
          }

          // Persist the imports and re-emit outputs so the on-disk state
          // reflects the apply step. Phase A's earlier save + generate
          // produced the defaults; this pass overwrites with the imported
          // overrides cascaded through their dependents.
          saveRegistryToDir(paths.tokens, registry);
          await generateOutputs(cwd, paths, registry, exports, shadcn);
          log({
            event: 'init:import_applied',
            count: toImportColors.length + toImportNonColors.length - skipped.length,
            cssPath: detectedCssPath,
            ...(skipped.length > 0 ? { skipped } : {}),
          });
        }
      }

      // Multi-palette flow runs independently of the `:root` flow. A
      // Tailwind-v4 project may declare its brand palettes in `@theme {}`
      // with no `:root` declarations at all (or only a `--radius`), in
      // which case `senseShadcnCss` returns 0 and the block above is
      // skipped. The `@theme` flow still needs to run for those projects.
      {
        // Extract @theme blocks, detect ramps, walk the 11
        // SemanticColorSystem roles asking the designer which detected
        // family fills each role and at which scale position. The designer
        // owns these assignments -- the importer collects taste, does not
        // infer it from the source's existing var() mappings.
        const themeDecls = extractThemeBlocks(sourceCss);
        if (themeDecls.length > 0) {
          // Detect family seeds: group color-valued declarations by base
          // name (Tailwind v4 source conventionally prefixes with `color-`;
          // strip it). Track the position the designer authored at: prefer
          // -500 if they wrote it (the canonical anchor when present);
          // otherwise carry whatever position they actually wrote so the
          // seed lands at the right index in the derived scale. Bare
          // single-color decls (`--color-empire`) default to position 500.
          // `buildColorValue` derives the rest of the scale around that
          // anchor; the source's other declared positions are discarded.
          const POSITION_SUFFIX = new RegExp(`^(.+)-(${SCALE_POSITIONS.join('|')})$`);
          const familySeeds = new Map<
            string,
            { seed: OKLCH; seedPosition: (typeof SCALE_POSITIONS)[number] }
          >();
          for (const decl of themeDecls) {
            // Tailwind v4 namespaces color tokens with `color-`. Gate on the
            // prefix so a `--font-display: red` (named CSS color, parses as
            // OKLCH) does not mint a font-display color family. Other
            // namespaces (--font-*, --spacing-*, --radius-*, --shadow-*)
            // have dedicated import paths and should not leak in here.
            if (!decl.name.startsWith('color-')) continue;
            const oklch = tryParseColor(decl.value);
            if (oklch === null) continue;
            const m = decl.name.match(POSITION_SUFFIX);
            const baseName = ((m ? m[1] : decl.name) ?? decl.name).replace(/^color-/, '');
            if (!baseName) continue;
            // m[2] is one of SCALE_POSITIONS by construction (regex
            // alternation), so the cast is sound when the match exists.
            const seedPosition = (m?.[2] ?? '500') as (typeof SCALE_POSITIONS)[number];
            const existing = familySeeds.get(baseName);
            if (!existing || seedPosition === '500') {
              familySeeds.set(baseName, { seed: oklch, seedPosition });
            }
          }
          const families = Array.from(familySeeds, ([name, info]) => ({ name, ...info }));
          if (families.length > 0) {
            // Define every detected palette via `importColorFamily` --
            // returns the family Token + 11 per-position primitive Tokens,
            // all built via `buildColorValue` (the canonical color-utils
            // builder). Designers preserve their own family names:
            // `--color-empire-500` -> family `empire`.
            for (const family of families) {
              for (const t of importColorFamily(family.name, family.seedPosition, family.seed)) {
                registry.define(t);
              }
            }

            // Walk the 11 canonical SemanticColorSystem roles. Per role:
            // (1) which family from the detected list, (2) which position
            // in that family. Families stay in the list across roles --
            // the designer can pick the same palette for multiple roles at
            // different positions (their call, per the 2026-05-22 decision).
            // Roles from `SemanticColorSystem` in `@rafters/color-utils`.
            // Filter to those that exist as SEMANTIC-namespace tokens in
            // the current registry. `neutral` exists too, but as a color
            // family (a ColorValue with a scale) -- setting it via this
            // path would replace the family with a ColorReference and
            // break every default semantic that derives from it.
            // `tertiary` ships only in some configurations.
            const ALL_ROLES = [
              'primary',
              'secondary',
              'tertiary',
              'accent',
              'highlight',
              'neutral',
              'muted',
              'success',
              'warning',
              'destructive',
              'info',
            ];
            const ROLES = ALL_ROLES.filter((r) => {
              const tok = registry.get(r);
              return tok !== undefined && tok.namespace === 'semantic';
            });
            const assignments: Array<{
              role: string;
              family: string;
              position: string;
            }> = [];
            for (const [i, role] of ROLES.entries()) {
              let familyChoice: string | null;
              if (isAgentMode) {
                familyChoice = families[i]?.name ?? null;
              } else {
                familyChoice = await select<string | null>({
                  message: `Which palette is "${role}"?`,
                  choices: [
                    ...families.map((f) => ({ name: f.name, value: f.name })),
                    { name: '(skip -- keep rafters default)', value: null },
                  ],
                });
              }
              if (familyChoice === null) continue;
              const family = families.find((f) => f.name === familyChoice);
              if (!family) continue;
              // Every family is full-scale (buildColorValue derives the
              // positions the designer did not author), so the role can
              // bind to any of the 11. Default to the position the family
              // was seeded at -- that IS the designer's anchor. Hardcoding
              // 500 would override their declared position when they
              // authored elsewhere on the scale.
              const position = isAgentMode
                ? family.seedPosition
                : await select({
                    message: `Which position in "${familyChoice}" for "${role}"?`,
                    choices: SCALE_POSITIONS.map((p) => ({ name: p, value: p })),
                    default: family.seedPosition,
                  });
              registry.set(
                role,
                { family: familyChoice, position },
                {
                  reason: `assigned ${familyChoice}@${position} as ${role} during import from ${detectedCssPath}`,
                },
              );
              assignments.push({ role, family: familyChoice, position });
            }

            saveRegistryToDir(paths.tokens, registry);
            await generateOutputs(cwd, paths, registry, exports, shadcn);
            log({
              event: 'init:import_palettes_applied',
              cssPath: detectedCssPath,
              palettesDefined: families.map((f) => f.name),
              assignments,
            });
          }
        }
      }
    }

    // Typography font role-walk. Independent of the color flows above and
    // of `summary.totalDeclarations > 0` -- a project can declare fonts
    // entirely through `@import url(google fonts)` or `@font-face` without
    // any `:root` custom properties. Three prompts (heading, body, code);
    // each answer reseats BOTH the role token and its inherited base
    // family (heading -> font-sans, body -> font-sans, code -> font-mono).
    // Last write wins on shared base families if heading and body pick
    // different fonts -- explicit trade-off for the 3-prompt UX, designer
    // can `rafters set` individually if they want heading != body.
    if (sourceCss !== null) {
      const detectedFonts = detectFonts(sourceCss);
      if (detectedFonts.length > 0) {
        // Derive the role/base mapping from the registry's typography
        // graph instead of hardcoding it here. Base families are typography
        // tokens whose value is a literal font stack (no `dependsOn`);
        // role tokens are typography tokens with `dependsOn` pointing at
        // a base family and a `value` of `var(--<base>)`. This is exactly
        // how the typography generator emits them, so the dynamic
        // discovery survives any future expansion of the role taxonomy
        // (e.g. `font-display` joining `font-heading`/`font-body`/`font-code`).
        const typographyTokens = registry.list({ namespace: 'typography' });
        const baseFamilyNames = new Set(
          typographyTokens
            .filter((t) => (!t.dependsOn || t.dependsOn.length === 0) && isFontStackValue(t.value))
            .map((t) => t.name),
        );
        const fontRoles: Array<{ role: string; base: string }> = [];
        for (const tok of typographyTokens) {
          const base = tok.dependsOn?.[0];
          if (base === undefined || !baseFamilyNames.has(base)) continue;
          if (typeof tok.value !== 'string' || !tok.value.includes(`var(--${base})`)) continue;
          fontRoles.push({ role: tok.name, base });
        }

        // Define a token for every detected font that isn't already a
        // canonical base family or role token (those are handled by the
        // role walk and the `:root` direct-set flow). A local `@font-face`
        // for Aurabesh, a `--font-aurabesh` declaration, or an `@import`
        // for a custom Google Font ALL land as rafters typography tokens
        // here -- otherwise the family would be loaded into the page
        // (still in source CSS) but invisible to the rafters token system
        // and unusable via `var(--rafters-font-*)` or `font-*` Tailwind
        // utilities driven by rafters output.
        const roleTokenNames = new Set(fontRoles.map((r) => r.role));
        const canonicalTokenNames = new Set([...baseFamilyNames, ...roleTokenNames]);
        const definedFonts: string[] = [];
        for (const font of detectedFonts) {
          if (font.sourceDeclName && canonicalTokenNames.has(font.sourceDeclName)) continue;
          const tokenName = font.sourceDeclName ?? `font-${slugifyFontName(font.name)}`;
          if (registry.has(tokenName)) continue;
          registry.define({
            name: tokenName,
            namespace: 'typography',
            category: 'typography',
            value: font.stack,
            description: `Imported from ${detectedCssPath}. ${
              font.sourceDeclName
                ? `Declared as --${font.sourceDeclName}.`
                : 'Loaded via @font-face or @import.'
            }`,
            userOverride: null,
            containerQueryAware: false,
          });
          definedFonts.push(tokenName);
        }

        // Agent mode: prefer the family the source explicitly declared
        // via the role's BASE name (a `--font-sans: "Inter"` decl makes
        // Inter the heading and body candidate because both roles depend
        // on `font-sans`). Falls back to a mono-name heuristic for code,
        // source order for the rest. If no signal exists we skip the
        // role -- a custom `@font-face` is not auto-assigned to heading
        // just because it was detected.
        const fontAssignments: Array<{ role: string; family: string }> = [];
        const declaredByBase = new Map<string, DetectedFont>();
        for (const font of detectedFonts) {
          if (font.sourceDeclName && baseFamilyNames.has(font.sourceDeclName)) {
            if (!declaredByBase.has(font.sourceDeclName)) {
              declaredByBase.set(font.sourceDeclName, font);
            }
          }
        }
        for (const { role, base } of fontRoles) {
          let choice: string | null;
          if (isAgentMode) {
            const declared = declaredByBase.get(base);
            if (declared !== undefined) {
              choice = declared.name;
            } else if (/mono/.test(base)) {
              choice = detectedFonts.find((f) => /mono/i.test(f.name))?.name ?? null;
            } else {
              const sansLike = detectedFonts.find((f) => !/mono/i.test(f.name));
              choice = sansLike?.name ?? null;
            }
          } else {
            const prompt = role.replace(/^font-/, '');
            choice = await select<string | null>({
              message: `Which font is "${prompt}"?`,
              choices: [
                ...detectedFonts.map((f) => ({ name: f.name, value: f.name })),
                { name: '(skip -- keep rafters default)', value: null },
              ],
            });
          }
          if (choice === null) continue;
          const font = detectedFonts.find((f) => f.name === choice);
          if (font === undefined) continue;
          const reason = `assigned ${font.name} as ${role} during import from ${detectedCssPath}`;
          if (registry.has(role)) {
            registry.set(role, font.stack, { reason });
          }
          // Don't clobber the base family's userOverride reason when an
          // earlier `:root --font-sans` direct-set already wrote the same
          // value. Preserves "imported from --font-sans" provenance.
          if (registry.has(base)) {
            const current = registry.get(base);
            if (current?.value !== font.stack) {
              registry.set(base, font.stack, { reason });
            }
          }
          fontAssignments.push({ role, family: font.name });
        }
        if (fontAssignments.length > 0 || definedFonts.length > 0) {
          saveRegistryToDir(paths.tokens, registry);
          await generateOutputs(cwd, paths, registry, exports, shadcn);
          log({
            event: 'init:import_fonts_applied',
            cssPath: detectedCssPath,
            fontsDetected: detectedFonts.map((f) => f.name),
            assignments: fontAssignments,
            ...(definedFonts.length > 0 ? { definedFonts } : {}),
          });
        }
      }
    }
  }

  log({
    event: 'init:complete',
    outputs: [...outputs, 'config.rafters.json'],
    path: paths.output,
  });
}
