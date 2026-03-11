import type { ColorValue } from '@rafters/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ColorCharacter,
  ColorFamily,
  ColorInspector,
  ColorScale,
  ColorStory,
  ColorWeight,
  ContrastMatrix,
  ContrastPreview,
  CVDSimulation,
  TokenIntelligence,
} from '../../src/components/ui/color-inspector';
import type { OklchColor } from '../../src/primitives/types';

// ============================================================================
// Test helpers
// ============================================================================

const SCALE_KEYS = [
  '50',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
  '950',
] as const;

function makeScale(): OklchColor[] {
  return SCALE_KEYS.map((_, i) => ({
    l: 0.98 - i * 0.09,
    c: 0.02 + (i < 6 ? i * 0.025 : (10 - i) * 0.025),
    h: 240,
  }));
}

function makeAccessibility() {
  return {
    onWhite: { wcagAA: true, wcagAAA: false, contrastRatio: 5.2 },
    onBlack: { wcagAA: true, wcagAAA: true, contrastRatio: 12.1 },
    wcagAA: {
      normal: [
        [0, 6],
        [0, 7],
        [1, 7],
        [2, 8],
      ],
      large: [
        [0, 5],
        [0, 6],
        [1, 6],
        [2, 7],
      ],
    },
    wcagAAA: {
      normal: [
        [0, 8],
        [0, 9],
      ],
      large: [
        [0, 7],
        [0, 8],
      ],
    },
    apca: { onWhite: 62.3, onBlack: -89.1, minFontSize: 14 },
  };
}

function makeColorValue(name: string, token?: string): ColorValue {
  const scale = makeScale();
  return {
    name,
    scale,
    token,
    accessibility: {
      ...makeAccessibility(),
      cvd: {
        deuteranopia: { l: 0.53, c: 0.08, h: 260 },
        protanopia: { l: 0.53, c: 0.06, h: 270 },
        tritanopia: { l: 0.53, c: 0.12, h: 200 },
      },
    },
    perceptualWeight: {
      weight: 0.72,
      density: 'medium' as const,
      balancingRecommendation: 'Pair with a lighter element.',
    },
    atmosphericWeight: {
      distanceWeight: 0.45,
      temperature: 'warm' as const,
      atmosphericRole: 'midground' as const,
    },
    analysis: {
      temperature: 'cool' as const,
      isLight: false,
      name,
    },
    intelligence: {
      reasoning: 'Derived from primary brand color',
      emotionalImpact: 'Trust and stability',
      culturalContext: 'Corporate blue',
      accessibilityNotes: 'Passes WCAG AA for normal text',
      usageGuidance: 'Primary interactive elements',
    },
  };
}

// ============================================================================
// ColorScale tests
// ============================================================================

