/**
 * Semantic Color Generator
 *
 * Emits semantic color tokens with a real derivation tree: dependsOn[0] points
 * at the parent semantic (or family for top-of-tree tokens), and the binding
 * encodes the same derivation as a runtime hook for the cascade.
 *
 *   primary             dependsOn=[family]                binding: scale@family@N
 *   primary-foreground  dependsOn=[primary]               binding: contrast@primary,AAA,fallback=neutral
 *   primary-ring        dependsOn=[primary]               binding: state@primary,ring,surface=background
 *   primary-hover       dependsOn=[primary]               binding: state@primary,hover
 *   primary-active      dependsOn=[primary]               binding: state@primary,active
 *   primary-focus       dependsOn=[primary]               binding: state@primary,focus
 *   primary-disabled    dependsOn=[primary]               binding: state@primary,disabled
 *   primary-hover-fg    dependsOn=[primary-hover]         binding: contrast@primary-hover,AAA
 *
 * When the user runs `rafters set primary-hover {family:yellow,position:500}`,
 * cascadeFrom(primary-hover) walks dependents -- primary-hover-foreground
 * recomputes via contrast against yellow's accessibility ladder; primary-hover
 * itself anchors because the override is recorded as userOverride.
 *
 * Each {name}--dark token derives from its light token: top-of-tree roles via
 * mirror (light position mirrored, plus the designed elevation offset),
 * foregrounds and states via the --dark parent.
 *
 * dependsOn[1] is the {name}--dark token. The Tailwind exporter resolves it
 * to get the current dark ColorReference (cascade-derived, not static).
 */

import {
  POSITION_TO_INDEX,
  SCALE_POSITIONS,
  STATE_USES,
  type StateUse,
} from '@rafters/color-utils';
import type { Binding, ColorReference, Token } from '@rafters/shared';
import { DEFAULT_SEMANTIC_COLOR_MAPPINGS, type SemanticColorMapping } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';

const SCALE_LAST_INDEX = SCALE_POSITIONS.length - 1;
const FOREGROUND_SUFFIXES = ['-foreground', '-text', '-contrast'] as const;
const STATE_SUFFIXES = STATE_USES.map((s) => `-${s}` as const);
/** The role a foreground falls back to when its own family has no AA pair. */
const FALLBACK_FAMILY = 'neutral';

type Derivation =
  | { kind: 'scale'; family: string; scalePosition: number }
  | { kind: 'state'; from: string; stateType: StateUse }
  | { kind: 'contrast'; against: string; level: 'AAA' };

function toColorRef(mapping: SemanticColorMapping): ColorReference {
  return { family: mapping.light.family, position: mapping.light.position };
}

function toDarkColorRef(mapping: SemanticColorMapping): ColorReference {
  return { family: mapping.dark.family, position: mapping.dark.position };
}

/**
 * Pick the derivation for a semantic token from its name. The suffix wins
 * over the literal scale position in the mapping -- the mapping is the
 * designer's chosen position for top-of-tree tokens; suffixed variants
 * derive from their parent semantic instead.
 *
 * Pattern matching order matters: -hover-foreground must hit the foreground
 * branch and use 'primary-hover' as the parent, not the state branch.
 */
function deriveDerivation(
  name: string,
  lightRef: ColorReference,
  knownTokens: ReadonlySet<string>,
): Derivation {
  // Foreground branch first so `-hover-foreground` resolves to contrast
  // against `primary-hover` rather than as a state variant.
  for (const suffix of FOREGROUND_SUFFIXES) {
    if (name.endsWith(suffix)) {
      const parent = name.slice(0, -suffix.length);
      if (knownTokens.has(parent)) {
        return { kind: 'contrast', against: parent, level: 'AAA' };
      }
    }
  }

  for (const suffix of STATE_SUFFIXES) {
    if (name.endsWith(suffix)) {
      const parent = name.slice(0, -suffix.length);
      if (knownTokens.has(parent)) {
        return {
          kind: 'state',
          from: parent,
          stateType: suffix.slice(1) as StateUse,
        };
      }
    }
  }

  // No matching parent -- this is a top-of-tree token. Bind to the family
  // scale at the designer-chosen position.
  const scalePosition = POSITION_TO_INDEX[lightRef.position];
  if (scalePosition === undefined) {
    throw new Error(
      `semantic generator: token "${name}" has unknown scale position "${lightRef.position}"`,
    );
  }
  return { kind: 'scale', family: lightRef.family, scalePosition };
}

