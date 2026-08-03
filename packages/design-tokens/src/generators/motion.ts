/**
 * Motion Generator
 *
 * Generates motion tokens: duration tiers, easing curves, delays, keyframes,
 * animations, and the semantic motion layer.
 *
 * Duration tiers are perceptual RANGES a designer picks within (docs/MOTION.md),
 * NOT constants and NOT a ratio progression -- perception sets the bounds and the
 * emitted value is the tier's default until a designer moves it. Delays no longer
 * progress from the base duration: `motion-delay-{none,short,medium,long}` were
 * ratio steps that no component ever referenced, and #1991 replaced them with the
 * `delay` namespace, whose members are relationships (hover-intent, linger,
 * choreo-step, stagger-step, skip) rather than steps on a curve.
 *
 * This generator also emits THE FIVE NAMESPACES as `rafters-<ns>-<member>` system
 * leaves -- duration, ease, delay, extent, period, of equal rank (ruling
 * 019fc49f). Those are the values; every other motion name in the emitted sheet
 * becomes a reference to one of them. The semantic motion tokens (motion-semantic-*) carry a
 * full transition spec as JSON; the Tailwind exporter turns each into one
 * `motion-<name>` @utility.
 *
 * This generator is a pure function - it receives motion definitions as input.
 * Default motion values are provided by the orchestrator from defaults.ts. That
 * is now true of the WHOLE vocabulary: keyframes, animations and composite
 * presets were literal arrays in this file until 2026-07-23, so the claim held
 * for only four of the seven definition sets.
 */

import { ratioValue as computeRatioValue, resolveRatio } from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import type {
  AnimationDef,
  DurationDef,
  EasingDef,
  KeyframeContext,
  KeyframeDef,
  MotionCompositePreset,
  MotionNamespaceMemberDef,
  MotionSemanticMapping,
  MotionValueProvenance,
} from './defaults.js';
import { deriveBand, deriveCurve, deriveDuration, type MotionIntent } from './motion-derivation.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { EASING_CURVES, MOTION_DURATION_SCALE } from './types.js';

/**
 * Resolve a named definition or fail loudly.
 *
 * Every one of these lookups previously did `if (!def) continue`, which drops the
 * token and lets the build stay green. The reference survives elsewhere: the
 * semantic path writes `motion-duration-<name>` into `dependsOn` and the exporter
 * emits `var(--duration-<name>)` unconditionally, so a typo produced syntactically
 * valid CSS that resolves to nothing -- no throw, no warning, no failing test, and
 * an element that simply does not animate.
 *
 * The name is authored data, so an unknown one is a definition error and belongs
 * at generation time. Listing the known names matters more than it looks: the
 * failure is almost always a near-miss (`easing` vs `ease`, a renamed curve), and
 * the fix is unguessable without the vocabulary in front of you.
 */
function requireDef<T>(defs: Record<string, T>, key: string, kind: string, owner: string): T {
  const def = defs[key];
  if (def === undefined) {
    throw new Error(
      `motion generator: ${owner} references unknown ${kind} "${key}". ` +
        `Known ${kind}s: ${Object.keys(defs).sort().join(', ')}.`,
    );
  }
  return def;
}

/** The five namespaces of equal rank (ruling 019fc49f, 2026-08-02). */
export const MOTION_NAMESPACES = ['duration', 'ease', 'delay', 'extent', 'period'] as const;
export type MotionNamespace = (typeof MOTION_NAMESPACES)[number];

/** The var/token name a namespace member owns: `rafters-<namespace>-<member>`. */
export function motionNamespaceTokenName(namespace: MotionNamespace, member: string): string {
  return `rafters-${namespace}-${member}`;
}

/**
 * Build one namespace leaf.
 *
 * `dependsOn` is empty on purpose: a leaf is the bottom of the graph. Provenance
 * rides in `description` rather than on a new `Token` field, because `TokenSchema`
 * does not change for this work -- the three new namespaces validate as plain
 * tokens, which is the property toy 9 was built to prove.
 */
