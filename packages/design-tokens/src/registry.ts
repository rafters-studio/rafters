/**
 * TokenRegistry - Core data structure for design token storage and retrieval
 *
 * Provides O(1) get/set operations with intelligent metadata preservation
 * Built for AI-first design token system with comprehensive intelligence metadata
 * Automatically enriches color tokens with intelligence from Color Intelligence API
 */

import {
  COMPUTED,
  type ColorReference,
  type ColorValue,
  type ComputedSymbol,
  type Token,
  type TypographyElementOverride,
  TypographyElementOverrideSchema,
} from '@rafters/shared';
import { TokenDependencyGraph } from './dependencies';
import { resolveColorReference } from './oklch-to-css';
import type { PersistenceAdapter } from './persistence/types';
import { cascade, regenerate } from './plugins';
import { findDarkCounterpartIndex, INDEX_TO_POSITION, POSITION_TO_INDEX } from './scale-positions';

// Event types (inline to replace deleted types/events.js)
export type TokenChangeEvent =
  | {
      type: 'add' | 'update' | 'delete' | 'token-changed';
      tokenName: string;
      oldValue?: string | unknown;
      newValue?: string | unknown;
      timestamp: number;
    }
  | {
      type: 'tokens-batch-changed';
      changes: Array<{
        type: 'add' | 'update' | 'delete' | 'token-changed';
        tokenName: string;
        oldValue?: string | unknown;
        newValue?: string | unknown;
        timestamp: number;
      }>;
      timestamp: number;
    }
  | {
      type: 'registry-initialized';
      tokenCount: number;
      timestamp: number;
    };

export type RegistryChangeCallback = (event: TokenChangeEvent) => void | Promise<void>;

export class TokenRegistry {
  private tokens: Map<string, Token> = new Map();
  public dependencyGraph: TokenDependencyGraph = new TokenDependencyGraph();
  private changeCallback?: RegistryChangeCallback;
  private adapter?: PersistenceAdapter;
  private dirtyNamespaces = new Set<string>();
  private typographyOverrides: Map<string, TypographyElementOverride> = new Map();

  constructor(initialTokens?: Token[]) {
    if (initialTokens) {
      // First pass: add all tokens
      for (const token of initialTokens) {
        this.addToken(token);
      }
      // Second pass: populate dependency graph now that all tokens exist
      this.populateDependencyGraph();
    }
  }

  /**
   * Populate dependency graph from tokens that have dependsOn/generationRule.
   * Called after bulk loading to ensure all dependency targets exist.
   */
  private populateDependencyGraph(): void {
    for (const token of this.tokens.values()) {
      if (token.dependsOn && token.dependsOn.length > 0 && token.generationRule) {
        const missingDeps = token.dependsOn.filter((dep) => !this.tokens.has(dep));
        if (missingDeps.length > 0) {
          console.warn(
            `[TokenRegistry] Token "${token.name}" skipped in dependency graph: ` +
              `missing dependencies [${missingDeps.join(', ')}]`,
          );
          continue;
        }
        this.dependencyGraph.addDependency(token.name, token.dependsOn, token.generationRule);
      }
    }
  }