describe('ColorScale', () => {
  it('renders 11 swatches with listbox role', () => {
    render(<ColorScale scale={makeScale()} name="ocean-blue" />);
    expect(screen.getByRole('listbox')).toBeDefined();
    expect(screen.getAllByRole('option')).toHaveLength(11);
  });

  it('passes className to container', () => {
    const { container } = render(
      <ColorScale scale={makeScale()} name="ocean-blue" className="test-class" />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('test-class');
  });
});

// ============================================================================
// ContrastMatrix tests
// ============================================================================

describe('ContrastMatrix', () => {
  it('renders grid role', () => {
    render(<ContrastMatrix accessibility={makeAccessibility()} scaleName="ocean-blue" />);
    expect(screen.getByRole('grid')).toBeDefined();
  });

  it('renders gridcell elements', () => {
    render(<ContrastMatrix accessibility={makeAccessibility()} scaleName="ocean-blue" />);
    const cells = screen.getAllByRole('gridcell');
    expect(cells.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// CVDSimulation tests
// ============================================================================

describe('CVDSimulation', () => {
  const cvdProps = {
    scale: makeScale(),
    name: 'ocean-blue',
    cvd: {
      deuteranopia: { l: 0.53, c: 0.08, h: 260 },
      protanopia: { l: 0.53, c: 0.06, h: 270 },
      tritanopia: { l: 0.53, c: 0.12, h: 200 },
    },
    baseColor: { l: 0.53, c: 0.145, h: 240 },
  };

  it('renders three CVD strips', () => {
    const { container } = render(<CVDSimulation {...cvdProps} />);
    const strips = container.querySelectorAll('[data-cvd-type]');
    expect(strips).toHaveLength(3);
  });

  it('renders four strips when showOriginal is true', () => {
    const { container } = render(<CVDSimulation {...cvdProps} showOriginal />);
    const strips = container.querySelectorAll('[data-cvd-type]');
    expect(strips).toHaveLength(4);
  });
});

// ============================================================================
// ColorWeight tests
// ============================================================================

describe('ColorWeight', () => {
  const weightProps = {
    perceptualWeight: {
      weight: 0.72,
      density: 'medium' as const,
      balancingRecommendation: 'Pair with a lighter element.',
    },
    atmosphericWeight: {
      distanceWeight: 0.45,
      temperature: 'warm' as const,
      atmosphericRole: 'midground' as const,
    },
  };

  it('renders balancing recommendation with role note', () => {
    render(<ColorWeight {...weightProps} />);
    expect(screen.getByRole('note')).toBeDefined();
  });

  it('sets data attributes on container', () => {
    const { container } = render(<ColorWeight {...weightProps} />);
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-density')).toBe('medium');
    expect(el.getAttribute('data-temperature')).toBe('warm');
  });
});

// ============================================================================
// TokenIntelligence tests
// ============================================================================

describe('TokenIntelligence', () => {
  it('renders do/never patterns', () => {
    const { container } = render(
      <TokenIntelligence
        usagePatterns={{
          dos: ['Use for primary actions'],
          nevers: ['Never use for backgrounds'],
        }}
      />,
    );
    expect(container.querySelector('[data-patterns-do]')).not.toBeNull();
    expect(container.querySelector('[data-patterns-never]')).not.toBeNull();
    expect(container.textContent).toContain('Use for primary actions');
    expect(container.textContent).toContain('Never use for backgrounds');
  });

  it('renders usage context', () => {
    const { container } = render(
      <TokenIntelligence usageContext={['Primary interactive elements']} />,
    );
    expect(container.querySelector('[data-usage-context]')).not.toBeNull();
  });

  it('renders trust level', () => {
    const { container } = render(<TokenIntelligence trustLevel="high" />);
    expect(container.querySelector('[data-trust-level]')).not.toBeNull();
    expect(container.textContent).toContain('high');
  });

  it('renders nothing when no data provided', () => {
    const { container } = render(<TokenIntelligence />);
    expect(container.firstChild).toBeNull();
  });

  it('renders override history', () => {
    const { container } = render(
      <TokenIntelligence
        userOverride={{
          previousValue: 'oklch(0.5 0.1 240)',
          reason: 'Brand refresh',
        }}
      />,
    );
    expect(container.querySelector('[data-user-override]')).not.toBeNull();
    expect(container.textContent).toContain('Brand refresh');
  });
});

// ============================================================================
// ColorStory tests
// ============================================================================

describe('ColorStory', () => {
  const intelligence = {
    reasoning: 'Balanced mid-tone lightness and moderate saturation',
    emotionalImpact: 'Tranquility and growth',
    culturalContext: 'Green symbolizes nature and prosperity',
    accessibilityNotes: 'Passes WCAG AA for normal text on white',
    usageGuidance: 'Suitable for backgrounds and accents',
  };

  it('renders reasoning as lead paragraph', () => {
    const { container } = render(<ColorStory intelligence={intelligence} />);
    expect(container.querySelector('[data-story-reasoning]')).not.toBeNull();
    expect(container.textContent).toContain('Balanced mid-tone');
  });

  it('renders emotion and reasoning visible, deep context collapsed', () => {
    const { container } = render(<ColorStory intelligence={intelligence} />);
    expect(container.querySelector('[data-story-emotion]')).not.toBeNull();
    expect(container.querySelector('[data-story-reasoning]')).not.toBeNull();
    // Deep context is behind a collapsible trigger
    expect(container.textContent).toContain('More context');
  });

  it('renders confidence meter when metadata present', () => {
    const withMeta = {
      ...intelligence,
      metadata: {
        predictionId: 'test-123',
        confidence: 0.95,
        uncertaintyBounds: { lower: 0.85, upper: 1, confidenceInterval: 0.95 },
        qualityScore: 0.83,
        method: 'bootstrap' as const,
      },
    };
    const { container } = render(<ColorStory intelligence={withMeta} />);
    expect(container.querySelector('[data-story-confidence]')).not.toBeNull();
    expect(container.querySelector('meter')).not.toBeNull();
  });

  it('omits confidence when no metadata', () => {
    const { container } = render(<ColorStory intelligence={intelligence} />);
    expect(container.querySelector('[data-story-confidence]')).toBeNull();
  });

  it('includes balancing in deep context when present', () => {
    const withBalancing = { ...intelligence, balancingGuidance: 'Pair with lighter elements' };
    const { container } = render(<ColorStory intelligence={withBalancing} />);
    // Balancing is behind the collapsible, but the trigger should exist
    expect(container.textContent).toContain('More context');
  });
});

// ============================================================================
// ColorCharacter tests
// ============================================================================

describe('ColorCharacter', () => {
  const testScale = makeScale();

  it('renders three atmospheric depth bands', () => {
    const { container } = render(
      <ColorCharacter
        analysis={{ temperature: 'cool', isLight: false, name: 'ocean-blue' }}
        scale={testScale}
      />,
    );
    expect(container.querySelector('[data-tag="background"]')).not.toBeNull();
    expect(container.querySelector('[data-tag="midground"]')).not.toBeNull();
    expect(container.querySelector('[data-tag="foreground"]')).not.toBeNull();
  });

  it('varies band height by density', () => {
    const { container: heavy } = render(
      <ColorCharacter
        analysis={{ temperature: 'warm', isLight: true, name: 'sunset' }}
        scale={testScale}
        perceptualWeight={{ weight: 0.8, density: 'heavy', balancingRecommendation: 'Test' }}
      />,
    );
    const { container: light } = render(
      <ColorCharacter
        analysis={{ temperature: 'cool', isLight: true, name: 'sky' }}
        scale={testScale}
        perceptualWeight={{ weight: 0.3, density: 'light', balancingRecommendation: 'Test' }}
      />,
    );
    const heavyBand = heavy.querySelector('[data-tag="background"]')?.parentElement;
    const lightBand = light.querySelector('[data-tag="background"]')?.parentElement;
    expect(heavyBand?.className).toContain('h-10');
    expect(lightBand?.className).toContain('h-5');
  });

  it('sets data attributes on container', () => {
    const { container } = render(
      <ColorCharacter analysis={{ temperature: 'cool', isLight: true, name: 'test' }} />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('data-temperature')).toBe('cool');
    expect(el.getAttribute('data-light')).toBe('true');
  });

  it('renders without scale (fallback)', () => {
    const { container } = render(
      <ColorCharacter analysis={{ temperature: 'neutral', isLight: false, name: 'test' }} />,
    );
    expect(container.querySelector('[data-tag="background"]')).not.toBeNull();
  });

  it('includes aria-label with character summary', () => {
    const { container } = render(
      <ColorCharacter
        analysis={{ temperature: 'cool', isLight: false, name: 'test' }}
        atmosphericWeight={{
          distanceWeight: 0.2,
          temperature: 'cool',
          atmosphericRole: 'background',
        }}
        perceptualWeight={{ weight: 0.5, density: 'medium', balancingRecommendation: 'Test' }}
      />,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.getAttribute('aria-label')).toContain('cool');
    expect(el.getAttribute('aria-label')).toContain('dark');
    expect(el.getAttribute('aria-label')).toContain('background');
    expect(el.getAttribute('aria-label')).toContain('medium');
  });
});

// ============================================================================
// ContrastPreview tests
// ============================================================================

describe('ContrastPreview', () => {
  it('renders list of contrast samples', () => {
    render(<ContrastPreview scale={makeScale()} />);
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);
  });

  it('shows pangram text in each sample', () => {
    render(<ContrastPreview scale={makeScale()} />);
    const items = screen.getAllByRole('listitem');
    const first = items[0] as HTMLElement;
    expect(first.textContent).toContain('The quick brown fox');
  });

  it('has inline styles for background and text color', () => {
    const { container } = render(<ContrastPreview scale={makeScale()} />);
    const items = container.querySelectorAll('[data-bg]');
    expect(items.length).toBeGreaterThan(0);
    const first = items[0] as HTMLElement;
    expect(first.getAttribute('data-bg')).toBeDefined();
    expect(first.getAttribute('data-fg')).toBeDefined();
  });

  it('shows scale position labels', () => {
    const { container } = render(<ContrastPreview scale={makeScale()} />);
    expect(container.textContent).toContain('50/');
  });
});

// ============================================================================
// ColorFamily tests
// ============================================================================

describe('ColorFamily', () => {
  it('renders color name and swatch in resting state', () => {
    const color = makeColorValue('ocean-blue', 'primary');
    render(<ColorFamily color={color} />);
    expect(screen.getByText('ocean-blue')).toBeDefined();
    expect(screen.getByText('primary')).toBeDefined();
  });

  it('has data-color-state resting by default', () => {
    const color = makeColorValue('ocean-blue');
    const { container } = render(<ColorFamily color={color} />);
    const el = container.querySelector('[data-color-state]') as HTMLElement;
    expect(el.getAttribute('data-color-state')).toBe('resting');
  });

  it('shows scale on hover', () => {
    const color = makeColorValue('ocean-blue');
    const { container } = render(<ColorFamily color={color} />);
    const el = container.querySelector('[data-color-state]') as HTMLElement;

    fireEvent.pointerEnter(el);
    expect(el.getAttribute('data-color-state')).toBe('hover');
    // The listbox should now be present (scale ribbon)
    expect(screen.getByRole('listbox')).toBeDefined();
  });

  it('expands sections on click (selected state)', () => {
    const onSelect = vi.fn();
    const color = makeColorValue('ocean-blue');
    render(<ColorFamily color={color} selected onSelect={onSelect} />);

    // In selected state, sections should be visible
    const buttons = screen.getAllByRole('button');
    // Should have collapsible triggers for sections
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('sets aria-current when selected', () => {
    const color = makeColorValue('ocean-blue');
    const { container } = render(<ColorFamily color={color} selected />);
    const el = container.querySelector('[data-color-state]') as HTMLElement;
    expect(el.getAttribute('aria-current')).toBe('true');
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    const color = makeColorValue('ocean-blue');
    render(<ColorFamily color={color} onSelect={onSelect} />);
    const btn = screen.getByRole('button');

    fireEvent.click(btn);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('calls onDeselect when Escape is pressed while selected', () => {
    const onDeselect = vi.fn();
    const color = makeColorValue('ocean-blue');
    render(<ColorFamily color={color} selected onDeselect={onDeselect} />);
    const btn = screen.getAllByRole('button')[0] as HTMLElement;

    fireEvent.keyDown(btn, { key: 'Escape' });
    expect(onDeselect).toHaveBeenCalledOnce();
  });
});

// ============================================================================
// ColorInspector tests
// ============================================================================

describe('ColorInspector', () => {
  it('renders chip for each color in left rail', () => {
    const colors = [
      makeColorValue('ocean-blue', 'primary'),
      makeColorValue('sunset-red', 'destructive'),
      makeColorValue('forest-green', 'success'),
    ];
    render(<ColorInspector colors={colors} />);

    // Chips hide text by default; verify via aria-label
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]?.getAttribute('aria-label')).toContain('ocean-blue');
    expect(buttons[1]?.getAttribute('aria-label')).toContain('sunset-red');
    expect(buttons[2]?.getAttribute('aria-label')).toContain('forest-green');
  });

  it('only allows one selection at a time', () => {
    const colors = [
      makeColorValue('ocean-blue', 'primary'),
      makeColorValue('sunset-red', 'destructive'),
    ];
    render(<ColorInspector colors={colors} />);

    const buttons = screen.getAllByRole('button');
    const firstBtn = buttons[0] as HTMLElement;
    const secondBtn = buttons[1] as HTMLElement;

    // Select first
    fireEvent.click(firstBtn);
    expect(firstBtn.getAttribute('aria-current')).toBe('true');
    expect(secondBtn.getAttribute('aria-current')).toBeNull();

    // Select second -- first should deselect
    fireEvent.click(secondBtn);
    expect(firstBtn.getAttribute('aria-current')).toBeNull();
    expect(secondBtn.getAttribute('aria-current')).toBe('true');
  });

  it('shows detail panel when color selected', () => {
    const colors = [makeColorValue('ocean-blue', 'primary')];
    render(<ColorInspector colors={colors} />);

    // Initially shows placeholder
    expect(screen.getByText('Select a color to inspect')).toBeDefined();

    // Click the chip
    fireEvent.click(screen.getByRole('button'));

    // Detail panel renders hero with color name
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('ocean-blue');
  });

  it('renders with region role', () => {
    const colors = [makeColorValue('ocean-blue')];
    render(<ColorInspector colors={colors} />);
    expect(screen.getByRole('region', { name: 'Color families' })).toBeDefined();
  });
});
