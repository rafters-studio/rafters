/**
 * Motion Generator
 *
 * Generates motion tokens: duration tiers, easing curves, delays, keyframes,
 * animations, and the semantic motion layer.
 *
 * Duration tiers are perceptual RANGES a designer picks within (docs/MOTION.md),
 * NOT constants and NOT a ratio progression -- perception sets the bounds and the
 * emitted value is the tier's default until a designer moves it. Delays are the
 * one thing here that does progress: step-based (value = base * ratio^step) from
 * @rafters/math-utils. The semantic motion tokens (motion-semantic-*) carry a
 * full transition spec as JSON; the Tailwind exporter turns each into one
 * `motion-<name>` @utility.
 *
 * This generator is a pure function - it receives motion definitions as input.
 * Default motion values are provided by the orchestrator from defaults.ts. That
 * is now true of the WHOLE vocabulary: keyframes, animations and composite
 * presets were literal arrays in this file until 2026-07-23, so the claim held
 * for only four of the seven definition sets.
 */

import {
  ratioValue as computeRatioValue,
  progression as ratioStep,
  resolveRatio,
} from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import { DEFAULT_MOTION_INTENT_DURATIONS } from './defaults.js';
import type {
  AnimationDef,
  DelayDef,
  DurationDef,
  EasingDef,
  KeyframeContext,
  KeyframeDef,
  MotionCompositePreset,
  MotionSemanticMapping,
} from './defaults.js';
import {
  deriveBand,
  deriveCurve,
  deriveDuration,
  type IntentDurationMatrix,
  type MotionIntent,
} from './motion-derivation.js';
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
  delayDefs: Record<string, DelayDef>,
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

  // The per-intent starting points. Supplied by the orchestrator like every other
  // definition set, so a project can hand in its own matrix -- these are designer
  // inputs, not system constants.
  const intentDurations =
    (config as { intentDurations?: IntentDurationMatrix }).intentDurations ??
    DEFAULT_MOTION_INTENT_DURATIONS;

  const ratio = resolveRatio(progressionRatio);
  const ratioVal = computeRatioValue(ratio);
  const computeStep = (base: number, step: number) => ratioStep(ratio, base, step);

  // Base duration token
  tokens.push({
    name: 'motion-duration-base',
    value: `${baseTransitionDuration}ms`,
    category: 'motion',
    namespace: 'motion',
    semanticMeaning:
      'Legacy base transition duration. The perceptual duration scale (motion-duration-*) no longer derives from this; retained only as a reference value and delay-progression base.',
    usageContext: ['calculation-reference', 'delay-base'],
    progressionSystem: progressionRatio as 'minor-third',
    description: `Base duration (${baseTransitionDuration}ms). Delay tokens use ${progressionRatio} progression (ratio ${ratioVal}); duration tiers are perceptual RANGES a designer sets within and do not derive from this base.`,
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
    const durationMs = deriveDuration(scale, intent, durationDefs, intentDurations);
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

  // Generate delay tokens
  for (const [name, def] of Object.entries(delayDefs)) {
    let delayMs: number;
    let mathRelationship: string;

    if (def.step === 'none') {
      delayMs = 0;
      mathRelationship = '0';
    } else {
      // Use computeStep() for step-based calculation
      delayMs = Math.round(computeStep(baseTransitionDuration, def.step));
      mathRelationship =
        def.step === 0
          ? `${baseTransitionDuration}ms (base)`
          : `${baseTransitionDuration} × ${ratioVal}^${def.step}`;
    }

    tokens.push({
      name: `motion-delay-${name}`,
      value: delayMs === 0 ? '0ms' : `${delayMs}ms`,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: `${name.charAt(0).toUpperCase() + name.slice(1)} animation delay`,
      usageContext:
        name === 'none'
          ? ['immediate-response']
          : name === 'short'
            ? ['staggered-lists', 'sequential-elements']
            : name === 'medium'
              ? ['modal-content', 'after-transition']
              : ['emphasis', 'dramatic-reveals'],
      delayMs,
      mathRelationship,
      dependsOn: def.step === 'none' ? [] : ['motion-duration-base'],
      description: `Delay ${name}: ${delayMs}ms. Based on duration progression.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
    });
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
      durationRef = `var(--motion-duration-${anim.duration.tier})`;
      durationDependency = [`motion-duration-${anim.duration.tier}`];
    }

    const easingDef = requireDef(easingDefs, anim.curve, 'easing curve', `animation "${name}"`);
    const easingRef = `var(--motion-easing-${anim.curve})`;

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
        `motion-easing-${anim.curve}`,
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
      note: 'Duration tiers are perceptually derived literals (docs/MOTION.md); delay tokens use the workspace progression ratio from the base duration.',
    }),
    category: 'motion',
    namespace: 'motion',
    semanticMeaning: 'Metadata about the motion system',
    description: `Duration tiers are perceptual literals; delays use ${progressionRatio} progression from ${baseTransitionDuration}ms base.`,
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
  });

  return {
    namespace: 'motion',
    tokens,
  };
}