  /**
   * Set persistence adapter for auto-save on changes
   */
  setAdapter(adapter: PersistenceAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Mark a namespace as needing persistence
   */
  private markDirty(namespace: string): void {
    this.dirtyNamespaces.add(namespace);
  }

  /**
   * Persist dirty namespaces to storage
   */
  private async persist(): Promise<void> {
    if (!this.adapter || this.dirtyNamespaces.size === 0) return;

    // Collect tokens from dirty namespaces only
    const tokensToSave: Token[] = [];
    for (const ns of this.dirtyNamespaces) {
      tokensToSave.push(...this.list({ namespace: ns }));
    }

    await this.adapter.save(tokensToSave);
    this.dirtyNamespaces.clear();
  }

  /**
   * Add a token to the registry, enriching color tokens with intelligence if needed
   */
  private addToken(token: Token): void {
    // For now, store as-is. Async enrichment will be added via enrichColorToken method
    this.tokens.set(token.name, token);
  }

  /**
   * Public method to add a token to the registry.
   * Also populates the dependency graph if token has dependencies and all targets exist.
   * Used during initialization - no cascade, no events.
   *
   * NOTE: Dependencies must be added before dependent tokens. For bulk loading with
   * forward references, use the constructor which does a two-pass resolution.
   */
  add(token: Token): void {
    this.addToken(token);

    // Populate dependency graph from token's dependency metadata
    if (token.dependsOn && token.dependsOn.length > 0 && token.generationRule) {
      const missingDeps = token.dependsOn.filter((dep) => !this.tokens.has(dep));
      if (missingDeps.length > 0) {
        console.warn(
          `[TokenRegistry] Token "${token.name}" added but dependency graph not populated: ` +
            `missing [${missingDeps.join(', ')}]. Add dependencies first or use constructor.`,
        );
        return;
      }
      this.dependencyGraph.addDependency(token.name, token.dependsOn, token.generationRule);
    }
  }

  /**
   * Remove a token from the registry and clean up all dependencies
   */
  remove(tokenName: string): boolean {
    // Remove from dependency graph first
    this.dependencyGraph.removeToken(tokenName);

    // Remove from token registry
    return this.tokens.delete(tokenName);
  }

  /**
   * Clear all tokens from the registry and dependency graph
   */
  clear(): void {
    this.tokens.clear();
    this.dependencyGraph.clear();
  }

  get(tokenName: string): Token | undefined {
    return this.tokens.get(tokenName);
  }

  /**
   * Set change callback for real-time notifications
   */
  setChangeCallback(callback: RegistryChangeCallback): void {
    this.changeCallback = callback;
  }

  /**
   * Update a single token's value and fire change event
   */
  updateToken(name: string, value: Token['value']): void {
    const oldValue = this.tokens.get(name)?.value;
    const existingToken = this.tokens.get(name);

    if (!existingToken) {
      throw new Error(`Token "${name}" does not exist. Cannot update non-existent token.`);
    }

    // Update the token
    const updatedToken: Token = {
      ...existingToken,
      value,
    };

    this.tokens.set(name, updatedToken);

    // Fire change callback
    if (this.changeCallback) {
      this.changeCallback({
        type: 'token-changed',
        tokenName: name,
        oldValue,
        newValue: value,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Clear a token's override and restore to computed/previous value.
   * - Derived tokens: regenerate from rule
   * - Root tokens: restore previousValue from override
   */
  private async clearOverride(tokenName: string): Promise<void> {
    const existingToken = this.tokens.get(tokenName);
    if (!existingToken) {
      throw new Error(`Token "${tokenName}" does not exist`);
    }

    if (!existingToken.userOverride) {
      return; // No override to clear
    }

    const rule = this.dependencyGraph.getGenerationRule(tokenName);

    if (rule) {
      // Derived token: remove override and regenerate from rule
      const { userOverride: _, ...tokenWithoutOverride } = existingToken;
      this.tokens.set(tokenName, tokenWithoutOverride as Token);
      await regenerate(this, tokenName);
    } else {
      // Root token: restore previousValue
      const { previousValue } = existingToken.userOverride;
      if (previousValue === undefined) {
        throw new Error(
          `Cannot clear override for root token "${tokenName}": no previousValue to restore`,
        );
      }
      const { userOverride: _, ...tokenWithoutOverride } = existingToken;
      this.tokens.set(tokenName, {
        ...tokenWithoutOverride,
        value: previousValue,
      } as Token);
    }
  }

  /**
   * Update multiple tokens efficiently and fire batch change event
   */
  updateMultipleTokens(updates: Array<{ name: string; value: string }>): void {
    const changes: Array<{
      type: 'add' | 'update' | 'delete' | 'token-changed';
      tokenName: string;
      oldValue?: string | unknown;
      newValue?: string | unknown;
      timestamp: number;
    }> = [];

    for (const { name, value } of updates) {
      const oldValue = this.tokens.get(name)?.value;
      const existingToken = this.tokens.get(name);

      if (!existingToken) {
        throw new Error(`Token "${name}" does not exist. Cannot update non-existent token.`);
      }

      const updatedToken: Token = {
        ...existingToken,
        value,
      };

      this.tokens.set(name, updatedToken);

      changes.push({
        type: 'token-changed',
        tokenName: name,
        oldValue,
        newValue: value,
        timestamp: Date.now(),
      });
    }

    if (this.changeCallback) {
      this.changeCallback({
        type: 'tokens-batch-changed',
        changes,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Fire registry initialized event
   */
  initializeRegistry(tokenCount: number): void {
    if (this.changeCallback) {
      this.changeCallback({
        type: 'registry-initialized',
        tokenCount,
        timestamp: Date.now(),
      });
    }
  }

  async set(tokenName: string, value: Token['value'] | ComputedSymbol): Promise<void> {
    const token = this.tokens.get(tokenName);
    if (token) this.markDirty(token.namespace);

    // COMPUTED = clear override and restore to computed/previous value
    if (value === COMPUTED) {
      const oldValue = this.tokens.get(tokenName)?.value;
      await this.clearOverride(tokenName);
      const newValue = this.tokens.get(tokenName)?.value;

      // Fire change event if value actually changed
      if (this.changeCallback && oldValue !== newValue) {
        this.changeCallback({
          type: 'token-changed',
          tokenName,
          oldValue,
          newValue,
          timestamp: Date.now(),
        });
      }

      // Regenerate dependents
      await this.regenerateDependents(tokenName);
      await this.persist();
      return;
    }

    // Use updateToken for consistency and event firing
    this.updateToken(tokenName, value);

    // Regenerate all dependent tokens
    await this.regenerateDependents(tokenName);

    // Persist dirty namespaces
    await this.persist();
  }

  /**
   * Update a token with full token data (not just value).
   * Use this when you need to update metadata fields like trustLevel, description, etc.
   * Handles cascade + persist like set().
   */
  async setToken(token: Token): Promise<void> {
    const existingToken = this.tokens.get(token.name);
    if (!existingToken) {
      throw new Error(`Token "${token.name}" does not exist. Use add() for new tokens.`);
    }

    const oldValue = existingToken.value;
    const valueChanged = JSON.stringify(oldValue) !== JSON.stringify(token.value);

    // Mark namespace dirty for persistence
    this.markDirty(token.namespace);

    // Update the full token
    this.tokens.set(token.name, token);

    // Fire change callback
    if (this.changeCallback) {
      this.changeCallback({
        type: 'token-changed',
        tokenName: token.name,
        oldValue,
        newValue: token.value,
        timestamp: Date.now(),
      });
    }

    // Regenerate dependents only if value changed
    if (valueChanged) {
      await this.regenerateDependents(token.name);
    }

    // Persist dirty namespaces
    await this.persist();
  }

  /**
   * Batch update multiple tokens with single persist.
   * More efficient than calling setToken() multiple times.
   * All tokens must already exist in the registry.
   */
  async setTokens(tokens: Token[]): Promise<void> {
    const tokensToRegenerate: string[] = [];

    for (const token of tokens) {
      const existingToken = this.tokens.get(token.name);
      if (!existingToken) {
        throw new Error(`Token "${token.name}" does not exist. Use add() for new tokens.`);
      }

      const oldValue = existingToken.value;
      const valueChanged = JSON.stringify(oldValue) !== JSON.stringify(token.value);

      // Mark namespace dirty for persistence
      this.markDirty(token.namespace);

      // Update the full token
      this.tokens.set(token.name, token);

      // Fire change callback
      if (this.changeCallback) {
        this.changeCallback({
          type: 'token-changed',
          tokenName: token.name,
          oldValue,
          newValue: token.value,
          timestamp: Date.now(),
        });
      }

      // Track tokens that need dependent regeneration
      if (valueChanged) {
        tokensToRegenerate.push(token.name);
      }
    }

    // Regenerate dependents for all changed tokens
    for (const tokenName of tokensToRegenerate) {
      await this.regenerateDependents(tokenName);
    }

    // Single persist at the end
    await this.persist();
  }

  has(tokenName: string): boolean {
    return this.tokens.has(tokenName);
  }

  list(filter?: { category?: string; namespace?: string }): Token[] {
    const allTokens = Array.from(this.tokens.values());

    if (!filter) {
      return allTokens;
    }

    return allTokens.filter((token) => {
      if (filter.category && token.category !== filter.category) {
        return false;
      }
      if (filter.namespace && token.namespace !== filter.namespace) {
        return false;
      }
      return true;
    });
  }

  size(): number {
    return this.tokens.size;
  }

  /**
   * Get all tokens that depend on the specified token
   */
  getDependents(tokenName: string): string[] {
    return this.dependencyGraph.getDependents(tokenName);
  }

  /**
   * Get all tokens this token depends on
   */
  getDependencies(tokenName: string): string[] {
    return this.dependencyGraph.getDependencies(tokenName);
  }

  /**
   * Get the generation rule string for a token (if any).
   * Used by plugins.regenerate to fetch the rule without exposing the graph.
   */
  getGenerationRule(tokenName: string): string | undefined {
    return this.dependencyGraph.getGenerationRule(tokenName);
  }

  /**
   * Return the dependents of changedTokenName in topological order.
   * Used by plugins.cascade to walk the graph without skipping levels.
   */
  topologicalDependents(changedTokenName: string): string[] {
    const dependents = this.dependencyGraph.getDependents(changedTokenName);
    if (dependents.length === 0) return [];
    const sortedAll = this.dependencyGraph.topologicalSort();
    return sortedAll.filter((name) => dependents.includes(name));
  }

  /**
   * Add dependency relationship with generation rule
   */
  addDependency(tokenName: string, dependsOn: string[], rule: string): void {
    // Validate all tokens exist
    if (!this.tokens.has(tokenName)) {
      throw new Error(`Token ${tokenName} does not exist`);
    }

    for (const dep of dependsOn) {
      if (!this.tokens.has(dep)) {
        throw new Error(`Dependency token ${dep} does not exist`);
      }
    }

    this.dependencyGraph.addDependency(tokenName, dependsOn, rule);
  }

  /**
   * Get dependency information including generation rule
   */
  getDependencyInfo(tokenName: string): { dependsOn: string[]; rule?: string } | null {
    const dependsOn = this.getDependencies(tokenName);
    const rule = this.dependencyGraph.getGenerationRule(tokenName);

    if (dependsOn.length === 0 && !rule) {
      return null;
    }

    return {
      dependsOn,
      ...(rule ? { rule } : {}),
    };
  }

  /**
   * Regenerate all dependent tokens when a dependency changes.
   * Thin wrapper over cascade() from plugins.ts.
   * Aggregate cascade errors propagate up through set/setToken/setTokens.
   */
  private async regenerateDependents(changedTokenName: string): Promise<void> {
    const dependents = this.dependencyGraph.getDependents(changedTokenName);
    if (dependents.length === 0) return;
    await cascade(this, changedTokenName);
  }

  /**
   * Apply a computed value to a token without re-entering cascade.
   * Called by plugins.regenerate inside the cascade loop.
   *
   * If the token has a userOverride:
   * - Sets computedValue only (preserves the human's value decision)
   *
   * If no override:
   * - Sets value + computedValue
   *
   * For ColorReference outputs, also updates dependsOn[0]/[1] so the
   * Tailwind exporter can resolve dark mode counterparts.
   *
   * Fires the change event. Does NOT recurse into cascade.
   */
  async applyComputed(tokenName: string, newValue: string | ColorReference): Promise<void> {
    const existingToken = this.tokens.get(tokenName);
    if (!existingToken) return;

    this.markDirty(existingToken.namespace);

    let resolvedValue: string | ColorReference = newValue;
    let updatedDependsOn = existingToken.dependsOn;

    if (typeof resolvedValue === 'object' && 'family' in resolvedValue) {
      const ref = resolvedValue as ColorReference;
      // Semantic tokens store ColorReferences; position tokens store CSS strings.
      const isSemanticToken = existingToken.namespace === 'semantic';

      if (isSemanticToken) {
        // Semantic token path: update dependsOn[0]=family, dependsOn[1]=dark counterpart.
        // findDarkCounterpart requires WCAG data from the family ColorValue.
        const darkTokenName = this.findDarkCounterpart(ref, existingToken.dependsOn);
        updatedDependsOn = [ref.family, darkTokenName];
        // Keep resolvedValue as ColorReference (semantic tokens store refs)
      } else {
        // Position token path: stored value is a CSS string.
        // Resolve the ColorReference to a CSS oklch() string immediately.
        // Do NOT update dependsOn (position tokens only depend on their family).
        //
        // During bulk load the family can be absent; that's expected and the
        // ColorReference is kept so a later export resolves it. Any other
        // resolver failure (malformed scale, invalid position) is a real bug
        // and must propagate rather than silently leave a ColorReference where
        // a CSS string was promised.
        try {
          resolvedValue = resolveColorReference(ref, (name) => this.tokens.get(name));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (!message.startsWith('Family token not found')) throw err;
        }
      }
    }

    const oldValue = existingToken.value;

    if (existingToken.userOverride) {
      this.tokens.set(tokenName, {
        ...existingToken,
        computedValue: resolvedValue,
        dependsOn: updatedDependsOn,
      });
    } else {
      this.tokens.set(tokenName, {
        ...existingToken,
        value: resolvedValue,
        computedValue: resolvedValue,
        dependsOn: updatedDependsOn,
      });
    }

    if (this.changeCallback) {
      this.changeCallback({
        type: 'token-changed',
        tokenName,
        oldValue,
        newValue: resolvedValue,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Find the dark mode counterpart for a light mode ColorReference.
   * Uses the WCAG accessibility matrix from the color family's ColorValue.
   * Falls back to mathematical inversion if no WCAG data available.
   */
  private findDarkCounterpart(lightRef: ColorReference, _existingDependsOn?: string[]): string {
    const lightIdx = POSITION_TO_INDEX[lightRef.position];
    if (lightIdx === undefined) {
      throw new Error(
        `Invalid position "${lightRef.position}" in ColorReference for family "${lightRef.family}". ` +
          `Expected one of: ${Object.keys(POSITION_TO_INDEX).join(', ')}`,
      );
    }

    const familyToken = this.tokens.get(lightRef.family);
    if (!familyToken || typeof familyToken.value !== 'object' || !('scale' in familyToken.value)) {
      const fallbackIdx = Math.max(0, Math.min(10, 10 - lightIdx));
      return `${lightRef.family}-${INDEX_TO_POSITION[fallbackIdx] ?? '500'}`;
    }

    const colorValue = familyToken.value as ColorValue;
    const darkIdx = findDarkCounterpartIndex(lightIdx, colorValue);
    const darkPos = INDEX_TO_POSITION[darkIdx] ?? '500';
    return `${lightRef.family}-${darkPos}`;
  }

  /**
   * Add multiple dependencies efficiently using bulk operations
   */
  addDependencies(
    dependencies: Array<{ tokenName: string; dependsOn: string[]; rule: string }>,
  ): void {
    // Validate all tokens exist first
    for (const { tokenName, dependsOn } of dependencies) {
      if (!this.tokens.has(tokenName)) {
        throw new Error(`Token ${tokenName} does not exist`);
      }

      for (const dep of dependsOn) {
        if (!this.tokens.has(dep)) {
          throw new Error(`Dependency token ${dep} does not exist`);
        }
      }
    }

    // Use bulk operation for better performance
    this.dependencyGraph.addDependencies(dependencies);
  }

  /**
   * Get comprehensive metrics about the token system
   */
  getMetrics(): {
    totalTokens: number;
    totalDependencies: number;
    avgDependenciesPerToken: number;
    maxDependencies: number;
    isolated: string[];
  } {
    return this.dependencyGraph.getMetrics();
  }

  /**
   * Get all tokens in the registry
   */
  getAllTokens(): string[] {
    return Array.from(this.tokens.keys());
  }

  /**
   * Get all tokens from the dependency graph (includes both tokens and their dependencies)
   */
  getAllTokensFromGraph(): string[] {
    return this.dependencyGraph.getAllTokens();
  }

  /**
   * Validate the integrity of the token registry and dependency graph
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate dependency graph integrity
    const graphValidation = this.dependencyGraph.validate();
    errors.push(...graphValidation.errors);

    // Validate that all tokens in dependency graph exist in registry
    const graphTokens = this.dependencyGraph.getAllTokens();
    for (const tokenName of graphTokens) {
      if (!this.tokens.has(tokenName)) {
        errors.push(`Token ${tokenName} exists in dependency graph but not in registry`);
      }
    }

    // Validate that all token dependencies exist
    for (const tokenName of this.tokens.keys()) {
      const dependencies = this.dependencyGraph.getDependencies(tokenName);
      for (const dep of dependencies) {
        if (!this.tokens.has(dep)) {
          errors.push(`Token ${tokenName} depends on ${dep} which doesn't exist in registry`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get topological order of all tokens for regeneration
   */
  getTopologicalOrder(): string[] {
    return this.dependencyGraph.topologicalSort();
  }

  /**
   * Add dependency with automatic rule parsing and validation
   */
  addDependencyWithRuleParsing(
    tokenName: string,
    rule: string,
    explicitDependsOn: string[] = [],
  ): void {
    // Validate token exists
    if (!this.tokens.has(tokenName)) {
      throw new Error(`Token ${tokenName} does not exist`);
    }

    // Validate explicit dependencies exist
    for (const dep of explicitDependsOn) {
      if (!this.tokens.has(dep)) {
        throw new Error(`Dependency token ${dep} does not exist`);
      }
    }

    // Use dependency graph's rule parsing functionality
    this.dependencyGraph.addDependencyWithRuleParsing(tokenName, rule, explicitDependsOn);
  }

  /**
   * Update a token's generation rule
   */
  updateTokenRule(tokenName: string, newRule: string): void {
    // Validate token exists
    if (!this.tokens.has(tokenName)) {
      throw new Error(`Token ${tokenName} does not exist`);
    }

    // Use dependency graph's rule update functionality
    this.dependencyGraph.updateTokenRule(tokenName, newRule);
  }

  /**
   * Validate a generation rule syntax
   */
  validateRule(rule: string): { isValid: boolean; error?: string } {
    return this.dependencyGraph.validateRule(rule);
  }

  /**
   * Get all tokens with generation rules
   */
  getTokensWithRules(): Array<{ tokenName: string; rule: string; dependencies: string[] }> {
    return this.dependencyGraph.getTokensWithRules();
  }

  /**
   * Validate all generation rules in the token system
   */
  validateAllRules(): { isValid: boolean; errors: Array<{ tokenName: string; error: string }> } {
    return this.dependencyGraph.validateAllRules();
  }

  /**
   * Get statistics about rule types used in the system
   */
  getRuleTypeStats(): { [ruleType: string]: number } {
    return this.dependencyGraph.getRuleTypeStats();
  }

  /**
   * Find tokens that use a specific rule type
   */
  getTokensByRuleType(ruleType: string): string[] {
    return this.dependencyGraph.getTokensByRuleType(ruleType);
  }

  /**
   * Parse rule dependencies for analysis
   */
  parseRuleDependencies(rule: string): string[] {
    return this.dependencyGraph.parseRuleDependencies(rule);
  }

  // ===========================================================================
  // Typography Element Overrides
  // ===========================================================================

  /**
   * Add a typography element override with why-gate enforcement.
   * Stores an override for a specific HTML element that diverges from its
   * assigned typography role.
   *
   * @throws If why field is empty (why-gate enforcement)
   * @throws If role references a non-existent typography composite token
   */
  addTypographyOverride(override: TypographyElementOverride): void {
    // Validate with Zod schema (enforces non-empty why)
    const parsed = TypographyElementOverrideSchema.parse(override);

    // Validate that the role exists as a typography-composite token
    const roleToken = this.get(parsed.role);
    if (!roleToken || roleToken.namespace !== 'typography-composite') {
      throw new Error(
        `Typography override for "${parsed.element}" references unknown role "${parsed.role}". ` +
          'Role must be an existing typography-composite token.',
      );
    }

    // Typography accessibility validation is deferred to #1246 (typography package).
    // The why-gate (non-empty reason) and role-token-exists checks above are sufficient for now.

    this.typographyOverrides.set(parsed.element, parsed);
  }

  /**
   * Get all typography element overrides.
   */
  getTypographyOverrides(): TypographyElementOverride[] {
    return Array.from(this.typographyOverrides.values());
  }

  /**
   * Remove a typography element override.
   */
  removeTypographyOverride(element: string): boolean {
    return this.typographyOverrides.delete(element);
  }

  /**
   * Enhanced validation that includes both registry and rule validation
   */
  validateComplete(): {
    isValid: boolean;
    errors: string[];
    ruleErrors: Array<{ tokenName: string; error: string }>;
  } {
    const registryValidation = this.validate();
    const ruleValidation = this.validateAllRules();

    return {
      isValid: registryValidation.isValid && ruleValidation.isValid,
      errors: registryValidation.errors,
      ruleErrors: ruleValidation.errors,
    };
  }
}
