"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Search, Ban, Phone, Loader2, User } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Importações dos componentes shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// 1. Tipos
type Professional = {
  id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  establishment_id: string;
  created_at: string;
};

export default function ProfessionalsPage() {
  const supabase = createBrowserSupabaseClient();

  // States
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // States de UI
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  // --- ACTIONS ---

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Usuário não autenticado");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("establishment_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (profile) setEstablishmentId(profile.establishment_id);

      const { data: professionalsData, error: professionalsError } = await supabase
        .from("professionals")
        .select("*")
        .eq("establishment_id", profile.establishment_id)
        .order("name");

      if (professionalsError) throw professionalsError;
      setProfessionals(professionalsData || []);

    } catch (error) {
      console.error("Erro detalhado:", JSON.stringify(error, null, 2));
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!formData.name) return toast.error("O nome do profissional é obrigatório");
    if (!establishmentId) return toast.error("Erro: Estabelecimento não identificado");

    setIsSaving(true);
    try {
      if (editingProfessional) {
        // Update
        const { error } = await supabase
          .from("professionals")
          .update({
            name: formData.name,
            phone: formData.phone || null,
          })
          .eq("id", editingProfessional.id);

        if (error) throw error;
        toast.success("Profissional atualizado!");
      } else {
        // Create
        const { error } = await supabase
          .from("professionals")
          .insert({
            name: formData.name,
            phone: formData.phone || null,
            is_active: true,
            establishment_id: establishmentId,
          });

        if (error) throw error;
        toast.success("Profissional criado!");
      }

      await fetchData();
      closeDialog();
    } catch (error) {
      console.error("Erro ao salvar:", JSON.stringify(error, null, 2));
      toast.error("Erro ao salvar profissional");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setProfessionalToDelete(id);
  };

  const handleDelete = async () => {
    if (!professionalToDelete) return;

    try {
      const { error } = await supabase
        .from("professionals")
        .delete()
        .eq("id", professionalToDelete);

      if (error) throw error;

      toast.success("Profissional excluído");
      setProfessionals(prev => prev.filter(p => p.id !== professionalToDelete));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir profissional");
    } finally {
      setProfessionalToDelete(null);
    }
  };

  const handleToggleActive = async (professional: Professional) => {
    try {
      const newStatus = !professional.is_active;
      setProfessionals(prev =>
        prev.map(p => p.id === professional.id ? { ...p, is_active: newStatus } : p)
      );

      const { error } = await supabase
        .from("professionals")
        .update({ is_active: newStatus })
        .eq("id", professional.id);

      if (error) {
        setProfessionals(prev =>
          prev.map(p => p.id === professional.id ? { ...p, is_active: !newStatus } : p)
        );
        throw error;
      }

      toast.success(newStatus ? "Profissional ativado" : "Profissional desativado");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao alterar status");
    }
  };

  // --- HELPERS ---
  const handleEdit = (professional: Professional) => {
    setEditingProfessional(professional);
    setFormData({
      name: professional.name,
      phone: professional.phone || "",
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProfessional(null);
    setFormData({
      name: "",
      phone: "",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setEditingProfessional(null), 300);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredProfessionals = professionals.filter((professional) =>
    professional.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (professional.phone?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const activeProfessionals = filteredProfessionals.filter(p => p.is_active);
  const inactiveProfessionals = filteredProfessionals.filter(p => !p.is_active);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Profissionais</h1>
            <p className="text-muted-foreground">Gerencie sua equipe de profissionais</p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Profissional
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar profissionais..."
            className="pl-10"
          />
        </div>

        {!loading && professionals.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum profissional cadastrado.</p>
            <Button variant="link" onClick={handleCreate} className="mt-2">
              Adicionar o primeiro profissional
            </Button>
          </div>
        )}

        {/* Profissionais Ativos */}
        {activeProfessionals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              Ativos
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {activeProfessionals.length}
              </span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProfessionals.map((professional) => (
                <Card
                  key={professional.id}
                  className="group relative transition-all hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:block">
                      {/* Header com Avatar e Nome */}
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(professional.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 lg:pr-10">
                          <h3 className="font-medium truncate">{professional.name}</h3>
                          {professional.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{professional.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className={cn(
                        "flex gap-1 justify-end mt-2",
                        "opacity-100",
                        "lg:absolute lg:right-4 lg:top-4 lg:mt-0",
                        "lg:opacity-0 lg:group-hover:opacity-100",
                        "lg:bg-background/90 lg:backdrop-blur-sm lg:p-1 lg:rounded-lg lg:border lg:shadow-sm",
                        "transition-opacity z-10"
                      )}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleEdit(professional)}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-muted"
                          onClick={() => handleToggleActive(professional)}
                          title="Desativar"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => confirmDelete(professional.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Profissionais Inativos */}
        {inactiveProfessionals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              Inativos
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                {inactiveProfessionals.length}
              </span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveProfessionals.map((professional) => (
                <Card
                  key={professional.id}
                  className="group relative transition-all hover:shadow-md opacity-60 grayscale-[0.5] border-dashed"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:block">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-12 w-12 shrink-0">
                          <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                            {getInitials(professional.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 lg:pr-10">
                          <h3 className="font-medium truncate flex items-center gap-2">
                            {professional.name}
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                              Inativo
                            </span>
                          </h3>
                          {professional.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                              <Phone className="h-3.5 w-3.5" />
                              <span>{professional.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={cn(
                        "flex gap-1 justify-end mt-2",
                        "opacity-100",
                        "lg:absolute lg:right-4 lg:top-4 lg:mt-0",
                        "lg:opacity-0 lg:group-hover:opacity-100",
                        "lg:bg-background/90 lg:backdrop-blur-sm lg:p-1 lg:rounded-lg lg:border lg:shadow-sm",
                        "transition-opacity z-10"
                      )}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleEdit(professional)}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-muted"
                          onClick={() => handleToggleActive(professional)}
                          title="Ativar"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => confirmDelete(professional.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DIALOG DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingProfessional ? "Editar Profissional" : "Novo Profissional"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do profissional abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG DE EXCLUSÃO */}
      <AlertDialog open={!!professionalToDelete} onOpenChange={() => setProfessionalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o profissional
              e todos os seus agendamentos associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}