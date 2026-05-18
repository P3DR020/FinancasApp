# Sistema de Controle Financeiro Pessoal

Aplicação web completa de controle de finanças pessoais com autenticação, dashboard analítico, gerenciamento de transações e metas de economia.

> [!IMPORTANT]
> O projeto será organizado em duas pastas separadas: `frontend/` (Vite + React) e `backend/` (Supabase SQL, migrations e documentação).

## Stack

- **Frontend:** React + TypeScript + Vite
- **UI:** Mantine UI v7 (zero Tailwind)
- **Backend/Auth:** Supabase (auth + PostgreSQL + RLS)
- **Charts:** @mantine/charts (wraps Recharts)
- **Routing:** React Router DOM v6
- **Icons:** @tabler/icons-react (padrão Mantine)
- **Font:** Plus Jakarta Sans (Google Fonts)

---

## User Review Required

> [!IMPORTANT]
> **Supabase Credentials:** O arquivo `.env` será criado com placeholders. Você precisará substituir com suas credenciais reais do Supabase antes de testar.

> [!IMPORTANT]
> **SQL do Supabase:** As tabelas `transacoes` e `metas` com RLS precisam ser criadas manualmente no SQL Editor do Supabase. O SQL está no arquivo `text` e será também incluído num arquivo `supabase-setup.sql` para referência.

---

## Open Questions

> [!NOTE]
> **Lucide vs Tabler Icons:** O spec menciona "Lucide React" mas o Mantine UI v7 usa `@tabler/icons-react` nativamente. Vou usar **@tabler/icons-react** para melhor integração com Mantine. Isso está OK?

---

## Proposed Changes

### 1. Inicialização do Projeto

#### [NEW] Projeto Vite + dependências
- Criar pasta `frontend/` e inicializar Vite dentro dela
- `npm create vite@latest ./frontend -- --template react-ts`
- Instalar todas as dependências: Mantine core, hooks, form, dates, charts, notifications, modals, tabler icons, dayjs, supabase-js, react-router-dom, recharts

#### [NEW] Pasta `backend/`
- Criar pasta `backend/` com scripts SQL e documentação do Supabase

---

### 2. Configuração Base

#### [NEW] [.env](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/.env)
Placeholders para `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

#### [NEW] [supabase-setup.sql](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/backend/supabase-setup.sql)
SQL completo para criar as tabelas `transacoes` e `metas` com RLS policies.

#### [NEW] [README.md](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/backend/README.md)
Documentação de como configurar o Supabase (criar projeto, rodar SQL, configurar RLS).

#### [NEW] [index.html](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/index.html)
Google Fonts (Plus Jakarta Sans), meta tags, título do app.

#### [NEW] [src/lib/supabase.ts](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/lib/supabase.ts)
Cliente Supabase usando variáveis de ambiente do Vite.

#### [NEW] [src/main.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/main.tsx)
MantineProvider com tema customizado (dark mode, teal primary, Plus Jakarta Sans), Notifications provider, BrowserRouter.

#### [NEW] [src/App.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/App.tsx)
React Router v6 com todas as rotas: Login, Cadastro, RecuperarSenha, e rotas protegidas (Dashboard, Transacoes, Metas).

---

### 3. Autenticação

#### [NEW] [src/contexts/AuthContext.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/contexts/AuthContext.tsx)
- Context com `session`, `user`, `loading`
- `getSession()` no mount + `onAuthStateChange()` listener
- Hook `useAuth()` exportado

#### [NEW] [src/components/PrivateRoute.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/components/PrivateRoute.tsx)
- Verifica sessão via `useAuth()`
- Redirect para `/login` se não autenticado
- `<LoadingOverlay>` durante carregamento

#### [NEW] [src/pages/Login.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/pages/Login.tsx)
- Card centralizado com Paper shadow
- TextInput (email) + PasswordInput
- Loading state no botão Entrar
- Links para Cadastro e Recuperar Senha
- Notificação de erro via `notifications.show()`

#### [NEW] [src/pages/Cadastro.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/pages/Cadastro.tsx)
- Mesma estrutura visual do Login
- Campos: nome, email, senha, confirmar senha
- Validação com `useForm` do Mantine
- Redirect para /dashboard após sucesso

#### [NEW] [src/pages/RecuperarSenha.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/pages/RecuperarSenha.tsx)
- Campo email + botão enviar
- Alert de sucesso

---

### 4. Layout Principal

#### [NEW] [src/components/Layout.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/components/Layout.tsx)
- `<AppShell>` com header (60px) e navbar (240px)
- Header: logo + avatar com menu dropdown (Perfil, Logout)
- Navbar: NavLinks para Dashboard, Transações, Metas
- `<Outlet>` para React Router
- Burger para mobile

---

### 5. Páginas Principais

#### [NEW] [src/pages/Dashboard.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/pages/Dashboard.tsx)
- 4 cards de resumo (Receitas, Despesas, Saldo, Economia) em SimpleGrid
- DonutChart (despesas por categoria)
- BarChart (receitas vs despesas últimos 6 meses)
- Tabela com últimas 5 transações
- LoadingOverlay durante fetch

#### [NEW] [src/pages/Transacoes.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/pages/Transacoes.tsx)
- Filtros: MonthPickerInput, Select tipo, Select categoria
- Botão "Nova Transação"
- Table striped/highlightOnHover com colunas: Data, Descrição, Categoria, Tipo (Badge), Valor, Ações
- Modal de criação/edição com useForm, SegmentedControl, NumberInput, DateInput
- Confirmação de exclusão
- CRUD completo via Supabase

#### [NEW] [src/pages/Metas.tsx](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/pages/Metas.tsx)
- Cards de resumo no topo (total metas, valor alvo, já guardado)
- Grid de cards por meta com Progress bar, Badge de status
- Botões: adicionar valor, excluir
- Modal nova meta (nome, valor alvo, valor inicial, data limite)
- Modal adicionar valor com auto-conclusão quando valor_atual >= valor_alvo

---

### 6. Estilos Globais

#### [NEW] [src/index.css](file:///c:/Users/pedro/Desktop/Codes/FinancasApp/frontend/src/index.css)
- Reset básico, smooth scrolling
- Estilos globais para dark theme consistency
- Animações sutis para cards e transições

---

## Verificação

### Automated Tests
- `npm run build` — verificar que o projeto compila sem erros TypeScript
- `npm run dev` — verificar que o dev server inicia corretamente

### Manual Verification
- Inspecionar visualmente cada página no browser via dev server
- Testar fluxo de navegação entre páginas
- Verificar responsividade (mobile navbar toggle)

---

## Estrutura Final

```
FinancasApp/
  frontend/                ← Aplicação React + Vite
    src/
      lib/
        supabase.ts
      contexts/
        AuthContext.tsx
      pages/
        Login.tsx
        Cadastro.tsx
        RecuperarSenha.tsx
        Dashboard.tsx
        Transacoes.tsx
        Metas.tsx
      components/
        Layout.tsx
        PrivateRoute.tsx
      App.tsx
      main.tsx
      index.css
    .env
    index.html
    package.json
    vite.config.ts
    tsconfig.json
  backend/                 ← Configuração Supabase
    supabase-setup.sql
    README.md
```
