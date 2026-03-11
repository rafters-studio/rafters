/**
 * Color Inspector -- progressive-reveal color family inspection components
 *
 * Renders color families with three disclosure states: resting (paint chip),
 * hover (scale ribbon), selected (full inspector with collapsible sections).
 *
 * @cognitive-load 4/10 - Progressive reveal keeps resting state minimal
 * @attention-economics Resting: 3 facts (name, swatch, token). Hover: scale ribbon. Selected: full data sections.
 * @trust-building Animated transitions maintain object permanence; user controls disclosure depth
 * @accessibility aria-selected on active family, listbox/grid roles on data sections, keyboard navigation
 * @semantic-meaning Color intelligence: scale, accessibility, CVD simulation, weight, token intelligence
 *
 * @usage-patterns
 * DO: Use ColorInspector to display multiple color families with single-selection
 * DO: Use ColorFamily for individual color family display with progressive reveal
 * DO: Use section components (ColorScale, ContrastMatrix, etc.) standalone when needed
 * NEVER: Bypass the progressive reveal by forcing all sections open simultaneously
 * NEVER: Display more than one selected family at a time in ColorInspector
 */

import type { ColorValue } from '@rafters/shared';
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
// ColorScale
// ============================================================================

export interface ColorScaleProps {
  /** Array of 11 OKLCH values mapping to scale positions 50-950 */
  scale: OklchColor[];
  /** Color family name for ARIA labels */
  name: string;
  /** Optional gamut tier for each swatch */
  tiers?: GamutTier[];
  /** Called when a swatch receives focus via keyboard navigation */
  onSwatchFocus?: (position: ScalePosition, index: number) => void;
  /** Called when a swatch is clicked */
  onSwatchClick?: (position: ScalePosition, index: number) => void;
  className?: string;
}

/**
 * Thin React shell wrapping the color-scale leaf primitive.
 * Renders an OKLCH color scale as a navigable swatch strip with listbox semantics.
 */
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

    const cleanup = createColorScale(el, {
      scale,
      name,
      ...(tiers ? { tiers } : {}),
      ...(onSwatchFocus ? { onSwatchFocus } : {}),
      ...(onSwatchClick ? { onSwatchClick } : {}),
    });

    return cleanup;
  }, [scale, name, tiers, onSwatchFocus, onSwatchClick]);

  return <div ref={containerRef} className={classy('flex', className)} />;
}

ColorScale.displayName = 'ColorScale';

// ============================================================================
// ContrastMatrix
// ============================================================================

export interface ContrastMatrixProps {
  /** Accessibility data from ColorValue */
  accessibility: ContrastMatrixOptions['accessibility'];
  /** Color family name */
  scaleName: string;
  className?: string;
}

/**
 * Thin React shell wrapping the contrast-matrix leaf primitive.
 * Renders a WCAG contrast pairing grid with keyboard navigation.
 */
function ContrastMatrix({ accessibility, scaleName, className }: ContrastMatrixProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const cleanup = createContrastMatrix(el, { accessibility, scaleName });
    return cleanup;
  }, [accessibility, scaleName]);

  return <div ref={containerRef} className={classy(className)} />;
}

ContrastMatrix.displayName = 'ContrastMatrix';

// ============================================================================
// CVDSimulation
// ============================================================================

export interface CVDSimulationProps {
  /** Array of 11 OKLCH values mapping to scale positions 50-950 */
  scale: OklchColor[];
  /** Color family name */
  name: string;
  /** CVD simulation data for each deficiency type */
  cvd: {
    deuteranopia: OklchColor;
    protanopia: OklchColor;
    tritanopia: OklchColor;
  };
  /** The original base color for computing hue/chroma shifts */
  baseColor: OklchColor;
  /** Whether to show the original scale alongside for comparison */
  showOriginal?: boolean;
  className?: string;
}

/**
 * Thin React shell wrapping the cvd-simulation leaf primitive.
 * Renders parallel scale strips for each color vision deficiency.
 */
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

    const cleanup = createCvdSimulation(el, {
      scale,
      name,
      cvd,
      baseColor,
      ...(showOriginal !== undefined ? { showOriginal } : {}),
    });

    return cleanup;
  }, [scale, name, cvd, baseColor, showOriginal]);

  return <div ref={containerRef} className={classy(className)} />;
}

CVDSimulation.displayName = 'CVDSimulation';

// ============================================================================
// ColorWeight
// ============================================================================

export interface ColorWeightProps {
  /** Perceptual weight data */
  perceptualWeight: {
    weight: number;
    density: 'light' | 'medium' | 'heavy';
    balancingRecommendation: string;
  };
  /** Atmospheric weight data */
  atmosphericWeight: {
    distanceWeight: number;
    temperature: 'warm' | 'neutral' | 'cool';
    atmosphericRole: 'background' | 'midground' | 'foreground';
  };
  className?: string;
}

