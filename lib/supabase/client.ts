import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        // Configurações de sessão
        autoRefreshToken: true,     // Renova automaticamente antes de expirar
        persistSession: true,       // Mantém sessão entre recarregamentos
        detectSessionInUrl: true,   // Detecta sessão na URL (magic links)
        flowType: 'pkce',          // Método mais seguro de autenticação
      },
    }
  );
}