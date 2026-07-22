import { Container } from '@rafters/ui/components/ui/container';
import { Code, H1, H2, P } from '@rafters/ui/components/ui/typography';
import { TypeScaleToy } from './components/type-scale-toy';

export function App() {
  return (
    <Container as="main" size="5xl" padding="8">
      <Container as="header">
        <H1>rafters lab</H1>
        <P>
          Live dogfooding surface. Tailwind compiles utilities on the fly against a real{' '}
          <Code>rafters init</Code> token theme. Type and component toys prove the system before the
          registry ships them.
        </P>
      </Container>
      <Container as="section">
        <H2>Type toy 1 — baseline grid</H2>
        <P>
          Scale is <Code>--spacing</Code>-seeded and grid-snapped. Leading-as-length snaps to the
          rhythm; unitless drifts. Toggle text-box-trim to sit cap-height on the line.
        </P>
        <TypeScaleToy />
      </Container>
    </Container>
  );
}
