"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Search, Loader2, Users, Mail, Phone as PhoneIcon } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Tipos
type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  establishment_id: string;
  created_at: string;
};

export default function ClientesPage() {
  const supabase = createBrowserSupabaseClient();

  // States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // States de UI
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    phone: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
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

      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*")
        .eq("establishment_id", profile.establishment_id)
        .order("name");

      if (customersError) throw customersError;
      setCustomers(customersData || []);

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
    // Validação
    const newErrors = {
      name: "",
      phone: "",
    };

    if (!formData.name.trim()) {
      newErrors.name = "O nome é obrigatório";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "O telefone é obrigatório";
    }

    setErrors(newErrors);

    // Se houver erros, não prosseguir
    if (newErrors.name || newErrors.phone) {
      return;
    }

    if (!establishmentId) return toast.error("Erro: Estabelecimento não identificado");

    setIsSaving(true);
    try {
      if (editingCustomer) {
        // Update
        const { error } = await supabase
          .from("customers")
          .update({
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
          })
          .eq("id", editingCustomer.id);

        if (error) throw error;
        toast.success("Cliente atualizado!");
      } else {
        // Create
        const { error } = await supabase
          .from("customers")
          .insert({
            name: formData.name,
            phone: formData.phone,
            email: formData.email || null,
            establishment_id: establishmentId,
          });

        if (error) throw error;
        toast.success("Cliente criado!");
      }

      await fetchData();
      closeDialog();
    } catch (error) {
      console.error("Erro ao salvar:", JSON.stringify(error, null, 2));
      toast.error("Erro ao salvar cliente");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (id: string) => {
    setCustomerToDelete(id);
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;

    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customerToDelete);

      if (error) throw error;

      toast.success("Cliente excluído");
      setCustomers(prev => prev.filter(c => c.id !== customerToDelete));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir cliente");
    } finally {
      setCustomerToDelete(null);
    }
  };

  // --- HELPERS ---
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
    });
    setErrors({ name: "", phone: "" });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
    });
    setErrors({ name: "", phone: "" });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setErrors({ name: "", phone: "" });
    setTimeout(() => setEditingCustomer(null), 300);
  };

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');

    // Aplica a máscara conforme o tamanho
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
    // Limpa o erro quando o usuário começa a digitar
    if (errors.phone && formatted) {
      setErrors({ ...errors, phone: "" });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, name: e.target.value });
    // Limpa o erro quando o usuário começa a digitar
    if (errors.name && e.target.value.trim()) {
      setErrors({ ...errors, name: "" });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery) ||
    (customer.email?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">Gerencie sua base de clientes</p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, telefone ou email..."
            className="pl-10"
          />
        </div>

        {!loading && customers.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-center mb-2">
                Nenhum cliente cadastrado.
              </p>
              <Button variant="link" onClick={handleCreate}>
                Adicionar o primeiro cliente
              </Button>
            </CardContent>
          </Card>
        )}

        {filteredCustomers.length > 0 && (
          <>
            {/* Versão Desktop - Tabela */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {getInitials(customer.name)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                            {customer.phone}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              {customer.email}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(customer)}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => confirmDelete(customer.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Versão Mobile - Cards */}
            <div className="grid gap-4 md:hidden">
              {filteredCustomers.map((customer) => (
                <Card key={customer.id} className="group relative transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(customer.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0 space-y-2">
                        <h3 className="font-medium truncate">{customer.name}</h3>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <PhoneIcon className="h-3.5 w-3.5 shrink-0" />
                            <span>{customer.phone}</span>
                          </div>

                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{customer.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => handleEdit(customer)}
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => confirmDelete(customer.id)}
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
          </>
        )}

        {filteredCustomers.length === 0 && customers.length > 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-center">
                Nenhum cliente encontrado com &ldquo;{searchQuery}&rdquo;
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* DIALOG DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="Ex: João Silva"
                className={cn(errors.name && "border-destructive")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone *</Label>
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="(67) 99999-9999"
                  className={cn("pl-9", errors.phone && "border-destructive")}
                  maxLength={15}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="cliente@exemplo.com"
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
      <AlertDialog open={!!customerToDelete} onOpenChange={() => setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o cliente
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