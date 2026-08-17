import { Badge } from '@rafters/ui/components/ui/badge';
import { Button } from '@rafters/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rafters/ui/components/ui/card';
import { Container } from '@rafters/ui/components/ui/container';
import { Separator } from '@rafters/ui/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@rafters/ui/components/ui/sidebar';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@rafters/ui/components/ui/accordion';
import { H1, H2, H3, P, Code } from '@rafters/ui/components/ui/typography';
import { useEffect, useState } from 'react';
import type { ColorIntelligence, ColorValue, OKLCH } from '@rafters/shared';
import { buildColorValue } from '@rafters/color-utils';
import { createMemory } from '@rafters/ui/primitives/memory';
import { getTokens } from './api';
import { ColorCard } from './components/color-card/color-card';
import { ScaleStrip } from './components/scale-strip/scale-strip';
import { isInSRGBGamut, isInP3Gamut } from '@rafters/color-utils';
import { WcagMatrix } from './components/wcag-matrix/wcag-matrix';

type IntelCache = Record<string, ColorIntelligence | 'pending'>;
const intelStore = createMemory<IntelCache>(() => ({}));

async function fetchIntel(oklch: OKLCH, key: string): Promise<void> {
  const current = intelStore.get();
  if (current[key]) return;
  intelStore.patch({ [key]: 'pending' });
  try {
    const param = `${oklch.l.toFixed(3)}-${oklch.c.toFixed(3)}-${Math.round(oklch.h)}`;
    const res = await fetch(`/api/color/${param}?sync=true`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.color?.intelligence) {
      console.log('[studio] intel received for', key);
      intelStore.patch({ [key]: data.color.intelligence });
    } else {
      console.log('[studio] no intel in response', Object.keys(data.color ?? {}));
    }
  } catch {
    // API unreachable -- intel stays as 'pending'
  }
}

type Screen = 'spacing' | 'typography' | 'color' | 'motion';

const SCREENS: Array<{ key: Screen; label: string }> = [
  { key: 'spacing', label: 'Space' },
  { key: 'typography', label: 'Type' },
  { key: 'color', label: 'Color' },
  { key: 'motion', label: 'Motion' },
];

function SpacingScreen() {
  return (
    <Container as="section" gap size="5xl">
      <H2>Spacing / Radius / Depth / Focus</H2>
      <P color="muted">One base, one ratio, four scales respond.</P>

      <Container columns={2} gap="6">
        <Card>
          <CardHeader>
            <CardTitle as="h3">Spacing</CardTitle>
            <CardDescription>baseSpacingUnit drives the progression</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="3">
              <P size="sm" weight="medium">
                Base unit: 4px
              </P>
              <P size="sm" weight="medium">
                Ratio: minor-third (1.2)
              </P>
              <Separator />
              <P size="sm" color="muted">
                Scale
              </P>
              <Container columns={9} gap="1">
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <div
                    key={n}
                    style={{
                      width: `${n * 4}px`,
                      height: `${n * 4}px`,
                      backgroundColor: 'var(--primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                ))}
              </Container>
            </Container>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3">Radius</CardTitle>
            <CardDescription>Derives from spacing base * 1.5</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="3">
              <P size="sm" weight="medium">
                Base: 6px
              </P>
              <Separator />
              <Container columns={4} gap="2">
                {['sm', 'md', 'lg', 'xl'].map((name) => (
                  <Container key={name} gap="1">
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        backgroundColor: 'var(--muted)',
                        border: '1px solid var(--border)',
                        borderRadius: `var(--radius-${name})`,
                      }}
                    />
                    <Code>{name}</Code>
                  </Container>
                ))}
              </Container>
            </Container>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3">Depth</CardTitle>
            <CardDescription>Z-index layers</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="2">
              {['base', 'dropdown', 'sticky', 'modal', 'popover', 'tooltip', 'overlay'].map(
                (layer) => (
                  <Container key={layer} columns={2}>
                    <Code>{layer}</Code>
                    <Badge variant="outline" size="sm">{`z-depth-${layer}`}</Badge>
                  </Container>
                ),
              )}
            </Container>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3">Focus</CardTitle>
            <CardDescription>Ring width derives from spacing base / 2</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="3">
              <P size="sm" weight="medium">
                Ring width: 2px
              </P>
              <Separator />
              <Button>Focus me</Button>
            </Container>
          </CardContent>
        </Card>
      </Container>
    </Container>
  );
}