function namespaceLeaf(input: {
  namespaceName: MotionNamespace;
  member: string;
  value: string;
  provenance: MotionValueProvenance;
  note: string;
  meaning: string;
  contexts: string[];
  timestamp: string;
}): Token {
  const { namespaceName, member, value, provenance, note, meaning, contexts, timestamp } = input;
  return {
    name: motionNamespaceTokenName(namespaceName, member),
    value,
    category: 'motion',
    namespace: 'motion',
    semanticMeaning: meaning,
    usageContext: contexts,
    dependsOn: [],
    description: `${namespaceName}-${member}: ${value} [provenance: ${provenance}] ${note} ${meaning}`,
    generatedAt: timestamp,
    containerQueryAware: false,
    // Mirrors the exporter's REDUCED_MOTION_ZEROED set: only duration and delay
    // are zeroed under prefers-reduced-motion. ease/extent are shaped BY a
    // duration, not zeroed themselves; period is exempt by law (loops slow,
    // never stop).
    reducedMotionAware: namespaceName === 'duration' || namespaceName === 'delay',
    userOverride: null,
    usagePatterns: {
      do: [`Use the generated utility \`${namespaceName}-${member}\``],
      never: [
        'Hardcode this value in a component',
        'Add a second name for the same idea -- one fast, everywhere, always',
      ],
    },
  };
}

/**
 * Generate motion tokens from provided definitions.
 *
 * Every part of the vocabulary arrives as a parameter. Keyframes and animations
 * used to be literal arrays in this function body while durations, easings,
 * delays and semantic mappings were passed in -- so the generator's own claim to
 * be a pure function over supplied definitions was only three-quarters true.
 * The pre-#1903 easing remap that kept those inline animations alive across the
 * curve rename is retired with them: the definitions now name the six curves
 * directly.
 */
