"use client"

import { Clock, User, Check, X, Phone, Scissors } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

type Appointment = {
  id: string
  customer_name: string
  professional_name: string
  service_name: string
  start_time: string
  duration_minutes: number
  status: string
  notes: string | null
  customer_phone?: string
  price?: number
}

type Props = {
  appointment: Appointment
  showStaff?: boolean
  showDate?: boolean
  showActions?: boolean
  onUpdate?: () => void
  onCancel?: (id: string) => void // NOVA PROP
}

export function AppointmentCard({
  appointment,
  showStaff,
  showDate,
  showActions,
  onUpdate,
  onCancel // Recebendo a prop
}: Props) {
  const supabase = createBrowserSupabaseClient()

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-500",
    confirmed: "bg-green-500/20 text-green-500",
    completed: "bg-blue-500/20 text-blue-500",
    cancelled: "bg-red-500/20 text-red-500",
  }

  const statusLabels = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
  }

  const handleConfirm = async () => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", appointment.id)

      if (error) throw error
      toast.success("Agendamento confirmado!")
      onUpdate?.()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao confirmar agendamento")
    }
  }

  const handleComplete = async () => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", appointment.id)

      if (error) throw error
      toast.success("Agendamento concluído!")
      onUpdate?.()
    } catch (error) {
      console.error(error)
      toast.error("Erro ao concluir agendamento")
    }
  }

  // O handleCancel interno foi removido/substituído pela chamada da prop direta no botão

  const startTime = parseISO(appointment.start_time)

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="text-center min-w-[60px]">
        <span className="text-xl font-bold">{format(startTime, "HH:mm")}</span>
        {showDate && (
          <p className="text-xs text-muted-foreground">
            {format(startTime, "dd MMM", { locale: ptBR })}
          </p>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium truncate">{appointment.service_name}</span>
          <span className={cn("text-xs px-2 py-0.5 rounded-full shrink-0", statusColors[appointment.status as keyof typeof statusColors])}>
            {statusLabels[appointment.status as keyof typeof statusLabels]}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{appointment.customer_name}</span>
          </div>
          {appointment.customer_phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span>{appointment.customer_phone}</span>
            </div>
          )}
          {showStaff && (
            <div className="flex items-center gap-1">
              <Scissors className="h-3 w-3" />
              <span className="text-primary">com {appointment.professional_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{appointment.duration_minutes} min</span>
          </div>
          {appointment.price && (
            <span className="font-medium text-foreground">R$ {appointment.price.toFixed(2)}</span>
          )}
        </div>
      </div>

      {showActions && appointment.status !== "completed" && appointment.status !== "cancelled" && (
        <div className="flex items-center gap-2 shrink-0">
          {appointment.status === "pending" && (
            <button
              onClick={handleConfirm}
              className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors"
              title="Confirmar"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          {appointment.status === "confirmed" && (
            <button
              onClick={handleComplete}
              className="p-2 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition-colors"
              title="Concluir"
            >
              <Check className="h-4 w-4" />
            </button>
          )}

          {/* MUDANÇA AQUI: Agora chama a prop onCancel passada pelo pai */}
          <button
            onClick={() => onCancel?.(appointment.id)}
            className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
            title="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}