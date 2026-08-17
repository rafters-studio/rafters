import { Container } from '@/components/ui/container';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { useState } from 'react';

type Page = 'workspace' | 'typography';

export default function App() {
  const [page, setPage] = useState<Page>('workspace');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <img src="logo.svg" width="64" />
        </SidebarHeader>
        <SidebarContent>
          <nav className="flex flex-col gap-1 p-2">
            <button
              onClick={() => setPage('workspace')}
              className={`text-left px-3 py-1.5 rounded-md text-body-small ts-body-small ${page === 'workspace' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
            >
              Workspace
            </button>
            <button
              onClick={() => setPage('typography')}
              className={`text-left px-3 py-1.5 rounded-md text-body-small ts-body-small ${page === 'typography' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}`}
            >
              Typography
            </button>
          </nav>
        </SidebarContent>
        <SidebarFooter>settings</SidebarFooter>
      </Sidebar>
      <Container as="main">
        {page === 'workspace' && (
          <Container as="section" gap="6">
            workspace
          </Container>
        )}
        {page === 'typography' && (
          <Container as="section" gap="6">
            typography
          </Container>
        )}
      </Container>
    </SidebarProvider>
  );
}