function TypographyScreen() {
  return (
    <Container as="section" gap size="5xl">
      <H2>Typography</H2>
      <P color="muted">Scale, families, weights, line heights.</P>

      <Container columns={2} gap="6">
        <Card>
          <CardHeader>
            <CardTitle as="h3">Families</CardTitle>
            <CardDescription>Role assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="4">
              <Container gap="1">
                <P size="sm" weight="medium">
                  Heading
                </P>
                <H3>The quick brown fox</H3>
              </Container>
              <Separator />
              <Container gap="1">
                <P size="sm" weight="medium">
                  Body
                </P>
                <P>The quick brown fox jumps over the lazy dog.</P>
              </Container>
              <Separator />
              <Container gap="1">
                <P size="sm" weight="medium">
                  Code
                </P>
                <Code>const x = 42;</Code>
              </Container>
            </Container>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3">Weights</CardTitle>
            <CardDescription>Available font weights</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="2">
              {(['normal', 'medium', 'semibold', 'bold'] as const).map((w) => (
                <Container key={w} columns={2}>
                  <Code>{w}</Code>
                  <P weight={w}>The quick brown fox</P>
                </Container>
              ))}
            </Container>
          </CardContent>
        </Card>
      </Container>
    </Container>
  );
}

const SCALE_LABELS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function parseOklch(value: string): OKLCH | null {
  const m = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!m) return null;
  return { l: Number(m[1]), c: Number(m[2]), h: Number(m[3]), alpha: 1 };
}

interface Token {
  name: string;
  namespace: string;
  value: unknown;
}

interface FamilyData {
  name: string;
  seed: OKLCH;
  colorValue: ColorValue;
}

function groupFamilies(tokens: Token[]): Map<string, FamilyData> {
  const byFamily = new Map<string, Map<string, OKLCH>>();
  for (const t of tokens) {
    if (typeof t.value !== 'string') continue;
    const oklch = parseOklch(t.value);
    if (!oklch) continue;
    const lastDash = t.name.lastIndexOf('-');
    if (lastDash === -1) continue;
    const family = t.name.slice(0, lastDash);
    const position = t.name.slice(lastDash + 1);
    if (!SCALE_LABELS.includes(position)) continue;
    if (!byFamily.has(family)) byFamily.set(family, new Map());
    byFamily.get(family)?.set(position, oklch);
  }

  const result = new Map<string, FamilyData>();
  for (const [family, positions] of byFamily) {
    const seed = positions.get('500');
    if (!seed) continue;
    const cv = buildColorValue(seed, { token: family });
    result.set(family, { name: family, seed, colorValue: cv });
  }
  return result;
}

interface SemanticRef {
  family: string;
  position: string;
}

