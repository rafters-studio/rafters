/**
 * Color Inspector -- specimen gallery for color intelligence
 *
 * Horizontal chip palette at top, immersive detail below. Selecting a color
 * fills a hero field in that hue with the emotional headline overlaid in
 * computed-contrast type. The detail panel breathes the color's lightest
 * scale step as a wash.
 *
 * @cognitive-load 4/10 - Chip palette is scannable; detail appears on demand
 * @accessibility Keyboard nav in chip list, aria-current on selected, collapsible sections
 *
 * @usage-patterns
 * DO: Use ColorInspector to display multiple color families with single-selection
 * DO: Use section components (ColorScale, ContrastMatrix, etc.) standalone when needed
 * NEVER: Display more than one selected family at a time
 */

import type {
  AtmosphericWeight,
  ColorAnalysis,
  ColorIntelligence,
  ColorValue,
  PerceptualWeight,
} from '@rafters/shared';
import * as React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Container } from '@/components/ui/container';
import { Grid } from '@/components/ui/grid';
import { H2, Lead, Muted, P, Small } from '@/components/ui/typography';
import classy from '@/lib/primitives/classy';
import type { ScalePosition } from '@/lib/primitives/color-scale';
import { createColorScale } from '@/lib/primitives/color-scale';
import { createColorWeight } from '@/lib/primitives/color-weight';
import type { ContrastMatrixOptions } from '@/lib/primitives/contrast-matrix';
import { createContrastMatrix } from '@/lib/primitives/contrast-matrix';
import { createCvdSimulation } from '@/lib/primitives/cvd-simulation';
import { inP3, inSrgb } from '@/lib/primitives/oklch-gamut';
import type { GamutTier, OklchColor } from '@/lib/primitives/types';

// ============================================================================
// Shared helpers
// ============================================================================

function getBaseColor(color: ColorValue): OklchColor {
  // Base color at step 500 (index 5) with current scale generator.
  // Original math anchored at 600 — fix index when scale is restored.
  const base = color.scale[5];
  if (base) return base;
  return { l: 0.5, c: 0.1, h: 0 };
}

function toOklchCss(c: OklchColor): string {
  return `oklch(${c.l} ${c.c} ${c.h})`;
}

function toOklchAlpha(c: OklchColor, alpha: number): string {
  return `oklch(${c.l} ${c.c} ${c.h} / ${alpha})`;
}

function getOverlayTextColor(color: ColorValue): OklchColor {
  const base = getBaseColor(color);
  if (base.l > 0.55) {
    return color.scale[10] ?? color.scale[9] ?? { l: 0.15, c: 0, h: 0 };
  }
  return color.scale[0] ?? color.scale[1] ?? { l: 0.97, c: 0, h: 0 };
}

// ============================================================================
// ColorScale
// ============================================================================

export interface ColorScaleProps {
  scale: OklchColor[];
  name: string;
  tiers?: GamutTier[];
  onSwatchFocus?: (position: ScalePosition, index: number) => void;
  onSwatchClick?: (position: ScalePosition, index: number) => void;
  className?: string;
}

function ColorScale({
  scale,
  name,
  tiers,
  onSwatchFocus,
  onSwatchClick,
  className,
}: ColorScaleProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return createColorScale(el, {
      scale,
      name,
      ...(tiers ? { tiers } : {}),
      ...(onSwatchFocus ? { onSwatchFocus } : {}),
      ...(onSwatchClick ? { onSwatchClick } : {}),
    });
  }, [scale, name, tiers, onSwatchFocus, onSwatchClick]);

  return (
    <div
      ref={containerRef}
      className={classy(
        'flex gap-0.5',
        '[&_[role=option]]:h-8 [&_[role=option]]:flex-1 [&_[role=option]]:cursor-pointer',
        '[&_[role=option]:first-child]:rounded-l [&_[role=option]:last-child]:rounded-r',
        '[&_[role=option]:focus-visible]:ring-2 [&_[role=option]:focus-visible]:ring-primary-ring [&_[role=option]:focus-visible]:outline-none [&_[role=option]:focus-visible]:z-10',
        className,
      )}
    />
  );
}

