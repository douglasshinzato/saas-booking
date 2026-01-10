"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  DollarSign,
  Briefcase,
  Loader2,
  Activity
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  startOfDay,
  endOfDay,
  subDays,
  format,
  parseISO,
  isWithinInterval,
  startOfMonth
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppointmentCard } from "@/components/appointment-card";

// Tipos
type DashboardMetrics = {
  revenueToday: number;
  appointmentsToday: number;
  newCustomersMonth: number;
  activeProfessionals: number;
};

type ChartData = {
  name: string; // Dia da semana (Seg, Ter...)
  total: number; // Faturamento
};

type EnrichedAppointment = {
  id: string;
  customer_name: string;
  professional_name: string;
  service_name: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  price: number;
  customer_phone?: string;
};

export default function DashboardPage() {
  const supabase = createBrowserSupabaseClient();
  const [loading, setLoading] = useState(true);

  // States de Dados
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    revenueToday: 0,
    appointmentsToday: 0,
    newCustomersMonth: 0,
    activeProfessionals: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<EnrichedAppointment[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("establishment_id")
        .eq("id", user.id)
        .single();

      if (!profile?.establishment_id) return;
      const establishmentId = profile.establishment_id;

      // Datas de Referência
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      const last7DaysStart = startOfDay(subDays(new Date(), 6)).toISOString(); // Últimos 7 dias
      const monthStart = startOfMonth(new Date()).toISOString();

      // --- BUSCAS PARALELAS ---
      const [
        appointmentsRes,
        servicesRes,
        professionalsRes,
        customersRes
      ] = await Promise.all([
        // Buscar agendamentos dos últimos 7 dias até o futuro (para gráfico + lista)
        supabase
          .from("appointments")
          .select("*")
          .eq("establishment_id", establishmentId)
          .gte("start_time", last7DaysStart), // Filtro inicial para não trazer o banco todo

        supabase.from("services").select("id, price, name").eq("establishment_id", establishmentId),

        supabase.from("professionals").select("id, name, is_active").eq("establishment_id", establishmentId).eq("is_active", true),

        supabase.from("customers").select("id, name, created_at").eq("establishment_id", establishmentId)
      ]);

      const allAppointments = appointmentsRes.data || [];
      const services = servicesRes.data || [];
      const professionals = professionalsRes.data || [];
      const customers = customersRes.data || [];

      // --- 1. CÁLCULO DE MÉTRICAS (KPIs) ---

      // Hoje
      const appointmentsToday = allAppointments.filter(apt =>
        isWithinInterval(parseISO(apt.start_time), {
          start: parseISO(todayStart),
          end: parseISO(todayEnd)
        }) && apt.status !== 'cancelled'
      );

      const revenueToday = appointmentsToday.reduce((acc, apt) => {
        const service = services.find(s => s.id === apt.service_id);
        return acc + (service?.price || 0);
      }, 0);

      // Novos Clientes (Este Mês)
      const newCustomers = customers.filter(c =>
        c.created_at && parseISO(c.created_at) >= parseISO(monthStart)
      ).length;

      setMetrics({
        revenueToday,
        appointmentsToday: appointmentsToday.length,
        newCustomersMonth: newCustomers,
        activeProfessionals: professionals.length,
      });

      // --- 2. DADOS DO GRÁFICO (Últimos 7 dias) ---
      const chartMap = new Map<string, number>();

      // Inicializar últimos 7 dias com 0
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dayKey = format(d, "dd/MM", { locale: ptBR }); // Chave: "25/12"
        chartMap.set(dayKey, 0);
      }

      // Somar faturamento por dia
      allAppointments.forEach(apt => {
        if (apt.status === 'cancelled') return;

        const aptDate = parseISO(apt.start_time);
        // Se for anterior a hoje+1 e posterior a 7 dias atrás
        if (aptDate >= parseISO(last7DaysStart) && aptDate <= new Date()) {
          const dayKey = format(aptDate, "dd/MM", { locale: ptBR });
          if (chartMap.has(dayKey)) {
            const service = services.find(s => s.id === apt.service_id);
            const currentTotal = chartMap.get(dayKey) || 0;
            chartMap.set(dayKey, currentTotal + (service?.price || 0));
          }
        }
      });

      // Converter Map para Array do Recharts
      const chartArray: ChartData[] = Array.from(chartMap).map(([name, total]) => ({
        name,
        total
      }));
      setChartData(chartArray);

      // --- 3. PRÓXIMOS AGENDAMENTOS (Lista) ---
      const now = new Date();
      const nextAppointments = allAppointments
        .filter(apt => parseISO(apt.start_time) >= now && apt.status !== 'cancelled' && apt.status !== 'completed')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 5) // Top 5
        .map(apt => {
          const service = services.find(s => s.id === apt.service_id);
          const professional = professionals.find(p => p.id === apt.professional_id);
          const customer = customers.find(c => c.id === apt.customer_id);

          return {
            id: apt.id,
            customer_name: customer?.name || "Cliente Excluído",
            professional_name: professional?.name || "Profissional Inativo",
            service_name: service?.name || "Serviço Inativo",
            start_time: apt.start_time,
            duration_minutes: apt.duration_minutes,
            status: apt.status,
            notes: apt.notes,
            price: service?.price || 0,
          };
        });

      setUpcomingAppointments(nextAppointments);

    } catch (error) {
      console.error("Erro dashboard:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      {/* Header */}
      {/* CORREÇÃO: flex-col no mobile para empilhar, md:flex-row no desktop para alinhar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        {/* Adicionei flex-wrap para garantir que os botões quebrem linha se necessário em telas muito pequenas */}
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/agendamentos">Ver Agenda</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/agendamentos">Novo Agendamento</Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Estimada (Hoje)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {metrics.revenueToday.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Baseado nos agendamentos do dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos (Hoje)</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.appointmentsToday}</div>
            <p className="text-xs text-muted-foreground">Clientes agendados para hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Clientes (Mês)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{metrics.newCustomersMonth}</div>
            <p className="text-xs text-muted-foreground">Cadastrados este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipe Ativa</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProfessionals}</div>
            <p className="text-xs text-muted-foreground">Profissionais disponíveis</p>
          </CardContent>
        </Card>
      </div>

      {/* Área Principal */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

        {/* Gráfico de Receita (Ocupa 4 colunas) */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Visão Geral de Receita</CardTitle>
            <CardDescription>Faturamento estimado nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  Receita
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  R$ {Number(payload[0].value).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar
                    dataKey="total"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lista Próximos Agendamentos */}
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
            <CardDescription>
              Você tem {upcomingAppointments.length} agendamentos futuros próximos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <AppointmentCard
                    key={apt.id}
                    appointment={apt}
                    showDate={true}
                    showStaff={true}
                  // Removemos ações complexas para manter o dashboard limpo,
                  // mas poderíamos adicionar um botão simples "Ver Detalhes"
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Activity className="h-10 w-10 mb-3 opacity-20" />
                <p>Nenhum agendamento futuro encontrado.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}