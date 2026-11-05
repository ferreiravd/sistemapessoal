# Meu Painel

Aplicação web privada com Agenda, Brainstorm e Banco de Horas. Interface responsiva em gold, off-white, black e fern green.

## O que já está implementado
- Login por usuário e senha via Supabase Auth.
- Agenda mensal com cadastro, edição e exclusão de compromissos.
- Brainstorm com anotações livres, busca, cores, edição e exclusão.
- Banco de horas com jornada diária configurável (padrão de 528 minutos = 8h48), entrada, saída, intervalo e saldo acumulado.
- Dados isolados por usuário com Row Level Security (RLS).

## Para colocar online

1. Crie um projeto em https://supabase.com/.
2. No painel do projeto, abra **SQL Editor**, cole e execute `supabase/schema.sql`.
3. Em **Authentication > Users**, crie o usuário:
   - E-mail interno usado pelo login: `vinicius@painel.local`
   - Senha: defina uma senha forte no painel do Supabase. Não coloque senha dentro do código.
   - Se o Supabase bloquear o domínio `.local` na criação, use um endereço de e-mail válido e altere `LOGIN_EMAIL` no arquivo `src/App.jsx` para o mesmo endereço.
4. Em **Project Settings > API**, copie Project URL e anon/public key.
5. Duplique `.env.example` com o nome `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
6. Instale Node.js (versão LTS) e execute na pasta do projeto:
   ```bash
   npm install
   npm run dev
   ```
7. Para publicar, envie o projeto para GitHub e conecte o repositório a Vercel ou Netlify. Configure as mesmas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente da hospedagem e faça o deploy.

## Login
A tela aceita o nome de usuário `vinicius`. A autenticação é validada pelo Supabase usando o e-mail interno configurado em `LOGIN_EMAIL`. A senha é cadastrada e armazenada pelo serviço de autenticação, nunca no código-fonte.

## Observações
- O projeto não fica online automaticamente só por baixar os arquivos: é necessário criar e configurar o projeto Supabase e publicar a aplicação.
- O banco de horas considera o intervalo informado e compara o total líquido trabalhado com a jornada diária padrão. O saldo é recalculado com base na jornada atual configurada.
- A tabela de banco de horas permite um registro por dia. Se precisar corrigir um dia já lançado, exclua-o e registre novamente.
- Para uma empresa com regras específicas de adicional, feriados, tolerâncias ou virada de turno, a regra de cálculo deverá ser adaptada antes do uso oficial.
