import type { ColorValue } from '@rafters/shared';
import {
  ColorInspector,
  ColorScale,
  ColorStory,
  ContrastMatrix,
  ContrastPreview,
  TokenIntelligence,
} from '@rafters/ui/components/ui/color-inspector';
import { Container } from '@rafters/ui/components/ui/container';
import fixtureData from '../../fixtures/indigo-color-system.json';

// ---------------------------------------------------------------------------
// Load real color system fixture (Tailwind indigo-500 -> full Rafters harmony)
// All 11 families with intelligence from the API
// ---------------------------------------------------------------------------

const colors = fixtureData.colors as ColorValue[];
const primary = colors[0] as ColorValue;

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
          ContrastPreview (primary)
        </h3>
        <ContrastPreview scale={primary.scale} />
      </section>

      {primary.intelligence ? (
        <section>
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            ColorStory (primary)
          </h3>
          <ColorStory intelligence={primary.intelligence} />
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