export function generateMotionTokens(
  config: ResolvedSystemConfig,
  durationDefs: Record<string, DurationDef>,
  easingDefs: Record<string, EasingDef>,
  delayDefs: Record<string, MotionNamespaceMemberDef>,
  extentDefs: Record<string, MotionNamespaceMemberDef>,
  periodDefs: Record<string, MotionNamespaceMemberDef>,
  semanticMappings: Record<string, MotionSemanticMapping>,
  keyframeDefs: Record<string, KeyframeDef>,
  animationDefs: Record<string, AnimationDef>,
  compositePresets: Record<string, MotionCompositePreset>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { baseTransitionDuration, progressionRatio } = config;

  // The active intent. `ResolvedSystemConfig` has no `intent` field yet -- adding
  // one is cross-cutting, since intent drives spacing, radius and type as well as
  // motion, and widening the system config inside a motion change would be the
  // wrong seam. Read optionally with the neutral default so the derivation is
  // live now and the config work stays separable.
  const intent: MotionIntent = (config as { intent?: MotionIntent }).intent ?? 'efficient';

  const ratio = resolveRatio(progressionRatio);
  const ratioVal = computeRatioValue(ratio);

  // Base duration token
  tokens.push({
    name: 'motion-duration-base',
    value: `${baseTransitionDuration}ms`,
    category: 'motion',
    namespace: 'motion',
    semanticMeaning:
      'Legacy base transition duration. Nothing derives from this any more: the perceptual duration scale never did, and the ratio-stepped delay tokens that did were removed in #1991. Retained as a reference value only.',
    usageContext: ['calculation-reference'],
    progressionSystem: progressionRatio as 'minor-third',
    description: `Base duration (${baseTransitionDuration}ms). A reference value with no dependents: duration tiers are perceptual RANGES a designer sets within, and the delay namespace holds relationships rather than ratio steps.`,
    generatedAt: timestamp,
    containerQueryAware: false,
    reducedMotionAware: true,
    userOverride: null,
    usagePatterns: {
      do: ['Reference as the delay-progression base'],
      never: [
        'Assume the perceptual duration tiers derive from this -- they are ranges a designer sets within, bounded by perception, not computed from this base',
      ],
    },
  });

  // Generate duration tokens. Each tier is a perceptual RANGE the designer picks
  // within (docs/MOTION.md), NOT a constant and NOT a ratio progression. The
  // emitted value is the tier's default -- what ships at neutral intent, until a
  // designer moves it.
  //
  // The bounds are NOT emitted onto the token: they are system data, identical in
  // every install and invariant per project, so serializing them into every
  // consumer's token JSON would be storing a constant. Studio reads them from
  // DEFAULT_DURATION_DEFINITIONS to clamp its picker. Only the human-readable
  // range appears here, in `mathRelationship` and `description`.
  for (const scale of MOTION_DURATION_SCALE) {
    const def = durationDefs[scale];
    if (!def) continue;
    const scaleIndex = MOTION_DURATION_SCALE.indexOf(scale);
    // The band supplies the window; the intent picks a point inside it. This is
    // the link that makes an intent change move motion -- without it the tier
    // emits a constant and every downstream reference inherits the constant.
    // At the neutral intent this returns each tier's shipped default, so the
    // emitted system is unchanged until someone chooses a different intent.
    const durationMs = deriveDuration(scale, intent, durationDefs);
    const [rangeMin, rangeMax] = def.range;
    const bandNote = def.band ? ` Band: ${def.band}.` : '';
    const rangeNote = rangeMin === rangeMax ? ' Fixed.' : ` Range: ${rangeMin}-${rangeMax}ms.`;

    tokens.push({
      name: `motion-duration-${scale}`,
      value: `${durationMs}ms`,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: `${def.meaning}${bandNote}`,
      usageContext: def.contexts,
      scalePosition: scaleIndex,
      motionIntent: def.motionIntent,
      motionDuration: durationMs,
      mathRelationship: def.band
        ? `${durationMs}ms within ${rangeMin}-${rangeMax}ms (perceptual: ${def.band})`
        : `${durationMs}ms (fixed)`,
      dependsOn: [],
      description: `Duration ${scale}: ${durationMs}ms.${rangeNote}${bandNote} ${def.meaning}`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
      usagePatterns: {
        do:
          scale === 'instant'
            ? ['Use for prefers-reduced-motion', 'Use for disabled animations']
            : scale === 'micro' || scale === 'fast'
              ? ['Use for acknowledgment feedback (hover, focus, press)']
              : ['Use for communicative transitions where the user must track the change'],
        never: ['Ignore prefers-reduced-motion', 'Use slow animations for frequent actions'],
      },
    });
  }

  // Generate easing tokens
  for (const curve of EASING_CURVES) {
    const def = easingDefs[curve];
    if (!def) continue;

    tokens.push({
      name: `motion-easing-${curve}`,
      value: def.css,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: def.meaning,
      usageContext: def.contexts,
      easingCurve: def.curve,
      easingName: curve,
      description: `Easing ${curve}: ${def.css}. ${def.meaning}`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
      usagePatterns: {
        do:
          curve === 'linear'
            ? ['Use for progress and loading, where the system is working not interacting']
            : curve === 'enter'
              ? ['Use for anything entering the viewport']
              : curve === 'exit'
                ? ['Use for anything leaving the viewport']
                : ['Match the curve register to the interaction feel'],
        never: [
          'Use exit for entering (arrives reluctantly)',
          'Use linear for interactive spatial transitions (reads as mechanical)',
        ],
      },
    });
  }

  // THE FIVE NAMESPACES, as --rafters-* system leaves.
  //
  // duration and ease read the SAME definitions the tier tokens above read, so
  // there is exactly one moderate and one standard curve in the system. delay,
  // extent and period arrive as their own leaf tables because nothing derives
  // them -- a delay is a relationship, an extent is a geometry, a period is a
  // loop, and none of the three is a function of a perceptual band.
  //
  // These carry LITERALS. Everything else that names a motion value becomes a
  // reference to one of them in the exporter, which is what makes retuning a
  // leaf a one-line change to the emitted sheet.
  for (const scale of MOTION_DURATION_SCALE) {
    const def = durationDefs[scale];
    if (!def) continue;
    const durationMs = deriveDuration(scale, intent, durationDefs);
    tokens.push(
      namespaceLeaf({
        namespaceName: 'duration',
        member: scale,
        value: `${durationMs}ms`,
        provenance: 'baseline',
        note: def.band
          ? `Efficient baseline. ${durationMs}ms within the ${def.band} band (${def.range[0]}-${def.range[1]}ms).`
          : `Efficient baseline. Fixed at ${durationMs}ms.`,
        meaning: def.meaning,
        contexts: def.contexts,
        timestamp,
      }),
    );
  }

  for (const curve of EASING_CURVES) {
    const def = easingDefs[curve];
    if (!def) continue;
    tokens.push(
      namespaceLeaf({
        namespaceName: 'ease',
        member: curve,
        value: def.css,
        provenance: 'baseline',
        note: 'Efficient baseline curve.',
        meaning: def.meaning,
        contexts: def.contexts,
        timestamp,
      }),
    );
  }

  for (const [namespaceName, members] of [
    ['delay', delayDefs],
    ['extent', extentDefs],
    ['period', periodDefs],
  ] as const) {
    for (const [member, def] of Object.entries(members)) {
      tokens.push(
        namespaceLeaf({
          namespaceName,
          member,
          value: def.value,
          provenance: def.provenance,
          note: def.note,
          meaning: def.meaning,
          contexts: def.contexts,
          timestamp,
        }),
      );
    }
  }

  // Keyframe definitions - values derived from progression ratio for mathematical harmony
  // Compute animation values from ratio:
  // - scaleStart: 1/ratio^0.25 ≈ 0.955 for subtle entrance scale
  // - pingScale: ratio^3 ≈ 1.73 for expanding effect (rounded to 2 for simplicity)
  // - pulseOpacity: 1/ratio^4 ≈ 0.48 for gentle pulse midpoint
  // - bounceTranslate: 100/ratio^6 ≈ 33% for bounce height
  const ratioValue = ratioVal;
  const scaleStart = Math.round((1 / ratioValue ** 0.25) * 100) / 100; // ~0.95 for 1.2 ratio
  const pingScale = Math.round(ratioValue ** 3 * 10) / 10; // ~1.7 for 1.2 ratio, round to nearest 0.1
  const pulseOpacity = Math.round((1 / ratioValue ** 4) * 100) / 100; // ~0.48 for 1.2 ratio
  const bouncePercent = Math.round(100 / ratioValue ** 6); // ~33% for 1.2 ratio

  const keyframeContext: KeyframeContext = {
    scaleStart,
    pingScale,
    pulseOpacity,
    bouncePercent,
  };

  // Generate keyframe tokens
  for (const [name, kf] of Object.entries(keyframeDefs)) {
    tokens.push({
      name: `motion-keyframe-${name}`,
      value: kf.css(keyframeContext),
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: kf.meaning,
      usageContext: kf.contexts,
      keyframeName: name,
      description: `Keyframe ${name}: ${kf.meaning}`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
    });
  }

  // Generate animation tokens. `duration` is a tagged union rather than a string
  // sniffed for a trailing "s": a transition names a perceptual TIER, while a
  // continuous animation carries a LOOP PERIOD that no band governs.
  for (const [name, anim] of Object.entries(animationDefs)) {
    let durationValue: string;
    let durationRef: string;
    let durationDependency: string[];
    if ('loopPeriod' in anim.duration) {
      durationValue = anim.duration.loopPeriod;
      durationRef = anim.duration.loopPeriod;
      durationDependency = [];
    } else {
      const durationDef = requireDef(
        durationDefs,
        anim.duration.tier,
        'duration tier',
        `animation "${name}"`,
      );
      durationValue = `${durationDef.default}ms`;
      // The namespace LEAF, not `--motion-duration-*`. Nothing has ever declared
      // `--motion-duration-*` in either emission path, so every animation value
      // built on it carried a dangling var(): `animation: scale-out  ;` parses,
      // computes to a zero duration, and the animation silently never runs --
      // the failure mode reflection 019fb063 names. The leaves (`--rafters-
      // duration-*`, `--rafters-ease-*`) are declared by generateMotionNamespaceVars.
      durationRef = `var(--rafters-duration-${anim.duration.tier})`;
      durationDependency = [`rafters-duration-${anim.duration.tier}`];
    }

    const easingDef = requireDef(easingDefs, anim.curve, 'easing curve', `animation "${name}"`);
    // `easing` was renamed to `ease` when the five namespaces landed; the leaf
    // name is the one the sheet declares.
    const easingRef = `var(--rafters-ease-${anim.curve})`;

    const iterations = anim.iterations || '';
    const animValue = iterations
      ? `${anim.keyframe} ${durationRef} ${easingRef} ${iterations}`
      : `${anim.keyframe} ${durationRef} ${easingRef}`;

    tokens.push({
      name: `motion-animation-${name}`,
      value: animValue,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: anim.meaning,
      usageContext: anim.contexts,
      animationName: name,
      keyframeName: anim.keyframe,
      animationDuration: durationValue,
      animationEasing: easingDef.css,
      animationIterations: anim.iterations || '1',
      dependsOn: [
        `motion-keyframe-${anim.keyframe}`,
        ...durationDependency,
        `rafters-ease-${anim.curve}`,
      ],
      description: `Animation ${name}: ${anim.meaning}`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
    });
  }

  // Composite presets -- retained for backwards compatibility; the semantic
  // motion tokens are the current expression of the same idea.
  for (const [name, comp] of Object.entries(compositePresets)) {
    const durationDef = requireDef(
      durationDefs,
      comp.durationTier,
      'duration tier',
      `composite preset "${name}"`,
    );
    const easingDef = requireDef(
      easingDefs,
      comp.curve,
      'easing curve',
      `composite preset "${name}"`,
    );

    const durationMs = durationDef.default;

    tokens.push({
      name,
      value: `${durationMs}ms ${easingDef.css}`,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: comp.meaning,
      usageContext: comp.contexts,
      motionDuration: durationMs,
      easingCurve: easingDef.curve,
      easingName: comp.curve as (typeof EASING_CURVES)[number],
      dependsOn: [`motion-duration-${comp.durationTier}`, `motion-easing-${comp.curve}`],
      description: `${comp.meaning}. Combines ${comp.durationTier} duration with ${comp.curve} easing.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
    });
  }

  // Semantic motion tokens (docs/MOTION.md semantic table). Each carries its
  // full transition spec as JSON -- the exporter reads these to emit one
  // `motion-<name>` @utility per token (property + duration + easing longhand,
  // with a prefers-reduced-motion override). JSON value => the @theme motion
  // loop skips it (tokenValueToCSS returns null for JSON), so it never leaks a
  // raw custom property. Named after typography-composite's single-source model.
  for (const [name, mapping] of Object.entries(semanticMappings)) {
    // Tier and curve are DERIVED, not read. The mapping declares how far the
    // thing travels; perception decides which band that lands in and character
    // decides the curve. Nothing here names a tier, so there is no place left to
    // bake a choice -- which is the whole point of the exercise.
    const durationTier = deriveBand(mapping.category, mapping.travel, mapping.band);
    const curve = deriveCurve(mapping.category, mapping.travel, intent, mapping.curve);

    // Still validate, for the same reason as the other paths: the derived names
    // flow into dependsOn and into a var() the exporter emits unconditionally, so
    // a name that does not resolve would render nothing and fail nowhere.
    requireDef(durationDefs, durationTier, 'duration tier', `semantic motion "${name}"`);
    requireDef(easingDefs, curve, 'easing curve', `semantic motion "${name}"`);

    tokens.push({
      name: `motion-semantic-${name}`,
      value: JSON.stringify({
        properties: mapping.properties,
        durationTier,
        curve,
        reducedMotion: mapping.reducedMotion,
      }),
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: `${mapping.meaning} ${mapping.sizeReasoning}`,
      usageContext: mapping.contexts,
      motionIntent:
        mapping.category === 'enter'
          ? 'enter'
          : mapping.category === 'exit'
            ? 'exit'
            : 'transition',
      generateUtilityClass: true,
      dependsOn: [`motion-duration-${durationTier}`, `motion-easing-${curve}`],
      description: `Semantic motion motion-${name}: ${mapping.properties.join(', ')} over ${durationTier} with ${curve}. ${mapping.sizeReasoning}`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
      usagePatterns: {
        do: [`Apply class motion-${name} and let a state/presence change trigger the transition`],
        never: ['Hardcode a raw numeric duration in place of this token'],
      },
    });
  }

  // Motion metadata
  tokens.push({
    name: 'motion-progression',
    value: JSON.stringify({
      ratio: progressionRatio,
      ratioValue: ratioVal,
      baseDuration: baseTransitionDuration,
      note: 'Duration tiers are perceptually derived literals (docs/MOTION.md); the five motion namespaces are authored leaves and nothing in motion uses the progression ratio.',
    }),
    category: 'motion',
    namespace: 'motion',
    semanticMeaning: 'Metadata about the motion system',
    description: `Duration tiers are perceptual literals; the five motion namespaces (duration, ease, delay, extent, period) are authored leaves. The ${progressionRatio} progression and the ${baseTransitionDuration}ms base are recorded here but no longer drive any motion value.`,
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
  });

  return {
    namespace: 'motion',
    tokens,
  };
}
