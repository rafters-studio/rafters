import { Container } from '@/components/ui/container';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
} from '@/components/ui/sidebar';

export default function App() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <img src="logo.svg" width="64" />
        </SidebarHeader>
        <SidebarContent>menu</SidebarContent>
        <SidebarFooter>settings</SidebarFooter>
      </Sidebar>
      <Container as="main">
        <Container as="section" gap="6">
          workspace
        </Container>
      </Container>
    </SidebarProvider>
  );
}
