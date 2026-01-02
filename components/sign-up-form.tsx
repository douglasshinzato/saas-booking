"use client";

import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  // Estados do Formulário
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [establishmentName, setEstablishmentName] = useState("");
  const [slug, setSlug] = useState("");

  // Estados de Interface
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Helper para gerar URL amigável (slug) automaticamente
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9]+/g, "-")     // Substitui espaços/símbolos por hífens
      .replace(/^-+|-+$/g, "");        // Remove hífens das pontas
  };

  const handleEstablishmentNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setEstablishmentName(name);
    // Gera o slug automaticamente se o usuário ainda não tiver definido um manualmente
    if (name) {
      setSlug(generateSlug(name));
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createBrowserSupabaseClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Estes dados são passados para o Trigger via 'raw_user_meta_data'
          data: {
            full_name: fullName,            // Mapeia para -> new.raw_user_meta_data->>'full_name'
            establishment_name: establishmentName, // Mapeia para -> new.raw_user_meta_data->>'establishment_name'
            slug: slug,                     // Mapeia para -> new.raw_user_meta_data->>'slug'
          },
          // URL para onde o usuário volta após clicar no email de confirmação
          emailRedirectTo: `${window.location.origin}/email-verification-success`,
        },
      });

      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Verifique seu email</CardTitle>
            <CardDescription>
              Enviamos um link de confirmação para <strong>{email}</strong>.
              <br className="mb-2" />
              Clique no link para ativar sua conta e liberar o acesso ao painel da <strong>{establishmentName}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Voltar para o Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>
            Comece a gerenciar seus agendamentos hoje mesmo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-4">

              {/* Dados Pessoais */}
              <div className="grid gap-2">
                <Label htmlFor="fullName">Seu Nome Completo</Label>
                <Input
                  id="fullName"
                  placeholder="Ex: Ana Silva"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@exemplo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Dados do Estabelecimento */}
              <div className="grid gap-2">
                <Label htmlFor="establishmentName">Nome do Estabelecimento</Label>
                <Input
                  id="establishmentName"
                  placeholder="Ex: Studio Ana Beauty"
                  required
                  value={establishmentName}
                  onChange={handleEstablishmentNameChange}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="slug">Link de Agendamento</Label>
                <div className="flex items-center rounded-md border border-input px-3 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap select-none">
                    /
                  </span>
                  <input
                    id="slug"
                    className="flex h-10 w-full bg-transparent py-2 pl-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="studio-ana-beauty"
                    required
                    value={slug}
                    onChange={(e) => setSlug(generateSlug(e.target.value))} // Permite edição manual também
                  />
                </div>
                <p className="text-[0.8rem] text-muted-foreground">
                  Seus clientes usarão este link para agendar.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Criando conta..." : "Criar conta grátis"}
              </Button>
            </div>

            <div className="mt-4 text-center text-sm">
              Já tem uma conta?{" "}
              <Link href="/login" className="underline underline-offset-4">
                Fazer Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}