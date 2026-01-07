"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Store, MapPin, Phone, Link2, Palette, Save } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type EstablishmentData = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  primary_color: string;
};

export default function EstablishmentSettingsPage() {
  const supabase = createBrowserSupabaseClient();

  const [establishment, setEstablishment] = useState<EstablishmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    phone: "",
    address: "",
    logo_url: "",
    primary_color: "#000000",
  });

  const fetchEstablishment = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Usuário não autenticado");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("establishment_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.establishment_id) {
        throw new Error("Estabelecimento não encontrado");
      }

      const { data: establishmentData, error: establishmentError } = await supabase
        .from("establishments")
        .select("*")
        .eq("id", profile.establishment_id)
        .single();

      if (establishmentError) throw establishmentError;

      setEstablishment(establishmentData);
      setFormData({
        name: establishmentData.name || "",
        slug: establishmentData.slug || "",
        phone: establishmentData.phone || "",
        address: establishmentData.address || "",
        logo_url: establishmentData.logo_url || "",
        primary_color: establishmentData.primary_color || "#000000",
      });
    } catch (error) {
      console.error("Erro ao carregar estabelecimento:", error);
      toast.error("Erro ao carregar dados do estabelecimento");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchEstablishment();
  }, [fetchEstablishment]);

  const handleSave = async () => {
    if (!establishment) return;

    if (!formData.name) {
      return toast.error("O nome do estabelecimento é obrigatório");
    }

    if (!formData.slug) {
      return toast.error("O slug é obrigatório");
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("establishments")
        .update({
          name: formData.name,
          slug: formData.slug,
          phone: formData.phone || null,
          address: formData.address || null,
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color,
        })
        .eq("id", establishment.id);

      if (error) throw error;

      toast.success("Configurações atualizadas com sucesso!");
      await fetchEstablishment();
    } catch (error) {
      console.error("Erro ao salvar:", error);

      // Definimos uma interface mínima para o erro do banco de dados
      const dbError = error as { code?: string };

      if (dbError.code === "23505") {
        toast.error("Este slug já está em uso. Escolha outro.");
      } else {
        toast.error("Erro ao salvar configurações");
      }
    } finally {
      setSaving(false);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: generateSlug(value),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!establishment) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="text-center py-12 text-muted-foreground">
          <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Estabelecimento não encontrado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Configurações do Estabelecimento</h1>
          <p className="text-muted-foreground">
            Gerencie as informações públicas do seu negócio
          </p>
        </div>

        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
            <CardDescription>
              Estas informações serão exibidas na sua página pública de agendamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Estabelecimento</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Barbearia do João"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">
                Link Público
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  (URL amigável para clientes)
                </span>
              </Label>
              <div className="flex items-center rounded-md border border-input px-3 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap select-none">
                  {typeof window !== "undefined" ? window.location.origin : ""}/
                </span>
                <input
                  id="slug"
                  className="flex h-9 w-full bg-transparent py-2 pl-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                  placeholder="barbearia-do-joao"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Clientes usarão este link para agendar horários
              </p>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(67) 99999-9999"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Endereço</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Rua exemplo, 123 - Centro, Cidade - UF"
                  className="pl-9 resize-none"
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Aparência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize as cores e logo da sua marca
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="logo_url">URL da Logo</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="logo_url"
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://exemplo.com/logo.png"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cole a URL de uma imagem hospedada online
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="primary_color">Cor Principal</Label>
              <div className="flex gap-3">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-20 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Esta cor será usada nos botões e destaques da página pública
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Botão Salvar */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={fetchEstablishment}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}