ColorScale.displayName = 'ColorScale';

// ============================================================================
// ContrastMatrix
// ============================================================================

export interface ContrastMatrixProps {
  accessibility: ContrastMatrixOptions['accessibility'];
  scaleName: string;
  className?: string;
}

function ContrastMatrix({ accessibility, scaleName, className }: ContrastMatrixProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return createContrastMatrix(el, { accessibility, scaleName });
  }, [accessibility, scaleName]);

  return (
    <div
      ref={containerRef}
      className={classy(
        'text-xs',
        '[&_[role=grid]]:grid [&_[role=grid]]:gap-px',
        '[&_[role=row]]:flex [&_[role=row]]:gap-px',
        '[&_[role=gridcell]]:h-5 [&_[role=gridcell]]:w-5 [&_[role=gridcell]]:rounded-xs',
        '[&_[data-wcag-level=aaa]]:bg-emerald-500/30 [&_[data-wcag-level=aa]]:bg-amber-500/30 [&_[data-wcag-level=fail]]:bg-muted/10',
        '[&_[role=gridcell]:focus-visible]:ring-1 [&_[role=gridcell]:focus-visible]:ring-primary-ring [&_[role=gridcell]:focus-visible]:outline-none',
        '[&_[role=columnheader]]:h-5 [&_[role=columnheader]]:w-5 [&_[role=columnheader]]:text-center [&_[role=columnheader]]:text-muted-foreground/60 [&_[role=columnheader]]:leading-5',
        '[&_[role=rowheader]]:h-5 [&_[role=rowheader]]:w-5 [&_[role=rowheader]]:text-center [&_[role=rowheader]]:text-muted-foreground/60 [&_[role=rowheader]]:leading-5',
        '[&_[data-contrast-summary]]:mt-3 [&_[data-contrast-summary]]:text-xs [&_[data-contrast-summary]]:text-muted-foreground',
        '[&_[data-apca]]:text-xs [&_[data-apca]]:text-muted-foreground [&_[data-apca]]:mt-1',
        className,
      )}
    />
  );
}

ContrastMatrix.displayName = 'ContrastMatrix';

// ============================================================================
// CVDSimulation
// ============================================================================

export interface CVDSimulationProps {
  scale: OklchColor[];
  name: string;
  cvd: { deuteranopia: OklchColor; protanopia: OklchColor; tritanopia: OklchColor };
  baseColor: OklchColor;
  showOriginal?: boolean;
  className?: string;
}

function CVDSimulation({
  scale,
  name,
  cvd,
  baseColor,
  showOriginal,
  className,
}: CVDSimulationProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return createCvdSimulation(el, {
      scale,
      name,
      cvd,
      baseColor,
      ...(showOriginal !== undefined ? { showOriginal } : {}),
    });
  }, [scale, name, cvd, baseColor, showOriginal]);

  return (
    <div
      ref={containerRef}
      className={classy(
        'flex flex-col gap-0.5',
        '[&_[data-cvd-type]]:flex [&_[data-cvd-type]]:gap-0.5',
        '[&_[data-swatch]]:h-6 [&_[data-swatch]]:flex-1',
        '[&_[data-cvd-type]:first-child_[data-swatch]:first-child]:rounded-tl [&_[data-cvd-type]:first-child_[data-swatch]:last-child]:rounded-tr',
        '[&_[data-cvd-type]:last-child_[data-swatch]:first-child]:rounded-bl [&_[data-cvd-type]:last-child_[data-swatch]:last-child]:rounded-br',
        className,
      )}
    />
  );
}

CVDSimulation.displayName = 'CVDSimulation';

// ============================================================================
// ColorWeight
// ============================================================================

export interface ColorWeightProps {
  perceptualWeight: {
    weight: number;
    density: 'light' | 'medium' | 'heavy';
    balancingRecommendation: string;
  };
  atmosphericWeight: {
    distanceWeight: number;
    temperature: 'warm' | 'neutral' | 'cool';
    atmosphericRole: 'background' | 'midground' | 'foreground';
  };
  className?: string;
}

