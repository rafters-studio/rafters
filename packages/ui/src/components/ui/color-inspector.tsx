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

const SECTION_NAMES = ['Accessibility', 'Color Vision', 'Weight', 'Intelligence'] as const;

interface ColorDetailProps {
  color: ColorValue;
  onClose: () => void;
}

function ColorDetail({ color, onClose }: ColorDetailProps) {
  const baseColor = getBaseColor(color);
  const hasAccessibility = !!color.accessibility;
  const hasCvd = !!color.accessibility?.cvd;
  const hasWeight = !!(color.perceptualWeight && color.atmosphericWeight);
  const hasIntelligence = !!color.intelligence;

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

      {/* Sections grid */}
      <div className={classy('grid grid-cols-1 gap-4 xl:grid-cols-2')}>
        {hasAccessibility && color.accessibility ? (
          <Collapsible defaultOpen>
            <CollapsibleTrigger
              className={classy(
                'w-full text-left font-medium uppercase tracking-widest text-muted-foreground',
                'hover:text-foreground transition-colors cursor-pointer',
              )}
              style={{ fontSize: '10px' }}
            >
              {SECTION_NAMES[0]}
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
            <CollapsibleTrigger
              className={classy(
                'w-full text-left font-medium uppercase tracking-widest text-muted-foreground',
                'hover:text-foreground transition-colors cursor-pointer',
              )}
              style={{ fontSize: '10px' }}
            >
              {SECTION_NAMES[1]}
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

        {hasWeight && color.perceptualWeight && color.atmosphericWeight ? (
          <Collapsible defaultOpen>
            <CollapsibleTrigger
              className={classy(
                'w-full text-left font-medium uppercase tracking-widest text-muted-foreground',
                'hover:text-foreground transition-colors cursor-pointer',
              )}
              style={{ fontSize: '10px' }}
            >
              {SECTION_NAMES[2]}
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

        {hasIntelligence && color.intelligence ? (
          <Collapsible defaultOpen>
            <CollapsibleTrigger
              className={classy(
                'w-full text-left font-medium uppercase tracking-widest text-muted-foreground',
                'hover:text-foreground transition-colors cursor-pointer',
              )}
              style={{ fontSize: '10px' }}
            >
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
  ColorFamily,
  ColorInspector,
};

export default ColorInspector;
