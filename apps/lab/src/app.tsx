/**
 * Behavior-layer lab -- button, the first test article.
 *
 * One behavior definition (button.behavior.ts) rendered by two live
 * bindings on the same page: the React component and the <rafters-button>
 * Web Component. Same classes, same ARIA projection, same keymap.
 */
import * as React from 'react';
import { Button, buttonVariants, type ButtonVariant } from '@rafters/ui/next/button';
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
    <Container as="section" gap="4">
      <H2>Variants</H2>
      <P>
        The shadcn superset: shadcn's six plus the oracle's additions. Classes are literal
        semantic-token strings selected by <Code>button.classes.ts</Code>.
      </P>
      <Grid columns={{ base: 2, md: 4 }} gap="4">
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
    <Container as="section" gap="4">
      <H2>Sizes</H2>
      <Grid columns={4} gap="4">
        <Button size="xs">xs</Button>
        <Button size="sm">sm</Button>
        <Button size="default">default</Button>
        <Button size="lg">lg</Button>
      </Grid>
      <P>
        Icon sizes require an accessible name at the type level -- omitting <Code>aria-label</Code>{' '}
        on an icon size is a compile error, not a lint warning.
      </P>
      <Grid columns={4} gap="4">
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
    <Container as="section" gap="4">
      <H2>States beyond shadcn</H2>
      <P>
        Loading keeps the label, keeps focus, and suppresses re-activation through{' '}
        <Code>canDispatch</Code> -- click it and try clicking again. A live region announces the
        transition to screen readers.
      </P>
      <Grid columns={{ base: 1, md: 3 }} gap="4">
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
        <Container gap="2">
          <Small>
            Toggle state: <Code>aria-pressed={String(muted)}</Code>
          </Small>
        </Container>
      </Grid>
      <P>
        Two disabled models: hard disabled is the native attribute; soft-disabled stays focusable
        and discoverable (<Code>aria-disabled</Code>) while actions no-op. Tab through them to feel
        the difference.
      </P>
      <Grid columns={{ base: 1, md: 3 }} gap="4">
        <Button disabled>Hard disabled</Button>
        <Button softDisabled>Soft disabled</Button>
        <Button softDisabled toggle>
          Soft-disabled toggle
        </Button>
      </Grid>
    </Container>
  );
}

function CompatSection() {
  // The shadcn escape hatch: buttonVariants() styles non-button elements.
  // Rendered through asChild so the design system still owns the element.
  const linkClasses = buttonVariants({ variant: 'link' });

  return (
    <Container as="section" gap="4">
      <H2>shadcn compatibility</H2>
      <P>
        <Code>asChild</Code> renders the child as the root part, and <Code>buttonVariants()</Code>{' '}
        is exported cva-signature-compatible. The first {linkClasses.split(' ').length} classes it
        returns are the same literals the component itself wears.
      </P>
      <Grid columns={{ base: 1, md: 2 }} gap="4">
        <Button asChild variant="outline">
          <a href="#top">asChild link</a>
        </Button>
        <Button asChild variant="link">
          <a href="#top">asChild link, link variant</a>
        </Button>
      </Grid>
    </Container>
  );
}

function WebComponentSection() {
  return (
    <Container as="section" gap="4">
      <H2>Same behavior, no React</H2>
      <P>
        These are <Code>&lt;rafters-button&gt;</Code> Web Components -- the identical behavior file,
        classes, and ARIA projection with zero React. The conformance harness runs the same suite
        against both bindings.
      </P>
      <Grid columns={{ base: 2, md: 4 }} gap="4">
        <rafters-button variant="primary">primary</rafters-button>
        <rafters-button variant="destructive" size="lg">
          destructive lg
        </rafters-button>
        <rafters-button toggle>toggle me</rafters-button>
        <rafters-button loading loading-announcement="Loading">
          loading
        </rafters-button>
      </Grid>
    </Container>
  );
}

export function App() {
  return (
    <Container as="main" size="5xl" padding="8" gap="12" id="top">
      <Container as="header" gap="2">
        <H1>Behavior Layer Lab</H1>
        <P>
          Button is the first test article for the behavior-layer constitution: one
          framework-agnostic definition, presented by every binding. This page is a proving ground
          -- it never deploys.
        </P>
      </Container>
      <VariantsSection />
      <SizesSection />
      <StatesSection />
      <CompatSection />
      <WebComponentSection />
      <Container as="footer" gap="2">
        <Small>
          Spec: packages/ui/docs/spec -- issue #1752 -- conformance: axe + contract + interaction,
          React and WC adapters.
        </Small>
      </Container>
    </Container>
  );
}
