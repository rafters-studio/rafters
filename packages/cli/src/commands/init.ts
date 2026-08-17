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
  type BaseSystemConfig,
  type ColorDeclaration,
  classifyDeclarations,
  contrastPlugin,
  type DetectedFont,
  extractShadcnRoot,
  extractThemeBlocks,
  generateBaseSystem,
  getAdapter,
  importColorFamily,
  invertPlugin,
  loadRegistryFromDir,
  regenerateOutputs,
  resolveContentSources,
  saveRegistryToDir,
  scalePlugin,
  senseShadcnCss,
  statePlugin,
  TokenRegistry,
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
 * Block-level source cleaning after an applied import (#1647).
 *
 * Values now live in .rafters/tokens and emit through rafters.css, so token
 * layers left in the source override the system in the cascade:
 * - `@theme inline` blocks are removed entirely -- they are token bridges by
 *   definition, and rafters.css emits the canonical bridge.
 * - `:root` blocks (anywhere, including under @media) lose ALL custom-property
 *   declarations; non-custom-prop declarations (color-scheme, ...) survive.
 *   A block left with no content is removed; an at-rule shell emptied by that
 *   removal is removed too.
 * Plain `@theme` blocks are untouched: non-imported props there (custom
 * fonts, ...) are intentional user tokens. Pre-strip backup is the recovery
 * path. Brace matching is character-depth based; brace characters inside
 * string values are not handled (acceptable for token layers).
 */
export function cleanSourceCssBlocks(content: string): string {
  type Block = {
    headerStart: number;
    bodyStart: number;
    end: number;
    header: string;
  };

  function parseBlocks(src: string): Block[] {
    const blocks: Block[] = [];
    let depth = 0;
    const headerStack: number[] = [];
    let segmentStart = 0;
    for (let i = 0; i < src.length; i++) {
      const ch = src.charAt(i);
      if (ch === '{') {
        headerStack.push(segmentStart);
        depth++;
        if (depth >= 1) {
          blocks.push({
            headerStart: segmentStart,
            bodyStart: i + 1,
            end: -1,
            header: src.slice(segmentStart, i).trim(),
          });
        }
        segmentStart = i + 1;
      } else if (ch === '}') {
        depth--;
        const open = blocks
          .slice()
          .reverse()
          .find((b) => b.end === -1);
        if (open) open.end = i + 1;
        headerStack.pop();
        segmentStart = i + 1;
      } else if (ch === ';') {
        segmentStart = i + 1;
      }
    }
    return blocks.filter((b) => b.end !== -1);
  }

  function isContentEmpty(body: string): boolean {
    return body.replace(/\/\*[\s\S]*?\*\//g, '').trim().length === 0;
  }

  let out = content;
  // Iterate until stable: removing inner blocks can empty outer shells.
  for (let pass = 0; pass < 10; pass++) {
    const blocks = parseBlocks(out);
    let edited = false;
    // Walk innermost-last so splices don't invalidate earlier ranges;
    // process one edit per pass for simplicity and re-parse.
    for (const block of blocks.sort((a, b) => b.headerStart - a.headerStart)) {
      const header = block.header;
      if (/^@theme\s+inline$/.test(header)) {
        out = out.slice(0, block.headerStart) + out.slice(block.end);
        edited = true;
        break;
      }
      if (header === ':root' || /(^|,)\s*:root\s*$/.test(header)) {
        const body = out.slice(block.bodyStart, block.end - 1);
        const cleanedBody = body.replace(/--[\w-]+\s*:[^;{}]*;?/g, '');
        if (isContentEmpty(cleanedBody)) {
          out = out.slice(0, block.headerStart) + out.slice(block.end);
          edited = true;
          break;
        }
        if (cleanedBody !== body) {
          out = out.slice(0, block.bodyStart) + cleanedBody + out.slice(block.end - 1);
          edited = true;
          break;
        }
        continue;
      }
      if (header.startsWith('@media') || header.startsWith('@supports')) {
        const body = out.slice(block.bodyStart, block.end - 1);
        if (isContentEmpty(body)) {
          out = out.slice(0, block.headerStart) + out.slice(block.end);
          edited = true;
          break;
        }
      }
    }
    if (!edited) break;
  }
  return out.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
}

async function stripImportedDeclarations(
  cwd: string,
  cssPath: string,
  importedNames: string[],
): Promise<void> {
  if (importedNames.length === 0) return;
  const fullPath = join(cwd, cssPath);
  const content = await readFile(fullPath, 'utf-8');
  const pattern = new RegExp(importedNames.map((n) => `^\\s*--${n}[^;]*;\\s*$`).join('|'), 'gm');
  const cleaned = cleanSourceCssBlocks(content.replace(pattern, ''));
  const collapsed = cleaned.replace(/\n{3,}/g, '\n\n');
  await writeFile(fullPath, collapsed);
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
export interface FontsConfig {
  path?: string | null;
  imports?: string[];
}

export interface RaftersConfig {
  framework: Framework;
  /** Registry to install from / query. Set this to host your own internal registry. */
  registryUrl?: string;
  componentTarget?: ComponentTarget;
  componentsPath: PathField;
  primitivesPath: PathField;
  compositesPath: PathField;
  rulesPath: PathField;
  cssPath: string | null;
  /** Which design system this project was imported from. Replaces the old `shadcn` boolean. */
  source?: string;
  exports: ExportConfig;
  darkMode?: 'class' | 'media';
  /** Aesthetic starting point and rollback target. Default "efficient". */
  intent?: string;
  /** Font file locations and web font imports. */
  fonts?: FontsConfig;
  installed?: {
    components: string[];
    primitives: string[];
    composites: string[];
    rules: string[];
    substrate?: string[];
  };
}

/**
 * Migrate legacy configs that carry `shadcn: boolean` to the new `source`
 * field. Called on every config read so existing projects upgrade silently.
 */
export function migrateConfig(raw: Record<string, unknown>): Record<string, unknown> {
  if ('shadcn' in raw && !('source' in raw)) {
    if (raw.shadcn === true) {
      raw.source = 'shadcn';
    }
    delete raw.shadcn;
  }
  return raw;
}

async function updateMainCss(
  cwd: string,
  cssPath: string,
  themePath: string,
  contentSources: string[] = [],
): Promise<void> {
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

  // Keep @import "tailwindcss" at the top level so @source directives work.
  // Add @source for installed component paths, then import rafters.css.
  const sourceLines = contentSources.map((src) => `@source "${src}";`).join('\n');
  const raftersBlock = sourceLines
    ? `@import "tailwindcss";\n${sourceLines}\n@import "${relativeThemePath}";`
    : `@import "tailwindcss";\n@import "${relativeThemePath}";`;

  let newContent: string;
  if (cssContent.includes('@import "tailwindcss"')) {
    newContent = cssContent.replace('@import "tailwindcss";', raftersBlock);
  } else if (cssContent.includes("@import 'tailwindcss'")) {
    newContent = cssContent.replace("@import 'tailwindcss';", raftersBlock);
  } else if (cssContent.includes('.rafters/output/rafters.css')) {
    // Already has rafters import, update source directives
    return;
  } else {
    newContent = `${raftersBlock}\n\n${cssContent}`;
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
 * Pick the source CSS path init should read for sense/import.
 *
 *   1. shadcn's components.json `tailwind.css` IF the file exists on disk.
 *   2. The framework's canonical CSS location (`findCssPath` or
 *      `project.cssPath`).
 *
 * The shadcn config commonly lags after a project changes framework (e.g.
 * a generated `src/app/globals.css` Next.js path persists after the
 * project becomes Astro at `src/styles/global.css`). Trusting that path
 * silently meant init read ENOENT and skipped the whole import flow with
 * no diagnostic. Now: when the configured path is missing, emit
 * `init:shadcn_css_missing` and fall back to the framework's canonical
 * location.
 */
function resolveSourceCssPath(
  cwd: string,
  framework: Framework,
  detectedFramework: Framework,
  projectCssPath: string | null,
  shadcnCssPath: string | null | undefined,
  emit: typeof log,
): string | null {
  if (shadcnCssPath) {
    if (existsSync(join(cwd, shadcnCssPath))) return shadcnCssPath;
    const fallback = framework === detectedFramework ? projectCssPath : findCssPath(cwd, framework);
    emit({
      event: 'init:shadcn_css_missing',
      configuredPath: shadcnCssPath,
      fallbackPath: fallback,
      message:
        'components.json points at a CSS file that does not exist. Falling back to the framework canonical location.',
    });
    return fallback;
  }
  return framework === detectedFramework ? projectCssPath : findCssPath(cwd, framework);
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
  source: string | undefined,
  darkMode: 'class' | 'media' = 'class',
  config?: RaftersConfig | null,
): Promise<string[]> {
  const contentSources = config ? resolveContentSources(cwd, config) : [];

  if (exports.compiled && !isTailwindCliInstalled()) {
    log({ event: 'init:prompting_exports' });
    await ensureTailwindCli(cwd);
  }
  if (exports.compiled) {
    log({ event: 'init:compiling_css' });
  }

  return regenerateOutputs(registry, {
    outputDir: paths.output,
    exports,
    contentSources,
    darkMode,
    includeImport: source !== 'shadcn',
  });
}

async function regenerateFromExisting(
  cwd: string,
  paths: ReturnType<typeof getRaftersPaths>,
  source: string | undefined,
  isAgentMode: boolean,
  framework: Framework,
): Promise<void> {
  log({ event: 'init:regenerate', cwd });

  let existingConfig: RaftersConfig | null = null;
  try {
    const configContent = await readFile(paths.config, 'utf-8');
    existingConfig = migrateConfig(
      JSON.parse(configContent) as Record<string, unknown>,
    ) as unknown as RaftersConfig;
  } catch {
    // No config file, will use defaults
  }

  if (framework !== 'unknown' && existingConfig) {
    const frameworkPaths = FRAMEWORK_SPECS[framework].components;
    existingConfig.framework = framework;
    existingConfig.componentsPath = frameworkPaths.components;
    existingConfig.primitivesPath = frameworkPaths.primitives;
    existingConfig.compositesPath = frameworkPaths.composites;
    existingConfig.rulesPath = frameworkPaths.rules;
  }

  // Deleted token namespaces (#1638 S2 elevation, #1637 fill): drop the
  // stale files so their dead tokens stop reloading on every rebuild.
  await rm(join(paths.tokens, 'elevation.rafters.json'), { force: true });
  await rm(join(paths.tokens, 'fill.rafters.json'), { force: true });

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

  const outputs = await generateOutputs(
    cwd,
    paths,
    registry,
    exports,
    source,
    'class',
    existingConfig,
  );

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
      ...(source ? { source } : {}),
      intent: 'efficient',
      fonts: { path: null, imports: [] },
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
  source: string | undefined,
  isAgentMode: boolean,
  framework: Framework,
): Promise<void> {
  log({ event: 'init:reset', cwd });

  let existingConfig: RaftersConfig | null = null;
  try {
    const configContent = await readFile(paths.config, 'utf-8');
    existingConfig = migrateConfig(
      JSON.parse(configContent) as Record<string, unknown>,
    ) as unknown as RaftersConfig;
  } catch {
    // No config file, will use defaults
  }

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

  await mkdir(paths.output, { recursive: true });

  const outputs = await generateOutputs(
    cwd,
    paths,
    registry,
    exports,
    source,
    'class',
    existingConfig,
  );

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
      ...(source ? { source } : {}),
      intent: 'efficient',
      fonts: { path: null, imports: [] },
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
  const source: string | undefined = shadcn ? 'shadcn' : undefined;

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
    await resetToDefaults(cwd, paths, source, isAgentMode, framework);
    return;
  }

  if (raftersExists && !options.rebuild) {
    throw new Error(
      '.rafters/ directory already exists. Use --rebuild to regenerate output files, or --reset to start from defaults.',
    );
  }

  // If --rebuild and rafters exists, regenerate from existing config
  if (raftersExists && options.rebuild) {
    await regenerateFromExisting(cwd, paths, source, isAgentMode, framework);
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

  // Phase A: install-time generation. Spacing-base detection runs FIRST
  // -- the cascade flows from baseSpacingUnit through five namespaces
  // (resolveConfig in generators/types.ts derives baseFontSize,
  // baseRadius, focusRingWidth, baseTransitionDuration from it), so the
  // base has to land in the config BEFORE generation. Post-generation
  // `registry.set('spacing-base', ...)` only cascades through spacing
  // tokens via CSS `calc()`; shadow/typography/radius/focus/motion
  // bake values numerically at generation time and would not update.
  // See legion reflection 019e57d8 for the full invariant.
  const adapter = getAdapter(source ?? 'tailwind');
  const baseConfig: Partial<BaseSystemConfig> = {};
  // Source CSS resolution priority for both pre-generation base detection
  // AND the later sense/apply flow:
  //   1. shadcn's components.json `tailwind.css` IF the file actually exists
  //   2. framework's canonical CSS location (findCssPath)
  // shadcn configs often carry a stale Next.js path (`src/app/globals.css`)
  // after a project migrates to Astro / Vite. Silently trusting the
  // configured path means init reads ENOENT and skips the whole import
  // flow without surfacing what went wrong.
  const sourceCssPathForBase = resolveSourceCssPath(
    cwd,
    framework,
    detectedFramework,
    project.cssPath,
    shadcn?.tailwind?.css,
    log,
  );
  if (sourceCssPathForBase !== null) {
    try {
      const cssForBase = await readFile(join(cwd, sourceCssPathForBase), 'utf-8');
      // Per-detector wiring: each adapter method returns an object with
      // an optional key; if the value is present, it lands on the matching
      // BaseSystemConfig override and fires its own `init:import_*_applied`
      // event for telemetry.
      const baseSlots = [
        {
          detect: () => adapter.detectSpacing(cssForBase).base,
          field: 'baseSpacingUnit',
          event: 'init:import_spacing_applied',
          eventKey: 'baseSpacingUnit',
        },
        {
          detect: () => adapter.detectRadius(cssForBase).base,
          field: 'baseRadiusOverride',
          event: 'init:import_radius_applied',
          eventKey: 'baseRadius',
        },
        {
          detect: () => adapter.detectFontSize(cssForBase).base,
          field: 'baseFontSizeOverride',
          event: 'init:import_font_size_applied',
          eventKey: 'baseFontSize',
        },
        {
          detect: () => adapter.detectFocusRing(cssForBase).width,
          field: 'focusRingWidthOverride',
          event: 'init:import_focus_ring_applied',
          eventKey: 'focusRingWidth',
        },
        // Motion duration is intentionally not imported -- rafters' motion
        // system is research-backed and most projects' `--duration-base`
        // values are unresearched defaults. See importers/bases.ts for the
        // policy note; designers can `rafters set motion-duration-base ...`
        // after init to override explicitly.
      ] as const;
      for (const slot of baseSlots) {
        const value = slot.detect();
        if (value === undefined) continue;
        baseConfig[slot.field] = value;
        log({
          event: slot.event,
          cssPath: sourceCssPathForBase,
          [slot.eventKey]: value,
        });
      }
    } catch (err) {
      // ENOENT is a soft skip -- the later sensing pass will surface the
      // missing-file state via its own log. Any other read failure
      // propagates so the user sees it.
      if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) throw err;
    }
  }

  const system = generateBaseSystem(baseConfig);
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
  const outputs = await generateOutputs(cwd, paths, registry, exports, source);

  // Find and update the main CSS file (if not using shadcn which has its own CSS path).
  // `project.cssPath` is computed against the auto-detected framework; if the
  // resolved framework differs, re-walk under the new framework.
  let detectedCssPath: string | null = null;
  // Same resolution helper as pre-generation. When shadcn's components.json
  // points at a missing file (common after a project migrates frameworks
  // without updating the config) we fall back to the framework's canonical
  // CSS location and warn loudly.
  detectedCssPath = resolveSourceCssPath(
    cwd,
    framework,
    detectedFramework,
    project.cssPath,
    shadcn?.tailwind?.css,
    log,
  );
  if (source !== 'shadcn' && exports.tailwind) {
    if (detectedCssPath) {
      await updateMainCss(cwd, detectedCssPath, '.rafters/output/rafters.css');
    } else {
      log({
        event: 'init:css_not_found',
        message: 'No main CSS file found. Add @import ".rafters/output/rafters.css" manually.',
        searchedLocations: FRAMEWORK_SPECS[framework].cssLocations,
      });
    }
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
    ...(source ? { source } : {}),
    componentTarget,
    componentsPath: frameworkPaths.components,
    primitivesPath: frameworkPaths.primitives,
    compositesPath: frameworkPaths.composites,
    rulesPath: frameworkPaths.rules,
    cssPath: detectedCssPath,
    exports,
    intent: 'efficient',
    fonts: { path: null, imports: [] },
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
        const colorDecls = adapter.detectColors(sourceCss);
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
          await generateOutputs(cwd, paths, registry, exports, source);
          const importedNames = [
            ...toImportColors.map((c) => c.name),
            ...toImportNonColors.map((d) => d.name),
          ];
          await stripImportedDeclarations(cwd, detectedCssPath, importedNames);
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
          const families = Array.from(familySeeds, ([name, info]) => ({
            name,
            ...info,
          }));
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

            // Walk semantic roles. The designer assigns detected palettes
            // to each role. Filter to roles that exist as semantic-namespace
            // tokens in the registry (tertiary ships only in some configs).
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
                    choices: SCALE_POSITIONS.map((p) => ({
                      name: p,
                      value: p,
                    })),
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
            await generateOutputs(cwd, paths, registry, exports, source);
            const themeImportedNames = families.flatMap((f) =>
              SCALE_POSITIONS.map((p) => `color-${f.name}-${p}`).concat([`color-${f.name}`]),
            );
            await stripImportedDeclarations(cwd, detectedCssPath, themeImportedNames);
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
      const detectedFonts = adapter.detectFonts(sourceCss);
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
          await generateOutputs(cwd, paths, registry, exports, source);
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
