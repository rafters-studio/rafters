import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import type { Constraint, PropField } from './componentService';

export interface ResolvedProp {
  name: string;
  field: PropField;
}

let cachedChecker: { program: ts.Program; checker: ts.TypeChecker } | undefined;

function getComponentsPath(): string {
  return join(process.cwd(), '../../packages/ui/src/components');
}

function getUiPath(): string {
  return join(process.cwd(), '../../packages/ui');
}

function discoverTsxFiles(componentsDir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of readdirSync(componentsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = join(componentsDir, entry.name);
      try {
        for (const f of readdirSync(dir)) {
          if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            files.push(join(dir, f));
          }
        }
      } catch {
        // skip unreadable dirs
      }
    }
  } catch {
    // skip if components dir doesn't exist
  }
  return files;
}

function ensureChecker(): { program: ts.Program; checker: ts.TypeChecker } {
  if (cachedChecker) return cachedChecker;

  const uiPath = getUiPath();
  const tsconfigPath = join(uiPath, 'tsconfig.json');

  let compilerOptions: ts.CompilerOptions;
  let rootFiles: string[];

  if (existsSync(tsconfigPath)) {
    const parsed = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const config = ts.parseJsonConfigFileContent(parsed.config, ts.sys, uiPath);
    compilerOptions = { ...config.options, noEmit: true, skipLibCheck: true };
    rootFiles = discoverTsxFiles(getComponentsPath());
  } else {
    compilerOptions = {
      target: ts.ScriptTarget.ES2024,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      esModuleInterop: true,
    };
    rootFiles = discoverTsxFiles(getComponentsPath());
  }

  const program = ts.createProgram(rootFiles, compilerOptions);
  const checker = program.getTypeChecker();
  cachedChecker = { program, checker };
  return cachedChecker;
}

export function resetCheckerCache(): void {
  cachedChecker = undefined;
}

