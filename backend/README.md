# Backend — Configuração Supabase

## Como configurar

1. **Crie um projeto no Supabase:** [https://supabase.com](https://supabase.com)

2. **Execute o SQL:** Abra o **SQL Editor** no painel do Supabase e cole o conteúdo do arquivo `supabase-setup.sql`. Clique em "Run".

3. **Configure as variáveis de ambiente:** No painel do Supabase, vá em **Settings > API** e copie:
   - `Project URL` → cole em `VITE_SUPABASE_URL` no arquivo `frontend/.env`
   - `anon public key` → cole em `VITE_SUPABASE_ANON_KEY` no arquivo `frontend/.env`

4. **Ative a autenticação por email:** Em **Authentication > Providers**, certifique-se de que o provider **Email** está ativado.

## Tabelas criadas

| Tabela      | Descrição                        |
|-------------|----------------------------------|
| `transacoes`| Receitas e despesas do usuário   |
| `metas`     | Metas de economia/poupança       |

## Segurança (RLS)

Row Level Security está ativado em ambas as tabelas. Cada usuário só consegue ver e manipular seus próprios registros.
