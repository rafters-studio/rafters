/**
 * Motion Generator
 *
 * Generates motion tokens: duration tiers, easing curves, delays, keyframes,
 * animations, and the semantic motion layer.
 *
 * Duration tiers are PERCEPTUALLY DERIVED literals (docs/MOTION.md) -- fitted to
 * how the visual system tracks motion, NOT a ratio progression. Delays still use
 * step-based progression (value = base * ratio^step) from @rafters/math-utils.
 * The semantic motion tokens (motion-semantic-*) carry a full transition spec as
 * JSON; the Tailwind exporter turns each into one `motion-<name>` @utility.
 *
 * This generator is a pure function - it receives motion definitions as input.
 * Default motion values are provided by the orchestrator from defaults.ts.
 */

import {
  ratioValue as computeRatioValue,
  progression as ratioStep,
  resolveRatio,
} from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import type { DelayDef, DurationDef, EasingDef, MotionSemanticMapping } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { EASING_CURVES, MOTION_DURATION_SCALE } from './types.js';

/**
 * Legacy easing keys (the pre-#1903 vocabulary) mapped to the six named curves.
 * The retained looping/enter-exit @keyframes animations reference these old keys;
 * remapping keeps them alive across the curve rename instead of silently dropping
 * them (an `easingDefs[oldKey]` miss would `continue` and vanish the animation).
 */
const LEGACY_EASING_REMAP: Record<string, string> = {
  linear: 'linear',
  'ease-out': 'enter',
  'ease-in': 'exit',
  'ease-in-out': 'standard',
  spring: 'spring-snappy',
};

/**
 * Generate motion tokens from provided definitions
 */
