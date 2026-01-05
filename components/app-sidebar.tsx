"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { SearchForm } from "@/components/search-form";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { EstablishmentHeader } from "./establishment-header";

// Dados de navegação
const data = {
  navMain: [
    {
      title: "Painel",
      items: [
        {
          title: "Início",
          url: "/dashboard",
        },
        {
          title: "Agendamentos",
          url: "/dashboard/agendamentos",
        },
        {
          title: "Serviços",
          url: "/dashboard/servicos",
        },
        {
          title: "Profissionais",
          url: "/dashboard/profissionais",
        },
        {
          title: "Clientes",
          url: "/dashboard/clientes",
        },
        {
          title: "Horários",
          url: "/dashboard/horarios",
        },
        {
          title: "Configurações",
          url: "/dashboard/configuracoes",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <EstablishmentHeader />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((menuItem) => {
                  const isActive = pathname === menuItem.url;

                  return (
                    <SidebarMenuItem key={menuItem.title}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <a href={menuItem.url}>{menuItem.title}</a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}