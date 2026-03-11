/**
 * Color Inspector -- left-rail chip selector with right-panel detail view
 *
 * Layout: vertical chip rail on the left, selected color's full data on the right.
 * Chips show swatch + name + token. On click, the right panel fills with
 * scale, accessibility, CVD, weight, intelligence.
 *
 * @cognitive-load 4/10 - Chip rail is scannable; detail appears on demand
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
import classy from '../../primitives/classy';
import type { ScalePosition } from '../../primitives/color-scale';
import { createColorScale } from '../../primitives/color-scale';
import { createColorWeight } from '../../primitives/color-weight';
import type { ContrastMatrixOptions } from '../../primitives/contrast-matrix';
import { createContrastMatrix } from '../../primitives/contrast-matrix';
import { createCvdSimulation } from '../../primitives/cvd-simulation';
import type { GamutTier, OklchColor } from '../../primitives/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';

// ============================================================================
// Shared helpers
// ============================================================================

function getBaseColor(color: ColorValue): OklchColor {
  const base = color.scale[5];
  if (base) return base;
  return { l: 0.5, c: 0.1, h: 0 };
}

function toOklchCss(c: OklchColor): string {
  return `oklch(${c.l} ${c.c} ${c.h})`;
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
        'text-xs font-mono',
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
        'flex flex-col gap-1 text-xs text-muted-foreground font-mono',
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
        <div data-trust-level="" className={classy('font-mono text-muted-foreground')}>
          <span className={classy('font-medium')}>Trust:</span> {trustLevel}
        </div>
      ) : null}

      {consequence ? (
        <div data-consequence="" className={classy('text-muted-foreground')}>
          <span className={classy('font-medium')}>Consequence:</span> {consequence}
        </div>
      ) : null}

      {dependsOn && dependsOn.length > 0 ? (
        <div data-depends-on="" className={classy('font-mono text-muted-foreground')}>
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
  return (
    <div className={classy('flex flex-col gap-4', className)} data-color-story="">
      <p data-story-reasoning="" className={classy('text-sm leading-relaxed text-foreground')}>
        {intelligence.reasoning}
      </p>

      <dl className={classy('grid grid-cols-1 gap-3 text-xs')}>
        <div data-story-emotion="">
          <dt className={classy('font-medium text-muted-foreground')}>Emotional impact</dt>
          <dd className={classy('mt-0.5 leading-relaxed text-foreground')}>
            {intelligence.emotionalImpact}
          </dd>
        </div>

        <div data-story-culture="">
          <dt className={classy('font-medium text-muted-foreground')}>Cultural context</dt>
          <dd className={classy('mt-0.5 leading-relaxed text-foreground')}>
            {intelligence.culturalContext}
          </dd>
        </div>

        <div data-story-accessibility="">
          <dt className={classy('font-medium text-muted-foreground')}>Accessibility</dt>
          <dd className={classy('mt-0.5 leading-relaxed text-foreground')}>
            {intelligence.accessibilityNotes}
          </dd>
        </div>

        <div data-story-usage="">
          <dt className={classy('font-medium text-muted-foreground')}>Usage guidance</dt>
          <dd className={classy('mt-0.5 leading-relaxed text-foreground')}>
            {intelligence.usageGuidance}
          </dd>
        </div>

        {intelligence.balancingGuidance ? (
          <div data-story-balancing="">
            <dt className={classy('font-medium text-muted-foreground')}>Balancing</dt>
            <dd className={classy('mt-0.5 leading-relaxed text-foreground')}>
              {intelligence.balancingGuidance}
            </dd>
          </div>
        ) : null}
      </dl>

      {intelligence.metadata ? (
        <div
          data-story-confidence=""
          className={classy('flex items-center gap-2 text-xs text-muted-foreground/60 font-mono')}
        >
          <meter
            className={classy('h-1.5 w-12 overflow-hidden rounded-full bg-muted')}
            aria-label="Confidence"
            value={intelligence.metadata.confidence}
            min={0}
            max={1}
          >
            {Math.round(intelligence.metadata.confidence * 100)}%
          </meter>
          <span>{Math.round(intelligence.metadata.confidence * 100)}% confidence</span>
        </div>
      ) : null}
    </div>
  );
}

ColorStory.displayName = 'ColorStory';

// ============================================================================
// ColorCharacter -- analysis summary: temperature, role, character
// ============================================================================

export interface ColorCharacterProps {
  analysis: ColorAnalysis;
  atmosphericWeight?: AtmosphericWeight;
  perceptualWeight?: PerceptualWeight;
  className?: string;
}

function ColorCharacter({
  analysis,
  atmosphericWeight,
  perceptualWeight,
  className,
}: ColorCharacterProps) {
  return (
    <div
      className={classy('flex flex-wrap gap-2', className)}
      data-color-character=""
      data-temperature={analysis.temperature}
      data-light={analysis.isLight}
    >
      <span
        className={classy(
          'inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs',
          analysis.temperature === 'warm' && 'text-orange-400',
          analysis.temperature === 'cool' && 'text-sky-400',
          analysis.temperature === 'neutral' && 'text-muted-foreground',
        )}
        data-tag="temperature"
      >
        {analysis.temperature}
      </span>

      <span
        className={classy(
          'inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground',
        )}
        data-tag="lightness"
      >
        {analysis.isLight ? 'light' : 'dark'}
      </span>

      {atmosphericWeight ? (
        <span
          className={classy(
            'inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground',
          )}
          data-tag="role"
        >
          {atmosphericWeight.atmosphericRole}
        </span>
      ) : null}

      {perceptualWeight ? (
        <span
          className={classy(
            'inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs',
            perceptualWeight.density === 'heavy' && 'text-foreground font-medium',
            perceptualWeight.density === 'light' && 'text-muted-foreground/60',
            perceptualWeight.density === 'medium' && 'text-muted-foreground',
          )}
          data-tag="density"
        >
          {perceptualWeight.density}
        </span>
      ) : null}
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
      className={classy('grid grid-cols-2 gap-2 list-none p-0 m-0', className)}
      data-contrast-preview=""
      aria-label="Contrast preview samples"
    >
      {shown.map((pair) => (
        <li
          key={`${pair.bgLabel}-${pair.fgLabel}`}
          className={classy('rounded-md px-3 py-2')}
          style={{ backgroundColor: toOklchCss(pair.bg), color: toOklchCss(pair.fg) }}
          data-bg={pair.bgLabel}
          data-fg={pair.fgLabel}
        >
          <span className={classy('text-sm leading-snug')}>
            The quick brown fox jumps over the lazy dog
          </span>
          <span
            className={classy('block font-mono text-muted-foreground/60 mt-0.5')}
            style={{ fontSize: '9px', color: 'inherit', opacity: 0.5 }}
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
// ColorChip -- sidebar item
// ============================================================================

interface ColorChipProps {
  color: ColorValue;
  selected: boolean;
  onSelect: () => void;
}

function ColorChip({ color, selected, onSelect }: ColorChipProps) {
  const baseColor = getBaseColor(color);
  const swatchStyle = React.useMemo(
    () => ({ backgroundColor: toOklchCss(baseColor) }),
    [baseColor],
  );

  return (
    <button
      type="button"
      className={classy(
        'flex w-full items-center gap-3 px-3 py-2 text-left outline-none',
        'cursor-pointer select-none transition-colors duration-100',
        'hover:bg-muted/50',
        'focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:ring-inset',
        selected && 'bg-muted/30',
      )}
      onClick={onSelect}
      aria-current={selected || undefined}
    >
      <div
        className={classy('h-6 w-6 shrink-0 rounded-sm')}
        style={swatchStyle}
        aria-hidden="true"
      />
      <div className={classy('flex min-w-0 flex-col')}>
        <span className={classy('truncate text-xs font-medium')}>{color.name}</span>
        {color.token ? (
          <span className={classy('truncate text-muted-foreground')} style={{ fontSize: '10px' }}>
            {color.token}
          </span>
        ) : null}
      </div>
    </button>
  );
}

// ============================================================================
// ColorDetail -- right panel content
// ============================================================================

interface ColorDetailProps {
  color: ColorValue;
  onClose: () => void;
}

function ColorDetail({ color, onClose }: ColorDetailProps) {
  const baseColor = getBaseColor(color);
  const hasAccessibility = !!color.accessibility;
  const hasCvd = !!color.accessibility?.cvd;
  const hasIntelligence = !!color.intelligence;

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sectionTriggerClass = classy(
    'w-full text-left font-medium uppercase tracking-widest text-muted-foreground',
    'hover:text-foreground transition-colors cursor-pointer',
  );

  return (
    <div className={classy('flex flex-col gap-6')}>
      {/* Header */}
      <div className={classy('flex items-center gap-4')}>
        <div
          className={classy('h-10 w-10 shrink-0 rounded')}
          style={{ backgroundColor: toOklchCss(baseColor) }}
          aria-hidden="true"
        />
        <div>
          <h2 className={classy('text-sm font-medium')}>{color.name}</h2>
          {color.token ? (
            <span className={classy('text-xs text-muted-foreground')}>{color.token}</span>
          ) : null}
        </div>
        <span
          className={classy('ml-auto font-mono text-muted-foreground/60')}
          style={{ fontSize: '10px' }}
        >
          L {baseColor.l.toFixed(2)} C {baseColor.c.toFixed(3)} H {baseColor.h.toFixed(0)}
        </span>
      </div>

      {/* Character tags */}
      {color.analysis ? (
        <ColorCharacter
          analysis={color.analysis}
          {...(color.atmosphericWeight ? { atmosphericWeight: color.atmosphericWeight } : {})}
          {...(color.perceptualWeight ? { perceptualWeight: color.perceptualWeight } : {})}
        />
      ) : null}

      {/* Scale */}
      <div>
        <h3
          className={classy('mb-2 font-medium uppercase tracking-widest text-muted-foreground')}
          style={{ fontSize: '10px' }}
        >
          Scale
        </h3>
        <ColorScale scale={color.scale} name={color.name} />
      </div>

      {/* Story -- the intelligence prose */}
      {hasIntelligence && color.intelligence ? (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className={sectionTriggerClass} style={{ fontSize: '10px' }}>
            Story
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ColorStory intelligence={color.intelligence} className={classy('mt-3')} />
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {/* Contrast preview */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className={sectionTriggerClass} style={{ fontSize: '10px' }}>
          Contrast
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ContrastPreview scale={color.scale} className={classy('mt-3')} />
        </CollapsibleContent>
      </Collapsible>

      {/* Sections grid for remaining atoms */}
      <div className={classy('grid grid-cols-1 gap-4 xl:grid-cols-2')}>
        {hasAccessibility && color.accessibility ? (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className={sectionTriggerClass} style={{ fontSize: '10px' }}>
              Accessibility
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ContrastMatrix
                accessibility={{
                  onWhite: color.accessibility.onWhite,
                  onBlack: color.accessibility.onBlack,
                  ...(color.accessibility.wcagAA ? { wcagAA: color.accessibility.wcagAA } : {}),
                  ...(color.accessibility.wcagAAA ? { wcagAAA: color.accessibility.wcagAAA } : {}),
                  ...(color.accessibility.apca ? { apca: color.accessibility.apca } : {}),
                }}
                scaleName={color.name}
                className={classy('mt-3')}
              />
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {hasCvd && color.accessibility?.cvd ? (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className={sectionTriggerClass} style={{ fontSize: '10px' }}>
              Color Vision
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CVDSimulation
                scale={color.scale}
                name={color.name}
                cvd={color.accessibility.cvd}
                baseColor={baseColor}
                showOriginal
                className={classy('mt-3')}
              />
            </CollapsibleContent>
          </Collapsible>
        ) : null}

        {color.perceptualWeight && color.atmosphericWeight ? (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className={sectionTriggerClass} style={{ fontSize: '10px' }}>
              Weight
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ColorWeight
                perceptualWeight={color.perceptualWeight}
                atmosphericWeight={color.atmosphericWeight}
                className={classy('mt-3')}
              />
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>
    </div>
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
// ColorInspector -- main layout: left rail + right detail
// ============================================================================

export interface ColorInspectorProps {
  colors: ColorValue[];
  className?: string;
}

function ColorInspector({ colors, className }: ColorInspectorProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const selectedColor = selectedIndex !== null ? colors[selectedIndex] : undefined;

  return (
    <section aria-label="Color families" className={classy('flex min-h-0 gap-0', className)}>
      {/* Left rail: chip list */}
      <nav
        className={classy('flex w-48 shrink-0 flex-col border-r border-border', 'overflow-y-auto')}
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

      {/* Right panel: detail view */}
      <div className={classy('flex-1 overflow-y-auto p-6')}>
        {selectedColor ? (
          <ColorDetail color={selectedColor} onClose={() => setSelectedIndex(null)} />
        ) : (
          <div
            className={classy(
              'flex h-full items-center justify-center text-xs text-muted-foreground/40',
            )}
          >
            Select a color to inspect
          </div>
        )}
      </div>
    </section>
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
