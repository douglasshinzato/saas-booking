# SaaS Booking

Aplicação SaaS para gestão de agendamentos de estabelecimentos (ex.: barbearia, salão, clínica), com painel administrativo protegido e página pública de reserva por slug.

## Visão Geral

O projeto foi construído com Next.js (App Router) e Supabase para autenticação e dados.

Principais objetivos:

- Permitir cadastro e login de estabelecimentos.
- Oferecer painel com métricas e operação diária.
- Gerenciar serviços, profissionais, clientes, horários e agendamentos.
- Disponibilizar uma página pública de agendamento para clientes finais em `/{slug}`.

## Funcionalidades

- Autenticação com Supabase (login, cadastro, confirmação de email, recuperação e atualização de senha).
- Rotas protegidas para o painel administrativo.
- Dashboard com KPIs e gráfico de faturamento.
- CRUD de serviços.
- CRUD de profissionais.
- Gestão de agendamentos com validações de conflito de horário.
- Cadastro/gestão de clientes.
- Página pública de booking por slug do estabelecimento.
- Tema com suporte a claro/escuro.

## Stack Tecnológica

- Next.js 16 (App Router)
- React 19 + TypeScript
- Supabase (`@supabase/ssr` e `@supabase/supabase-js`)
- Tailwind CSS 4
- Radix UI + componentes em `components/ui`
- date-fns
- Recharts
- Sonner (toast)

## Estrutura do Projeto

```text
app/
	(auth)/               # Fluxos de autenticação (login, cadastro, senha, confirmação)
	(protected)/dashboard # Painel administrativo e módulos de gestão
	[slug]/               # Página pública de agendamento do estabelecimento
components/
	ui/                   # Biblioteca de componentes de interface
lib/
	supabase/             # Clientes browser/server e middleware de sessão
hooks/                  # Hooks reutilizáveis
```

## Requisitos

- Node.js 20+ (recomendado)
- npm (ou pnpm/yarn/bun)
- Projeto Supabase configurado

## Configuração

1. Instale dependências:

```bash
npm install
```

2. Crie o arquivo `.env.local` na raiz com as variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLIC_ANON_KEY
```

3. Inicie o ambiente de desenvolvimento:

```bash
npm run dev
```

4. Acesse no navegador:

```text
http://localhost:3000
```

## Scripts

- `npm run dev`: inicia o servidor de desenvolvimento.
- `npm run build`: gera build de produção.
- `npm run start`: inicia a aplicação em modo produção.
- `npm run lint`: executa lint com ESLint.

## Rotas Principais

- Públicas:
	- `/sign-up`
	- `/login`
	- `/forgot-password`
	- `/update-password`
	- `/{slug}` (agendamento público)

- Protegidas:
	- `/dashboard`
	- `/dashboard/agendamentos`
	- `/dashboard/servicos`
	- `/dashboard/profissionais`
	- `/dashboard/clientes`
	- `/dashboard/horarios`
	- `/dashboard/configuracoes`

## Observações de Banco de Dados

Pelo código atual, a aplicação espera tabelas no Supabase com entidades como:

- `profiles`
- `establishments`
- `services`
- `professionals`
- `customers`
- `appointments`
- `schedules`

Também é recomendado configurar Row Level Security (RLS) e políticas por estabelecimento.

## Próximos Passos Recomendados

- Definir e versionar schema SQL/migrations.
- Configurar CI para lint e build.
- Adicionar testes (unitários e de integração) para fluxos críticos de booking.

## Licença

Defina aqui a licença do projeto (ex.: MIT, proprietária, etc.).
