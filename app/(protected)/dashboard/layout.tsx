"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SessionMonitor } from "@/components/session-monitor";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";

// Mapa de rotas para títulos em português
const routeMap: Record<string, { title: string; parent?: string }> = {
  "/dashboard": { title: "Início", parent: "Painel" },
  "/dashboard/agendamentos": { title: "Agendamentos", parent: "Painel" },
  "/dashboard/servicos": { title: "Serviços", parent: "Painel" },
  "/dashboard/profissionais": { title: "Profissionais", parent: "Painel" },
  "/dashboard/clientes": { title: "Clientes", parent: "Painel" },
  "/dashboard/horarios": { title: "Horários", parent: "Painel" },
  "/dashboard/configuracoes": { title: "Configurações", parent: "Painel" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Busca as informações da rota atual
  const currentRoute = routeMap[pathname] || { title: "Página", parent: "Painel" };

  return (
    <SidebarProvider>
      <SessionMonitor />
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              {currentRoute.parent && (
                <>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">
                      {currentRoute.parent}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{currentRoute.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex items-center justify-end flex-1 gap-2">
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <ModeToggle />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}