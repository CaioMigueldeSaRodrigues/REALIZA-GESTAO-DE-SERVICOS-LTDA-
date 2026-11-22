# Login administrativo temporário — REALIZA

A conta temporária é criada pela API oficial do Supabase Auth; não se edita auth.users por SQL.

## Uma execução local, sem salvar senhas no GitHub
1. No Supabase do projeto REALIZA, abra Settings → API Keys e copie a **secret key** (servidor).
2. Na pasta do repositório no seu computador, crie `.env.local` contendo:
   - `NEXT_PUBLIC_SUPABASE_URL=https://xogsqotomyvxgtippuzc.supabase.co`
   - `SUPABASE_SECRET_KEY=cole-a-chave-secreta-localmente`
3. Instale as dependências com `npm install` e execute `npm run admin:demo` usando Node.js 22+.
4. E-mail e senha fortes, gerados aleatoriamente, aparecerão **somente no seu terminal**. Entre no `/login` da REALIZA.

O script confirma o e-mail pela API Admin, ativa role `gestor` por 48 horas e não permite gestão de usuários.
O controle de acesso pelo banco verifica a expiração em todas as chamadas com permissões de função.
Após a homologação exclua a conta em Supabase → Authentication → Users.

Não compartilhe a chave secreta, capturas com a senha ou o arquivo .env.local.
Para validação, abra Fluxo operacional, analise a solicitação recebida e gere uma proposta de teste. Evite pagamentos reais.
