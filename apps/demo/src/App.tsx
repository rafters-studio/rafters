import { Container } from '@/components/ui/container'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
} from '@/components/ui/sidebar'

export default function App() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>rafters</SidebarHeader>
        <SidebarContent>menu</SidebarContent>
        <SidebarFooter>settings</SidebarFooter>
      </Sidebar>
      <Container as="main">
        <Container as="section" gap='6'>workspace</Container>
      </Container>
    </SidebarProvider>
  )
}
