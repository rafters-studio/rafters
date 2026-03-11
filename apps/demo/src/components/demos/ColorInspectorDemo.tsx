import { buildColorValue } from '@rafters/color-utils';
import {
  ColorInspector,
  ColorScale,
  ContrastMatrix,
  TokenIntelligence,
} from '@rafters/ui/components/ui/color-inspector';
import { Container } from '@rafters/ui/components/ui/container';

// ---------------------------------------------------------------------------
// Build real ColorValue objects from OKLCH base colors using pure math
// ---------------------------------------------------------------------------

const primary = buildColorValue({ l: 0.53, c: 0.15, h: 240 }, { token: 'primary', value: '500' });
const secondary = buildColorValue(
  { l: 0.55, c: 0.16, h: 15 },
  { token: 'secondary', value: '500' },
);
const accent = buildColorValue({ l: 0.6, c: 0.14, h: 145 }, { token: 'accent', value: '500' });
const neutral = buildColorValue({ l: 0.5, c: 0.015, h: 240 }, { token: 'neutral', value: '500' });
const destructive = buildColorValue(
  { l: 0.5, c: 0.2, h: 25 },
  { token: 'destructive', value: '500' },
);
const success = buildColorValue({ l: 0.6, c: 0.18, h: 155 }, { token: 'success', value: '500' });

const colors = [primary, secondary, accent, neutral, destructive, success];

// ---------------------------------------------------------------------------
// Default demo: full ColorInspector with all families
// ---------------------------------------------------------------------------

export default function ColorInspectorDemo() {
  return <ColorInspector colors={colors} />;
}

// ---------------------------------------------------------------------------
// Variants demo: individual sub-components shown standalone
// ---------------------------------------------------------------------------

export function ColorInspectorVariants() {
  return (
    <Container as="div" gap="12">
      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          ColorScale (primary)
        </h3>
        <ColorScale scale={primary.scale} name={primary.name} />
      </section>

      {primary.accessibility ? (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            ContrastMatrix (primary)
          </h3>
          <ContrastMatrix accessibility={primary.accessibility} scaleName={primary.name} />
        </section>
      ) : null}

      <section>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          TokenIntelligence
        </h3>
        <TokenIntelligence
          usagePatterns={{
            dos: [
              'Use primary for main interactive elements and key actions',
              'Pair with neutral for text-heavy layouts',
              'Use the 500 step as the base; 50-200 for backgrounds, 700-950 for text',
            ],
            nevers: [
              'Never use primary on primary backgrounds without checking contrast',
              'Never combine primary and secondary at equal visual weight',
              'Never use scale positions below 600 for body text on white',
            ],
          }}
          usageContext={[
            'Brand identity anchor across all product surfaces',
            'Interactive element default (buttons, links, focus rings)',
          ]}
          trustLevel="high"
          consequence="Misuse breaks brand consistency and WCAG compliance simultaneously"
          dependsOn={['--color-primary-base', '--color-primary-scale']}
          generationRule="Scale generated from OKLCH base via contrast-targeted lightness curve"
        />
      </section>
    </Container>
  );
}
