"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Search, Clock, DollarSign, Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Importações dos componentes shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

// 1. Tipos
type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category: string | null;
  is_active: boolean;
  establishment_id: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  "Hair": "Cabelo",
  "Beard": "Barba",
  "Combo": "Combo",
  "Eyebrows": "Sobrancelha",
  "Other": "Outros"
};

export default function ServicesPage() {
  const supabase = createBrowserSupabaseClient();

  // States
  const [services, setServices] = useState<Service[]>([]);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // States de UI
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Controla o Dialog de Cadastro
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null); // Controla o Alert de Exclusão
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: 30,
    price: 0,
    category: "Hair",
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

      const { data: servicesData, error: servicesError } = await supabase
        .from("services")
        .select("*")
        .order("name");

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

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
    if (!formData.name) return toast.error("O nome do serviço é obrigatório");
    if (!establishmentId) return toast.error("Erro: Estabelecimento não identificado");

    setIsSaving(true);
    try {
      if (editingService) {
        // Update
        const { error } = await supabase
          .from("services")
          .update({
            name: formData.name,
            description: formData.description,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
            category: formData.category,
          })
          .eq("id", editingService.id);

        if (error) throw error;
        toast.success("Serviço atualizado!");
      } else {
        // Create
        const { error } = await supabase
          .from("services")
          .insert({
            name: formData.name,
            description: formData.description,
            duration_minutes: formData.duration_minutes,
            price: formData.price,
            category: formData.category,
            is_active: true,
            establishment_id: establishmentId,
          });

        if (error) throw error;
        toast.success("Serviço criado!");
      }

      await fetchData();
      closeDialog();
    } catch (error) {
      console.error("Erro ao salvar:", JSON.stringify(error, null, 2));
      toast.error("Erro ao salvar serviço");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setServiceToDelete(id);
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;

    try {
      const { error } = await supabase.from("services").delete().eq("id", serviceToDelete);
      if (error) throw error;

      toast.success("Serviço excluído");
      setServices(prev => prev.filter(s => s.id !== serviceToDelete));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir serviço");
    } finally {
      setServiceToDelete(null);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      const newStatus = !service.is_active;
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: newStatus } : s));

      const { error } = await supabase
        .from("services")
        .update({ is_active: newStatus })
        .eq("id", service.id);

      if (error) {
        setServices(prev => prev.map(s => s.id === service.id ? { ...s, is_active: !newStatus } : s));
        throw error;
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao alterar status");
    }
  };

  // --- HELPERS ---
  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      duration_minutes: service.duration_minutes,
      price: service.price,
      category: service.category || "Other",
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingService(null);
    setFormData({
      name: "",
      description: "",
      duration_minutes: 30,
      price: 0,
      category: "Hair",
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setEditingService(null), 300); // Aguarda animação
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (service.description?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const uniqueCategories = Array.from(new Set([
    "Hair", "Beard", "Combo", "Other",
    ...services.map(s => s.category || "Other")
  ]));

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
            <h1 className="text-2xl font-bold">Serviços</h1>
            <p className="text-muted-foreground">Gerencie os serviços oferecidos</p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Serviço
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar serviços..."
            className="pl-10"
          />
        </div>

        {!loading && services.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <p>Nenhum serviço cadastrado.</p>
            <Button variant="link" onClick={handleCreate} className="mt-2">
              Criar o primeiro serviço
            </Button>
          </div>
        )}

        {uniqueCategories.map((categoryKey) => {
          const categoryServices = filteredServices.filter((s) => (s.category || "Other") === categoryKey);
          if (categoryServices.length === 0) return null;
          return (
            <div key={categoryKey} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                {CATEGORY_LABELS[categoryKey] || categoryKey}
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{categoryServices.length}</span>
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryServices.map((service) => (
                  <Card
                    key={service.id}
                    className={cn(
                      "group relative transition-all hover:shadow-md",
                      !service.is_active && "opacity-60 grayscale-[0.5] border-dashed"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 pr-10">
                          <h3 className="font-medium flex items-center gap-2">
                            {service.name}
                            {!service.is_active && (
                              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                                Inativo
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 min-h-10 mt-1">
                            {service.description || "Sem descrição"}
                          </p>
                        </div>

                        {/* Ações (Edit, Toggle, Delete) */}
                        <div className="flex gap-1 absolute right-4 top-4 bg-background/90 backdrop-blur-sm p-1 rounded-lg border shadow-sm transition-opacity opacity-100 lg:opacity-0 lg:group-hover:opacity-100 z-10">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => handleEdit(service)}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted"
                            onClick={() => handleToggleActive(service)}
                            title={service.is_active ? "Desativar" : "Ativar"}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => confirmDelete(service.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t">
                        <div className="flex items-center gap-1.5 text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{service.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-1 font-semibold text-primary">
                          <span className="text-xs font-normal text-muted-foreground">R$</span>
                          <span>{service.price.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* DIALOG DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do serviço abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Serviço</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Corte Degradê"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes (opcional)"
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duração (min)</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    step="5"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="1.00"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hair">Cabelo</SelectItem>
                  <SelectItem value="Beard">Barba</SelectItem>
                  <SelectItem value="Combo">Combo</SelectItem>
                  <SelectItem value="Eyebrows">Sobrancelha</SelectItem>
                  <SelectItem value="Other">Outros</SelectItem>
                </SelectContent>
              </Select>
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
      <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o serviço do seu estabelecimento.
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