function pascalCase(input: string): string {
  return input
    .split(/[-_]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function isOwnDeclaration(symbol: ts.Symbol, componentDir: string): boolean {
  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return false;
  const resolved = resolve(componentDir);
  return declarations.every((decl) => {
    const fileName = resolve(decl.getSourceFile().fileName);
    return fileName.startsWith(resolved);
  });
}

function isStringLiteralUnion(_checker: ts.TypeChecker, type: ts.Type): string[] | null {
  if (type.isUnion()) {
    const values: string[] = [];
    for (const member of type.types) {
      if (member.isStringLiteral()) {
        values.push(member.value);
      } else {
        return null;
      }
    }
    return values.length > 0 ? values : null;
  }
  if (type.isStringLiteral()) {
    return [type.value];
  }
  return null;
}

function isNumberLiteralUnion(_checker: ts.TypeChecker, type: ts.Type): string[] | null {
  if (type.isUnion()) {
    const values: string[] = [];
    for (const member of type.types) {
      if (member.isNumberLiteral()) {
        values.push(String(member.value));
      } else {
        return null;
      }
    }
    return values.length > 0 ? values : null;
  }
  if (type.isNumberLiteral()) {
    return [String(type.value)];
  }
  return null;
}

function isBooleanType(_checker: ts.TypeChecker, type: ts.Type): boolean {
  const flags = type.getFlags();
  if (flags & ts.TypeFlags.BooleanLike) return true;
  if (type.isUnion()) {
    return type.types.every(
      (t) => t.getFlags() & (ts.TypeFlags.BooleanLiteral | ts.TypeFlags.BooleanLike),
    );
  }
  return false;
}

function isStringType(type: ts.Type): boolean {
  return (type.getFlags() & ts.TypeFlags.String) !== 0;
}

function isNumberType(type: ts.Type): boolean {
  return (type.getFlags() & ts.TypeFlags.Number) !== 0;
}

function isFunctionType(_checker: ts.TypeChecker, type: ts.Type): boolean {
  const signatures = type.getCallSignatures();
  return signatures.length > 0;
}

function extractDefaultFromInitializer(
  initializer: ts.Expression,
): { value: string | boolean | number; kind: 'string' | 'boolean' | 'number' } | null {
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return { value: initializer.text, kind: 'string' };
  }
  if (initializer.kind === ts.SyntaxKind.TrueKeyword) {
    return { value: true, kind: 'boolean' };
  }
  if (initializer.kind === ts.SyntaxKind.FalseKeyword) {
    return { value: false, kind: 'boolean' };
  }
  if (ts.isNumericLiteral(initializer)) {
    return { value: Number(initializer.text), kind: 'number' };
  }
  if (ts.isPrefixUnaryExpression(initializer) && ts.isNumericLiteral(initializer.operand)) {
    const val = Number(initializer.operand.text);
    return {
      value: initializer.operator === ts.SyntaxKind.MinusToken ? -val : val,
      kind: 'number',
    };
  }
  return null;
}

/**
 * Extract defaults from the destructured props of the component whose props type
 * is `propsTypeName`. Handles three patterns:
 *   1. `function Comp({ variant = 'default' }: CompProps)` — param destructuring
 *   2. `forwardRef<..., CompProps>(({ variant = 'default' }, ref) => ...)` — inferred param
 *   3. `const { variant = 'default', ... } = props;` inside a forwardRef callback
 *
 * The first pattern found wins, so sub-component destructurings later in the
 * same file do not leak their defaults.
 */
function findDestructuredDefaults(
  sourceFile: ts.SourceFile,
  propsTypeName: string,
): Map<string, { value: string | boolean | number; kind: 'string' | 'boolean' | 'number' }> {
  const defaults = new Map<
    string,
    { value: string | boolean | number; kind: 'string' | 'boolean' | 'number' }
  >();

  function extractFromPattern(pattern: ts.ObjectBindingPattern): void {
    for (const element of pattern.elements) {
      if (ts.isBindingElement(element) && element.initializer && ts.isIdentifier(element.name)) {
        const extracted = extractDefaultFromInitializer(element.initializer);
        if (extracted) {
          defaults.set(element.name.text, extracted);
        }
      }
    }
  }

  function typeAnnotationNames(param: ts.ParameterDeclaration): string | null {
    if (!param.type) return null;
    return param.type.getText(sourceFile);
  }

  let found = false;

  function visitNode(node: ts.Node): void {
    if (found) return;

    // Pattern 1: function Comp({ variant = 'default' }: CompProps)
    // Pattern 1b: function Comp(props: CompProps) { const { preset = 'linear' } = props; }
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isArrowFunction(node) ||
        ts.isFunctionExpression(node)) &&
      node.parameters.length > 0
    ) {
      for (const param of node.parameters) {
        const typeName = typeAnnotationNames(param);
        if (typeName !== propsTypeName) continue;
        if (param.name && ts.isObjectBindingPattern(param.name)) {
          extractFromPattern(param.name);
          found = true;
          return;
        }
        if (param.name && ts.isIdentifier(param.name) && node.body && ts.isBlock(node.body)) {
          for (const stmt of node.body.statements) {
            if (ts.isVariableStatement(stmt)) {
              for (const decl of stmt.declarationList.declarations) {
                if (
                  ts.isObjectBindingPattern(decl.name) &&
                  decl.initializer &&
                  ts.isIdentifier(decl.initializer) &&
                  decl.initializer.text === param.name.text
                ) {
                  extractFromPattern(decl.name);
                  found = true;
                  return;
                }
              }
            }
          }
        }
      }
    }

    // Pattern 2 + 3: forwardRef callback
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const firstArg = node.arguments[0];
      if (
        firstArg !== undefined &&
        (ts.isArrowFunction(firstArg) || ts.isFunctionExpression(firstArg)) &&
        firstArg.parameters.length > 0
      ) {
        const param = firstArg.parameters[0];
        if (param !== undefined && param.name) {
          // Pattern 2: forwardRef(({ variant = 'default', ... }, ref) => ...)
          if (ts.isObjectBindingPattern(param.name)) {
            extractFromPattern(param.name);
            found = true;
            return;
          }
          // Pattern 3: forwardRef((props, ref) => { const { variant = 'default' } = props; })
          if (ts.isIdentifier(param.name) && firstArg.body && ts.isBlock(firstArg.body)) {
            for (const stmt of firstArg.body.statements) {
              if (ts.isVariableStatement(stmt) && stmt.declarationList.declarations.length > 0) {
                const decl = stmt.declarationList.declarations[0];
                if (
                  decl !== undefined &&
                  ts.isObjectBindingPattern(decl.name) &&
                  decl.initializer &&
                  ts.isIdentifier(decl.initializer) &&
                  decl.initializer.text === param.name.text
                ) {
                  extractFromPattern(decl.name);
                  found = true;
                  return;
                }
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visitNode);
  }

  ts.forEachChild(sourceFile, visitNode);
  return defaults;
}

function findPropsType(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  componentName: string,
): { type: ts.Type; name: string } | null {
  const pascal = pascalCase(componentName);
  const candidates = [`${pascal}Props`];

  for (const candidate of candidates) {
    const symbol = checker
      .getSymbolsInScope(sourceFile, ts.SymbolFlags.Type | ts.SymbolFlags.Interface)
      .find((s) => s.name === candidate);
    if (symbol) {
      const type = checker.getDeclaredTypeOfSymbol(symbol);
      if (type && !(type.getFlags() & ts.TypeFlags.Any)) return { type, name: candidate };
    }
  }

  // Fallback: look for exported type/interface with Props suffix
  for (const statement of sourceFile.statements) {
    if (
      (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) &&
      statement.name.text.endsWith('Props') &&
      statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const symbol = checker.getSymbolAtLocation(statement.name);
      if (symbol) {
        const type = checker.getDeclaredTypeOfSymbol(symbol);
        if (type && !(type.getFlags() & ts.TypeFlags.Any)) {
          return { type, name: statement.name.text };
        }
      }
    }
  }

  return null;
}

/**
 * Resolve a react component's prop surface through the TypeScript type checker.
 * `componentDir` is the ABSOLUTE path to the component's directory on disk
 * (the same value `loadComponent` already has from `resolveComponentDir`).
 */
export function resolvePropsFromChecker(
  componentName: string,
  componentDir: string,
  constraints: Map<string, Constraint>,
): Record<string, PropField> {
  const { checker, program } = ensureChecker();

  const tsxPath = join(componentDir, `${componentName}.tsx`);
  const sourceFile = program.getSourceFile(tsxPath);
  if (!sourceFile) return {};

  const found = findPropsType(checker, sourceFile, componentName);
  if (!found) return {};

  const defaults = findDestructuredDefaults(sourceFile, found.name);
  const properties = checker.getPropertiesOfType(found.type);
  const props: Record<string, PropField> = {};

  for (const prop of properties) {
    if (!isOwnDeclaration(prop, componentDir)) continue;

    const propType = checker.getTypeOfSymbol(prop);
    if (isFunctionType(checker, propType)) continue;

    const isOptional = (prop.getFlags() & ts.SymbolFlags.Optional) !== 0;
    const required = !isOptional;
    const propName = prop.getName();

    // Strip optionality wrapper to get the real type
    const nonNullType = propType.getNonNullableType();

    // String literal union (enum)
    const stringValues = isStringLiteralUnion(checker, nonNullType);
    if (stringValues) {
      const field: PropField = { type: 'enum', values: stringValues };
      const def = defaults.get(propName);
      if (def !== undefined && def.kind === 'string') field.default = def.value as string;
      if (required) field.required = true;
      const constraint = constraints.get(propName);
      if (constraint) field.constraint = constraint;
      props[propName] = field;
      continue;
    }

    // Number literal union (emit as enum with stringified values)
    const numberValues = isNumberLiteralUnion(checker, nonNullType);
    if (numberValues) {
      const field: PropField = { type: 'enum', values: numberValues };
      const def = defaults.get(propName);
      if (def !== undefined && def.kind === 'number') field.default = String(def.value);
      if (required) field.required = true;
      const constraint = constraints.get(propName);
      if (constraint) field.constraint = constraint;
      props[propName] = field;
      continue;
    }

    // Boolean
    if (isBooleanType(checker, nonNullType)) {
      const field: PropField = { type: 'boolean' };
      const def = defaults.get(propName);
      if (def !== undefined && def.kind === 'boolean') field.default = def.value as boolean;
      if (required) field.required = true;
      props[propName] = field;
      continue;
    }

    // String
    if (isStringType(nonNullType)) {
      const field: PropField = { type: 'string' };
      const def = defaults.get(propName);
      if (def !== undefined && def.kind === 'string') field.default = def.value as string;
      if (required) field.required = true;
      props[propName] = field;
      continue;
    }

    // Number
    if (isNumberType(nonNullType)) {
      const field: PropField = { type: 'number' };
      const def = defaults.get(propName);
      if (def !== undefined && def.kind === 'number') field.default = def.value as number;
      if (required) field.required = true;
      props[propName] = field;
      continue;
    }
  }

  return props;
}