function ColorScreen() {
  const [families, setFamilies] = useState<Map<string, FamilyData>>(new Map());
  const [semantics, setSemantics] = useState<Map<string, SemanticRef>>(new Map());

  useEffect(() => {
    const load = async () => {
      const result = await getTokens();
      if (!result.ok) return;
      const allTokens = result.tokens as Array<Token & { namespace: string }>;

      const colorTokens = allTokens.filter((t) => t.namespace === 'color');
      setFamilies(groupFamilies(colorTokens));

      const semTokens = allTokens.filter((t) => t.namespace === 'semantic');
      if (semTokens.length > 0) {
        const map = new Map<string, SemanticRef>();
        for (const t of semTokens) {
          const v = t.value as Record<string, unknown>;
          if (
            v &&
            typeof v.family === 'string' &&
            typeof v.position === 'string' &&
            !t.name.endsWith('--dark')
          ) {
            map.set(t.name, { family: v.family, position: v.position });
          }
        }
        setSemantics(map);
      }
    };
    load();
  }, []);

  const [intel, setIntel] = useState<IntelCache>(intelStore.get());
  useEffect(() => intelStore.subscribe(setIntel), []);

  const primaryRef = semantics.get('primary');
  const primaryFamily = primaryRef ? families.get(primaryRef.family) : undefined;
  const primaryPosition = primaryRef ? SCALE_LABELS.indexOf(primaryRef.position) : 5;

  useEffect(() => {
    if (!primaryFamily) return;
    const seed = primaryFamily.seed;
    const key = `${seed.l.toFixed(3)}-${seed.c.toFixed(3)}-${Math.round(seed.h)}`;
    fetchIntel(seed, key);
  }, [primaryFamily]);

  if (!primaryFamily) {
    return (
      <Container as="section" gap size="5xl">
        <H2>Color</H2>
        <P color="muted">Loading color data from registry...</P>
      </Container>
    );
  }

  const cv = primaryFamily.colorValue;
  const aaPairs = cv.accessibility?.wcagAA?.normal ?? [];
  const aaaPairs = cv.accessibility?.wcagAAA?.normal ?? [];

  return (
    <Container as="section" gap size="5xl">
      <H1>Color</H1>

      {(() => {
        const key = `${primaryFamily.seed.l.toFixed(3)}-${primaryFamily.seed.c.toFixed(3)}-${Math.round(primaryFamily.seed.h)}`;
        const cached = intel[key];
        const ci = cached && cached !== 'pending' ? cached : null;
        const seed = primaryFamily.seed;

        return (
          <>
            <Container columns={2} gap>
              <Container gap>
                <ColorCard
                  name={cv.name}
                  oklch={cv.scale[primaryPosition >= 0 ? primaryPosition : 5] ?? seed}
                  seed={seed}
                  srgb={isInSRGBGamut(seed)}
                  p3={!isInSRGBGamut(seed) && isInP3Gamut(seed)}
                  apca={
                    cv.accessibility?.apca
                      ? {
                          onWhite: cv.accessibility.apca.onWhite,
                          onBlack: cv.accessibility.apca.onBlack,
                        }
                      : undefined
                  }
                  perceptual={
                    cv.perceptualWeight
                      ? { density: cv.perceptualWeight.density, weight: cv.perceptualWeight.weight }
                      : undefined
                  }
                  atmospheric={
                    cv.atmosphericWeight
                      ? {
                          role: cv.atmosphericWeight.atmosphericRole,
                          temperature: cv.atmosphericWeight.temperature,
                        }
                      : undefined
                  }
                />
                <ScaleStrip
                  scale={cv.scale}
                  highlight={primaryPosition >= 0 ? primaryPosition : undefined}
                />
                {['secondary', 'accent', 'muted', 'destructive', 'success', 'warning', 'info'].map(
                  (role) => {
                    const ref = semantics.get(role);
                    if (!ref) return null;
                    const fam = families.get(ref.family);
                    if (!fam) return null;
                    const posIdx = SCALE_LABELS.indexOf(ref.position);
                    return (
                      <ScaleStrip
                        key={role}
                        scale={fam.colorValue.scale}
                        highlight={posIdx >= 0 ? posIdx : undefined}
                      />
                    );
                  },
                )}
                <WcagMatrix scale={cv.scale} aaPairs={aaPairs} aaaPairs={aaaPairs} />
              </Container>

              <Container gap>
                <Accordion type="multiple" defaultValue={['reasoning']}>
                  <AccordionItem value="reasoning">
                    <AccordionTrigger>Reasoning</AccordionTrigger>
                    <AccordionContent>
                      <P>{ci?.reasoning ?? 'awaiting enrichment'}</P>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="emotional-impact">
                    <AccordionTrigger>Emotional Impact</AccordionTrigger>
                    <AccordionContent>
                      <P>{ci?.emotionalImpact ?? 'awaiting enrichment'}</P>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="cultural-context">
                    <AccordionTrigger>Cultural Context</AccordionTrigger>
                    <AccordionContent>
                      <P>{ci?.culturalContext ?? 'awaiting enrichment'}</P>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="accessibility-notes">
                    <AccordionTrigger>Accessibility Notes</AccordionTrigger>
                    <AccordionContent>
                      <P>{ci?.accessibilityNotes ?? 'awaiting enrichment'}</P>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="usage-guidance">
                    <AccordionTrigger>Usage Guidance</AccordionTrigger>
                    <AccordionContent>
                      <P>{ci?.usageGuidance ?? 'awaiting enrichment'}</P>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Container>
            </Container>
          </>
        );
      })()}
    </Container>
  );
}

