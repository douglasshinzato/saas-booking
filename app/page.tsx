import Link from "next/link";
import { ArrowRight, Calendar, Users, Clock, BarChart3, Bell, Settings, CheckCircle2, Sparkles, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">BookingSaaS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm font-medium transition-colors hover:text-primary">
              Funcionalidades
            </Link>
            <Link href="#pricing" className="text-sm font-medium transition-colors hover:text-primary">
              Preços
            </Link>
            <Link href="#contact" className="text-sm font-medium transition-colors hover:text-primary">
              Contato
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="outline" size="sm">Entrar</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full">
        <div className="container mx-auto max-w-screen-2xl px-4 py-24 md:py-32">
          <div className="flex flex-col items-center gap-8 text-center">
            <Badge className="gap-1">
              <Sparkles className="h-3 w-3" />
              Simplifique seus agendamentos
            </Badge>

            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl">
              Gestão de agendamentos para seu{" "}
              <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                negócio de beleza
              </span>
            </h1>

            <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
              Plataforma completa para salões de beleza, barbearias e estéticas.
              Gerencie agendamentos, clientes, profissionais e muito mais em um único lugar.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Começar Gratuitamente
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">
                  Ver Funcionalidades
                </Button>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>14 dias grátis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Cancele quando quiser</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full">
        <div className="container mx-auto max-w-screen-2xl px-4 py-24 md:py-32">
          <div className="flex flex-col items-center gap-4 text-center mb-16">
            <Badge variant="outline">Funcionalidades</Badge>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="max-w-2xl text-muted-foreground md:text-lg">
              Ferramentas poderosas para gerenciar seu negócio de forma eficiente
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Agendamento Online</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Seus clientes podem agendar 24/7 através de uma interface simples e intuitiva.
                  Reduz faltas e otimiza seu tempo.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Gestão de Clientes</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Mantenha um cadastro completo com histórico de serviços, preferências e
                  informações de contato organizadas.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Horários Flexíveis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Configure horários de funcionamento, bloqueios e disponibilidade
                  de cada profissional de forma independente.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Notificações Automáticas</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Lembretes automáticos por email e SMS reduzem faltas e melhoram
                  a experiência do cliente.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Relatórios e Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Acompanhe métricas importantes, serviços mais vendidos,
                  e tome decisões baseadas em dados reais.
                </CardDescription>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Settings className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>Personalização Total</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Adapte o sistema às necessidades do seu negócio com configurações
                  flexíveis e customizáveis.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="w-full border-y bg-muted/50">
        <div className="container mx-auto max-w-screen-2xl px-4 py-24 md:py-32">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="flex flex-col gap-8">
              <div>
                <Badge variant="outline" className="mb-4">Por que escolher?</Badge>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                  Foque no que importa: seus clientes
                </h2>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Configuração Rápida</h3>
                    <p className="text-sm text-muted-foreground">
                      Comece em minutos. Interface intuitiva que não requer treinamento extensivo.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Dados Seguros</h3>
                    <p className="text-sm text-muted-foreground">
                      Seus dados e dos seus clientes protegidos com as melhores práticas de segurança.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Suporte Dedicado</h3>
                    <p className="text-sm text-muted-foreground">
                      Nossa equipe está sempre disponível para ajudar você a crescer.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-lg">
                <div className="absolute inset-0 bg-linear-to-r from-primary/20 to-primary/10 rounded-2xl blur-3xl" />
                <Card className="relative">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <CardTitle>Dashboard</CardTitle>
                      <Badge>Ao vivo</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border p-4">
                          <div className="text-2xl font-bold">124</div>
                          <div className="text-xs text-muted-foreground">Agendamentos</div>
                        </div>
                        <div className="rounded-lg border p-4">
                          <div className="text-2xl font-bold">89</div>
                          <div className="text-xs text-muted-foreground">Clientes Ativos</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">João Silva</div>
                            <div className="text-xs text-muted-foreground">Corte • 14:00</div>
                          </div>
                          <Badge variant="outline">Hoje</Badge>
                        </div>
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">Maria Santos</div>
                            <div className="text-xs text-muted-foreground">Barba • 15:30</div>
                          </div>
                          <Badge variant="outline">Hoje</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="w-full">
        <div className="container mx-auto max-w-screen-2xl px-4 py-24 md:py-32">
          <div className="flex flex-col items-center gap-4 text-center mb-16">
            <Badge variant="outline">Preços</Badge>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Planos para cada tamanho de negócio
            </h2>
            <p className="max-w-2xl text-muted-foreground md:text-lg">
              Escolha o plano ideal para você. Sem taxas ocultas, cancele quando quiser.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Iniciante</CardTitle>
                <CardDescription>Ideal para começar</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 49</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Até 50 agendamentos/mês</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>1 profissional</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Gestão de clientes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Notificações por email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Suporte por email</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline">Começar Grátis</Button>
              </CardContent>
            </Card>

            <Card className="border-primary shadow-lg lg:scale-105">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profissional</CardTitle>
                  <Badge>Mais Popular</Badge>
                </div>
                <CardDescription>Para negócios em crescimento</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 99</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Agendamentos ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Até 5 profissionais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Gestão completa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Email + SMS</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Relatórios avançados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Suporte prioritário</span>
                  </li>
                </ul>
                <Button className="w-full">Começar Grátis</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Empresarial</CardTitle>
                <CardDescription>Para grandes operações</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ 199</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Tudo do Profissional</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Profissionais ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Múltiplas unidades</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>API personalizada</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Gerente de conta dedicado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>Suporte 24/7</span>
                  </li>
                </ul>
                <Button className="w-full" variant="outline">Falar com Vendas</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full border-t bg-muted/50">
        <div className="container mx-auto max-w-screen-2xl px-4 py-24 md:py-32">
          <div className="flex flex-col items-center gap-8 text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Pronto para transformar seu negócio?
            </h2>
            <p className="text-lg text-muted-foreground">
              Junte-se a centenas de profissionais que já simplificaram seus agendamentos
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup">
                <Button size="lg" className="gap-2">
                  Começar Agora Grátis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#contact">
                <Button size="lg" variant="outline">
                  Falar com Especialista
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t">
        <div className="container mx-auto max-w-screen-2xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-bold">BookingSaaS</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Gestão de agendamentos simples e eficiente para seu negócio.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Funcionalidades</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground transition-colors">Preços</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Atualizações</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Sobre</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link href="#contact" className="hover:text-foreground transition-colors">Contato</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Privacidade</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Termos</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Cookies</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2026 BookingSaaS. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  );
}