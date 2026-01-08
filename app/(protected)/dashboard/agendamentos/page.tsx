"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Scissors,
  Loader2,
  Search,
  Filter,
  Ban,
  CheckCircle2,
  Edit2
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns"; // Mantido pois o Calendar do shadcn depende dele
import { ptBR } from "date-fns/locale";

// Componentes shadcn/ui
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // Certifique-se de ter instalado: npx shadcn-ui@latest add calendar
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

// Tipos
type Appointment = {
  id: string;
  customer_id: string;
  customer_name: string;
  professional_id: string;
  professional_name: string;
  service_id: string;
  service_name: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  price?: number;
};

type Professional = { id: string; name: string };
type Service = { id: string; name: string; duration_minutes: number; price: number };
type Customer = { id: string; name: string; phone: string };

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  confirmed: { label: "Confirmado", variant: "default" },
  completed: { label: "Concluído", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  pending: { label: "Pendente", variant: "outline" },
};

export default function AgendamentosPage() {
  const supabase = createBrowserSupabaseClient();

  // Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);

  // UI States
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    customer_id: "",
    customer_name: "",
    customer_phone: "",
    professional_id: "",
    service_id: "",
    date: undefined as Date | undefined, // Alterado para objeto Date para o Calendar
    time: "",
    notes: "",
  });

  // --- ACTIONS ---

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("establishment_id")
        .eq("id", user.id)
        .single();

      // CORREÇÃO: Verificamos se o profile existe e paramos se não existir.
      // Isso garante ao TypeScript que, daqui para baixo, 'profile' não é null.
      if (!profile) {
        toast.error("Perfil não encontrado.");
        return;
      }

      setEstablishmentId(profile.establishment_id);

      // Agora o TypeScript sabe que profile.establishment_id é seguro de usar
      const [profRes, servRes, custRes, aptRes] = await Promise.all([
        supabase.from("professionals").select("id, name").eq("establishment_id", profile.establishment_id).eq("is_active", true).order("name"),
        supabase.from("services").select("id, name, duration_minutes, price").eq("establishment_id", profile.establishment_id).eq("is_active", true).order("name"),
        supabase.from("customers").select("id, name, phone").eq("establishment_id", profile.establishment_id).order("name"),
        supabase.from("appointments").select("*").eq("establishment_id", profile.establishment_id).order("start_time", { ascending: false })
      ]);

      setProfessionals(profRes.data || []);
      setServices(servRes.data || []);
      setCustomers(custRes.data || []);

      const enrichedAppointments = aptRes.data?.map(apt => {
        const customer = custRes.data?.find(c => c.id === apt.customer_id);
        const professional = profRes.data?.find(p => p.id === apt.professional_id);
        const service = servRes.data?.find(s => s.id === apt.service_id);

        return {
          id: apt.id,
          customer_id: apt.customer_id,
          customer_name: customer?.name || "Cliente Excluído",
          professional_id: apt.professional_id,
          professional_name: professional?.name || "Profissional Inativo",
          service_id: apt.service_id,
          service_name: service?.name || "Serviço Inativo",
          start_time: apt.start_time,
          duration_minutes: apt.duration_minutes,
          status: apt.status,
          notes: apt.notes,
        };
      }) || [];

      setAppointments(enrichedAppointments);
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- HANDLERS ---

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      customer_id: "",
      customer_name: "",
      customer_phone: "",
      professional_id: "",
      service_id: "",
      date: new Date(), // Data de hoje por padrão
      time: "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (apt: Appointment) => {
    setEditingId(apt.id);
    const startDate = parseISO(apt.start_time);

    setFormData({
      customer_id: apt.customer_id,
      customer_name: "",
      customer_phone: "",
      professional_id: apt.professional_id,
      service_id: apt.service_id,
      date: startDate,
      time: format(startDate, "HH:mm"),
      notes: apt.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if ((!formData.customer_id && !formData.customer_name) || !formData.professional_id || !formData.service_id || !formData.date || !formData.time) {
      return toast.error("Preencha todos os campos obrigatórios");
    }

    setIsSaving(true);
    try {
      let customerId = formData.customer_id;

      // Criar cliente se for novo
      if (!customerId && formData.customer_name) {
        const { data: newCustomer, error: cError } = await supabase
          .from("customers")
          .insert({
            name: formData.customer_name,
            phone: formData.customer_phone,
            establishment_id: establishmentId,
          })
          .select()
          .single();
        if (cError) throw cError;
        customerId = newCustomer.id;
      }

      const service = services.find(s => s.id === formData.service_id);

      // Montar string ISO da data
      const dateStr = format(formData.date, "yyyy-MM-dd");
      const startDateTime = `${dateStr}T${formData.time}:00`;

      const payload = {
        establishment_id: establishmentId,
        customer_id: customerId,
        professional_id: formData.professional_id,
        service_id: formData.service_id,
        start_time: startDateTime,
        duration_minutes: service?.duration_minutes || 30,
        status: "confirmed", // Ao editar ou criar, reseta para confirmado (regra de negócio opcional)
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase.from("appointments").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Agendamento atualizado!");
      } else {
        const { error } = await supabase.from("appointments").insert(payload);
        if (error) throw error;
        toast.success("Agendamento criado!");
      }

      await fetchData();
      setIsDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar agendamento");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmCancel = (id: string) => {
    setAppointmentToCancel(id);
    setCancelDialogOpen(true);
  };

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentToCancel);

      if (error) throw error;
      toast.success("Agendamento cancelado.");
      fetchData();
    } catch (error) {
      console.error("Erro ao cancelar:", error); // ✅ Adicionei esta linha para usar a variável 'error'
      toast.error("Erro ao cancelar.");
    } finally {
      setCancelDialogOpen(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.professional_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || apt.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">Gerencie sua agenda</p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por cliente ou profissional..."
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" /> <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="completed">Concluídos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <div className="grid gap-4">
        {filteredAppointments.length === 0 && (
          <p className="text-center text-muted-foreground py-10">Nenhum agendamento encontrado.</p>
        )}

        {filteredAppointments.map((apt) => (
          <Card key={apt.id} className={cn("transition-all hover:shadow-md", apt.status === 'cancelled' && "opacity-60 bg-muted/30")}>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

              {/* Informações Principais */}
              <div className="flex items-start gap-4 flex-1">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border">
                  <AvatarFallback className="bg-primary/5 text-primary font-bold">
                    {apt.customer_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold line-clamp-1">{apt.customer_name}</h3>
                    <Badge variant={STATUS_LABELS[apt.status]?.variant || "default"} className="text-[10px] h-5">
                      {STATUS_LABELS[apt.status]?.label}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(parseISO(apt.start_time), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(parseISO(apt.start_time), "HH:mm")} ({apt.duration_minutes}min)
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {apt.professional_name}</span>
                    <span className="flex items-center gap-1"><Scissors className="h-3 w-3" /> {apt.service_name}</span>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                {apt.status !== 'cancelled' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(apt)}
                      title="Editar Agendamento"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => confirmCancel(apt.id)}
                      title="Cancelar Agendamento"
                    >
                      <Ban className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" />
                    </Button>
                  </>
                )}
                {apt.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              </div>

            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
            <DialogDescription>Preencha os dados do atendimento.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Cliente */}
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {!formData.customer_id && !editingId && (
                <div className="pt-2 border-t mt-1 space-y-2">
                  <Label className="text-xs text-muted-foreground">Ou novo cliente:</Label>
                  <Input placeholder="Nome" value={formData.customer_name} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} />
                  <Input placeholder="Telefone" value={formData.customer_phone} onChange={e => setFormData({ ...formData, customer_phone: e.target.value })} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Profissional */}
              <div className="grid gap-2">
                <Label>Profissional</Label>
                <Select value={formData.professional_id} onValueChange={(v) => setFormData({ ...formData, professional_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {professionals.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {/* Serviço */}
              <div className="grid gap-2">
                <Label>Serviço</Label>
                <Select value={formData.service_id} onValueChange={(v) => setFormData({ ...formData, service_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4"> {/* MUDANÇA: grid-cols-2 fixo (sempre lado a lado) */}
              <div className="grid gap-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal px-3", // px-3 ajuda a economizar espaço
                        !formData.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {formData.date ? (
                          format(formData.date, "dd/MM/yy", { locale: ptBR })
                        ) : (
                          "Selecione"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => setFormData({ ...formData, date })}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-2" // px-2 para dar mais espaço ao texto da hora
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações internas..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alerta de Cancelamento */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação marcará o agendamento como cancelado. O histórico será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelAppointment} className="bg-destructive hover:bg-destructive/90">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}