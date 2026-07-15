import * as React from 'react';
import { Button, type ButtonVariant } from '../../../../packages/ui/src/components/button/button';
import { Container } from '@rafters/ui/components/ui/container';
import { Grid } from '@rafters/ui/components/ui/grid';
import { Code, H1, H2, P, Small } from '@rafters/ui/components/ui/typography';

const VARIANTS: ButtonVariant[] = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
  'outline',
  'ghost',
  'link',
];

function VariantsSection() {
  return (
    <Container as="section">
      <H2>Variants</H2>
      <P>The shadcn superset. Classes are literal semantic-token strings in the behavior file.</P>
      <Grid columns={{ base: 2, md: 4 }}>
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
      </Grid>
    </Container>
  );
}

function SizesSection() {
  return (
    <Container as="section">
      <H2>Sizes</H2>
      <Grid columns={4}>
        <Button size="xs">xs</Button>
        <Button size="sm">sm</Button>
        <Button size="default">default</Button>
        <Button size="lg">lg</Button>
      </Grid>
      <P>
        Icon sizes require an accessible name at the type level -- omitting <Code>aria-label</Code>{' '}
        on an icon size is a compile error, not a lint warning.
      </P>
      <Grid columns={4}>
        <Button size="icon-xs" aria-label="Add item">
          +
        </Button>
        <Button size="icon-sm" aria-label="Add item">
          +
        </Button>
        <Button size="icon" aria-label="Add item">
          +
        </Button>
        <Button size="icon-lg" aria-label="Add item">
          +
        </Button>
      </Grid>
    </Container>
  );
}

function StatesSection() {
  const [saving, setSaving] = React.useState(false);
  const [muted, setMuted] = React.useState(false);

  const simulateSave = () => {
    setSaving(true);
    window.setTimeout(() => setSaving(false), 2500);
  };

  return (
    <Container as="section">
      <H2>States beyond shadcn</H2>
      <P>
        Loading keeps the label, keeps focus, and suppresses re-activation through{' '}
        <Code>canDispatch</Code> -- click it and try clicking again.
      </P>
      <Grid columns={{ base: 1, md: 3 }}>
        <Button loading={saving} onClick={simulateSave} loadingAnnouncement="Saving your changes">
          Save changes
        </Button>
        <Button
          toggle
          pressed={muted}
          onPressedChange={setMuted}
          variant={muted ? 'accent' : 'outline'}
        >
          {muted ? 'Muted' : 'Mute'}
        </Button>
        <Container>
          <Small>
            Toggle state: <Code>aria-pressed={String(muted)}</Code>
          </Small>
        </Container>
      </Grid>
      <P>
        Two disabled models: hard disabled is the native attribute; soft-disabled stays focusable
        and discoverable (<Code>aria-disabled</Code>) while actions no-op.
      </P>
      <Grid columns={{ base: 1, md: 3 }}>
        <Button disabled>Hard disabled</Button>
        <Button softDisabled>Soft disabled</Button>
        <Button softDisabled toggle>
          Soft-disabled toggle
        </Button>
      </Grid>
    </Container>
  );
}

export function ButtonPage() {
  return (
    <Container as="article">
      <Container as="header">
        <H1>Button</H1>
        <P>
          The first test article: one framework-agnostic score, presented by the React performance.
        </P>
      </Container>
      <VariantsSection />
      <SizesSection />
      <StatesSection />
    </Container>
  );
}
