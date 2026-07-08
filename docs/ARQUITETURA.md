# Decisões de Arquitetura — CHControl

## 1. Stack
- **Next.js 15 (App Router)** com Server Components + Server Actions: renderização no
  servidor com acesso seguro ao banco, sem uma camada de API separada.
- **Supabase (PostgreSQL + Auth + Storage)**: banco relacional robusto, autenticação
  pronta e RLS nativo — ideal para multi-tenancy seguro.
- **TypeScript + Tailwind + componentes estilo shadcn/ui**: DX forte e UI consistente.

## 2. Multi-tenancy e isolamento
- Toda tabela de negócio possui `company_id`.
- **Row Level Security (RLS)** garante o isolamento no nível do banco (não só na aplicação):
  - `current_company_id()` — `SECURITY DEFINER`, lê o `company_id` do perfil do usuário
    autenticado sem causar recursão de política.
  - `is_superadmin()` — permite ao gestor da plataforma administrar empresas.
  - Políticas por tabela: `company_id = current_company_id() OR is_superadmin()`.
- Como a segurança está no banco, mesmo um bug na aplicação não vaza dados entre condomínios.

## 3. Papéis
- `superadmin` — gerencia empresas e cria o primeiro porteiro. Sem `company_id`.
- `porter` — usuário da portaria, restrito à própria empresa.
- `admin` — reservado para administração interna da empresa (extensível).

## 4. Modelo de dados
- `companies` → raiz do tenant.
- `profiles` (1:1 com `auth.users`) → papel + empresa.
- `residents`, `visitors`, `service_providers` → cadastros; visitantes/prestadores
  referenciam `resident_id` (morador responsável).
- `access_logs` → **entrada/saída** com *snapshot desnormalizado* (nome, CPF, responsável,
  residência, porteiros). Isso torna o histórico **imutável**: alterar/excluir um cadastro
  não corrompe registros passados.
  - Índice único parcial `WHERE status = 'inside'` impede duas entradas em aberto para a
    mesma pessoa.
- `audit_logs` → trilha de auditoria com IP, navegador, usuário, empresa e detalhes JSON.

## 5. Autenticação e sessão
- Login por e-mail/senha (Supabase Auth). Sessão em cookies via `@supabase/ssr`.
- `middleware.ts` atualiza a sessão a cada request e protege rotas privadas
  (redireciona não autenticados para `/login`).
- `requireSession()` / `requireSuperadmin()` protegem Server Components e Actions.

## 6. Auditoria
- Implementada na camada de aplicação (`lib/audit.ts`) para capturar **IP e navegador**
  (indisponíveis em triggers de banco) além do usuário/empresa.
- Registrada em login, logout, create, update, delete, entry, exit e export.
- Falhas de auditoria nunca interrompem o fluxo principal.

## 7. Fluxo de escrita
- Formulários (Client Components) chamam **Server Actions** tipadas.
- Cada Action: valida com **Zod** → grava via cliente Supabase do servidor (respeitando RLS)
  → registra auditoria → `revalidatePath()` para atualizar a UI.
- Provisionamento de empresa + porteiro usa o **cliente admin (`service_role`)** por exigir
  a criação de usuário no Auth; roda somente no servidor, restrito a superadmin.

## 8. Listagem, filtros e exportação
- Páginas carregam os dados no servidor (respeitando RLS) e entregam a um
  `DataTable`/cliente de histórico que faz **busca instantânea, ordenação e paginação**
  no cliente (resposta imediata para o porteiro).
- Exportação **PDF** (`jspdf` + `autotable`) e **Excel** (`xlsx`) no cliente; cada exportação
  é auditada.

## 9. Tipagem do Supabase
- Os clientes Supabase são usados sem o generic `Database` para evitar atrito com o
  sistema de tipos do PostgREST em consultas com *joins* aninhados. Os **tipos de domínio**
  (`Resident`, `Visitor`, ...) em `lib/database.types.ts` são aplicados por *cast* explícito
  nas fronteiras (páginas → componentes), preservando segurança de tipos onde importa.
- Para regenerar tipos a partir de um banco real:
  `npx supabase gen types typescript --local > src/lib/database.types.generated.ts`.

## 10. Extensibilidade
- Novos módulos seguem o padrão: `page.tsx` (server) → `actions.ts` (Zod + auditoria) →
  `*-client.tsx` (DataTable) → `*-form.tsx` (dialog). Componentes `ui/` e `shared/`
  são reutilizáveis.
