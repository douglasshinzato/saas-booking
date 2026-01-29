"use client"
//Booking Page
import { useState, useEffect, useCallback } from "react"
import {
  Calendar as CalIcon,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  X,
  Loader2,
  AlertTriangle,
  Check
} from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { AppointmentCard } from "@/components/appointment-card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format, parseISO, addMinutes, startOfDay, endOfDay, subDays, getDay } from "date-fns"
import { ptBR } from "date-fns/locale"

// Componentes Shadcn/UI
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

// --- TIPOS ---
type ViewMode = "day" | "month"

type Appointment = {
  id: string
  customer_id: string
  customer_name: string
  customer_phone: string
  professional_id: string
  professional_name: string
  service_id: string
  service_name: string
  start_time: string
  duration_minutes: number
  status: string
  notes: string | null
  price?: number
}

type Professional = { id: string; name: string }
type Service = { id: string; name: string; duration_minutes: number; price: number }
type Customer = { id: string; name: string; phone: string }
type Schedule = {
  id: string
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
  break_start: string | null
  break_end: string | null
}

export default function AgendamentosPage() {
  const supabase = createBrowserSupabaseClient()

  // Data States
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [establishmentId, setEstablishmentId] = useState<string | null>(null)

  // UI States
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState<string>("confirmed")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<ViewMode>("day")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState<string | null>(null)

  // New appointment form state
  const [newApt, setNewApt] = useState({
    clientName: "",
    clientPhone: "",
    clientId: "",
    staffId: "",
    selectedServices: [] as Service[],
    date: undefined as Date | undefined,
    time: "",
    notes: "",
  })

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("establishment_id")
        .eq("id", user.id)
        .single()

      if (!profile) {
        toast.error("Perfil não encontrado.")
        return
      }

      setEstablishmentId(profile.establishment_id)

      const [profRes, servRes, custRes, aptRes, schedRes] = await Promise.all([
        supabase.from("professionals").select("id, name").eq("establishment_id", profile.establishment_id).eq("is_active", true).order("name"),
        supabase.from("services").select("id, name, duration_minutes, price").eq("establishment_id", profile.establishment_id).eq("is_active", true).order("name"),
        supabase.from("customers").select("id, name, phone").eq("establishment_id", profile.establishment_id).order("name"),
        supabase.from("appointments").select("*").eq("establishment_id", profile.establishment_id).order("start_time", { ascending: false }),
        supabase.from("schedules").select("*").eq("establishment_id", profile.establishment_id).is("professional_id", null)
      ])

      setProfessionals(profRes.data || [])
      setServices(servRes.data || [])
      setCustomers(custRes.data || [])
      setSchedules(schedRes.data || [])

      const enrichedAppointments = aptRes.data?.map(apt => {
        const customer = custRes.data?.find(c => c.id === apt.customer_id)
        const professional = profRes.data?.find(p => p.id === apt.professional_id)
        const service = servRes.data?.find(s => s.id === apt.service_id)

        return {
          id: apt.id,
          customer_id: apt.customer_id,
          customer_name: customer?.name || "Cliente Excluído",
          customer_phone: customer?.phone || "",
          professional_id: apt.professional_id,
          professional_name: professional?.name || "Profissional Inativo",
          service_id: apt.service_id,
          service_name: service?.name || "Serviço Inativo",
          start_time: apt.start_time,
          duration_minutes: apt.duration_minutes,
          status: apt.status,
          notes: apt.notes,
          price: service?.price,
        }
      }) || []

      setAppointments(enrichedAppointments)
    } catch (error) {
      console.error("Erro:", error)
      toast.error("Erro ao carregar dados")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // --- LIMPEZA AUTOMÁTICA DE CANCELADOS ---
  const cleanOldCancelledAppointments = useCallback(async () => {
    try {
      const thirtyDaysAgo = subDays(new Date(), 30)
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("status", "cancelled")
        .lt("start_time", thirtyDaysAgo.toISOString())

      if (error) throw error
    } catch (error) {
      console.error("Erro ao limpar agendamentos antigos:", error)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
    cleanOldCancelledAppointments()
  }, [fetchData, cleanOldCancelledAppointments])

  // --- FUNÇÕES AUXILIARES ---
  const toggleService = (serviceId: string) => {
    setNewApt((prev) => {
      const isSelected = prev.selectedServices.some((s) => s.id === serviceId)
      let newServices = []

      if (isSelected) {
        newServices = prev.selectedServices.filter((s) => s.id !== serviceId)
      } else {
        const service = services.find((s) => s.id === serviceId)
        if (service) {
          newServices = [...prev.selectedServices, service]
        } else {
          newServices = prev.selectedServices
        }
      }
      return {
        ...prev,
        selectedServices: newServices,
        time: "",
      }
    })
  }

  const getTotalDuration = () => newApt.selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0)
  const getTotalPrice = () => newApt.selectedServices.reduce((acc, s) => acc + s.price, 0)

  // --- VALIDAÇÃO DE CONFLITOS ---
  const checkTimeConflict = useCallback((professionalId: string, startTime: Date, durationMinutes: number, excludeAppointmentId?: string) => {
    const endTime = addMinutes(startTime, durationMinutes)
    const conflictingAppointment = appointments.find(apt => {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false
      if (apt.status === 'cancelled') return false
      if (apt.professional_id !== professionalId) return false

      const aptStart = parseISO(apt.start_time)
      const aptEnd = addMinutes(aptStart, apt.duration_minutes)
      const startTimestamp = startTime.getTime()
      const endTimestamp = endTime.getTime()
      const aptStartTimestamp = aptStart.getTime()
      const aptEndTimestamp = aptEnd.getTime()

      return (
        (startTimestamp >= aptStartTimestamp && startTimestamp < aptEndTimestamp) ||
        (endTimestamp > aptStartTimestamp && endTimestamp <= aptEndTimestamp) ||
        (startTimestamp <= aptStartTimestamp && endTimestamp >= aptEndTimestamp)
      )
    })

    if (conflictingAppointment) {
      const conflictStart = parseISO(conflictingAppointment.start_time)
      return `Conflito: ${conflictingAppointment.customer_name} já tem agendamento às ${format(conflictStart, "HH:mm")}`
    }
    return null
  }, [appointments])

  // --- SLOTS DISPONÍVEIS ---
  const getAvailableSlots = useCallback(() => {
    if (!newApt.staffId || newApt.selectedServices.length === 0 || !newApt.date) return []

    const totalDuration = newApt.selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0)
    const dayOfWeek = getDay(newApt.date)
    const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek)

    if (!daySchedule || !daySchedule.is_open) return []

    const slots: string[] = []
    const [openHour, openMin] = daySchedule.open_time.split(":").map(Number)
    const [closeHour, closeMin] = daySchedule.close_time.split(":").map(Number)
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin

    let breakStartMinutes = null
    let breakEndMinutes = null
    if (daySchedule.break_start && daySchedule.break_end) {
      const [breakStartHour, breakStartMin] = daySchedule.break_start.split(":").map(Number)
      const [breakEndHour, breakEndMin] = daySchedule.break_end.split(":").map(Number)
      breakStartMinutes = breakStartHour * 60 + breakStartMin
      breakEndMinutes = breakEndHour * 60 + breakEndMin
    }

    for (let time = openMinutes; time + totalDuration <= closeMinutes; time += 30) {
      const hour = Math.floor(time / 60)
      const min = time % 60
      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      const slotEndMinutes = time + totalDuration

      if (breakStartMinutes !== null && breakEndMinutes !== null) {
        if (time < breakEndMinutes && slotEndMinutes > breakStartMinutes) continue
      }

      const slotDateTime = parseISO(`${format(newApt.date, 'yyyy-MM-dd')}T${timeStr}:00`)
      const now = new Date()
      if (slotDateTime < now) continue

      const conflict = checkTimeConflict(newApt.staffId, slotDateTime, totalDuration)
      if (!conflict) {
        slots.push(timeStr)
      }
    }
    return slots
  }, [newApt.staffId, newApt.selectedServices, newApt.date, schedules, checkTimeConflict])

  // Atualiza verificação de conflito
  useEffect(() => {
    if (newApt.staffId && newApt.selectedServices.length > 0 && newApt.time && newApt.date) {
      const totalDuration = newApt.selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0)
      const dateStr = format(newApt.date, "yyyy-MM-dd")
      const startDateTime = parseISO(`${dateStr}T${newApt.time}:00`)
      const conflict = checkTimeConflict(newApt.staffId, startDateTime, totalDuration)
      setConflictWarning(conflict)
    } else {
      setConflictWarning(null)
    }
  }, [newApt.staffId, newApt.selectedServices, newApt.time, newApt.date, checkTimeConflict])

  // --- HANDLERS ---
  const handleCreateAppointment = async () => {
    if (!newApt.clientName || !newApt.clientPhone || !newApt.staffId || newApt.selectedServices.length === 0 || !newApt.time || !newApt.date) {
      return toast.error("Preencha todos os campos obrigatórios")
    }

    if (conflictWarning) return toast.error("Não é possível criar: há conflito de horário")

    setIsSaving(true)
    try {
      const dateStr = format(newApt.date, "yyyy-MM-dd")
      let currentStartTime = parseISO(`${dateStr}T${newApt.time}:00`)

      let customerId = newApt.clientId

      if (!customerId && newApt.clientName) {
        const { data: newCustomer, error: cError } = await supabase
          .from("customers")
          .insert({
            name: newApt.clientName,
            phone: newApt.clientPhone,
            establishment_id: establishmentId,
          })
          .select()
          .single()
        if (cError) throw cError
        customerId = newCustomer.id
      }

      for (const service of newApt.selectedServices) {
        const startDateTimeISO = format(currentStartTime, "yyyy-MM-dd'T'HH:mm:00")
        const conflict = checkTimeConflict(newApt.staffId, currentStartTime, service.duration_minutes)
        if (conflict) throw new Error(conflict)

        const { error } = await supabase.from("appointments").insert({
          establishment_id: establishmentId,
          customer_id: customerId,
          professional_id: newApt.staffId,
          service_id: service.id,
          start_time: startDateTimeISO,
          duration_minutes: service.duration_minutes,
          status: "confirmed",
          notes: newApt.notes || null,
        })

        if (error) throw error
        currentStartTime = addMinutes(currentStartTime, service.duration_minutes)
      }

      toast.success("Agendamentos criados!")
      handleCloseDialog()
      await fetchData()
    } catch (error: unknown) {
      console.error(error)

      if (error instanceof Error) {
        toast.error(error.message || "Erro ao criar agendamento")
      } else if (typeof error === 'string') {
        toast.error(error)
      } else {
        toast.error("Erro ao criar agendamento")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setNewApt({
      clientName: "",
      clientPhone: "",
      clientId: "",
      staffId: "",
      selectedServices: [],
      date: undefined,
      time: "",
      notes: "",
    })
    setConflictWarning(null)
  }

  // --- CANCELAMENTO ---
  const handleConfirmCancel = async () => {
    if (!appointmentToCancel) return
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentToCancel)

      if (error) throw error
      toast.success("Agendamento cancelado.")
      fetchData()
    } catch (error) {
      console.error("Erro ao cancelar:", error)
      toast.error("Erro ao cancelar.")
    } finally {
      setAppointmentToCancel(null)
    }
  }

  // --- FILTROS ---
  const filteredAppointments = appointments.filter((apt) => {
    const aptDate = parseISO(apt.start_time)
    const matchesDate = viewMode === "day"
      ? aptDate >= startOfDay(selectedDate) && aptDate <= endOfDay(selectedDate)
      : aptDate.getMonth() === selectedDate.getMonth() && aptDate.getFullYear() === selectedDate.getFullYear()

    const matchesStatus = statusFilter === "all" || apt.status === statusFilter

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        apt.customer_name.toLowerCase().includes(searchLower) ||
        apt.customer_phone.includes(searchQuery) ||
        apt.professional_name.toLowerCase().includes(searchLower) ||
        apt.service_name.toLowerCase().includes(searchLower)
      return matchesDate && matchesStatus && matchesSearch
    }
    return matchesDate && matchesStatus
  })

  const navigateDate = (amount: number) => {
    const newDate = new Date(selectedDate)
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + amount)
    } else {
      newDate.setMonth(newDate.getMonth() + amount)
    }
    setSelectedDate(newDate)
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()
  const isCurrentMonth = selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()

  const groupedByDate = filteredAppointments.reduce((acc, apt) => {
    const dateKey = parseISO(apt.start_time).toDateString()
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(apt)
    return acc
  }, {} as Record<string, typeof filteredAppointments>)

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  const availableSlots = getAvailableSlots()
  const selectedDaySchedule = newApt.date ? schedules.find(s => s.day_of_week === getDay(newApt.date!)) : null
  const isClosedDay = selectedDaySchedule && !selectedDaySchedule.is_open

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="space-y-6">
        {/* Header Responsivo */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agendamentos</h1>
            <p className="text-muted-foreground">Gerencie todos os agendamentos</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setViewMode("day")}
                className={cn("flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors", viewMode === "day" ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/10")}
              >
                <CalIcon className="h-4 w-4" /><span>Dia</span>
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={cn("flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors", viewMode === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/10")}
              >
                <CalendarDays className="h-4 w-4" /><span>Mês</span>
              </button>
            </div>

            <Button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="sm:hidden">Novo</span>
              <span className="hidden sm:inline">Novo Agendamento</span>
            </Button>
          </div>
        </div>

        {/* Date Navigator */}
        <Card className="flex flex-row items-center justify-between p-4 gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate(-1)}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 flex-1 overflow-hidden">
            <div className="flex items-center justify-center gap-2">
              {viewMode === "day" ? (
                <CalIcon className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <CalendarDays className="h-5 w-5 text-primary shrink-0" />
              )}

              <div className="text-center sm:text-left flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
                <span className="font-semibold capitalize text-base sm:text-lg truncate">
                  {viewMode === "day" ? (
                    format(selectedDate, "EEEE", { locale: ptBR })
                  ) : (
                    format(selectedDate, "MMMM", { locale: ptBR })
                  )}
                </span>
                <span className="text-xs sm:text-sm text-muted-foreground capitalize">
                  {viewMode === "day" ? (
                    format(selectedDate, "d 'de' MMMM", { locale: ptBR })
                  ) : (
                    format(selectedDate, "yyyy", { locale: ptBR })
                  )}
                </span>
              </div>
            </div>

            {/* Badges de Status (Hoje/Mês Atual) */}
            {(viewMode === "day" && isToday) && (
              <Badge variant="secondary" className="shrink-0">Hoje</Badge>
            )}
            {(viewMode === "month" && isCurrentMonth) && (
              <Badge variant="secondary" className="shrink-0">Mês Atual</Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateDate(1)}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar..." className="pl-10" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {["all", "pending", "confirmed", "completed", "cancelled"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="capitalize"
              >
                {status === "all" ? "Todos" : status === "pending" ? "Pendentes" : status === "confirmed" ? "Confirmados" : status === "completed" ? "Concluídos" : "Cancelados"}
              </Button>
            ))}
          </div>
        </div>

        {/* Lista de Agendamentos */}
        <div className="bg-card border border-border rounded-lg p-6">
          {filteredAppointments.length > 0 ? (
            viewMode === "day" ? (
              <div className="space-y-3">
                {filteredAppointments
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      showStaff
                      showActions
                      onUpdate={fetchData}
                      // ADICIONADO: Conecta o clique no card com o estado da página
                      onCancel={(id) => setAppointmentToCancel(id)}
                    />
                  ))}
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map((dateKey) => {
                  const dayAppointments = groupedByDate[dateKey]
                  const date = new Date(dateKey)
                  const isDateToday = date.toDateString() === new Date().toDateString()
                  return (
                    <div key={dateKey}>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                        <span className="font-semibold capitalize">{format(date, "EEEE, d", { locale: ptBR })}</span>
                        {isDateToday && <Badge>Hoje</Badge>}
                        <span className="text-sm text-muted-foreground ml-auto">{dayAppointments.length} agendamentos</span>
                      </div>
                      <div className="space-y-3">
                        {dayAppointments.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((appointment) => (
                          <AppointmentCard
                            key={appointment.id}
                            appointment={appointment}
                            showStaff
                            showActions
                            onUpdate={fetchData}
                            // ADICIONADO: Conecta o clique no card com o estado da página
                            onCancel={(id) => setAppointmentToCancel(id)}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            // ... resto do código (empty state) mantido igual
            <div className="text-center text-muted-foreground py-12">
              <p>Nenhum agendamento encontrado.</p>
              {viewMode === "day" && !searchQuery && <Button onClick={() => setIsDialogOpen(true)} className="mt-4" variant="outline">Criar Agendamento</Button>}
            </div>
          )}
        </div>
      </div>

      {/* DIALOG DE CRIAÇÃO */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>Preencha os dados do agendamento abaixo.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {conflictWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Conflito</AlertTitle>
                <AlertDescription>{conflictWarning}</AlertDescription>
              </Alert>
            )}

            {/* Cliente */}
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Select
                value={newApt.clientId}
                onValueChange={(val) => {
                  if (val === "new_client_placeholder") {
                    setNewApt({ ...newApt, clientId: "", clientName: "", clientPhone: "" })
                  } else {
                    const customer = customers.find(c => c.id === val)
                    setNewApt({ ...newApt, clientId: val, clientName: customer?.name || "", clientPhone: customer?.phone || "" })
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_client_placeholder">-- Novo Cliente --</SelectItem>
                  {customers.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {!newApt.clientId && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Nome</Label>
                  <Input value={newApt.clientName} onChange={(e) => setNewApt({ ...newApt, clientName: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input type="tel" value={newApt.clientPhone} onChange={(e) => setNewApt({ ...newApt, clientPhone: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
              </div>
            )}

            {/* Profissional */}
            <div className="grid gap-2">
              <Label>Profissional</Label>
              <Select value={newApt.staffId} onValueChange={(val) => setNewApt({ ...newApt, staffId: val, time: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Serviços (ScrollArea) */}
            <div className="grid gap-2">
              <Label>Serviços ({newApt.selectedServices.length})</Label>
              {newApt.selectedServices.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-1">
                  {newApt.selectedServices.map((service) => (
                    <Badge key={service.id} variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
                      {service.name}
                      <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => toggleService(service.id)} />
                    </Badge>
                  ))}
                </div>
              )}
              <ScrollArea className="h-40 border rounded-md p-2">
                <div className="space-y-1">
                  {services.map((service) => {
                    const isSelected = newApt.selectedServices.some(s => s.id === service.id);
                    return (
                      <div
                        key={service.id}
                        onClick={() => toggleService(service.id)}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-sm cursor-pointer text-sm transition-colors",
                          isSelected ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn("h-4 w-4 border rounded flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-muted-foreground")}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span>{service.name}</span>
                        </div>
                        <span className="text-muted-foreground text-xs">{service.duration_minutes}min • R$ {service.price.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Data */}
            <div className="grid gap-2">
              <Label>Data</Label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newApt.date && "text-muted-foreground")}>
                    <CalIcon className="mr-2 h-4 w-4" />
                    {newApt.date ? format(newApt.date, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newApt.date}
                    onSelect={(date) => { setNewApt({ ...newApt, date, time: "" }); setDatePopoverOpen(false); }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {isClosedDay && newApt.date && (
              <Alert variant="destructive"><AlertTitle>Fechado</AlertTitle><AlertDescription>Este dia não há expediente.</AlertDescription></Alert>
            )}

            {/* Horários (ScrollArea Grid) */}
            {newApt.staffId && newApt.selectedServices.length > 0 && newApt.date && !isClosedDay && (
              <div className="grid gap-2">
                <Label>Horário {selectedDaySchedule && <span className="text-xs font-normal text-muted-foreground">({selectedDaySchedule.open_time} - {selectedDaySchedule.close_time})</span>}</Label>
                {availableSlots.length > 0 ? (
                  <ScrollArea className="h-40 border rounded-md p-2">
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={newApt.time === slot ? "default" : "outline"}
                          size="sm"
                          onClick={() => setNewApt({ ...newApt, time: slot })}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground bg-muted p-2 rounded">Sem horários disponíveis.</p>
                )}
              </div>
            )}

            {/* Notas */}
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea value={newApt.notes} onChange={(e) => setNewApt({ ...newApt, notes: e.target.value })} placeholder="Detalhes..." />
            </div>

            {/* Resumo */}
            {newApt.selectedServices.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-sm font-medium mb-2">Resumo</p>
                <div className="space-y-1 mb-2">
                  {newApt.selectedServices.map((service, index) => (
                    <div key={service.id} className="flex justify-between text-xs text-muted-foreground">
                      <span>{index + 1}. {service.name}</span>
                      <span>{service.duration_minutes}min - R$ {service.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Duração total:</span>
                    <span className="font-medium">{getTotalDuration()} min</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium mt-1">
                    <span>Total:</span>
                    <span className="text-primary">R$ {getTotalPrice().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleCreateAppointment} disabled={isSaving || !newApt.clientName || newApt.selectedServices.length === 0 || !newApt.time || !!conflictWarning}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG DE CANCELAMENTO */}
      <AlertDialog open={!!appointmentToCancel} onOpenChange={() => setAppointmentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O horário ficará vago e o status mudará para cancelado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancel} className="bg-destructive hover:bg-destructive/90">
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}