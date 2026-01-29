"use client"
// Slug Page
import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { format, parseISO, getDay, addMinutes } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Store,
  Loader2,
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar as CalIcon,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Scissors,
  AlertCircle,
  X
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

// Tipos
type Establishment = {
  id: string
  name: string
  slug: string
  phone: string | null
  address: string | null
  logo_url: string | null
  primary_color: string
}

type Service = {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number
  category: string | null
}

type Professional = {
  id: string
  name: string
  phone: string | null
}

type Schedule = {
  id: string
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
  break_start: string | null
  break_end: string | null
}

type Appointment = {
  id: string
  professional_id: string
  start_time: string
  duration_minutes: number
  status?: string
}

type BookingStep = "service" | "professional" | "datetime" | "info" | "confirm" | "success"

export default function PublicBookingPage() {
  const params = useParams()
  const slug = params.slug as string
  const supabase = createBrowserSupabaseClient()

  // Data States
  const [establishment, setEstablishment] = useState<Establishment | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])

  // UI States
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Booking Flow States
  const [currentStep, setCurrentStep] = useState<BookingStep>("service")
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [clientInfo, setClientInfo] = useState({
    name: "",
    phone: "",
    email: "",
    notes: ""
  })

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      // Busca estabelecimento pelo slug
      const { data: estData, error: estError } = await supabase
        .from("establishments")
        .select("*")
        .eq("slug", slug)
        .single()

      if (estError || !estData) {
        setNotFound(true)
        return
      }

      setEstablishment(estData)

      // Busca dados do estabelecimento
      const [servRes, profRes, schedRes, aptRes] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("establishment_id", estData.id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("professionals")
          .select("*")
          .eq("establishment_id", estData.id)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("schedules")
          .select("*")
          .eq("establishment_id", estData.id)
          .is("professional_id", null),
        supabase
          .from("appointments")
          .select("id, professional_id, start_time, duration_minutes")
          .eq("establishment_id", estData.id)
          .neq("status", "cancelled")
          .gte("start_time", new Date().toISOString())
      ])

      if (servRes.error) throw servRes.error
      if (profRes.error) throw profRes.error
      if (schedRes.error) throw schedRes.error
      if (aptRes.error) throw aptRes.error

      setServices(servRes.data || [])
      setProfessionals(profRes.data || [])
      setSchedules(schedRes.data || [])
      setAppointments(aptRes.data || [])

    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast.error("Erro ao carregar dados do estabelecimento")
    } finally {
      setLoading(false)
    }
  }, [slug, supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // --- DISPONIBILIDADE DE HORÁRIOS ---
  const checkTimeConflict = useCallback((professionalId: string, startTime: Date, durationMinutes: number) => {
    const endTime = addMinutes(startTime, durationMinutes)
    const conflictingAppointment = appointments.some(apt => {
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

    return conflictingAppointment
  }, [appointments])

  const getAvailableSlots = useCallback(() => {
    if (selectedServices.length === 0 || !selectedProfessional || !selectedDate) return []

    const totalDuration = selectedServices.reduce((acc, service) => acc + service.duration_minutes, 0)

    const dayOfWeek = getDay(selectedDate)
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

      // Verifica intervalo
      if (breakStartMinutes !== null && breakEndMinutes !== null) {
        if (time < breakEndMinutes && slotEndMinutes > breakStartMinutes) {
          continue
        }
      }

      const slotDateTime = parseISO(`${format(selectedDate, 'yyyy-MM-dd')}T${timeStr}:00`)

      // Verifica se não é passado
      if (slotDateTime < new Date()) continue

      // Verifica conflito de agendamento usando a nova função
      const hasConflict = checkTimeConflict(selectedProfessional.id, slotDateTime, totalDuration)

      if (!hasConflict) {
        slots.push(timeStr)
      }
    }

    return slots
  }, [selectedServices, selectedProfessional, selectedDate, schedules, checkTimeConflict])

  // --- SUBMIT BOOKING ---
  const handleSubmit = async () => {
    if (!establishment || selectedServices.length === 0 || !selectedProfessional || !selectedDate || !selectedTime) {
      return toast.error("Dados incompletos")
    }

    if (!clientInfo.name || !clientInfo.phone) {
      return toast.error("Preencha seu nome e telefone")
    }

    setSubmitting(true)

    try {
      // Verifica/cria cliente
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id")
        .eq("establishment_id", establishment.id)
        .eq("phone", clientInfo.phone)
        .single()

      let customerId = existingCustomer?.id

      if (!customerId) {
        const { data: newCustomer, error: custError } = await supabase
          .from("customers")
          .insert({
            establishment_id: establishment.id,
            name: clientInfo.name,
            phone: clientInfo.phone,
            email: clientInfo.email || null
          })
          .select("id")
          .single()

        if (custError) throw custError
        customerId = newCustomer.id
      }

      // Cria agendamentos para cada serviço
      const dateStr = format(selectedDate, "yyyy-MM-dd")
      let currentStartTime = selectedTime

      for (const service of selectedServices) {
        const startDateTime = `${dateStr}T${currentStartTime}:00`

        const { error: aptError } = await supabase
          .from("appointments")
          .insert({
            establishment_id: establishment.id,
            customer_id: customerId,
            professional_id: selectedProfessional.id,
            service_id: service.id,
            start_time: startDateTime,
            duration_minutes: service.duration_minutes,
            status: "confirmed",
            notes: clientInfo.notes || null
          })

        if (aptError) throw aptError

        // Calcula o próximo horário de início
        const [hour, min] = currentStartTime.split(":").map(Number)
        const nextMinutes = hour * 60 + min + service.duration_minutes
        const nextHour = Math.floor(nextMinutes / 60)
        const nextMin = nextMinutes % 60
        currentStartTime = `${nextHour.toString().padStart(2, '0')}:${nextMin.toString().padStart(2, '0')}`
      }

      setCurrentStep("success")
      toast.success("Agendamento realizado com sucesso!")

    } catch (error) {
      console.error("Erro ao criar agendamento:", error)
      toast.error("Erro ao criar agendamento. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  // --- HELPERS ---
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const groupServicesByCategory = () => {
    const grouped = services.reduce((acc, service) => {
      const category = service.category || "Outros"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(service)
      return acc
    }, {} as Record<string, Service[]>)

    return grouped
  }

  const categoryLabels: Record<string, string> = {
    Hair: "Cabelo",
    Beard: "Barba",
    Combo: "Combo",
    Eyebrows: "Sobrancelha",
    Other: "Outros"
  }

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id)
      if (exists) {
        return prev.filter(s => s.id !== service.id)
      } else {
        return [...prev, service]
      }
    })
  }

  const getTotalPrice = () => {
    return selectedServices.reduce((acc, service) => acc + service.price, 0)
  }

  const getTotalDuration = () => {
    return selectedServices.reduce((acc, service) => acc + service.duration_minutes, 0)
  }

  const availableSlots = getAvailableSlots()
  const isClosedDay = selectedDate ? !schedules.find(s => s.day_of_week === getDay(selectedDate))?.is_open : false

  // --- LOADING & NOT FOUND ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (notFound || !establishment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Estabelecimento não encontrado
            </CardTitle>
            <CardDescription>
              O link que você acessou não corresponde a nenhum estabelecimento cadastrado.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {establishment.logo_url && (
                <AvatarImage src={establishment.logo_url} alt={establishment.name} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(establishment.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-bold text-lg">{establishment.name}</h1>
              {establishment.address && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {establishment.address}
                </p>
              )}
            </div>
          </div>
          {establishment.phone && (
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href={`tel:${establishment.phone}`}>
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">{establishment.phone}</span>
              </a>
            </Button>
          )}
        </div>
      </header>

      {/* Progress Indicator */}
      {currentStep !== "success" && (
        <div className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {[
                { key: "service", label: "Serviço" },
                { key: "professional", label: "Profissional" },
                { key: "datetime", label: "Data/Hora" },
                { key: "info", label: "Seus Dados" },
                { key: "confirm", label: "Confirmar" }
              ].map((step, index, arr) => {
                const stepKeys: BookingStep[] = ["service", "professional", "datetime", "info", "confirm"]
                const currentStepIndex = stepKeys.indexOf(currentStep)
                const thisStepIndex = stepKeys.indexOf(step.key as BookingStep)

                return (
                  <div key={step.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors shrink-0",
                          currentStep === step.key
                            ? "bg-primary text-primary-foreground"
                            : currentStepIndex > thisStepIndex
                              ? "bg-primary/20 text-primary"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {currentStepIndex > thisStepIndex ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className="text-xs mt-1 hidden sm:block whitespace-nowrap text-center px-1">{step.label}</span>
                    </div>
                    {index < arr.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 mx-2",
                          currentStepIndex > thisStepIndex
                            ? "bg-primary/20"
                            : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* STEP 1: SELECT SERVICE */}
        {currentStep === "service" && (
          <Card>
            <CardHeader>
              <CardTitle>Escolha os serviços</CardTitle>
              <CardDescription>Selecione um ou mais serviços que deseja agendar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupServicesByCategory()).map(([category, categoryServices]) => (
                <div key={category} className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {categoryLabels[category] || category}
                  </h3>
                  <div className="grid gap-3">
                    {categoryServices.map((service) => {
                      const isSelected = selectedServices.some(s => s.id === service.id)
                      return (
                        <button
                          key={service.id}
                          onClick={() => toggleService(service)}
                          className={cn(
                            "text-left p-4 rounded-lg border transition-all",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary hover:bg-primary/5"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={cn(
                                "mt-1 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0",
                                isSelected ? "bg-primary border-primary" : "border-muted-foreground"
                              )}>
                                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-medium mb-1">{service.name}</h4>
                                {service.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {service.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-primary">
                                R$ {service.price.toFixed(2)}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 justify-end">
                                <Clock className="h-3 w-3" />
                                {service.duration_minutes} min
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Selected Services Summary */}
              {selectedServices.length > 0 && (
                <div className="border-t pt-6">
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Serviços selecionados</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedServices([])}
                        className="h-auto py-1 px-2 text-xs"
                      >
                        Limpar todos
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {selectedServices.map((service) => (
                        <div key={service.id} className="flex items-center justify-between text-sm">
                          <span>{service.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{service.duration_minutes} min</span>
                            <span className="font-medium">R$ {service.price.toFixed(2)}</span>
                            <button
                              onClick={() => toggleService(service)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-3 flex items-center justify-between font-semibold">
                      <span>Total</span>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground font-normal">{getTotalDuration()} min</span>
                        <span className="text-primary">R$ {getTotalPrice().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setCurrentStep("professional")}
                    className="w-full gap-2 mt-4"
                    size="lg"
                  >
                    Continuar
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 2: SELECT PROFESSIONAL */}
        {currentStep === "professional" && selectedServices.length > 0 && (
          <Card>
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep("service")}
                className="mb-2 -ml-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <CardTitle>Escolha o profissional</CardTitle>
              <CardDescription>Selecione quem irá realizar o atendimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {professionals.map((professional) => (
                <button
                  key={professional.id}
                  onClick={() => {
                    setSelectedProfessional(professional)
                    setCurrentStep("datetime")
                  }}
                  className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(professional.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium">{professional.name}</h4>
                      {/* {professional.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {professional.phone}
                        </p>
                      )} */}
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* STEP 3: SELECT DATE & TIME */}
        {currentStep === "datetime" && selectedServices.length > 0 && selectedProfessional && (
          <Card>
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep("professional")}
                className="mb-2 -ml-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <CardTitle>Escolha data e horário</CardTitle>
              <CardDescription>Selecione o melhor dia e horário para você</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Calendar */}
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date)
                    setSelectedTime("")
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  locale={ptBR}
                  className="rounded-md border"
                />
              </div>

              {/* Closed Day Warning */}
              {isClosedDay && selectedDate && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Fechado</AlertTitle>
                  <AlertDescription>
                    O estabelecimento não funciona neste dia da semana. Selecione outra data.
                  </AlertDescription>
                </Alert>
              )}

              {/* Time Slots */}
              {selectedDate && !isClosedDay && (
                <div>
                  <Label className="mb-3 block">Horários disponíveis</Label>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(slot)}
                          className={cn(
                            "p-3 text-sm rounded-lg border transition-all font-medium",
                            selectedTime === slot
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:border-primary hover:bg-primary/5"
                          )}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Sem horários disponíveis</AlertTitle>
                      <AlertDescription>
                        Não há horários disponíveis para esta data. Tente outro dia.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Next Button */}
              {selectedDate && selectedTime && (
                <Button
                  onClick={() => setCurrentStep("info")}
                  className="w-full gap-2"
                  size="lg"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* STEP 4: CLIENT INFO */}
        {currentStep === "info" && (
          <Card>
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep("datetime")}
                className="mb-2 -ml-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <CardTitle>Seus dados</CardTitle>
              <CardDescription>Preencha suas informações para confirmar o agendamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="name">Nome completo *</Label>
                  <div className="relative mt-2">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={clientInfo.name}
                      onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                      placeholder="Seu nome completo"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Telefone *</Label>
                  <div className="relative mt-2">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={clientInfo.phone}
                      onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                      placeholder="(67) 99999-9999"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email (opcional)</Label>
                  <div className="relative mt-2">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={clientInfo.email}
                      onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={clientInfo.notes}
                    onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })}
                    placeholder="Alguma observação ou preferência..."
                    rows={3}
                    className="mt-2 resize-none"
                  />
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep("confirm")}
                disabled={!clientInfo.name || !clientInfo.phone}
                className="w-full gap-2"
                size="lg"
              >
                Revisar agendamento
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 5: CONFIRM */}
        {currentStep === "confirm" && selectedServices.length > 0 && selectedProfessional && selectedDate && (
          <Card>
            <CardHeader>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep("info")}
                className="mb-2 -ml-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
              <CardTitle>Confirmar agendamento</CardTitle>
              <CardDescription>Revise os dados antes de confirmar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Scissors className="h-5 w-5 text-primary" />
                    <p className="font-medium">Serviços</p>
                  </div>
                  {selectedServices.map((service) => (
                    <div key={service.id} className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">com {selectedProfessional.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">R$ {service.price.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">{service.duration_minutes} min</p>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <div className="text-right">
                      <p className="text-primary">R$ {getTotalPrice().toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground font-normal">{getTotalDuration()} min</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <CalIcon className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium capitalize">
                      {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">às {selectedTime}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">{clientInfo.name}</p>
                    <p className="text-sm text-muted-foreground">{clientInfo.phone}</p>
                    {clientInfo.email && (
                      <p className="text-sm text-muted-foreground">{clientInfo.email}</p>
                    )}
                  </div>
                </div>

                {clientInfo.notes && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium mb-1">Observações:</p>
                    <p className="text-sm text-muted-foreground">{clientInfo.notes}</p>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full gap-2"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirmar agendamento
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SUCCESS */}
        {currentStep === "success" && selectedServices.length > 0 && selectedProfessional && selectedDate && (
          <Card>
            <CardContent className="pt-6 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <Check className="h-8 w-8 text-green-500" />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-2">Agendamento confirmado!</h2>
                <p className="text-muted-foreground">
                  Seu agendamento foi realizado com sucesso.
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 space-y-4 text-left">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Scissors className="h-5 w-5 text-primary" />
                    <p className="font-medium">Serviços agendados</p>
                  </div>
                  {selectedServices.map((service) => (
                    <div key={service.id}>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">com {selectedProfessional.name}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-3 border-t">
                  <CalIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium capitalize">
                      {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">às {selectedTime} • {getTotalDuration()} minutos</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{establishment.name}</p>
                    {establishment.address && (
                      <p className="text-sm text-muted-foreground">{establishment.address}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {establishment.phone && (
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <a href={`tel:${establishment.phone}`}>
                      <Phone className="h-4 w-4" />
                      Ligar para o estabelecimento
                    </a>
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setCurrentStep("service")
                    setSelectedServices([])
                    setSelectedProfessional(null)
                    setSelectedDate(undefined)
                    setSelectedTime("")
                    setClientInfo({ name: "", phone: "", email: "", notes: "" })
                  }}
                >
                  Fazer outro agendamento
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {establishment.name}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}