/**
 * Motion Generator
 *
 * Generates motion tokens (duration, easing, delay) using mathematical progressions
 * from @rafters/math-utils. Uses minor-third (1.2) ratio by default for harmonious
 * timing that feels connected to the spacing system.
 *
 * This generator uses step-based progression: value = base * ratio^step
 * - step 0 = base value
 * - step 1 = base * ratio (slower)
 * - step -1 = base / ratio (faster)
 *
 * This generator is a pure function - it receives motion definitions as input.
 * Default motion values are provided by the orchestrator from defaults.ts.
 */

import { createProgression } from '@rafters/math-utils';
import type { Token } from '@rafters/shared';
import type { DelayDef, DurationDef, EasingDef } from './defaults.js';
import type { GeneratorResult, ResolvedSystemConfig } from './types.js';
import { EASING_CURVES, MOTION_DURATION_SCALE } from './types.js';

/**
 * Generate motion tokens from provided definitions
 */
export function generateMotionTokens(
  config: ResolvedSystemConfig,
  durationDefs: Record<string, DurationDef>,
  easingDefs: Record<string, EasingDef>,
  delayDefs: Record<string, DelayDef>,
): GeneratorResult {
  const tokens: Token[] = [];
  const timestamp = new Date().toISOString();
  const { baseTransitionDuration, progressionRatio } = config;

  // Create progression for computing values
  const progression = createProgression(progressionRatio as 'minor-third');

  // Base duration token
  tokens.push({
    name: 'motion-duration-base',
    value: `${baseTransitionDuration}ms`,
    category: 'motion',
    namespace: 'motion',
    semanticMeaning: 'Base transition duration - all motion timing derives from this',
    usageContext: ['calculation-reference'],
    progressionSystem: progressionRatio as 'minor-third',
    description: `Base duration (${baseTransitionDuration}ms). Motion uses ${progressionRatio} progression (ratio ${progression.ratio}).`,
    generatedAt: timestamp,
    containerQueryAware: false,
    reducedMotionAware: true,
    userOverride: null,
    usagePatterns: {
      do: ['Reference as the calculation base'],
      never: ['Change without understanding full motion scale impact'],
    },
  });

  // Generate duration tokens
  for (const scale of MOTION_DURATION_SCALE) {
    const def = durationDefs[scale];
    if (!def) continue;
    const scaleIndex = MOTION_DURATION_SCALE.indexOf(scale);

    let durationMs: number;
    let mathRelationship: string;

    if (def.step === 'instant') {
      durationMs = 0;
      mathRelationship = '0';
    } else {
      // Use progression.compute() for step-based calculation
      durationMs = Math.round(progression.compute(baseTransitionDuration, def.step));
      mathRelationship =
        def.step === 0
          ? `${baseTransitionDuration}ms (base)`
          : `${baseTransitionDuration} × ${progression.ratio}^${def.step}`;
    }

    tokens.push({
      name: `motion-duration-${scale}`,
      value: durationMs === 0 ? '0ms' : `${durationMs}ms`,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: def.meaning,
      usageContext: def.contexts,
      scalePosition: scaleIndex,
      progressionSystem: progressionRatio as 'minor-third',
      motionIntent: def.motionIntent,
      motionDuration: durationMs,
      mathRelationship,
      dependsOn: def.step === 'instant' ? [] : ['motion-duration-base'],
      description: `Duration ${scale}: ${durationMs}ms. ${def.meaning}`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
      usagePatterns: {
        do:
          scale === 'instant'
            ? ['Use for prefers-reduced-motion', 'Use for disabled animations']
            : scale === 'fast'
              ? ['Use for hover/focus states', 'Use for micro-interactions']
              : scale === 'normal'
                ? ['Use for most UI transitions', 'Use for state changes']
                : ['Use for enter/exit animations', 'Use for emphasis'],
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
            ? ['Use for opacity fades', 'Use for progress indicators']
            : curve === 'ease-out'
              ? ['Use for entering elements', 'Use for appearing content']
              : curve === 'ease-in'
                ? ['Use for exiting elements', 'Use for disappearing content']
                : ['Use for general transitions', 'Match context to curve feel'],
        never: [
          'Use ease-in for entering (feels sluggish)',
          'Use ease-out for exiting (feels abrupt)',
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
      // Use progression.compute() for step-based calculation
      delayMs = Math.round(progression.compute(baseTransitionDuration, def.step));
      mathRelationship =
        def.step === 0
          ? `${baseTransitionDuration}ms (base)`
          : `${baseTransitionDuration} × ${progression.ratio}^${def.step}`;
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
  const ratioValue = progression.ratio;
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
      const durationMs =
        durationDef.step === 'instant'
          ? 0
          : Math.round(progression.compute(baseTransitionDuration, durationDef.step));
      durationValue = `${durationMs}ms`;
      durationRef = `var(--motion-duration-${anim.duration})`;
    }

    // Get easing
    const easingDef = easingDefs[anim.easing];
    if (!easingDef) continue;
    const easingRef = `var(--motion-easing-${anim.easing})`;

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
        `motion-easing-${anim.easing}`,
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
    const easingDef = easingDefs[comp.easing];
    if (!durationDef || !easingDef) continue;

    let durationMs: number;
    if (durationDef.step === 'instant') {
      durationMs = 0;
    } else {
      durationMs = Math.round(progression.compute(baseTransitionDuration, durationDef.step));
    }

    tokens.push({
      name: comp.name,
      value: `${durationMs}ms ${easingDef.css}`,
      category: 'motion',
      namespace: 'motion',
      semanticMeaning: comp.meaning,
      usageContext: comp.contexts,
      motionDuration: durationMs,
      easingCurve: easingDef.curve,
      easingName: comp.easing as (typeof EASING_CURVES)[number],
      dependsOn: [`motion-duration-${comp.duration}`, `motion-easing-${comp.easing}`],
      description: `${comp.meaning}. Combines ${comp.duration} duration with ${comp.easing} easing.`,
      generatedAt: timestamp,
      containerQueryAware: false,
      reducedMotionAware: true,
      userOverride: null,
    });
  }

  // Motion progression metadata
  tokens.push({
    name: 'motion-progression',
    value: JSON.stringify({
      ratio: progressionRatio,
      ratioValue: progression.ratio,
      baseDuration: baseTransitionDuration,
      note: 'Motion timing uses step-based progression (base * ratio^step) for unified feel',
    }),
    category: 'motion',
    namespace: 'motion',
    semanticMeaning: 'Metadata about the motion progression system',
    description: `Motion uses ${progressionRatio} progression from ${baseTransitionDuration}ms base.`,
    generatedAt: timestamp,
    containerQueryAware: false,
    userOverride: null,
  });

  return {
    namespace: 'motion',
    tokens,
  };
}