function derivationToBinding(derivation: Derivation): Binding {
  switch (derivation.kind) {
    case 'scale':
      return {
        plugin: 'scale',
        input: { familyName: derivation.family, scalePosition: derivation.scalePosition },
      };
    case 'state':
      return {
        plugin: 'state',
        input: stateInput(derivation.from, derivation.stateType),
      };
    case 'contrast':
      return {
        plugin: 'contrast',
        input: { against: derivation.against, level: derivation.level, fallback: FALLBACK_FAMILY },
      };
  }
}

/**
 * A state binding's input. A ring is measured, by default, against the page
 * background of its mode; a designer points it at any other surface by
 * rebinding it with a different `surface`.
 */
function stateInput(from: string, stateType: StateUse): Record<string, string> {
  if (stateType !== 'ring') return { from, stateType };
  const surface = from.endsWith('--dark') ? 'background--dark' : 'background';
  return { from, stateType, surface };
}

function derivationParent(derivation: Derivation, suffix = ''): string {
  switch (derivation.kind) {
    case 'scale':
      return derivation.family;
    case 'state':
      return `${derivation.from}${suffix}`;
    case 'contrast':
      return `${derivation.against}${suffix}`;
  }
}

function deriveDarkBinding(
  derivation: Derivation,
  parentName: string,
  lightRef: ColorReference,
  darkRef: ColorReference,
): Binding {
  switch (derivation.kind) {
    case 'scale': {
      // Top-of-tree roles derive dark FROM their light token: mirror the
      // light position, then shift by the designed elevation offset (#1638).
      // The offset is fixed at generation from the mapping's designed pair,
      // so defaults land exactly on the designed dark, and moving the light
      // token moves its dark counterpart. Mode-invariant roles (overlay)
      // carry the offset that maps light back onto itself.
      const lightIndex = POSITION_TO_INDEX[lightRef.position];
      const darkIndex = POSITION_TO_INDEX[darkRef.position];
      if (lightIndex === undefined || darkIndex === undefined) {
        throw new Error(
          `semantic generator: invalid designed position "${lightRef.position}"/"${darkRef.position}" for ${parentName}`,
        );
      }
      return {
        plugin: 'mirror',
        input: { fromToken: parentName, offset: darkIndex - (SCALE_LAST_INDEX - lightIndex) },
      };
    }
    case 'state':
      return {
        plugin: 'state',
        input: stateInput(`${derivation.from}--dark`, derivation.stateType),
      };
    case 'contrast':
      return {
        plugin: 'contrast',
        input: {
          against: `${derivation.against}--dark`,
          level: derivation.level,
          fallback: FALLBACK_FAMILY,
        },
      };
  }
}

export function generateSemanticTokens(_config: ResolvedSystemConfig): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const knownTokens = new Set(Object.keys(DEFAULT_SEMANTIC_COLOR_MAPPINGS));

  for (const [name, mapping] of Object.entries(DEFAULT_SEMANTIC_COLOR_MAPPINGS)) {
    const lightRef = toColorRef(mapping);
    const darkRef = toDarkColorRef(mapping);

    const derivation = deriveDerivation(name, lightRef, knownTokens);
    const binding = derivationToBinding(derivation);
    const parent = derivationParent(derivation);

    const darkName = `${name}--dark`;
    const darkBinding = deriveDarkBinding(derivation, name, lightRef, darkRef);
    const darkParent = derivation.kind === 'scale' ? name : derivationParent(derivation, '--dark');

    const dependsOn: string[] = [parent, darkName];

    tokens.push({
      name,
      value: lightRef,
      category: 'color',
      namespace: 'semantic',
      binding,
      semanticMeaning: mapping.meaning,
      usageContext: mapping.contexts,
      trustLevel: mapping.trustLevel,
      consequence: mapping.consequence,
      dependsOn,
      description: `${mapping.meaning}. Light: ${lightRef.family}-${lightRef.position}.`,
      generatedAt: timestamp,
      containerQueryAware: true,
      userOverride: null,
      usagePatterns: {
        do: mapping.do,
        never: mapping.never,
      },
      requiresConfirmation:
        mapping.consequence === 'destructive' || mapping.consequence === 'permanent',
    });

    tokens.push({
      name: darkName,
      value: darkRef,
      category: 'color',
      namespace: 'semantic',
      binding: darkBinding,
      dependsOn: [darkParent],
      description: `Dark mode counterpart of ${name}.`,
      generatedAt: timestamp,
      containerQueryAware: true,
      userOverride: null,
    });
  }

  return {
    namespace: 'semantic',
    tokens,
  };
}