function ColorWeight({ perceptualWeight, atmosphericWeight, className }: ColorWeightProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return createColorWeight(el, { perceptualWeight, atmosphericWeight });
  }, [perceptualWeight, atmosphericWeight]);

  return (
    <div
      ref={containerRef}
      className={classy(
        'flex flex-col gap-1 text-xs text-muted-foreground',
        '[&_[role=note]]:mt-2 [&_[role=note]]:text-foreground [&_[role=note]]:text-xs [&_[role=note]]:font-sans',
        className,
      )}
    />
  );
}

ColorWeight.displayName = 'ColorWeight';

// ============================================================================
// TokenIntelligence
// ============================================================================

export interface TokenIntelligenceProps {
  usagePatterns?: { dos: string[]; nevers: string[] };
  usageContext?: string[];
  trustLevel?: string;
  consequence?: string;
  dependsOn?: string[];
  generationRule?: string;
  userOverride?: { previousValue: string; reason: string; context?: string };
  className?: string;
}

function TokenIntelligence({
  usagePatterns,
  usageContext,
  trustLevel,
  consequence,
  dependsOn,
  generationRule,
  userOverride,
  className,
}: TokenIntelligenceProps) {
  const hasContent =
    usagePatterns ||
    usageContext ||
    trustLevel ||
    consequence ||
    dependsOn ||
    generationRule ||
    userOverride;

  if (!hasContent) return null;

  return (
    <div className={classy('flex flex-col gap-3 text-xs', className)} data-token-intelligence="">
      {usagePatterns ? (
        <div data-usage-patterns="">
          {usagePatterns.dos.length > 0 ? (
            <div data-patterns-do="">
              <span className={classy('font-medium text-emerald-400')}>Do:</span>
              <ul className={classy('ml-4 mt-1 list-disc text-muted-foreground')}>
                {usagePatterns.dos.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {usagePatterns.nevers.length > 0 ? (
            <div data-patterns-never="" className={classy('mt-2')}>
              <span className={classy('font-medium text-red-400')}>Never:</span>
              <ul className={classy('ml-4 mt-1 list-disc text-muted-foreground')}>
                {usagePatterns.nevers.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {usageContext && usageContext.length > 0 ? (
        <div data-usage-context="">
          <span className={classy('font-medium text-muted-foreground')}>Context:</span>
          <ul className={classy('ml-4 mt-1 list-disc text-muted-foreground')}>
            {usageContext.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {trustLevel ? (
        <div data-trust-level="" className={classy('text-muted-foreground')}>
          <span className={classy('font-medium')}>Trust:</span> {trustLevel}
        </div>
      ) : null}

      {consequence ? (
        <div data-consequence="" className={classy('text-muted-foreground')}>
          <span className={classy('font-medium')}>Consequence:</span> {consequence}
        </div>
      ) : null}

      {dependsOn && dependsOn.length > 0 ? (
        <div data-depends-on="" className={classy('text-muted-foreground')}>
          <span className={classy('font-medium')}>Depends on:</span> {dependsOn.join(', ')}
        </div>
      ) : null}

      {generationRule ? (
        <div data-generation-rule="" className={classy('text-muted-foreground')}>
          <span className={classy('font-medium')}>Rule:</span> {generationRule}
        </div>
      ) : null}

      {userOverride ? (
        <div data-user-override="" className={classy('text-muted-foreground')}>
          <span className={classy('font-medium')}>Override:</span> {userOverride.previousValue}{' '}
          changed because: {userOverride.reason}
          {userOverride.context ? ` (${userOverride.context})` : null}
        </div>
      ) : null}
    </div>
  );
}

TokenIntelligence.displayName = 'TokenIntelligence';

// ============================================================================
// ColorStory -- intelligence prose from the API
// ============================================================================

export interface ColorStoryProps {
  intelligence: ColorIntelligence;
  className?: string;
}

function ColorStory({ intelligence, className }: ColorStoryProps) {
  const emotionSentence =
    intelligence.emotionalImpact.split(/\.\s/)[0] ?? intelligence.emotionalImpact;

  const hasDeepContext =
    intelligence.culturalContext ||
    intelligence.usageGuidance ||
    intelligence.accessibilityNotes ||
    intelligence.balancingGuidance;

  return (
    <article className={classy('flex flex-col gap-3', className)} data-color-story="">
      <p
        data-story-emotion=""
        className={classy('text-sm leading-snug text-foreground font-medium')}
      >
        {emotionSentence}.
      </p>

      <p data-story-reasoning="" className={classy('text-xs leading-relaxed text-foreground/50')}>
        {intelligence.reasoning}
      </p>

      {hasDeepContext ? (
        <Collapsible>
          <CollapsibleTrigger
            className={classy(
              'text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-pointer',
            )}
          >
            More context
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div data-story-context="" className={classy('flex flex-col gap-2 mt-2')}>
              {intelligence.culturalContext ? (
                <p
                  data-story-culture=""
                  className={classy('text-xs leading-relaxed text-foreground/35')}
                >
                  {intelligence.culturalContext}
                </p>
              ) : null}
              {intelligence.usageGuidance ? (
                <p
                  data-story-usage=""
                  className={classy('text-xs leading-relaxed text-foreground/30')}
                >
                  {intelligence.usageGuidance}
                </p>
              ) : null}
              {intelligence.accessibilityNotes ? (
                <p
                  data-story-accessibility=""
                  className={classy('text-xs leading-relaxed text-foreground/25')}
                >
                  {intelligence.accessibilityNotes}
                </p>
              ) : null}
              {intelligence.balancingGuidance ? (
                <p
                  data-story-balancing=""
                  className={classy('text-xs leading-relaxed text-foreground/25')}
                >
                  {intelligence.balancingGuidance}
                </p>
              ) : null}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {intelligence.metadata ? (
        <div data-story-confidence="" className={classy('flex items-center gap-2')}>
          <meter
            className={classy('h-1 w-12 overflow-hidden rounded-full bg-muted/30')}
            aria-label="Confidence"
            value={intelligence.metadata.confidence}
            min={0}
            max={1}
          >
            {Math.round(intelligence.metadata.confidence * 100)}%
          </meter>
          <span className={classy('text-foreground/20')} style={{ fontSize: '9px' }}>
            {Math.round(intelligence.metadata.confidence * 100)}%
          </span>
        </div>
      ) : null}
    </article>
  );
}

ColorStory.displayName = 'ColorStory';

// ============================================================================
// ColorCharacter -- analysis summary: temperature, role, character
// ============================================================================

export interface ColorCharacterProps {
  analysis: ColorAnalysis;
  scale?: OklchColor[];
  atmosphericWeight?: AtmosphericWeight;
  perceptualWeight?: PerceptualWeight;
  className?: string;
}

function ColorCharacter({
  analysis,
  scale,
  atmosphericWeight,
  perceptualWeight,
  className,
}: ColorCharacterProps) {
  // Use the actual color scale to show atmospheric character.
  // Three bands from the scale: light wash (100), mid presence (500), deep intensity (900).
  // The color demonstrates its own personality across the lightness range.
  const bgColor = scale?.[1]; // 100 — background wash
  const midColor = scale?.[5]; // 500 — midground presence
  const fgColor = scale?.[9]; // 900 — foreground intensity

  // Weight controls how much vertical space the band occupies — heavier = taller
  const bandHeight = perceptualWeight
    ? perceptualWeight.density === 'heavy'
      ? 'h-10'
      : perceptualWeight.density === 'medium'
        ? 'h-7'
        : 'h-5'
    : 'h-7';

  return (
    <div
      role="img"
      className={classy('flex flex-col', className)}
      data-color-character=""
      data-temperature={analysis.temperature}
      data-light={analysis.isLight}
      aria-label={[
        analysis.temperature,
        analysis.isLight ? 'light' : 'dark',
        atmosphericWeight?.atmosphericRole,
        perceptualWeight?.density,
      ]
        .filter(Boolean)
        .join(', ')}
    >
      {/* Three-layer atmospheric band using the actual color at three depths */}
      <div className={classy('flex gap-0 rounded overflow-hidden', bandHeight)}>
        <div
          className={classy('flex-1')}
          style={bgColor ? { backgroundColor: toOklchCss(bgColor) } : undefined}
          data-tag="background"
          title="background"
        />
        <div
          className={classy('flex-1')}
          style={midColor ? { backgroundColor: toOklchCss(midColor) } : undefined}
          data-tag="midground"
          title="midground"
        />
        <div
          className={classy('flex-1')}
          style={fgColor ? { backgroundColor: toOklchCss(fgColor) } : undefined}
          data-tag="foreground"
          title="foreground"
        />
      </div>
    </div>
  );
}

ColorCharacter.displayName = 'ColorCharacter';

// ============================================================================
// ContrastPreview -- real text on real backgrounds
// ============================================================================

export interface ContrastPreviewProps {
  scale: OklchColor[];
  className?: string;
}

function ContrastPreview({ scale, className }: ContrastPreviewProps) {
  // Show meaningful text pairings from the scale
  // Light backgrounds (50, 100, 200) with dark text (700, 800, 900)
  // Dark backgrounds (800, 900, 950) with light text (50, 100, 200)
  const pairs: { bg: OklchColor; fg: OklchColor; bgLabel: string; fgLabel: string }[] = [];

  const lightBgs = [
    { idx: 0, label: '50' },
    { idx: 1, label: '100' },
    { idx: 2, label: '200' },
  ];
  const darkFgs = [
    { idx: 7, label: '700' },
    { idx: 8, label: '800' },
    { idx: 9, label: '900' },
  ];
  const darkBgs = [
    { idx: 8, label: '800' },
    { idx: 9, label: '900' },
    { idx: 10, label: '950' },
  ];
  const lightFgs = [
    { idx: 0, label: '50' },
    { idx: 1, label: '100' },
    { idx: 2, label: '200' },
  ];

  // Best light-on-dark and dark-on-light pairs
  for (const bg of lightBgs) {
    for (const fg of darkFgs) {
      const bgColor = scale[bg.idx];
      const fgColor = scale[fg.idx];
      if (bgColor && fgColor) {
        pairs.push({ bg: bgColor, fg: fgColor, bgLabel: bg.label, fgLabel: fg.label });
      }
    }
  }
  for (const bg of darkBgs) {
    for (const fg of lightFgs) {
      const bgColor = scale[bg.idx];
      const fgColor = scale[fg.idx];
      if (bgColor && fgColor) {
        pairs.push({ bg: bgColor, fg: fgColor, bgLabel: bg.label, fgLabel: fg.label });
      }
    }
  }

  // Show top 6 pairs (3 light bg, 3 dark bg)
  const shown = [...pairs.slice(0, 3), ...pairs.slice(9, 12)];

  return (
    <ul
      className={classy('flex flex-col gap-1 list-none p-0 m-0', className)}
      data-contrast-preview=""
      aria-label="Contrast preview samples"
    >
      {shown.map((pair) => (
        <li
          key={`${pair.bgLabel}-${pair.fgLabel}`}
          className={classy('flex items-center gap-2 rounded px-2.5 py-1.5')}
          style={{ backgroundColor: toOklchCss(pair.bg), color: toOklchCss(pair.fg) }}
          data-bg={pair.bgLabel}
          data-fg={pair.fgLabel}
        >
          <span className={classy('flex-1 text-xs leading-snug truncate')}>
            The quick brown fox jumps over the lazy dog
          </span>
          <span
            className={classy('shrink-0')}
            style={{ fontSize: '8px', color: 'inherit', opacity: 0.4 }}
          >
            {pair.bgLabel}/{pair.fgLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}

ContrastPreview.displayName = 'ContrastPreview';

// ============================================================================
// ColorChip -- palette specimen with vertical genie reveal
// ============================================================================

interface ColorChipProps {
  color: ColorValue;
  selected: boolean;
  onSelect: () => void;
}

function ColorChip({ color, selected, onSelect }: ColorChipProps) {
  const [hovered, setHovered] = React.useState(false);
  const baseColor = getBaseColor(color);
  const swatchStyle = React.useMemo(
    () => ({ backgroundColor: toOklchCss(baseColor) }),
    [baseColor],
  );
  const reveal = hovered || selected;

  return (
    <button
      type="button"
      className={classy(
        'flex w-16 flex-col items-center gap-0 p-0 outline-none',
        'cursor-pointer select-none',
        'focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:rounded',
      )}
      onClick={onSelect}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      aria-current={selected || undefined}
      aria-label={`${color.name}${color.token ? ` (${color.token})` : ''}`}
    >
      <div
        className={classy(
          'w-full shrink-0 transition-all duration-200 ease-out',
          reveal ? 'h-10 rounded' : 'h-16 rounded-sm',
        )}
        style={swatchStyle}
        aria-hidden="true"
      />
      <div
        className={classy(
          'flex w-full flex-col items-center overflow-hidden transition-all duration-200',
          reveal ? 'mt-1.5 max-h-12 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <span className={classy('truncate text-center text-xs font-medium text-foreground w-full')}>
          {color.token ?? color.name}
        </span>
        <span className={classy('truncate text-center text-xs text-muted-foreground/30 w-full')}>
          {color.name}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// ColorDetail -- immersive specimen view built from system components
// ============================================================================

interface ColorDetailProps {
  color: ColorValue;
  onClose: () => void;
}

function ColorDetail({ color, onClose }: ColorDetailProps) {
  const baseColor = getBaseColor(color);
  const overlayColor = getOverlayTextColor(color);
  const washColor = color.scale[0];
  const hasAccessibility = !!color.accessibility;
  const hasCvd = !!color.accessibility?.cvd;
  const intelligence = color.intelligence;

  const emotionSentence = intelligence
    ? (intelligence.emotionalImpact.split(/\.\s/)[0] ?? intelligence.emotionalImpact)
    : null;

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <Container
      as="section"
      gap="6"
      padding="6"
      size="full"
      className={classy('rounded-lg')}
      style={washColor ? { backgroundColor: toOklchAlpha(washColor, 0.045) } : undefined}
    >
      {/* Hero: the color speaks */}
      <Container
        as="div"
        padding="8"
        className={classy('flex flex-col justify-end rounded-lg')}
        style={{
          backgroundColor: toOklchCss(baseColor),
          color: toOklchCss(overlayColor),
          minHeight: '12rem',
        }}
        data-color-hero=""
      >
        {emotionSentence ? (
          <Lead
            className={classy('font-light')}
            style={{ color: 'inherit', opacity: 0.85 }}
            data-hero-emotion=""
          >
            {emotionSentence}.
          </Lead>
        ) : null}
        <div className={classy('flex items-baseline gap-3 mt-4')}>
          <H2 className={classy('text-base')} style={{ color: 'inherit' }}>
            {color.name}
          </H2>
          {color.token ? (
            <Small style={{ color: 'inherit', opacity: 0.5 }}>{color.token}</Small>
          ) : null}
          <Muted className={classy('ml-auto')} style={{ color: 'inherit', opacity: 0.3 }}>
            {baseColor.l.toFixed(2)} / {baseColor.c.toFixed(3)} / {baseColor.h.toFixed(0)}
          </Muted>
        </div>

        {/* At-a-glance badges: WCAG, APCA, gamut */}
        <div className={classy('flex flex-wrap gap-2 mt-4')}>
          {hasAccessibility && color.accessibility ? (
            <>
              <Small
                className={classy('rounded px-2 py-0.5')}
                style={{ backgroundColor: toOklchAlpha(overlayColor, 0.12), color: 'inherit' }}
              >
                White {Math.round(color.accessibility.onWhite.contrastRatio * 10) / 10}:1
                {color.accessibility.onWhite.wcagAA ? ' AA' : ''}
                {color.accessibility.onWhite.wcagAAA ? ' AAA' : ''}
              </Small>
              <Small
                className={classy('rounded px-2 py-0.5')}
                style={{ backgroundColor: toOklchAlpha(overlayColor, 0.12), color: 'inherit' }}
              >
                Black {Math.round(color.accessibility.onBlack.contrastRatio * 10) / 10}:1
                {color.accessibility.onBlack.wcagAA ? ' AA' : ''}
                {color.accessibility.onBlack.wcagAAA ? ' AAA' : ''}
              </Small>
              {color.accessibility.apca ? (
                <Small
                  className={classy('rounded px-2 py-0.5')}
                  style={{ backgroundColor: toOklchAlpha(overlayColor, 0.08), color: 'inherit' }}
                >
                  APCA {Math.round(color.accessibility.apca.onWhite * 10) / 10} /{' '}
                  {Math.round(color.accessibility.apca.onBlack * 10) / 10}
                </Small>
              ) : null}
            </>
          ) : null}
          {inSrgb(baseColor.l, baseColor.c, baseColor.h) ? (
            <Small
              className={classy('rounded px-2 py-0.5')}
              style={{ backgroundColor: toOklchAlpha(overlayColor, 0.08), color: 'inherit' }}
            >
              sRGB
            </Small>
          ) : null}
          {inP3(baseColor.l, baseColor.c, baseColor.h) ? (
            <Small
              className={classy('rounded px-2 py-0.5')}
              style={{ backgroundColor: toOklchAlpha(overlayColor, 0.08), color: 'inherit' }}
            >
              P3
            </Small>
          ) : null}
        </div>
      </Container>

      {/* Scale ribbon */}
      <ColorScale scale={color.scale} name={color.name} />

      {/* Two-column body: matrix left, intelligence right */}
      <Grid preset="golden" gap="6">
        {/* Left: contrast matrix — visible, breathing */}
        <Grid.Item>
          {hasAccessibility && color.accessibility ? (
            <ContrastMatrix
              accessibility={{
                onWhite: color.accessibility.onWhite,
                onBlack: color.accessibility.onBlack,
                ...(color.accessibility.wcagAA ? { wcagAA: color.accessibility.wcagAA } : {}),
                ...(color.accessibility.wcagAAA ? { wcagAAA: color.accessibility.wcagAAA } : {}),
                ...(color.accessibility.apca ? { apca: color.accessibility.apca } : {}),
              }}
              scaleName={color.name}
              className={classy(
                '[&_[role=gridcell]]:h-6 [&_[role=gridcell]]:w-6',
                '[&_[role=columnheader]]:h-6 [&_[role=columnheader]]:w-6',
                '[&_[role=rowheader]]:h-6 [&_[role=rowheader]]:w-6',
              )}
            />
          ) : null}
        </Grid.Item>

        {/* Right: intelligence — all visible, no collapsible */}
        <Grid.Item>
          <Container as="article" gap="4">
            {intelligence ? (
              <>
                <P>{intelligence.reasoning}</P>
                {intelligence.culturalContext ? (
                  <Muted>{intelligence.culturalContext}</Muted>
                ) : null}
                {intelligence.usageGuidance ? <Muted>{intelligence.usageGuidance}</Muted> : null}
                {intelligence.accessibilityNotes ? (
                  <Muted>{intelligence.accessibilityNotes}</Muted>
                ) : null}
                {intelligence.balancingGuidance ? (
                  <Muted>{intelligence.balancingGuidance}</Muted>
                ) : null}
              </>
            ) : null}
          </Container>
        </Grid.Item>
      </Grid>

      {/* CVD simulation */}
      {hasCvd && color.accessibility?.cvd ? (
        <CVDSimulation
          scale={color.scale}
          name={color.name}
          cvd={color.accessibility.cvd}
          baseColor={baseColor}
          showOriginal
        />
      ) : null}
    </Container>
  );
}

// ============================================================================
// ColorFamily -- kept for backwards compat / standalone use
// ============================================================================

export interface ColorFamilyProps {
  color: ColorValue;
  selected?: boolean;
  onSelect?: () => void;
  onDeselect?: () => void;
  className?: string;
}

function ColorFamily({
  color,
  selected = false,
  onSelect,
  onDeselect,
  className,
}: ColorFamilyProps) {
  const [hovered, setHovered] = React.useState(false);
  const state = selected ? 'selected' : hovered ? 'hover' : 'resting';
  const showScale = state === 'hover' || state === 'selected';

  const baseColor = getBaseColor(color);
  const swatchStyle = React.useMemo(
    () => ({ backgroundColor: toOklchCss(baseColor) }),
    [baseColor],
  );

  return (
    <article
      data-color-state={state}
      {...(selected ? { 'aria-current': true } : {})}
      aria-label={`${color.name}${color.token ? ` (${color.token})` : ''}`}
      className={classy(
        'flex flex-col rounded-lg border border-border p-3 outline-none transition-all duration-200',
        className,
      )}
      onPointerEnter={() => !selected && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className={classy(
          'flex w-full items-center gap-3 text-left cursor-pointer select-none outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:rounded-sm',
        )}
        onClick={() => (selected ? onDeselect?.() : onSelect?.())}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selected ? onDeselect?.() : onSelect?.();
          } else if (e.key === 'Escape' && selected) {
            e.preventDefault();
            onDeselect?.();
          }
        }}
        aria-expanded={selected}
        aria-label={`${selected ? 'Collapse' : 'Expand'} ${color.name} color family`}
      >
        <div
          className={classy('h-8 w-8 shrink-0 rounded-md border border-border')}
          style={swatchStyle}
          aria-hidden="true"
        />
        <div className={classy('flex flex-col')}>
          <span className={classy('text-sm font-medium')}>{color.name}</span>
          {color.token ? (
            <span className={classy('text-xs text-muted-foreground')}>{color.token}</span>
          ) : null}
        </div>
      </button>
      <div
        className={classy(
          'overflow-hidden transition-all duration-200',
          showScale ? 'mt-3 max-h-96 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <ColorScale scale={color.scale} name={color.name} />
      </div>
    </article>
  );
}

ColorFamily.displayName = 'ColorFamily';

// ============================================================================
// ColorInspector -- specimen gallery: chip palette + immersive detail
// ============================================================================

export interface ColorInspectorProps {
  colors: ColorValue[];
  className?: string;
}

function ColorInspector({ colors, className }: ColorInspectorProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const selectedColor = selectedIndex !== null ? colors[selectedIndex] : undefined;

  return (
    <Container as="section" gap="0" aria-label="Color families" className={className}>
      {/* Horizontal chip palette */}
      <nav
        className={classy('flex gap-3 overflow-x-auto px-4 py-5')}
        aria-label="Color family list"
      >
        {colors.map((color, index) => (
          <ColorChip
            key={color.tokenId ?? color.name}
            color={color}
            selected={selectedIndex === index}
            onSelect={() => setSelectedIndex(selectedIndex === index ? null : index)}
          />
        ))}
      </nav>

      {/* Detail panel */}
      <Container as="div" padding="4">
        {selectedColor ? (
          <ColorDetail color={selectedColor} onClose={() => setSelectedIndex(null)} />
        ) : (
          <Muted className={classy('flex items-center justify-center py-24')}>
            Select a color to inspect
          </Muted>
        )}
      </Container>
    </Container>
  );
}

ColorInspector.displayName = 'ColorInspector';

// ============================================================================
// Exports
// ============================================================================

export {
  ColorScale,
  ContrastMatrix,
  CVDSimulation,
  ColorWeight,
  TokenIntelligence,
  ColorStory,
  ColorCharacter,
  ContrastPreview,
  ColorFamily,
  ColorInspector,
};

export default ColorInspector;
