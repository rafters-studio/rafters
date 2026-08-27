import type { TooltipConfig, TooltipState } from './tooltip.behavior';

export interface TooltipClassSet {
  trigger: string;
  content: string;
}

// The DOM-native root is a binding host, not a box: it carries data-part="root"
// and the config, and NO class -- a behavior root never styles itself; layout
// belongs to the consumer's Container/Grid (operator ruling, 2026-08-02). With
// no class the unclassed <div> root is a BLOCK box: a tooltip is composed by
// Container, not dropped mid-sentence into running text.

// Inside that root the trigger is still inline-flex -- that is the button's own
// box, not the root's, and it keeps the label and any icon on one line.
const triggerClasses = 'inline-flex';

// MOTION IS CSS AND TOKENS ONLY (#2148). No TypeScript reads a motion token, no
// timer implements a delay, and the whole reveal works with JavaScript turned
// off. The hover-intent delay that used to be a JavaScript timer over
// `--rafters-delay-hover-intent` is now `transition-delay` on the reveal rule,
// and the reveal itself is native `:hover` / `:focus-visible` over the root's
// real sibling structure (root > trigger, root > content).
//
// THE CELL IS THE SPEC. These utilities are the consumption of two rows of
// packages/ui/docs/spec/matrix/motion.jsonl -- tooltip / content /
// "closed -> open" (moderate, enter, delay hover-intent) and tooltip / content /
// "open -> closed" (fast, exit, NO delay). A tooltip does not linger: the linger
// generic belongs to hover-card's close cell and to nothing else here. The old
// `tooltipCloseDelay` read `--rafters-delay-linger` -- that was drift against
// the matrix, and it is gone rather than carried into CSS.
//
// The CLOSED cell is the base rule and the OPEN cell is the reveal rule, which
// is how a CSS transition already works: whichever rule currently applies owns
// the duration/curve/delay of the change into it. Leaving the tooltip means the
// reveal rule stops matching, so the base (fast, exit, no delay) governs the
// fade out immediately.
//
// `fixed` is the base positioning, not decoration: the content is now rendered
// unconditionally in every performance (no `hidden`, no conditional null), so a
// flow-positioned panel would reserve layout space next to every trigger on a
// JS-off page. Out of flow it costs nothing, and the collision-detector's inline
// `position: fixed; left: 0; top: 0; transform: ...` overrides it once JS runs.
//
// NO component-level reduced-motion escape. The generated `duration-*` and
// `delay-*` utilities zero themselves under prefers-reduced-motion (the
// exporter's REDUCED_MOTION_ZEROED set,
// packages/design-tokens/src/exporters/tailwind.ts), so reduced motion is the
// token sheet's responsibility and never a component-level media query.
//
// `data-disable-hoverable-content` is read by the CSS directly, never by JS:
// the default reveal is root-level `:hover` (the pointer can travel onto the tip
// and hold it open), and the disabled variant narrows it to `:hover` on the
// trigger specifically via `:has()`.
//
// `data-dismissed` is the WCAG 1.4.13 dismiss escape hatch, set by an Escape
// keydown and cleared on pointerleave/blur. It has to win against a reveal rule
// that is one class-level more specific, hence the important form.
const contentClasses =
  'fixed z-depth-tooltip w-fit overflow-hidden rounded-md bg-foreground px-3 py-1.5 ' +
  'text-body-small ts-body-small text-background shadow-lg ' +
  'opacity-0 pointer-events-none transition-opacity duration-fast ease-exit ' +
  '[:is([data-tooltip]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[data-tooltip]:not([data-disable-hoverable-content=true]):hover)>&]:opacity-100 ' +
  '[:is([data-tooltip]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[data-tooltip]:not([data-disable-hoverable-content=true]):hover)>&]:pointer-events-auto ' +
  '[:is([data-tooltip]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[data-tooltip]:not([data-disable-hoverable-content=true]):hover)>&]:duration-moderate ' +
  '[:is([data-tooltip]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[data-tooltip]:not([data-disable-hoverable-content=true]):hover)>&]:ease-enter ' +
  '[:is([data-tooltip]:has(>[data-part=trigger]:is(:hover,:focus-visible)),[data-tooltip]:not([data-disable-hoverable-content=true]):hover)>&]:delay-hover-intent ' +
  'data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto ' +
  'data-[state=open]:duration-moderate data-[state=open]:ease-enter ' +
  'data-[state=open]:delay-hover-intent ' +
  '[[data-tooltip][data-dismissed=true]>&]:opacity-0! ' +
  '[[data-tooltip][data-dismissed=true]>&]:pointer-events-none!';

export function tooltipClasses(_config: TooltipConfig, _state: TooltipState): TooltipClassSet {
  return {
    trigger: triggerClasses,
    content: contentClasses,
  };
}
