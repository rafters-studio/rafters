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
import { Dialog } from '@rafters/ui/components/ui/dialog';
import { Field } from '@rafters/ui/components/ui/field';
import { Input } from '@rafters/ui/components/ui/input';
import { Separator } from '@rafters/ui/components/ui/separator';
import { Tabs } from '@rafters/ui/components/ui/tabs';
import { Tooltip } from '@rafters/ui/components/ui/tooltip';
import { P, Small } from '@rafters/ui/components/ui/typography';
import { useState } from 'react';

const NAMESPACES = [
  { key: 'color', label: 'Color', letter: 'C' },
  { key: 'spacing', label: 'Spacing', letter: 'S' },
  { key: 'typography', label: 'Typography', letter: 'T' },
  { key: 'radius', label: 'Radius', letter: 'R' },
  { key: 'shadow', label: 'Shadow', letter: 'Sh' },
  { key: 'depth', label: 'Depth', letter: 'D' },
  { key: 'motion', label: 'Motion', letter: 'M' },
  { key: 'focus', label: 'Focus', letter: 'F' },
] as const;

type NamespaceKey = (typeof NAMESPACES)[number]['key'];

interface NamespaceButtonProps {
  label: string;
  letter: string;
  active?: boolean;
  onClick?: () => void;
}

function NamespaceButton({ label, letter, active, onClick }: NamespaceButtonProps) {
  return (
    <Tooltip>
      <Tooltip.Trigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick}>
          <span className={active ? 'text-primary' : 'text-muted-foreground'}>{letter}</span>
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content side="right">{label}</Tooltip.Content>
    </Tooltip>
  );
}

export default function App() {
  const [activeNamespace, setActiveNamespace] = useState<NamespaceKey>('color');

  const currentNamespace = NAMESPACES.find((ns) => ns.key === activeNamespace);

  return (
    <Tooltip.Provider>
      <Container as="main" className="grid min-h-svh grid-cols-12 grid-rows-12">
        <Container as="nav" className="col-span-12 flex items-center gap-4" padding="2">
          <Small>Rafters Studio</Small>
          <Badge variant="muted" size="sm">
            {currentNamespace?.label}
          </Badge>
        </Container>

        <Container as="aside" className="col-span-1 row-span-11 flex flex-col" padding="2">
          {NAMESPACES.map((ns) => (
            <NamespaceButton
              key={ns.key}
              label={ns.label}
              letter={ns.letter}
              active={ns.key === activeNamespace}
              onClick={() => setActiveNamespace(ns.key)}
            />
          ))}

          <Separator className="my-2" />

          <P size="sm" color="muted">
            {NAMESPACES.length} ns
          </P>
        </Container>

        <Container as="section" className="col-span-11 row-span-11" padding="4">
          <Tabs defaultValue="tokens">
            <Tabs.List>
              <Tabs.Trigger value="tokens">Tokens</Tabs.Trigger>
              <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
              <Tabs.Trigger value="code">Code</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="tokens">
              <Dialog>
                <Dialog.Trigger asChild>
                  <Card interactive className="max-w-sm">
                    <CardHeader>
                      <CardTitle as="h4">primary-500</CardTitle>
                      <CardDescription>Base primary color</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <P size="sm" color="muted">
                        oklch(0.6 0.15 250)
                      </P>
                    </CardContent>
                  </Card>
                </Dialog.Trigger>

                <Dialog.Content>
                  <Dialog.Header>
                    <Dialog.Title>Edit primary-500</Dialog.Title>
                    <Dialog.Description>Modify the base primary color token</Dialog.Description>
                  </Dialog.Header>

                  <Field label="OKLCH Value" description="Lightness, Chroma, Hue">
                    <Input defaultValue="oklch(0.6 0.15 250)" />
                  </Field>

                  <Dialog.Footer className="mt-4">
                    <Dialog.Close asChild>
                      <Button variant="outline">Cancel</Button>
                    </Dialog.Close>
                    <Button>Save</Button>
                  </Dialog.Footer>
                </Dialog.Content>
              </Dialog>
            </Tabs.Content>

            <Tabs.Content value="preview">
              <P size="sm" color="muted">
                Live preview of {currentNamespace?.label} changes
              </P>
            </Tabs.Content>

            <Tabs.Content value="code">
              <P size="sm" color="muted">
                Generated CSS/Tailwind for {currentNamespace?.label}
              </P>
            </Tabs.Content>
          </Tabs>
        </Container>
      </Container>
    </Tooltip.Provider>
  );
}