/**
 * Thin React shell wrapping the color-weight leaf primitive.
 * Displays perceptual weight, atmospheric weight, and balancing recommendation.
 */
function ColorWeight({ perceptualWeight, atmosphericWeight, className }: ColorWeightProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const cleanup = createColorWeight(el, { perceptualWeight, atmosphericWeight });
    return cleanup;
  }, [perceptualWeight, atmosphericWeight]);

  return <div ref={containerRef} className={classy(className)} />;
}

ColorWeight.displayName = 'ColorWeight';

// ============================================================================
// TokenIntelligence
// ============================================================================

export interface TokenIntelligenceProps {
  /** Do/never usage patterns */
  usagePatterns?: { dos: string[]; nevers: string[] };
  /** Usage context descriptions */
  usageContext?: string[];
  /** Trust level for the token */
  trustLevel?: string;
  /** Consequence description */
  consequence?: string;
  /** Token dependencies */
  dependsOn?: string[];
  /** Generation rule description */
  generationRule?: string;
  /** Override history */
  userOverride?: { previousValue: string; reason: string; context?: string };
  className?: string;
}

/**
 * Pure React component for displaying token intelligence data.
 * No primitive wrapper needed -- this is structured text rendering.
 */
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
    <div className={classy('flex flex-col gap-3 text-sm', className)} data-token-intelligence="">
      {usagePatterns ? (
        <div data-usage-patterns="">
          {usagePatterns.dos.length > 0 ? (
            <div data-patterns-do="">
              <span className={classy('font-medium text-success-foreground')}>Do:</span>
              <ul className={classy('ml-4 list-disc')}>
                {usagePatterns.dos.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {usagePatterns.nevers.length > 0 ? (
            <div data-patterns-never="">
              <span className={classy('font-medium text-destructive-foreground')}>Never:</span>
              <ul className={classy('ml-4 list-disc')}>
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
          <span className={classy('font-medium')}>Context:</span>
          <ul className={classy('ml-4 list-disc')}>
            {usageContext.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {trustLevel ? (
        <div data-trust-level="">
          <span className={classy('font-medium')}>Trust:</span> {trustLevel}
        </div>
      ) : null}

      {consequence ? (
        <div data-consequence="">
          <span className={classy('font-medium')}>Consequence:</span> {consequence}
        </div>
      ) : null}

      {dependsOn && dependsOn.length > 0 ? (
        <div data-depends-on="">
          <span className={classy('font-medium')}>Depends on:</span> {dependsOn.join(', ')}
        </div>
      ) : null}

      {generationRule ? (
        <div data-generation-rule="">
          <span className={classy('font-medium')}>Rule:</span> {generationRule}
        </div>
      ) : null}

      {userOverride ? (
        <div data-user-override="">
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
// ColorFamily
// ============================================================================

type DisclosureState = 'resting' | 'hover' | 'selected';

export interface ColorFamilyProps {
  /** The color value to display */
  color: ColorValue;
  /** Whether this family is currently selected */
  selected?: boolean;
  /** Called when this family is selected */
  onSelect?: () => void;
  /** Called when this family is deselected */
  onDeselect?: () => void;
  className?: string;
}

/**
 * Resolves the base OKLCH swatch color from a ColorValue.
 * Uses scale position 5 (the 500 step) as the representative color.
 */
function getBaseColor(color: ColorValue): OklchColor {
  const base = color.scale[5];
  if (base) return base;
  return { l: 0.5, c: 0.1, h: 0 };
}

/**
 * Formats an OKLCH color as a CSS oklch() string for inline styles.
 */
function toOklchCss(c: OklchColor): string {
  return `oklch(${c.l} ${c.c} ${c.h})`;
}

/** Section names for the selected state */
const SECTION_NAMES = ['Accessibility', 'Color Vision', 'Weight', 'Intelligence'] as const;

/**
 * Progressive-reveal color family component.
 * Resting: paint chip (swatch + name + token).
 * Hover: scale ribbon animates in.
 * Selected: full scale + collapsible sections for each data category.
 */
function ColorFamily({
  color,
  selected = false,
  onSelect,
  onDeselect,
  className,
}: ColorFamilyProps) {
  const [hovered, setHovered] = React.useState(false);

  const state: DisclosureState = selected ? 'selected' : hovered ? 'hover' : 'resting';
  const showScale = state === 'hover' || state === 'selected';
  const showSections = state === 'selected';

  const baseColor = getBaseColor(color);
  const swatchStyle = React.useMemo(
    () => ({ backgroundColor: toOklchCss(baseColor) }),
    [baseColor],
  );

  function handlePointerEnter() {
    if (!selected) setHovered(true);
  }

  function handlePointerLeave() {
    setHovered(false);
  }

  function handleClick() {
    if (selected) {
      onDeselect?.();
    } else {
      onSelect?.();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (selected) {
        onDeselect?.();
      } else {
        onSelect?.();
      }
    } else if (event.key === 'Escape' && selected) {
      event.preventDefault();
      onDeselect?.();
    }
  }

  const hasAccessibility = !!color.accessibility;
  const hasCvd = !!color.accessibility?.cvd;
  const hasWeight = !!(color.perceptualWeight && color.atmosphericWeight);
  const hasIntelligence = !!color.intelligence;

  return (
    <article
      data-color-state={state}
      {...(selected ? { 'aria-current': true } : {})}
      aria-label={`${color.name}${color.token ? ` (${color.token})` : ''}`}
      className={classy(
        'flex flex-col rounded-lg border border-border p-3 outline-none',
        'transition-all duration-200',
        className,
      )}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Paint chip: clickable header */}
      <button
        type="button"
        className={classy(
          'flex w-full items-center gap-3 text-left',
          'cursor-pointer select-none outline-none',
          'focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:rounded-sm',
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
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

      {/* Scale ribbon: visible on hover and selected */}
      <div
        className={classy(
          'overflow-hidden transition-all duration-200',
          showScale ? 'mt-3 max-h-96 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <ColorScale scale={color.scale} name={color.name} />
      </div>

      {/* Data sections: visible when selected */}
      {showSections ? (
        <div className={classy('mt-3 flex flex-col gap-2')}>
          {/* Accessibility section */}
          {hasAccessibility && color.accessibility ? (
            <div
              className={classy('transition-opacity duration-150')}
              style={{ transitionDelay: '0ms' }}
            >
              <Collapsible>
                <CollapsibleTrigger className={classy('w-full text-left text-sm font-medium')}>
                  {SECTION_NAMES[0]}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ContrastMatrix
                    accessibility={{
                      onWhite: color.accessibility.onWhite,
                      onBlack: color.accessibility.onBlack,
                      ...(color.accessibility.wcagAA ? { wcagAA: color.accessibility.wcagAA } : {}),
                      ...(color.accessibility.wcagAAA
                        ? { wcagAAA: color.accessibility.wcagAAA }
                        : {}),
                      ...(color.accessibility.apca ? { apca: color.accessibility.apca } : {}),
                    }}
                    scaleName={color.name}
                    className={classy('mt-2')}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}

          {/* Color Vision section */}
          {hasCvd && color.accessibility?.cvd ? (
            <div
              className={classy('transition-opacity duration-150')}
              style={{ transitionDelay: '50ms' }}
            >
              <Collapsible>
                <CollapsibleTrigger className={classy('w-full text-left text-sm font-medium')}>
                  {SECTION_NAMES[1]}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CVDSimulation
                    scale={color.scale}
                    name={color.name}
                    cvd={color.accessibility.cvd}
                    baseColor={baseColor}
                    showOriginal
                    className={classy('mt-2')}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}

          {/* Weight section */}
          {hasWeight && color.perceptualWeight && color.atmosphericWeight ? (
            <div
              className={classy('transition-opacity duration-150')}
              style={{ transitionDelay: '100ms' }}
            >
              <Collapsible>
                <CollapsibleTrigger className={classy('w-full text-left text-sm font-medium')}>
                  {SECTION_NAMES[2]}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ColorWeight
                    perceptualWeight={color.perceptualWeight}
                    atmosphericWeight={color.atmosphericWeight}
                    className={classy('mt-2')}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}

          {/* Intelligence section */}
          {hasIntelligence && color.intelligence ? (
            <div
              className={classy('transition-opacity duration-150')}
              style={{ transitionDelay: '150ms' }}
            >
              <Collapsible>
                <CollapsibleTrigger className={classy('w-full text-left text-sm font-medium')}>
                  {SECTION_NAMES[3]}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <TokenIntelligence
                    {...(color.intelligence.usageGuidance
                      ? { usageContext: [color.intelligence.usageGuidance] }
                      : {})}
                    {...(color.intelligence.accessibilityNotes
                      ? { consequence: color.intelligence.accessibilityNotes }
                      : {})}
                    {...(color.intelligence.reasoning
                      ? { generationRule: color.intelligence.reasoning }
                      : {})}
                    className={classy('mt-2')}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

ColorFamily.displayName = 'ColorFamily';

// ============================================================================
// ColorInspector
// ============================================================================

export interface ColorInspectorProps {
  /** Array of ColorValue objects to display */
  colors: ColorValue[];
  className?: string;
}

/**
 * Top-level orchestrator for color family inspection.
 * Renders multiple ColorFamily instances with single-selection (only one expanded at a time).
 */
function ColorInspector({ colors, className }: ColorInspectorProps) {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  return (
    <section aria-label="Color families" className={classy('flex flex-wrap gap-4', className)}>
      {colors.map((color, index) => (
        <ColorFamily
          key={color.tokenId ?? color.name}
          color={color}
          selected={selectedIndex === index}
          onSelect={() => setSelectedIndex(index)}
          onDeselect={() => setSelectedIndex(null)}
        />
      ))}
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
  ColorFamily,
  ColorInspector,
};

export default ColorInspector;
