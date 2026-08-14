import { Container } from '@/components/ui/container';
import { Grid } from '@/components/ui/grid';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { H1, H2, H3, P, Code, Small, Blockquote, UL, OL, LI, Mark } from '@/components/type';

function SpecimenRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 py-2">
      <code className="shrink-0 w-56 text-xs text-muted-foreground">{label}</code>
      <div>{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
      {children}
    </div>
  );
}

export function TypographySpecimen() {
  return (
    <Container as="main" size="4xl" padding="6">
      <Container as="section" gap="8">
        {/* Type Components with default compositions */}
        <div>
          <SectionLabel>Type Components -- default compositions</SectionLabel>

          <SpecimenRow label="<H1>">
            <H1>Display Heading</H1>
          </SpecimenRow>
          <SpecimenRow label="<H2>">
            <H2>Section Heading</H2>
          </SpecimenRow>
          <SpecimenRow label="<H3>">
            <H3>Subsection</H3>
          </SpecimenRow>
          <SpecimenRow label="<P>">
            <P>Body text. The workhorse. Most of the words on screen.</P>
          </SpecimenRow>
          <SpecimenRow label="<Small>">
            <Small>Caption label text</Small>
          </SpecimenRow>
          <SpecimenRow label="<Code>">
            <Code>const system = 'rafters';</Code>
          </SpecimenRow>
        </div>

        {/* as prop demo requires Studio-authored compositions -- not yet available */}

        {/* Article Container -- native HTML */}
        <div>
          <SectionLabel>Article Container -- native HTML, zero imports</SectionLabel>

          <Container as="article">
            <h1>The Typography System</h1>
            <p>
              Text is the interface. If the hierarchy is not clear in the typography alone, no
              amount of color or spacing saves it.
            </p>

            <h2>Two Mechanisms</h2>
            <p>
              The <code>--text-*</code> namespace carries four type metrics. The <code>ts-*</code>{' '}
              utility carries everything else.
            </p>

            <h3>Assignments Select Positions</h3>
            <p>
              An assignment is a pure reference. It adds <mark>zero new values</mark> to the system.
            </p>

            <blockquote>
              Which values are the designer's. How many, and where they are allowed, is intent.
            </blockquote>

            <ul>
              <li>Article container -- native HTML, auto-styled</li>
              <li>Components -- typography baked in</li>
              <li>
                Type components -- <code>as</code> prop selects composition
              </li>
            </ul>

            <ol>
              <li>
                A component API <strong>and</strong> a prose layer from one source
              </li>
              <li>Sparse compositions with auto-drop</li>
              <li>Free per-member override at the call site</li>
            </ol>

            <p>
              <small>Every value references the --rafters-* settings layer.</small>
            </p>
          </Container>
        </div>

        {/* Component Pattern */}
        <div>
          <SectionLabel>Components -- typography baked in</SectionLabel>

          <Grid columns={2} gap="4">
            <Card>
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>
                  The agent writes Card. Typography is internal. Change the composition in Studio,
                  every card moves.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Another Card</CardTitle>
                <CardDescription>One source. Three consumer paths. No drift.</CardDescription>
              </CardHeader>
            </Card>
          </Grid>
        </div>
      </Container>
    </Container>
  );
}
