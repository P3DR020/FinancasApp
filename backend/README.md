# Backend — Configuração Supabase

## O que é o Supabase?

O Supabase é um serviço gratuito que funciona como seu backend — ele cuida do banco de dados (PostgreSQL) e da autenticação de usuários. Você não precisa instalar nada no seu computador, tudo roda na nuvem.

---

## Passo a Passo Completo

### 1. Criar conta no Supabase

1. Acesse **[https://supabase.com](https://supabase.com)**
2. Clique em **"Start your project"** (botão verde no topo)
3. Faça login com sua conta do **GitHub** (é a forma mais fácil)
   - Se não tem GitHub, crie uma conta em [github.com](https://github.com) primeiro

### 2. Criar um novo projeto

1. Após logar, clique em **"New Project"**
2. Preencha:
   - **Name:** `financas-app` (ou qualquer nome)
   - **Database Password:** crie uma senha forte (guarde ela!)
   - **Region:** escolha `South America (São Paulo)` para melhor performance
3. Clique em **"Create new project"**
4. Aguarde ~2 minutos enquanto o projeto é criado

### 3. Rodar o SQL para criar as tabelas

1. No menu lateral esquerdo, clique em **"SQL Editor"** (ícone de código `<>`)
2. Clique em **"New query"** (botão no topo)
3. Copie **todo** o conteúdo do arquivo `supabase-setup.sql` (que está nesta pasta)
4. Cole no editor SQL
5. Clique no botão **"Run"** (ou pressione `Ctrl+Enter`)
6. Deve aparecer: **"Success. No rows returned"** — isso significa que funcionou!

### 4. Pegar as credenciais (URL e chave)

Aqui é onde você encontra os valores para colocar no `.env`:

1. No menu lateral esquerdo, clique em **"Project Settings"** (ícone de engrenagem ⚙️, lá embaixo)
2. Depois clique em **"API"** (no submenu da esquerda, em **"Configuration"**)
3. Você verá duas informações importantes:

```
┌─────────────────────────────────────────────────────────┐
│  Project URL                                            │
│  https://abcdefghij.supabase.co         [Copy]          │
│                                                         │
│  Project API Keys                                       │
│                                                         │
│  anon public                                            │
│  eyJhbGciOiJIUzI1NiIsInR5cCI6...        [Copy]          │
└─────────────────────────────────────────────────────────┘
```

4. Copie cada valor clicando no botão **[Copy]** ao lado

### 5. Colar no arquivo .env

1. Abra o arquivo `frontend/.env`
2. Substitua os placeholders pelos valores que você copiou:

```env
VITE_SUPABASE_URL=https://abcdefghij.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6...
```

> ⚠️ **NÃO** coloque aspas nos valores!  
> ⚠️ **NÃO** adicione espaços antes ou depois do `=`

### 6. Verificar autenticação por email

1. No menu lateral, clique em **"Authentication"**
2. Clique em **"Providers"** (no submenu)
3. Verifique que **"Email"** está **habilitado** (enabled) — ele vem habilitado por padrão
4. (Opcional) Em **"Email Templates"** você pode personalizar os e-mails enviados

### 7. Reiniciar o app

Após configurar o `.env`, reinicie o dev server:

```bash
cd frontend
npm run dev
```

Agora o app está conectado ao Supabase! Você pode criar uma conta na tela de cadastro e começar a usar.

---

## Tabelas criadas

| Tabela       | Descrição                        |
|-------------|----------------------------------|
| `transacoes` | Receitas e despesas do usuário   |
| `metas`      | Metas de economia/poupança       |

## Segurança (RLS)

Row Level Security está ativado em ambas as tabelas. Cada usuário só consegue ver e manipular seus próprios registros — isso é garantido automaticamente pelo Supabase.

---

## Resumo rápido

| O que fazer | Onde |
|---|---|
| Criar conta | [supabase.com](https://supabase.com) → Login com GitHub |
| Criar tabelas | SQL Editor → colar `supabase-setup.sql` → Run |
| Pegar URL | Settings ⚙️ → API → Project URL |
| Pegar chave | Settings ⚙️ → API → anon public key |
| Colar credenciais | Arquivo `frontend/.env` |
