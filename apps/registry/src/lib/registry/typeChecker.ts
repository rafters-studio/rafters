import { existsSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import type { Constraint, PropField } from './componentService';

interface CheckerHandle {
  root: string;
  program: ts.Program;
  checker: ts.TypeChecker;
}

let cachedChecker: CheckerHandle | undefined;

function readEntriesOrThrow(dir: string, label: string) {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch (cause) {
    throw new Error(`registry type checker: cannot read the ${label} ${dir}: ${String(cause)}`);
  }
}

/**
 * Every discovery failure is fatal (#2165 Error Handling). A silently empty
 * root file list still builds a valid (empty) `ts.Program`, so every component
 * would resolve to `props: {}` and the registry would ship green with exactly
 * the bug this checker exists to fix.
 */
function discoverTsxFiles(componentsDir: string): string[] {
  const files: string[] = [];
  let directories = 0;
  for (const entry of readEntriesOrThrow(componentsDir, 'component root')) {
    if (!entry.isDirectory()) continue;
    directories += 1;
    const dir = join(componentsDir, entry.name);
    for (const file of readEntriesOrThrow(dir, 'component directory')) {
      const name = file.name;
      if (file.isDirectory()) continue;
      if (name.endsWith('.tsx') || name.endsWith('.ts')) files.push(join(dir, name));
    }
  }

  if (directories === 0) {
    throw new Error(`registry type checker: no component directories under ${componentsDir}`);
  }
  if (files.length === 0) {
    throw new Error(`registry type checker: no .ts/.tsx sources under ${componentsDir}`);
  }
  return files;
}

/**
 * One shared `ts.Program` over every component directory, built from the
 * ABSOLUTE component root the caller already resolved -- never from
 * `process.cwd()`, so the checker is not coupled to the directory the registry
 * build happens to run from.
 */
function ensureChecker(componentsRoot: string): CheckerHandle {
  const root = resolve(componentsRoot);
  if (cachedChecker && cachedChecker.root === root) return cachedChecker;

  // <ui>/src/components -> <ui>
  const uiPath = resolve(root, '..', '..');
  const tsconfigPath = join(uiPath, 'tsconfig.json');

  let compilerOptions: ts.CompilerOptions;

  if (existsSync(tsconfigPath)) {
    const parsed = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    const config = ts.parseJsonConfigFileContent(parsed.config, ts.sys, uiPath);
    compilerOptions = { ...config.options, noEmit: true, skipLibCheck: true };
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
  }

  const rootFiles = discoverTsxFiles(root);
  const program = ts.createProgram(rootFiles, compilerOptions);
  const checker = program.getTypeChecker();
  cachedChecker = { root, program, checker };
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

/**
 * Anchored containment. A bare `startsWith` would count `button-group/` as
 * inside `button/` -- and the sibling-prefix collisions are real here
 * (button/button-group, input/input-group + input-otp, toggle/toggle-group,
 * alert/alert-dialog), which would defeat the own-declaration filter outright.
 *
 * Exported for the regression test: no component's props type references a
 * sibling-prefixed neighbour's symbols TODAY, so the anchoring is only
 * assertable against the predicate itself.
 */
export function isInsideDir(dir: string, fileName: string): boolean {
  const rel = relative(dir, fileName);
  if (rel === '' || isAbsolute(rel)) return false;
  return rel !== '..' && !rel.startsWith(`..${sep}`);
}

function isOwnDeclaration(symbol: ts.Symbol, componentDir: string): boolean {
  const declarations = symbol.getDeclarations();
  if (!declarations || declarations.length === 0) return false;
  const resolved = resolve(componentDir);
  return declarations.every((decl) =>
    isInsideDir(resolved, resolve(decl.getSourceFile().fileName)),
  );
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

/** Widened primitives: an arm no finite list of literals can stand in for. */
const OPEN_PRIMITIVE_FLAGS =
  ts.TypeFlags.String |
  ts.TypeFlags.Number |
  ts.TypeFlags.BigInt |
  ts.TypeFlags.ESSymbol |
  ts.TypeFlags.Any |
  ts.TypeFlags.Unknown;

/**
 * A union that mixes literals with non-literal members -- container's
 * `columns?: ResponsiveColumns` (`ColumnsValue | ResponsiveColumnsObject`),
 * container's `gap?: boolean | ContainerPadding`, grid's `columns`. Every pure
 * classifier above returns null for these, so before this arm existed the prop
 * fell out of the loop with no diagnostic and no emission (#2165 Proof).
 *
 * Every LITERAL member becomes an enum value -- string, number, and boolean
 * alike, so checkbox's `checked?: boolean | 'indeterminate'` reads as the
 * tri-state it is (`true`/`false`/`indeterminate`) rather than as the single
 * value `indeterminate`. Structural arms (container's responsive-columns
 * object) have no enum representation and are dropped: the emitted values are
 * the literal vocabulary an agent can pick from, not the whole assignable
 * domain.
 *
 * Reached only after every pure classifier has declined, so a union that gets
 * here is mixed by construction.
 */
function mixedLiteralUnion(checker: ts.TypeChecker, type: ts.Type): string[] | null {
  if (!type.isUnion()) return null;
  const values: string[] = [];
  for (const member of type.types) {
    if (member.isStringLiteral()) values.push(member.value);
    else if (member.isNumberLiteral()) values.push(String(member.value));
    else if (member.getFlags() & ts.TypeFlags.BooleanLiteral) {
      values.push(checker.typeToString(member));
    } else if (member.getFlags() & OPEN_PRIMITIVE_FLAGS) {
      // A widened primitive arm means the literals are examples, not a
      // vocabulary -- `React.ReactNode` would otherwise publish its `true` and
      // `false` members as if `children` were a two-value enum.
      return null;
    }
  }
  return values.length > 0 ? values : null;
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

/**
 * Deterministic fallback order, numeric-aware so `colSpan` reads 1,2,...,12
 * rather than 1,10,11,12,2. Used only when the declaration's source order
 * cannot be recovered (see `orderValues`).
 */
function sortValues(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    const aNumeric = a.trim() !== '' && Number.isFinite(na);
    const bNumeric = b.trim() !== '' && Number.isFinite(nb);
    if (aNumeric && bNumeric) return na - nb;
    if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}

/**
 * The text a string or numeric literal expression carries, or null for anything
 * else -- `true`/`false`/`null` and every non-literal expression alike.
 *
 * The one place this repo reads a literal's text: the member of a
 * `LiteralTypeNode` in a union, an element of an as-const array, and the
 * initializer of a destructured default are all the same transformation, and
 * writing it once keeps the three readings from drifting apart (a negative
 * numeric member used to parse in a type position and not in an array one).
 */
function literalText(expression: ts.Expression): string | null {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) return expression.text;
  if (ts.isPrefixUnaryExpression(expression) && ts.isNumericLiteral(expression.operand)) {
    return expression.operator === ts.SyntaxKind.MinusToken
      ? `-${expression.operand.text}`
      : expression.operand.text;
  }
  return null;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isAsExpression(current) || ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

/** `(typeof X)[number]` parenthesizes its object type; `typeof X[number]` does not. */
function unwrapTypeNode(node: ts.TypeNode): ts.TypeNode {
  let current = node;
  while (ts.isParenthesizedTypeNode(current)) current = current.type;
  return current;
}

/**
 * Collect a type node's literal members IN SOURCE ORDER, following alias
 * references, `(typeof ARRAY)[number]`, `keyof typeof MAP`, and indexed access
 * into a named member. Best-effort by design: any member it cannot resolve is
 * skipped rather than aborting, because the caller only trusts this ordering
 * when its value SET matches the checker's (see `orderValues`).
 */
function collectSourceOrder(
  node: ts.TypeNode,
  checker: ts.TypeChecker,
  out: string[],
  seen: Set<ts.Node>,
): void {
  if (seen.has(node)) return;
  seen.add(node);

  if (ts.isParenthesizedTypeNode(node)) {
    collectSourceOrder(node.type, checker, out, seen);
    return;
  }

  if (ts.isUnionTypeNode(node)) {
    for (const member of node.types) collectSourceOrder(member, checker, out, seen);
    return;
  }

  if (ts.isLiteralTypeNode(node)) {
    // `true`/`false`/`null` members read as null here; the BooleanKeyword arm
    // below is what carries a `boolean` member's two literals.
    const value = literalText(node.literal);
    if (value !== null) out.push(value);
    return;
  }

  // `boolean` in a mixed union is two literal members once the checker
  // expands it, so the recovered order has to carry both or the set gate
  // rejects it (checkbox's `checked?: boolean | 'indeterminate'`).
  if (node.kind === ts.SyntaxKind.BooleanKeyword) {
    out.push('true', 'false');
    return;
  }

  if (ts.isTypeReferenceNode(node)) {
    const symbol = checker.getSymbolAtLocation(node.typeName);
    const aliased =
      symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    for (const declaration of aliased?.getDeclarations() ?? []) {
      if (ts.isTypeAliasDeclaration(declaration)) {
        collectSourceOrder(declaration.type, checker, out, seen);
      }
    }
    return;
  }

  if (ts.isTypeOperatorNode(node) && node.operator === ts.SyntaxKind.KeyOfKeyword) {
    for (const key of objectLiteralKeys(node.type, checker)) out.push(key);
    return;
  }

  if (ts.isIndexedAccessTypeNode(node)) {
    // `(typeof VALUES)[number]` -- badge's as-const array alias.
    if (node.indexType.kind === ts.SyntaxKind.NumberKeyword) {
      for (const value of constArrayValues(node.objectType, checker)) out.push(value);
      return;
    }
    // `GridConfig['gap']` -- indexed access into a named member.
    if (ts.isLiteralTypeNode(node.indexType) && ts.isStringLiteral(node.indexType.literal)) {
      const member = namedMember(node.objectType, node.indexType.literal.text, checker);
      if (member) collectSourceOrder(member, checker, out, seen);
    }
  }
}

/** Declarations a type node's name resolves to, following import aliases. */
function declarationsOf(node: ts.TypeNode, checker: ts.TypeChecker): ts.Declaration[] {
  if (!ts.isTypeReferenceNode(node)) return [];
  const symbol = checker.getSymbolAtLocation(node.typeName);
  if (!symbol) return [];
  const aliased = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  return [...(aliased.getDeclarations() ?? [])];
}

/** The type node of `member` on the interface/type-literal `node` names. */
function namedMember(
  node: ts.TypeNode,
  member: string,
  checker: ts.TypeChecker,
): ts.TypeNode | undefined {
  for (const declaration of declarationsOf(node, checker)) {
    const members = ts.isInterfaceDeclaration(declaration)
      ? declaration.members
      : ts.isTypeAliasDeclaration(declaration) && ts.isTypeLiteralNode(declaration.type)
        ? declaration.type.members
        : undefined;
    for (const candidate of members ?? []) {
      if (
        ts.isPropertySignature(candidate) &&
        candidate.name &&
        ts.isIdentifier(candidate.name) &&
        candidate.name.text === member
      ) {
        return candidate.type;
      }
    }
  }
  return undefined;
}

/**
 * The initializers of the const variable `typeof X` names, `as const` and
 * parenthesis wrappers stripped. Both `keyof typeof MAP` and
 * `(typeof ARRAY)[number]` reach their members through exactly this resolution;
 * only the literal shape they then expect differs.
 */
function constInitializers(node: ts.TypeNode, checker: ts.TypeChecker): ts.Expression[] {
  const query = unwrapTypeNode(node);
  if (!ts.isTypeQueryNode(query) || !ts.isIdentifier(query.exprName)) return [];
  const symbol = checker.getSymbolAtLocation(query.exprName);
  const initializers: ts.Expression[] = [];
  for (const declaration of symbol?.getDeclarations() ?? []) {
    if (!ts.isVariableDeclaration(declaration) || !declaration.initializer) continue;
    initializers.push(unwrapExpression(declaration.initializer));
  }
  return initializers;
}

/** The object literal `typeof X` names, if `X` is a const object. */
function objectLiteralKeys(node: ts.TypeNode, checker: ts.TypeChecker): string[] {
  const keys: string[] = [];
  for (const initializer of constInitializers(node, checker)) {
    if (!ts.isObjectLiteralExpression(initializer)) continue;
    for (const property of initializer.properties) {
      const name = property.name;
      if (!name) continue;
      if (ts.isIdentifier(name) || ts.isStringLiteral(name)) keys.push(name.text);
    }
  }
  return keys;
}

/** The literal members of the array `typeof X` names, in source order. */
function constArrayValues(node: ts.TypeNode, checker: ts.TypeChecker): string[] {
  const values: string[] = [];
  for (const initializer of constInitializers(node, checker)) {
    if (!ts.isArrayLiteralExpression(initializer)) continue;
    for (const element of initializer.elements) {
      const value = literalText(element);
      if (value !== null) values.push(value);
    }
  }
  return values;
}

/**
 * Emit order for an enum prop's values.
 *
 * The checker's own union member order is an implementation detail -- TS
 * interns literal types globally and orders union constituents by type id, so
 * the order depends on which file in the shared program happened to mint each
 * literal first, and adding an unrelated component reshuffles it. Source order
 * is stable and reads the way the author wrote it (`default` first, not
 * `accent` first), so it wins when it can be recovered.
 *
 * The recovered order is trusted only when its value SET matches the checker's
 * exactly; any resolution gap therefore costs a nicer order, never a wrong
 * vocabulary. Multiple declarations (button's `size`, split across the two arms
 * of the `ButtonProps` intersection) are concatenated in declaration order.
 */
function orderValues(prop: ts.Symbol, checker: ts.TypeChecker, resolved: string[]): string[] {
  const collected: string[] = [];
  const seen = new Set<ts.Node>();
  for (const declaration of prop.getDeclarations() ?? []) {
    const typeNode =
      ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration)
        ? declaration.type
        : undefined;
    if (typeNode) collectSourceOrder(typeNode, checker, collected, seen);
  }

  const ordered = [...new Set(collected)];
  const target = new Set(resolved);
  if (ordered.length === target.size && ordered.every((value) => target.has(value))) {
    return ordered;
  }
  return sortValues(resolved);
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

/**
 * A destructured default, tagged by the `PropField` arm it can supply.
 *
 * Discriminated on `kind`, so `def.kind === 'number'` narrows `def.value` to
 * `number` at the emit sites -- a `{ value: string | boolean | number }` pair
 * would leave every one of them casting.
 */
type PropDefault =
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'number'; value: number };

function extractDefaultFromInitializer(initializer: ts.Expression): PropDefault | null {
  if (initializer.kind === ts.SyntaxKind.TrueKeyword) return { kind: 'boolean', value: true };
  if (initializer.kind === ts.SyntaxKind.FalseKeyword) return { kind: 'boolean', value: false };
  if (ts.isStringLiteral(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) {
    return { kind: 'string', value: initializer.text };
  }
  // Everything `literalText` still answers for past the string arms above is
  // numeric, negation included.
  const numeric = literalText(initializer);
  return numeric === null ? null : { kind: 'number', value: Number(numeric) };
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
): Map<string, PropDefault> {
  const defaults = new Map<string, PropDefault>();

  function extractFromPattern(pattern: ts.ObjectBindingPattern): void {
    for (const element of pattern.elements) {
      if (!ts.isBindingElement(element) || !element.initializer) continue;
      if (!ts.isIdentifier(element.name)) continue;
      // `{ as: Element = 'div' }` renames the prop to a local binding. The
      // default belongs to the PROP (`as`, in propertyName), never to the local
      // (`Element`): keyed on the local, container.as and card.as shipped with
      // no default at all. Without a rename the two names coincide.
      const key =
        element.propertyName && ts.isIdentifier(element.propertyName)
          ? element.propertyName.text
          : element.name.text;
      const extracted = extractDefaultFromInitializer(element.initializer);
      if (extracted) defaults.set(key, extracted);
    }
  }

  function typeAnnotationNames(param: ts.ParameterDeclaration): string | null {
    if (!param.type) return null;
    return param.type.getText(sourceFile);
  }

  const propsTypeWord = new RegExp(`\\b${propsTypeName}\\b`);

  // A call's callback is a source of defaults only when the call is bound to the
  // props type: by the callback parameter's annotation, by the call's type
  // arguments (`forwardRef<HTMLButtonElement, ButtonProps>`), or, for an
  // unannotated callback, by the callee being a known component wrapper. Any
  // other call whose first argument happens to be a function with a
  // destructured parameter (a hook, a reducer, a memoised helper) is not the
  // component and must not win the first-pattern race with a phantom default.
  function wrapsPropsType(call: ts.CallExpression): boolean {
    const firstArg = call.arguments[0];
    if (firstArg === undefined) return false;
    if (!ts.isArrowFunction(firstArg) && !ts.isFunctionExpression(firstArg)) return false;
    const param = firstArg.parameters[0];
    if (param === undefined) return false;
    const annotation = typeAnnotationNames(param);
    if (annotation !== null) return propsTypeWord.test(annotation);
    const typeArguments = call.typeArguments ?? [];
    if (typeArguments.some((t) => propsTypeWord.test(t.getText(sourceFile)))) return true;
    const callee = call.expression;
    const calleeName = ts.isIdentifier(callee)
      ? callee.text
      : ts.isPropertyAccessExpression(callee)
        ? callee.name.text
        : null;
    return calleeName === 'forwardRef' || calleeName === 'memo';
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

    // Pattern 2 + 3: forwardRef / memo callback, bound to the props type
    if (ts.isCallExpression(node) && node.arguments.length > 0 && wrapsPropsType(node)) {
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

/**
 * The component's props type is the one it declares under its OWN name:
 * `pascalCase(componentName) + 'Props'`, matched case-insensitively against the
 * type and interface declarations in the component's own source file so
 * input-otp's declared `InputOTPProps` still answers to `InputOtpProps`.
 *
 * Matching by NAME, never by position, is the whole point. A file that declares
 * a provider or a sub-component interface ABOVE the component's own -- and four
 * do: sidebar.tsx (`SidebarProviderProps` at :109, `SidebarProps` at :210),
 * tooltip.tsx (`TooltipProviderProps` before `TooltipProps`), typography.tsx
 * (`TypographyComponentProps` before `TypographyProps`), resizable.tsx
 * (`ResizablePanelProps`, carrying the internal `__resizableIndex`) -- hands a
 * first-declaration search the WRONG prop surface: `<Sidebar>` would advertise
 * `open`/`defaultOpen`/`collapsible`, which it does not accept.
 *
 * No such declaration means null, and the caller emits the documented empty
 * props object (#2165 Error Handling: it "does not silently fabricate a props
 * object"). resizable.tsx declares no `ResizableProps`, so resizable's react
 * facet is empty rather than a panel's props wearing the group's name.
 */
function findPropsType(
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  componentName: string,
): { type: ts.Type; name: string } | null {
  const wanted = `${pascalCase(componentName)}Props`.toLowerCase();

  for (const statement of sourceFile.statements) {
    if (!ts.isTypeAliasDeclaration(statement) && !ts.isInterfaceDeclaration(statement)) continue;
    if (statement.name.text.toLowerCase() !== wanted) continue;

    const symbol = checker.getSymbolAtLocation(statement.name);
    if (!symbol) continue;
    const type = checker.getDeclaredTypeOfSymbol(symbol);
    if (type && !(type.getFlags() & ts.TypeFlags.Any)) {
      return { type, name: statement.name.text };
    }
  }

  return null;
}

/**
 * Resolve a react component's prop surface through the TypeScript type checker.
 * `componentDir` is the ABSOLUTE path to the component's directory on disk
 * (the same value `loadComponent` already has from `resolveComponentDir`).
 */
function resolvePropsFromChecker(
  componentName: string,
  componentDir: string,
  constraints: Map<string, Constraint>,
): Record<string, PropField> {
  // The component root is the parent of the component's own directory, so the
  // shared program is anchored to the caller's absolute path rather than to
  // whatever `process.cwd()` the build happens to run from.
  const { checker, program } = ensureChecker(dirname(resolve(componentDir)));

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

    const emitEnum = (values: string[]): void => {
      const field: PropField = { type: 'enum', values: orderValues(prop, checker, values) };
      const def = defaults.get(propName);
      if (def !== undefined && def.kind !== 'boolean') field.default = String(def.value);
      if (required) field.required = true;
      const constraint = constraints.get(propName);
      if (constraint) field.constraint = constraint;
      props[propName] = field;
    };

    // String literal union (enum)
    const stringValues = isStringLiteralUnion(checker, nonNullType);
    if (stringValues) {
      emitEnum(stringValues);
      continue;
    }

    // Number literal union (emit as enum with stringified values)
    const numberValues = isNumberLiteralUnion(checker, nonNullType);
    if (numberValues) {
      emitEnum(numberValues);
      continue;
    }

    // Boolean
    if (isBooleanType(checker, nonNullType)) {
      const field: PropField = { type: 'boolean' };
      const def = defaults.get(propName);
      if (def !== undefined && def.kind === 'boolean') field.default = def.value;
      if (required) field.required = true;
      props[propName] = field;
      continue;
    }

    // String
    if (isStringType(nonNullType)) {
      const field: PropField = { type: 'string' };
      const def = defaults.get(propName);
      if (def !== undefined && def.kind === 'string') field.default = def.value;
      if (required) field.required = true;
      props[propName] = field;
      continue;
    }

    // Number
    if (isNumberType(nonNullType)) {
      const field: PropField = { type: 'number' };
      const def = defaults.get(propName);
      if (def !== undefined && def.kind === 'number') field.default = def.value;
      if (required) field.required = true;
      props[propName] = field;
      continue;
    }

    // Mixed literal/non-literal union, LAST so it never intercepts a prop one
    // of the pure classifiers above already answers.
    const mixedValues = mixedLiteralUnion(checker, nonNullType);
    if (mixedValues) {
      emitEnum(mixedValues);
      continue;
    }
  }

  return props;
}

/**
 * The seam the registry build calls through (#2165 Interface). The TypeScript
 * 5.9 checker is the backend today; the tsgo / TS7 follow-up plugs in here as
 * another PropsTypeChecker without touching componentService.
 */
export interface PropsTypeLocation {
  componentName: string;
  /** ABSOLUTE path to the component's own directory on disk. */
  componentDir: string;
}

export interface PropsTypeChecker {
  resolveProps(
    location: PropsTypeLocation,
    constraints: Map<string, Constraint>,
  ): Record<string, PropField>;
}

export const typescriptPropsTypeChecker: PropsTypeChecker = {
  resolveProps(location, constraints) {
    return resolvePropsFromChecker(location.componentName, location.componentDir, constraints);
  },
};
