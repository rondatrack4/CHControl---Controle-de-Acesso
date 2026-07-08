# CHControl

Sistema **SaaS multi-tenant** de controle de acesso para condomínios residenciais e empresariais.
Cada empresa (condomínio) possui dados totalmente isolados; porteiros só acessam a própria empresa.

Construído com **Next.js 15 (App Router) + Supabase (PostgreSQL + Auth)**, TypeScript, Tailwind CSS
e componentes no estilo shadcn/ui.

---

## ✨ Funcionalidades

- **Autenticação** de porteiros/superadmin (Supabase Auth, sessão via cookies).
- **Multi-tenancy** com isolamento por `company_id` reforçado por **Row Level Security (RLS)**.
- **Empresas** (superadmin): cadastro do condomínio + criação automática do 1º porteiro.
- **Moradores**: CRUD completo, foto, residência (Bloco/Apto ou Quadra/Lote).
- **Visitantes**: vinculados a um morador responsável (preenchimento automático da residência).
- **Prestadores de serviço**: empresa, placa, tipo de serviço, morador responsável.
- **Controle de Acesso**: registro de entrada/saída com porteiro responsável e snapshot do histórico.
  Impede duas entradas em aberto para a mesma pessoa (índice único parcial).
- **Histórico**: filtros (nome, CPF, tipo, responsável, residência, datas, porteiro, status),
  pesquisa instantânea, paginação, impressão, exportação **PDF** e **Excel**.
- **Dashboard**: KPIs em tempo real + gráficos (entradas por dia/mês, tipos de acesso, horários de pico).
- **Auditoria**: login, logout, cadastros, alterações, exclusões, entradas, saídas e exportações,
  com usuário, empresa, IP, navegador, data e hora.
- **UI**: sidebar recolhível, navbar, tema claro/escuro, cards, tabelas, modais, toasts, responsivo.

---

## 🚀 Setup local

### Pré-requisitos
- **Node.js 20+**
- **Supabase CLI** (`npm i -g supabase` ou via `npx supabase`)
- **Docker Desktop** (necessário para rodar o Supabase localmente com `supabase start`)

> Sem Docker? Você pode usar um projeto no **Supabase Cloud**: aplique as migrations
> (`supabase/migrations`) e preencha o `.env.local` com a URL e as chaves do projeto.

### 1. Instalar dependências
```bash
npm install
```

### 2. Subir o Supabase local
```bash
npx supabase start
```
Ao final, o CLI mostra as chaves. Copie **API URL**, **anon key** e **service_role key**.

### 3. Configurar variáveis de ambiente
```bash
cp .env.local.example .env.local
```
Preencha com os valores exibidos pelo `supabase start`:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

### 4. Aplicar schema + seed
O `supabase start` já aplica as migrations e o `seed.sql`. Para recriar do zero:
```bash
npm run db:reset
```

### 5. Rodar a aplicação
```bash
npm run dev
```
Acesse http://localhost:3000

### Credenciais de demonstração (seed)
| Papel      | E-mail                     | Senha         |
|------------|----------------------------|---------------|
| Superadmin | superadmin@chcontrol.dev   | chcontrol123  |
| Porteiro   | portaria@chcontrol.dev     | chcontrol123  |

---

## 🗂️ Estrutura

```
src/
  app/
    login/                 # tela de login (Server Action)
    (app)/                 # área autenticada (layout com sidebar/navbar)
      dashboard/           # KPIs + gráficos
      acessos/             # entrada/saída
      moradores/           # CRUD moradores
      visitantes/          # CRUD visitantes
      prestadores/         # CRUD prestadores
      historico/           # filtros + exportação
      auditoria/           # logs de auditoria
      empresas/            # CRUD empresas (superadmin)
    api/health/            # healthcheck
  components/
    ui/                    # primitivos (button, input, dialog, table, select...)
    shared/                # data-table, stat-card, photo-upload, combobox...
    layout/                # sidebar, navbar, app-shell
    modules/               # componentes por domínio
  lib/
    supabase/              # clients (browser/server/admin/middleware)
    auth.ts                # sessão + guards
    audit.ts               # helper de auditoria (IP/navegador)
    validations.ts         # schemas Zod
    export.ts              # PDF/Excel
    database.types.ts      # tipos de domínio
supabase/
  migrations/0001_init.sql # schema, RLS, funções, índices, storage
  seed.sql                 # dados de demonstração
```

Veja [docs/ARQUITETURA.md](docs/ARQUITETURA.md) para as decisões de arquitetura.

---

## 🔒 Segurança

- Senhas gerenciadas pelo Supabase Auth (bcrypt).
- Isolamento entre empresas via RLS (`current_company_id()`, `is_superadmin()`).
- `service_role` usada **apenas** em Server Actions confiáveis (provisionar empresa/porteiro).
- Validação de entrada com Zod em todas as Server Actions.
- Auditoria imutável de eventos sensíveis.

## 📜 Scripts
| Script            | Descrição                          |
|-------------------|------------------------------------|
| `npm run dev`     | Ambiente de desenvolvimento        |
| `npm run build`   | Build de produção                  |
| `npm run start`   | Servir build de produção           |
| `npm run db:reset`| Recriar banco (migrations + seed)  |
