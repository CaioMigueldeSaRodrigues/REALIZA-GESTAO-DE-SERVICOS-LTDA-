# Acesso de apresentação — Edmilson

O portal REALIZA utiliza Supabase Auth com e-mail e senha; não aceita nome de usuário isolado.
Para não depender de endereço pessoal, o provisionador gera um **e-mail técnico temporário**
com senha aleatória forte, exibidos somente no terminal local.

## Procedimento
1. No computador de administração, clone/atualize o repositório.
2. No `.env.local` (NÃO publicar), configure:
   `NEXT_PUBLIC_SUPABASE_URL=https://xogsqotomyvxgtippuzc.supabase.co`
   e `SUPABASE_SECRET_KEY=<secret key do projeto>`.
3. Execute `npm install` e `npm run apresentacao:edmilson`.
4. Use as credenciais retornadas no terminal e acesse `/login`.
5. O acesso expira em 24 horas e só permite visualizar o fluxo operacional,
   ordens, frota, origens da água, contas a receber, contas a pagar,
   custos operacionais e DRE gerencial.
6. Exclua em Supabase > Authentication > Users após o evento.

**A senha `@1234` NÃO foi aplicada**: é fraca para dados operacionais e financeiros.
O conector SQL disponível não executa a Auth Admin API.
Portanto, o script local deve concluir a criação do login real.

O perfil `viewer_ops_finance` não tem INSERT/UPDATE/DELETE por RLS.
Funções transacionais continuam exigindo os papéis específicos.
A barra lateral mostra apenas os módulos da apresentação.
