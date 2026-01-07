"use client"

import { useEffect, useState } from "react"
import { Store, ChevronDown, ExternalLink, Copy, Check, Building2 } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useSidebar } from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import Link from "next/link"

type EstablishmentData = {
  id: string
  name: string
  slug: string
  logo_url?: string | null
}

export function EstablishmentHeader() {
  const supabase = createBrowserSupabaseClient()
  const { isMobile, setOpenMobile } = useSidebar()
  const [establishment, setEstablishment] = useState<EstablishmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchEstablishment = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          console.error("Erro ao buscar usuário:", authError)
          setLoading(false)
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("establishment_id")
          .eq("id", user.id)
          .single()

        if (profileError || !profile?.establishment_id) {
          console.error("Erro ao buscar perfil:", profileError)
          setLoading(false)
          return
        }

        const { data: establishmentData, error: establishmentError } = await supabase
          .from("establishments")
          .select("id, name, slug, logo_url")
          .eq("id", profile.establishment_id)
          .single()

        if (establishmentError) {
          console.error("Erro ao buscar estabelecimento:", establishmentError)
        } else {
          setEstablishment(establishmentData)
        }
      } catch (error) {
        console.error("Erro ao carregar estabelecimento:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchEstablishment()
  }, [supabase])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getPublicUrl = () => {
    if (!establishment) return ""
    return `${window.location.origin}/${establishment.slug}`
  }

  const copyPublicLink = async () => {
    const url = getPublicUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Link copiado para a área de transferência!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Erro ao copiar:", error)
      toast.error("Erro ao copiar link")
    }
  }

  const openPublicPage = () => {
    const url = getPublicUrl()
    window.open(url, "_blank")
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 px-2 py-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    )
  }

  if (!establishment) {
    return (
      <div className="flex items-center gap-3 px-2 py-3">
        <Avatar className="h-10 w-10 rounded-lg">
          <AvatarFallback className="rounded-lg bg-muted">
            <Store className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 text-sm">
          <p className="font-medium text-muted-foreground">Sem estabelecimento</p>
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full outline-none">
        <div className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-sidebar-accent transition-colors">
          <Avatar className="h-10 w-10 rounded-lg">
            {establishment.logo_url && (
              <AvatarImage src={establishment.logo_url} alt={establishment.name} />
            )}
            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
              {getInitials(establishment.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left text-sm leading-tight">
            <p className="font-semibold truncate">{establishment.name}</p>
            <p className="text-xs text-muted-foreground truncate">/{establishment.slug}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{establishment.name}</p>
            <p className="text-xs text-muted-foreground">/{establishment.slug}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openPublicPage}>
          <ExternalLink className="h-4 w-4" />
          Abrir Página Pública
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyPublicLink}>
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              Link Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copiar Link Público
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/configuracoes"
            onClick={() => {
              if (isMobile) setOpenMobile(false)
            }}
          >
            <Building2 className="h-4 w-4" />
            Configurações do Estabelecimento
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}