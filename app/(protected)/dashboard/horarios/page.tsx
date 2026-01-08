"use client";

import { useEffect, useState, useCallback } from "react";
import { Clock, Save, Loader2, Calendar, AlertCircle } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

// Importações dos componentes shadcn/ui
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Tipos
type DaySchedule = {
  id?: string;
  day: number; // 0 = domingo, 1 = segunda, etc
  dayKey: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string;
  breakEnd: string;
};

type Professional = {
  id: string;
  name: string;
  is_active: boolean;
};

const DAYS_OF_WEEK = [
  { key: "monday", label: "Segunda-feira", value: 1 },
  { key: "tuesday", label: "Terça-feira", value: 2 },
  { key: "wednesday", label: "Quarta-feira", value: 3 },
  { key: "thursday", label: "Quinta-feira", value: 4 },
  { key: "friday", label: "Sexta-feira", value: 5 },
  { key: "saturday", label: "Sábado", value: 6 },
  { key: "sunday", label: "Domingo", value: 0 },
];

export default function HorariosPage() {
  const supabase = createBrowserSupabaseClient();

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Horários do estabelecimento
  const [establishmentSchedule, setEstablishmentSchedule] = useState<DaySchedule[]>(
    DAYS_OF_WEEK.map(day => ({
      dayKey: day.key,
      day: day.value,
      isOpen: day.value !== 0, // Domingo fechado por padrão
      openTime: "09:00",
      closeTime: "18:00",
      breakStart: "",
      breakEnd: "",
    }))
  );

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

      // Buscar profissionais ativos
      const { data: professionalsData, error: professionalsError } = await supabase
        .from("professionals")
        .select("id, name, is_active")
        .eq("establishment_id", profile.establishment_id)
        .eq("is_active", true)
        .order("name");

      if (professionalsError) throw professionalsError;
      setProfessionals(professionalsData || []);

      // Buscar horários salvos
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("schedules")
        .select("*")
        .eq("establishment_id", profile.establishment_id)
        .is("professional_id", null) // Apenas horários do estabelecimento
        .order("day_of_week");

      if (schedulesError) throw schedulesError;

      // Se houver horários salvos, usar eles
      if (schedulesData && schedulesData.length > 0) {
        const scheduleMap = new Map(schedulesData.map(s => [s.day_of_week, s]));

        setEstablishmentSchedule(
          DAYS_OF_WEEK.map(day => {
            const saved = scheduleMap.get(day.value);
            if (saved) {
              return {
                id: saved.id,
                dayKey: day.key,
                day: day.value,
                isOpen: saved.is_open,
                openTime: saved.open_time || "09:00",
                closeTime: saved.close_time || "18:00",
                breakStart: saved.break_start || "",
                breakEnd: saved.break_end || "",
              };
            }
            return {
              dayKey: day.key,
              day: day.value,
              isOpen: day.value !== 0,
              openTime: "09:00",
              closeTime: "18:00",
              breakStart: "",
              breakEnd: "",
            };
          })
        );
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScheduleChange = (index: number, field: keyof DaySchedule, value: string | boolean) => {
    setEstablishmentSchedule(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setHasChanges(true);
  };

  const handleCopyToAll = (sourceIndex: number) => {
    const source = establishmentSchedule[sourceIndex];
    setEstablishmentSchedule(prev =>
      prev.map(day => ({
        ...day,
        openTime: source.openTime,
        closeTime: source.closeTime,
        breakStart: source.breakStart,
        breakEnd: source.breakEnd,
      }))
    );
    setHasChanges(true);
    toast.success("Horário copiado para todos os dias!");
  };

  const handleSave = async () => {
    if (!establishmentId) {
      toast.error("Estabelecimento não identificado");
      return;
    }

    setSaving(true);
    try {
      // Preparar dados para inserção/atualização
      const scheduleData = establishmentSchedule.map(schedule => ({
        // id: schedule.id,  <-- REMOVA ESTA LINHA. Não precisamos dela para o insert.
        establishment_id: establishmentId,
        professional_id: null,
        day_of_week: schedule.day,
        is_open: schedule.isOpen,
        open_time: schedule.openTime,
        close_time: schedule.closeTime,
        break_start: schedule.breakStart || null,
        break_end: schedule.breakEnd || null,
        updated_at: new Date().toISOString(),
      }));

      // Deletar horários existentes do estabelecimento
      const { error: deleteError } = await supabase
        .from("schedules")
        .delete()
        .eq("establishment_id", establishmentId)
        .is("professional_id", null);

      if (deleteError) throw deleteError;

      // Inserir novos horários
      const { error: insertError } = await supabase
        .from("schedules")
        .insert(scheduleData);

      if (insertError) throw insertError;

      // Recarregar dados
      await fetchData();
      setHasChanges(false);
      toast.success("Horários salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar horários");
    } finally {
      setSaving(false);
    }
  };

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Horários de Funcionamento</h1>
            <p className="text-muted-foreground">
              Configure os horários do estabelecimento e disponibilidade dos profissionais
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>

        {hasChanges && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Você tem alterações não salvas. Clique em &ldquo;Salvar Alterações&rdquo; para aplicar.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <Tabs defaultValue="establishment" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="establishment" className="gap-2">
              <Calendar className="h-4 w-4" />
              Estabelecimento
            </TabsTrigger>
            <TabsTrigger value="professionals" className="gap-2">
              <Clock className="h-4 w-4" />
              Profissionais
            </TabsTrigger>
          </TabsList>

          {/* Horários do Estabelecimento */}
          <TabsContent value="establishment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Horário de Funcionamento</CardTitle>
                <CardDescription>
                  Defina os horários em que o estabelecimento está aberto para agendamentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {establishmentSchedule.map((schedule, index) => {
                  const dayLabel = DAYS_OF_WEEK.find(d => d.key === schedule.dayKey)?.label || schedule.dayKey;

                  return (
                    <div key={schedule.dayKey} className="space-y-3 pb-4 border-b last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={schedule.isOpen}
                            onCheckedChange={(checked) => handleScheduleChange(index, "isOpen", checked)}
                          />
                          <Label className="text-base font-medium cursor-pointer">
                            {dayLabel}
                          </Label>
                        </div>
                        {schedule.isOpen && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyToAll(index)}
                            className="text-xs"
                          >
                            Copiar para todos
                          </Button>
                        )}
                      </div>

                      {schedule.isOpen && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-11">
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Horário de Funcionamento</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={schedule.openTime}
                                onChange={(e) => handleScheduleChange(index, "openTime", e.target.value)}
                                className="flex-1"
                              />
                              <span className="text-muted-foreground">às</span>
                              <Input
                                type="time"
                                value={schedule.closeTime}
                                onChange={(e) => handleScheduleChange(index, "closeTime", e.target.value)}
                                className="flex-1"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Intervalo (opcional)</Label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="time"
                                value={schedule.breakStart}
                                onChange={(e) => handleScheduleChange(index, "breakStart", e.target.value)}
                                className="flex-1"
                                placeholder="--:--"
                              />
                              <span className="text-muted-foreground">às</span>
                              <Input
                                type="time"
                                value={schedule.breakEnd}
                                onChange={(e) => handleScheduleChange(index, "breakEnd", e.target.value)}
                                className="flex-1"
                                placeholder="--:--"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Horários dos Profissionais */}
          <TabsContent value="professionals" className="space-y-4">
            {professionals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Nenhum profissional ativo encontrado.
                    <br />
                    Adicione profissionais para configurar seus horários.
                  </p>
                  <Button variant="link" className="mt-4" asChild>
                    <a href="/dashboard/profissionais">
                      Ir para Profissionais
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {professionals.map((professional) => (
                  <Card key={professional.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{professional.name}</CardTitle>
                      <CardDescription>
                        Configure os horários de disponibilidade deste profissional
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          Configuração de horários por profissional será implementada em breve
                        </p>
                        <p className="text-xs mt-1">
                          Por enquanto, os profissionais seguem o horário do estabelecimento
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}