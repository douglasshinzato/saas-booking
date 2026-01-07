"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export function SessionMonitor() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    // Listener para mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        toast.error("Sua sessão expirou. Faça login novamente.")
        router.push("/login")
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("✅ Token renovado automaticamente")
      } else if (event === 'USER_UPDATED') {
        console.log("ℹ️ Dados do usuário atualizados")
      }
    })

    // Cleanup
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return null
}