export function generateMotionTokens(
  config: ResolvedSystemConfig,
  durationDefs: Record<string, DurationDef>,
  easingDefs: Record<string, EasingDef>,
  delayDefs: Record<string, DelayDef>,
  semanticMappings: Record<string, MotionSemanticMapping>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { baseTransitionDuration, progressionRatio } = config;

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
    description: `Base duration (${baseTransitionDuration}ms). Delay tokens use ${progressionRatio} progression (ratio ${ratioVal}); duration tiers are perceptually derived literals.`,
    generatedAt: timestamp,
    containerQueryAware: false,
    reducedMotionAware: true,
    userOverride: null,
    usagePatterns: {
      do: ['Reference as the delay-progression base'],
      never: ['Assume the perceptual duration tiers derive from this'],
    },
  });

  // Generate duration tokens. Values are perceptually derived literals
  // (docs/MOTION.md), NOT a ratio progression -- each tier records its band.
  for (const scale of MOTION_DURATION_SCALE) {
    const def = durationDefs[scale];
    if (!def) continue;
    const scaleIndex = MOTION_DURATION_SCALE.indexOf(scale);
    const durationMs = def.ms;
    const bandNote = def.band ? ` Band: ${def.band}.` : '';

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
      mathRelationship: def.band ? `${durationMs}ms (perceptual: ${def.band})` : `${durationMs}ms`,
      dependsOn: [],
      description: `Duration ${scale}: ${durationMs}ms.${bandNote} ${def.meaning}`,
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

  const keyframes: Array<{
    name: string;
    css: string;
    meaning: string;
    contexts: string[];
  }> = [
    {
      name: 'fade-in',
      css: 'from { opacity: 0; } to { opacity: 1; }',
      meaning: 'Fade from transparent to opaque',
      contexts: ['enter', 'appear', 'show'],
    },
    {
      name: 'fade-out',
      css: 'from { opacity: 1; } to { opacity: 0; }',
      meaning: 'Fade from opaque to transparent',
      contexts: ['exit', 'disappear', 'hide'],
    },
    {
      name: 'slide-in-from-top',
      css: 'from { transform: translateY(-100%); } to { transform: translateY(0); }',
      meaning: 'Slide in from above',
      contexts: ['dropdown', 'notification', 'toast'],
    },
    {
      name: 'slide-in-from-bottom',
      css: 'from { transform: translateY(100%); } to { transform: translateY(0); }',
      meaning: 'Slide in from below',
      contexts: ['sheet', 'drawer', 'mobile-menu'],
    },
    {
      name: 'slide-in-from-left',
      css: 'from { transform: translateX(-100%); } to { transform: translateX(0); }',
      meaning: 'Slide in from left',
      contexts: ['sidebar', 'panel', 'drawer'],
    },
    {
      name: 'slide-in-from-right',
      css: 'from { transform: translateX(100%); } to { transform: translateX(0); }',
      meaning: 'Slide in from right',
      contexts: ['sidebar', 'panel', 'drawer'],
    },
    {
      name: 'slide-out-to-top',
      css: 'from { transform: translateY(0); } to { transform: translateY(-100%); }',
      meaning: 'Slide out upward',
      contexts: ['dropdown-exit', 'notification-dismiss'],
    },
    {
      name: 'slide-out-to-bottom',
      css: 'from { transform: translateY(0); } to { transform: translateY(100%); }',
      meaning: 'Slide out downward',
      contexts: ['sheet-exit', 'drawer-close'],
    },
    {
      name: 'slide-out-to-left',
      css: 'from { transform: translateX(0); } to { transform: translateX(-100%); }',
      meaning: 'Slide out to left',
      contexts: ['sidebar-close', 'panel-exit'],
    },
    {
      name: 'slide-out-to-right',
      css: 'from { transform: translateX(0); } to { transform: translateX(100%); }',
      meaning: 'Slide out to right',
      contexts: ['sidebar-close', 'panel-exit'],
    },
    {
      name: 'scale-in',
      css: `from { transform: scale(${scaleStart}); opacity: 0; } to { transform: scale(1); opacity: 1; }`,
      meaning: 'Scale up while fading in',
      contexts: ['modal', 'popover', 'dialog'],
    },
    {
      name: 'scale-out',
      css: `from { transform: scale(1); opacity: 1; } to { transform: scale(${scaleStart}); opacity: 0; }`,
      meaning: 'Scale down while fading out',
      contexts: ['modal-exit', 'popover-close'],
    },
    {
      name: 'spin',
      css: 'from { transform: rotate(0deg); } to { transform: rotate(360deg); }',
      meaning: 'Continuous rotation',
      contexts: ['loading', 'spinner', 'refresh'],
    },
    {
      name: 'ping',
      css: `75%, 100% { transform: scale(${pingScale}); opacity: 0; }`,
      meaning: 'Expanding pulse that fades out',
      contexts: ['notification-badge', 'attention', 'pulse'],
    },
    {
      name: 'pulse',
      css: `0%, 100% { opacity: 1; } 50% { opacity: ${pulseOpacity}; }`,
      meaning: 'Gentle opacity pulse',
      contexts: ['skeleton', 'loading-placeholder'],
    },
    {
      name: 'bounce',
      css: `0%, 100% { transform: translateY(-${bouncePercent}%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); } 50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }`,
      meaning: 'Bouncing motion',
      contexts: ['attention', 'scroll-indicator'],
    },
    {
      name: 'accordion-down',
      css: 'from { height: 0; } to { height: var(--radix-accordion-content-height); }',
      meaning: 'Expand accordion content',
      contexts: ['accordion', 'collapsible', 'expand'],
    },
    {
      name: 'accordion-up',
      css: 'from { height: var(--radix-accordion-content-height); } to { height: 0; }',
      meaning: 'Collapse accordion content',
      contexts: ['accordion', 'collapsible', 'collapse'],
    },
    {
      name: 'caret-blink',
      css: '0%, 70%, 100% { opacity: 1; } 20%, 50% { opacity: 0; }',
      meaning: 'Text cursor blinking',
      contexts: ['input-caret', 'text-cursor'],
    },
  ];

  // Generate keyframe tokens
  for (const kf of keyframes) {
    tokens.push({
      name: `motion-keyframe-${kf.name}`,
      value: kf.css,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: kf.meaning,
      usageContext: kf.contexts,
      keyframeName: kf.name,
      description: `Keyframe ${kf.name}: ${kf.meaning}`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
    });
  }

  // Animation definitions - combine keyframe + duration + easing
  const animations: Array<{
    name: string;
    keyframe: string;
    duration: string;
    easing: string;
    iterations?: string;
    meaning: string;
    contexts: string[];
  }> = [
    {
      name: 'fade-in',
      keyframe: 'fade-in',
      duration: 'fast',
      easing: 'ease-out',
      meaning: 'Fade in animation',
      contexts: ['enter', 'appear'],
    },
    {
      name: 'fade-out',
      keyframe: 'fade-out',
      duration: 'fast',
      easing: 'ease-in',
      meaning: 'Fade out animation',
      contexts: ['exit', 'disappear'],
    },
    {
      name: 'slide-in-from-top',
      keyframe: 'slide-in-from-top',
      duration: 'normal',
      easing: 'ease-out',
      meaning: 'Slide in from top',
      contexts: ['dropdown', 'notification'],
    },
    {
      name: 'slide-in-from-bottom',
      keyframe: 'slide-in-from-bottom',
      duration: 'normal',
      easing: 'ease-out',
      meaning: 'Slide in from bottom',
      contexts: ['sheet', 'drawer'],
    },
    {
      name: 'slide-in-from-left',
      keyframe: 'slide-in-from-left',
      duration: 'normal',
      easing: 'ease-out',
      meaning: 'Slide in from left',
      contexts: ['sidebar', 'panel'],
    },
    {
      name: 'slide-in-from-right',
      keyframe: 'slide-in-from-right',
      duration: 'normal',
      easing: 'ease-out',
      meaning: 'Slide in from right',
      contexts: ['sidebar', 'panel'],
    },
    {
      name: 'slide-out-to-top',
      keyframe: 'slide-out-to-top',
      duration: 'fast',
      easing: 'ease-in',
      meaning: 'Slide out to top',
      contexts: ['dropdown-exit'],
    },
    {
      name: 'slide-out-to-bottom',
      keyframe: 'slide-out-to-bottom',
      duration: 'fast',
      easing: 'ease-in',
      meaning: 'Slide out to bottom',
      contexts: ['sheet-exit'],
    },
    {
      name: 'slide-out-to-left',
      keyframe: 'slide-out-to-left',
      duration: 'fast',
      easing: 'ease-in',
      meaning: 'Slide out to left',
      contexts: ['sidebar-close'],
    },
    {
      name: 'slide-out-to-right',
      keyframe: 'slide-out-to-right',
      duration: 'fast',
      easing: 'ease-in',
      meaning: 'Slide out to right',
      contexts: ['sidebar-close'],
    },
    {
      name: 'scale-in',
      keyframe: 'scale-in',
      duration: 'normal',
      easing: 'spring',
      meaning: 'Scale in with spring',
      contexts: ['modal', 'popover'],
    },
    {
      name: 'scale-out',
      keyframe: 'scale-out',
      duration: 'fast',
      easing: 'ease-in',
      meaning: 'Scale out',
      contexts: ['modal-exit'],
    },
    {
      name: 'spin',
      keyframe: 'spin',
      duration: '1s',
      easing: 'linear',
      iterations: 'infinite',
      meaning: 'Continuous spin',
      contexts: ['loading', 'spinner'],
    },
    {
      name: 'ping',
      keyframe: 'ping',
      duration: '1s',
      easing: 'ease-out',
      iterations: 'infinite',
      meaning: 'Pinging pulse',
      contexts: ['notification'],
    },
    {
      name: 'pulse',
      keyframe: 'pulse',
      duration: '2s',
      easing: 'ease-in-out',
      iterations: 'infinite',
      meaning: 'Gentle pulse',
      contexts: ['skeleton', 'loading'],
    },
    {
      name: 'bounce',
      keyframe: 'bounce',
      duration: '1s',
      easing: 'ease-in-out',
      iterations: 'infinite',
      meaning: 'Bouncing',
      contexts: ['attention'],
    },
    {
      name: 'accordion-down',
      keyframe: 'accordion-down',
      duration: 'normal',
      easing: 'ease-out',
      meaning: 'Accordion expand',
      contexts: ['accordion', 'collapsible'],
    },
    {
      name: 'accordion-up',
      keyframe: 'accordion-up',
      duration: 'normal',
      easing: 'ease-out',
      meaning: 'Accordion collapse',
      contexts: ['accordion', 'collapsible'],
    },
    {
      name: 'caret-blink',
      keyframe: 'caret-blink',
      duration: '1.25s',
      easing: 'ease-out',
      iterations: 'infinite',
      meaning: 'Caret blinking',
      contexts: ['input'],
    },
  ];

  // Generate animation tokens
  for (const anim of animations) {
    // Get duration - either from tokens or as literal value
    let durationValue: string;
    let durationRef: string;
    if (anim.duration.endsWith('s') || anim.duration.endsWith('ms')) {
      durationValue = anim.duration;
      durationRef = anim.duration;
    } else {
      const durationDef = durationDefs[anim.duration];
      if (!durationDef) continue;
      durationValue = `${durationDef.ms}ms`;
      durationRef = `var(--motion-duration-${anim.duration})`;
    }

    // Get easing -- remap the legacy key to the current curve vocabulary so the
    // retained @keyframes animations survive the #1903 curve rename.
    const easingKey = LEGACY_EASING_REMAP[anim.easing] ?? anim.easing;
    const easingDef = easingDefs[easingKey];
    if (!easingDef) continue;
    const easingRef = `var(--motion-easing-${easingKey})`;

    // Build animation value
    const iterations = anim.iterations || '';
    const animValue = iterations
      ? `${anim.keyframe} ${durationRef} ${easingRef} ${iterations}`
      : `${anim.keyframe} ${durationRef} ${easingRef}`;

    tokens.push({
      name: `motion-animation-${anim.name}`,
      value: animValue,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: anim.meaning,
      usageContext: anim.contexts,
      animationName: anim.name,
      keyframeName: anim.keyframe,
      animationDuration: durationValue,
      animationEasing: easingDef.css,
      animationIterations: anim.iterations || '1',
      dependsOn: [
        `motion-keyframe-${anim.keyframe}`,
        ...(anim.duration.endsWith('s') || anim.duration.endsWith('ms')
          ? []
          : [`motion-duration-${anim.duration}`]),
        `motion-easing-${easingKey}`,
      ],
      description: `Animation ${anim.name}: ${anim.meaning}`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
    });
  }

  // Composite presets (for backwards compatibility)
  const composites = [
    {
      name: 'motion-fade-in',
      duration: 'fast',
      easing: 'ease-out',
      meaning: 'Fade in animation preset',
      contexts: ['fade-in', 'appear'],
    },
    {
      name: 'motion-fade-out',
      duration: 'fast',
      easing: 'ease-in',
      meaning: 'Fade out animation preset',
      contexts: ['fade-out', 'disappear'],
    },
    {
      name: 'motion-slide-in',
      duration: 'normal',
      easing: 'ease-out',
      meaning: 'Slide in animation preset',
      contexts: ['slide-in', 'panel-enter', 'modal-enter'],
    },
    {
      name: 'motion-slide-out',
      duration: 'fast',
      easing: 'ease-in',
      meaning: 'Slide out animation preset',
      contexts: ['slide-out', 'panel-exit', 'modal-exit'],
    },
    {
      name: 'motion-scale-in',
      duration: 'normal',
      easing: 'spring',
      meaning: 'Scale in with spring animation',
      contexts: ['pop-in', 'button-press', 'emphasis'],
    },
  ];

  for (const comp of composites) {
    const durationDef = durationDefs[comp.duration];
    const easingKey = LEGACY_EASING_REMAP[comp.easing] ?? comp.easing;
    const easingDef = easingDefs[easingKey];
    if (!durationDef || !easingDef) continue;

    const durationMs = durationDef.ms;

    tokens.push({
      name: comp.name,
      value: `${durationMs}ms ${easingDef.css}`,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: comp.meaning,
      usageContext: comp.contexts,
      motionDuration: durationMs,
      easingCurve: easingDef.curve,
      easingName: easingKey as (typeof EASING_CURVES)[number],
      dependsOn: [`motion-duration-${comp.duration}`, `motion-easing-${easingKey}`],
      description: `${comp.meaning}. Combines ${comp.duration} duration with ${easingKey} easing.`,
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
    tokens.push({
      name: `motion-semantic-${name}`,
      value: JSON.stringify({
        properties: mapping.properties,
        durationTier: mapping.durationTier,
        curve: mapping.curve,
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
      dependsOn: [`motion-duration-${mapping.durationTier}`, `motion-easing-${mapping.curve}`],
      description: `Semantic motion motion-${name}: ${mapping.properties.join(', ')} over ${mapping.durationTier} with ${mapping.curve}. ${mapping.sizeReasoning}`,
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
