"use client"

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
  AlertTriangle
} from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { AppointmentCard } from "@/components/appointment-card"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format, parseISO, addMinutes, startOfDay, endOfDay, subDays, getDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

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
  const [showNewModal, setShowNewModal] = useState(false)
  const [conflictWarning, setConflictWarning] = useState<string | null>(null)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)

  // New appointment form state
  const [newApt, setNewApt] = useState({
    clientName: "",
    clientPhone: "",
    clientId: "",
    staffId: "",
    serviceId: "",
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

  // --- VALIDAÇÃO DE CONFLITOS ---
  const checkTimeConflict = useCallback((professionalId: string, startTime: Date, durationMinutes: number, excludeAppointmentId?: string) => {
    const endTime = addMinutes(startTime, durationMinutes)

    const conflictingAppointment = appointments.find(apt => {
      // Ignora o próprio agendamento (para edição futura)
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false

      if (apt.status === 'cancelled') return false
      if (apt.professional_id !== professionalId) return false

      const aptStart = parseISO(apt.start_time)
      const aptEnd = addMinutes(aptStart, apt.duration_minutes)

      // Verifica sobreposição usando comparação de timestamps
      const startTimestamp = startTime.getTime()
      const endTimestamp = endTime.getTime()
      const aptStartTimestamp = aptStart.getTime()
      const aptEndTimestamp = aptEnd.getTime()

      // Conflito se:
      // - Novo agendamento começa durante um existente OU
      // - Novo agendamento termina durante um existente OU
      // - Novo agendamento engloba um existente
      const hasOverlap = (
        (startTimestamp >= aptStartTimestamp && startTimestamp < aptEndTimestamp) || // Começa durante
        (endTimestamp > aptStartTimestamp && endTimestamp <= aptEndTimestamp) ||     // Termina durante
        (startTimestamp <= aptStartTimestamp && endTimestamp >= aptEndTimestamp)     // Engloba
      )

      return hasOverlap
    })

    if (conflictingAppointment) {
      const conflictStart = parseISO(conflictingAppointment.start_time)
      return `Conflito: ${conflictingAppointment.customer_name} já tem agendamento às ${format(conflictStart, "HH:mm")}`
    }

    return null
  }, [appointments])

  // --- SLOTS DISPONÍVEIS BASEADOS NO HORÁRIO DE FUNCIONAMENTO ---
  const getAvailableSlots = useCallback(() => {
    if (!newApt.staffId || !newApt.serviceId || !newApt.date) return []

    const service = services.find(s => s.id === newApt.serviceId)
    if (!service) return []

    // Pega o dia da semana (0 = domingo, 1 = segunda, etc)
    const dayOfWeek = getDay(newApt.date)

    // Busca o horário de funcionamento para esse dia
    const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek)

    // Se não há horário configurado ou está fechado
    if (!daySchedule || !daySchedule.is_open) {
      return []
    }

    const slots: string[] = []

    // Converte horários para minutos
    const [openHour, openMin] = daySchedule.open_time.split(":").map(Number)
    const [closeHour, closeMin] = daySchedule.close_time.split(":").map(Number)
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin

    // Intervalos de almoço (se houver)
    let breakStartMinutes = null
    let breakEndMinutes = null
    if (daySchedule.break_start && daySchedule.break_end) {
      const [breakStartHour, breakStartMin] = daySchedule.break_start.split(":").map(Number)
      const [breakEndHour, breakEndMin] = daySchedule.break_end.split(":").map(Number)
      breakStartMinutes = breakStartHour * 60 + breakStartMin
      breakEndMinutes = breakEndHour * 60 + breakEndMin
    }

    // Gera slots de 30 em 30 minutos
    for (let time = openMinutes; time + service.duration_minutes <= closeMinutes; time += 30) {
      const hour = Math.floor(time / 60)
      const min = time % 60
      const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      const slotEndMinutes = time + service.duration_minutes

      // Pula se cai no intervalo de almoço
      if (breakStartMinutes !== null && breakEndMinutes !== null) {
        if (time < breakEndMinutes && slotEndMinutes > breakStartMinutes) {
          continue
        }
      }

      const slotDateTime = parseISO(`${format(newApt.date, 'yyyy-MM-dd')}T${timeStr}:00`)

      // Verifica se não é passado
      const now = new Date()
      if (slotDateTime < now) continue

      // Verifica conflito
      const conflict = checkTimeConflict(newApt.staffId, slotDateTime, service.duration_minutes)
      if (!conflict) {
        slots.push(timeStr)
      }
    }

    return slots
  }, [newApt.staffId, newApt.serviceId, newApt.date, services, schedules, checkTimeConflict])

  // Atualiza verificação de conflito
  useEffect(() => {
    if (newApt.staffId && newApt.serviceId && newApt.time && newApt.date) {
      const service = services.find(s => s.id === newApt.serviceId)
      if (!service) return

      const dateStr = format(newApt.date, "yyyy-MM-dd")
      const startDateTime = parseISO(`${dateStr}T${newApt.time}:00`)

      const conflict = checkTimeConflict(newApt.staffId, startDateTime, service.duration_minutes)
      setConflictWarning(conflict)
    } else {
      setConflictWarning(null)
    }
  }, [newApt.staffId, newApt.serviceId, newApt.time, newApt.date, services, checkTimeConflict])

  // --- HANDLERS ---
  const handleCreateAppointment = async () => {
    if (!newApt.clientName || !newApt.clientPhone || !newApt.staffId || !newApt.serviceId || !newApt.time || !newApt.date) {
      return toast.error("Preencha todos os campos obrigatórios")
    }

    if (conflictWarning) {
      return toast.error("Não é possível criar: há conflito de horário")
    }

    try {
      const service = services.find(s => s.id === newApt.serviceId)
      if (!service) {
        return toast.error("Serviço não encontrado")
      }

      // Monta o datetime SEM timezone para evitar conversão
      const dateStr = format(newApt.date, "yyyy-MM-dd")
      const startDateTime = `${dateStr}T${newApt.time}:00`
      const checkDateTime = parseISO(startDateTime)

      // VALIDAÇÃO FINAL DE CONFLITO antes de salvar
      const finalConflict = checkTimeConflict(newApt.staffId, checkDateTime, service.duration_minutes)
      if (finalConflict) {
        toast.error(finalConflict)
        return
      }

      let customerId = newApt.clientId

      // Criar cliente se for novo
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

      // Salva no banco
      const { error } = await supabase.from("appointments").insert({
        establishment_id: establishmentId,
        customer_id: customerId,
        professional_id: newApt.staffId,
        service_id: newApt.serviceId,
        start_time: startDateTime,
        duration_minutes: service.duration_minutes,
        status: "confirmed",
        notes: newApt.notes || null,
      })

      if (error) throw error
      toast.success("Agendamento criado!")

      setNewApt({
        clientName: "",
        clientPhone: "",
        clientId: "",
        staffId: "",
        serviceId: "",
        date: undefined,
        time: "",
        notes: "",
      })
      setShowNewModal(false)
      await fetchData()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao criar agendamento")
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
  const isCurrentMonth =
    selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()

  const groupedByDate = filteredAppointments.reduce(
    (acc, apt) => {
      const dateKey = parseISO(apt.start_time).toDateString()
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(apt)
      return acc
    },
    {} as Record<string, typeof filteredAppointments>,
  )

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  const availableSlots = getAvailableSlots()

  // Verifica se a data selecionada tem horário de funcionamento
  const selectedDaySchedule = newApt.date ? schedules.find(s => s.day_of_week === getDay(newApt.date!)) : null
  const isClosedDay = selectedDaySchedule && !selectedDaySchedule.is_open

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agendamentos</h1>
            <p className="text-muted-foreground">Gerencie todos os agendamentos</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <button
                onClick={() => setViewMode("day")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                  viewMode === "day" ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/10",
                )}
              >
                <CalIcon className="h-4 w-4" />
                <span>Dia</span>
              </button>
              <button
                onClick={() => setViewMode("month")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                  viewMode === "month" ? "bg-primary text-primary-foreground" : "hover:bg-muted-foreground/10",
                )}
              >
                <CalendarDays className="h-4 w-4" />
                <span>Mês</span>
              </button>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo
            </button>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            {viewMode === "day" ? (
              <CalIcon className="h-5 w-5 text-primary" />
            ) : (
              <CalendarDays className="h-5 w-5 text-primary" />
            )}
            <div className="text-center">
              {viewMode === "day" ? (
                <>
                  <p className="font-semibold capitalize">
                    {format(selectedDate, "EEEE", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold capitalize">
                    {format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p className="text-sm text-muted-foreground">{filteredAppointments.length} agendamentos</p>
                </>
              )}
            </div>
            {viewMode === "day" && isToday && (
              <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">Hoje</span>
            )}
            {viewMode === "month" && isCurrentMonth && (
              <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">Mês atual</span>
            )}
          </div>

          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, telefone, profissional ou serviço..."
              className="w-full pl-10 pr-4 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {["all", "pending", "confirmed", "completed", "cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-lg transition-colors",
                  statusFilter === status ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
                )}
              >
                {status === "all"
                  ? "Todos"
                  : status === "pending"
                    ? "Pendentes"
                    : status === "confirmed"
                      ? "Confirmados"
                      : status === "completed"
                        ? "Concluídos"
                        : "Cancelados"}
              </button>
            ))}
          </div>
        </div>

        {/* Appointments List */}
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
                        <span className="font-semibold capitalize">
                          {format(date, "EEEE, d", { locale: ptBR })}
                        </span>
                        {isDateToday && (
                          <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                            Hoje
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground ml-auto">
                          {dayAppointments.length} agendamento{dayAppointments.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {dayAppointments
                          .sort((a, b) => a.start_time.localeCompare(b.start_time))
                          .map((appointment) => (
                            <AppointmentCard
                              key={appointment.id}
                              appointment={appointment}
                              showStaff
                              showActions
                              onUpdate={fetchData}
                            />
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          ) : (
            <div className="text-center text-muted-foreground py-12">
              {searchQuery && filteredAppointments.length === 0 ? (
                <p>Cliente ou profissional não encontrado</p>
              ) : (
                <p>
                  {viewMode === "day"
                    ? "Nenhum agendamento encontrado para esta data"
                    : "Nenhum agendamento encontrado para este mês"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Novo Agendamento</h2>
              <button
                onClick={() => {
                  setShowNewModal(false)
                  setNewApt({
                    clientName: "",
                    clientPhone: "",
                    clientId: "",
                    staffId: "",
                    serviceId: "",
                    date: undefined,
                    time: "",
                    notes: "",
                  })
                  setConflictWarning(null)
                }}
                className="p-2 hover:bg-muted rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Alerta de Conflito */}
              {conflictWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Conflito de Horário</AlertTitle>
                  <AlertDescription>{conflictWarning}</AlertDescription>
                </Alert>
              )}

              {/* Client Selection or New */}
              <div>
                <label className="text-sm font-medium mb-2 block">Cliente</label>
                <select
                  value={newApt.clientId}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === e.target.value)
                    setNewApt({
                      ...newApt,
                      clientId: e.target.value,
                      clientName: customer?.name || "",
                      clientPhone: customer?.phone || ""
                    })
                  }}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Novo cliente...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {!newApt.clientId && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Nome</label>
                    <input
                      type="text"
                      value={newApt.clientName}
                      onChange={(e) => setNewApt({ ...newApt, clientName: e.target.value })}
                      placeholder="Nome completo"
                      className="w-full px-4 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Telefone</label>
                    <input
                      type="tel"
                      value={newApt.clientPhone}
                      onChange={(e) => setNewApt({ ...newApt, clientPhone: e.target.value })}
                      placeholder="(67) 99999-9999"
                      className="w-full px-4 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}

              {/* Professional */}
              <div>
                <label className="text-sm font-medium mb-2 block">Profissional</label>
                <select
                  value={newApt.staffId}
                  onChange={(e) => setNewApt({ ...newApt, staffId: e.target.value, time: "" })}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione um profissional</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service */}
              <div>
                <label className="text-sm font-medium mb-2 block">Serviço</label>
                <select
                  value={newApt.serviceId}
                  onChange={(e) => setNewApt({ ...newApt, serviceId: e.target.value, time: "" })}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione um serviço</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - R$ {s.price.toFixed(2)} ({s.duration_minutes}min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Date with Calendar */}
              <div>
                <label className="text-sm font-medium mb-2 block">Data</label>
                <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newApt.date && "text-muted-foreground"
                      )}
                    >
                      <CalIcon className="mr-2 h-4 w-4" />
                      {newApt.date ? format(newApt.date, "PPP", { locale: ptBR }) : "Selecione uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newApt.date}
                      onSelect={(date) => {
                        setNewApt({ ...newApt, date, time: "" })
                        setDatePopoverOpen(false)
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Aviso se dia fechado */}
              {isClosedDay && newApt.date && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Estabelecimento Fechado</AlertTitle>
                  <AlertDescription>
                    O estabelecimento não funciona neste dia da semana. Selecione outra data.
                  </AlertDescription>
                </Alert>
              )}

              {/* Time Slots */}
              {newApt.staffId && newApt.serviceId && newApt.date && !isClosedDay && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Horário
                    {selectedDaySchedule && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        (Funcionamento: {selectedDaySchedule.open_time} - {selectedDaySchedule.close_time})
                      </span>
                    )}
                  </label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setNewApt({ ...newApt, time: slot })}
                          className={cn(
                            "px-3 py-2 text-sm rounded-lg transition-colors",
                            newApt.time === slot ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                      Nenhum horário disponível para esta data. Todos os horários estão ocupados ou fora do expediente.
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">Observações (opcional)</label>
                <textarea
                  value={newApt.notes}
                  onChange={(e) => setNewApt({ ...newApt, notes: e.target.value })}
                  placeholder="Alguma observação importante..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* Summary */}
              {newApt.serviceId && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Resumo</p>
                  {(() => {
                    const service = services.find(s => s.id === newApt.serviceId)
                    if (!service) return null
                    return (
                      <>
                        <div className="flex justify-between text-sm">
                          <span>Duração total:</span>
                          <span>{service.duration_minutes} min</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium mt-1">
                          <span>Total:</span>
                          <span>R$ {service.price.toFixed(2)}</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewModal(false)
                  setNewApt({
                    clientName: "",
                    clientPhone: "",
                    clientId: "",
                    staffId: "",
                    serviceId: "",
                    date: undefined,
                    time: "",
                    notes: "",
                  })
                  setConflictWarning(null)
                }}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateAppointment}
                disabled={
                  !newApt.clientName ||
                  !newApt.clientPhone ||
                  !newApt.staffId ||
                  !newApt.serviceId ||
                  !newApt.time ||
                  !newApt.date ||
                  (conflictWarning !== null) ||
                  (isClosedDay ?? false)
                }
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}