function MotionScreen() {
  return (
    <Container as="section" gap size="5xl">
      <H2>Motion</H2>
      <P color="muted">Durations, easings, intent.</P>

      <Container columns={2} gap="6">
        <Card>
          <CardHeader>
            <CardTitle as="h3">Duration Tiers</CardTitle>
            <CardDescription>Perceptual bands, not a scale</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="3">
              {[
                { name: 'micro', range: '50-120ms', def: '100ms' },
                { name: 'fast', range: '120-200ms', def: '150ms' },
                { name: 'moderate', range: '200-300ms', def: '250ms' },
                { name: 'normal', range: '300-400ms', def: '350ms' },
                { name: 'slow', range: '400-500ms', def: '500ms' },
              ].map(({ name, range, def }) => (
                <Container key={name} columns={3}>
                  <P size="sm" weight="medium">
                    {name}
                  </P>
                  <P size="sm" color="muted">
                    {range}
                  </P>
                  <Badge variant="secondary">{def}</Badge>
                </Container>
              ))}
            </Container>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3">Easing Curves</CardTitle>
            <CardDescription>Six curves, intent selects intensity</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="3">
              {[
                { name: 'standard', desc: 'mild decelerate' },
                { name: 'enter', desc: 'emphatic arrival' },
                { name: 'exit', desc: 'accelerate departure' },
                { name: 'linear', desc: 'null case' },
                { name: 'spring-smooth', desc: 'coast to rest' },
                { name: 'spring-snappy', desc: 'tight settle' },
              ].map(({ name, desc }) => (
                <Container key={name} columns={2}>
                  <P size="sm" weight="medium">
                    {name}
                  </P>
                  <P size="sm" color="muted">
                    {desc}
                  </P>
                </Container>
              ))}
            </Container>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3">Intent</CardTitle>
            <CardDescription>Starting position for all motion</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="3">
              <P size="sm" weight="medium">
                Current: efficient
              </P>
              <P size="sm" color="muted">
                Fast durations, decelerate curves, zero overshoot. Other intents arrive from future
                knobs studies.
              </P>
            </Container>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h3">Reduced Motion</CardTitle>
            <CardDescription>Respects prefers-reduced-motion</CardDescription>
          </CardHeader>
          <CardContent>
            <Container gap="3">
              <P size="sm" color="muted">
                All durations and delays resolve to zero. Loops slow but never stop.
              </P>
            </Container>
          </CardContent>
        </Card>
      </Container>
    </Container>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('spacing');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <P size="lg" weight="semibold">
            Studio
          </P>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Namespaces</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SCREENS.map((s) => (
                  <SidebarMenuItem key={s.key}>
                    <SidebarMenuButton isActive={screen === s.key} onClick={() => setScreen(s.key)}>
                      {s.label}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <Container as="header" padding="4">
          <SidebarTrigger />
        </Container>
        <Container as="main" padding="4">
          {screen === 'spacing' && <SpacingScreen />}
          {screen === 'typography' && <TypographyScreen />}
          {screen === 'color' && <ColorScreen />}
          {screen === 'motion' && <MotionScreen />}
        </Container>
      </SidebarInset>
    </SidebarProvider>
  );
}
