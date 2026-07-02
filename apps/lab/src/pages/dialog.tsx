import * as React from 'react';
import { Button } from '../../../../packages/ui/src/components/button/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../../packages/ui/src/components/dialog/dialog';
import { Container } from '@rafters/ui/components/ui/container';
import { Grid } from '@rafters/ui/components/ui/grid';
import { Code, H1, H2, P, Small } from '@rafters/ui/components/ui/typography';

function BasicSection() {
  return (
    <Container as="section">
      <H2>Modal (default)</H2>
      <P>
        Open it, then try Tab (trapped), Escape (closes, restores focus), and clicking the overlay
        (dismisses). Body scroll locks while open. All of it is the score's effects list --
        <Code>focus-trap</Code>, <Code>scroll-lock</Code>, <Code>dismiss-on-outside</Code> -- not
        binding code.
      </P>
      <Dialog>
        <DialogTrigger asChild>
          <Button>Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workspace</DialogTitle>
            <DialogDescription>
              This removes the workspace and its history. The action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="destructive">Delete</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

function ControlledSection() {
  const [open, setOpen] = React.useState(false);
  return (
    <Container as="section">
      <H2>Controlled</H2>
      <P>
        The consumer owns <Code>open</Code>; the score never stores it. Escape and outside-click
        request the change through <Code>onOpenChange</Code>, and the dialog moves only when the
        prop does.
      </P>
      <Grid columns={{ base: 1, md: 3 }}>
        <Button onClick={() => setOpen(true)}>Open from outside</Button>
        <Container>
          <Small>
            open: <Code>{String(open)}</Code>
          </Small>
        </Container>
      </Grid>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controlled dialog</DialogTitle>
            <DialogDescription>
              No trigger in the tree at all -- state lives with the consumer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close via setState
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

function NonModalSection() {
  return (
    <Container as="section">
      <H2>Non-modal</H2>
      <P>
        <Code>modal=false</Code> drops <Code>aria-modal</Code>, the overlay, the trap, and the
        scroll lock -- the effects list is empty. Escape still closes while focus is inside.
      </P>
      <Dialog modal={false}>
        <DialogTrigger asChild>
          <Button variant="secondary">Open non-modal</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Non-modal panel</DialogTitle>
            <DialogDescription>
              The page behind stays scrollable and reachable by keyboard.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

function NoDescriptionSection() {
  return (
    <Container as="section">
      <H2>Registration</H2>
      <P>
        Omit <Code>DialogDescription</Code> and the content renders with NO{' '}
        <Code>aria-describedby</Code> -- absence, not a dangling id reference. Parts register with
        the root; unrendered parts project empty ids.
      </P>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost">Open title-only dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Just a title</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

export function DialogPage() {
  return (
    <Container as="article">
      <Container as="header">
        <H1>Dialog</H1>
        <P>
          The second test article: the first composed score -- <Code>disclosable</Code> slice,
          structure slice, glue -- and the first effectful multi-part component.
        </P>
      </Container>
      <BasicSection />
      <ControlledSection />
      <NonModalSection />
      <NoDescriptionSection />
    </Container>
  );
}
