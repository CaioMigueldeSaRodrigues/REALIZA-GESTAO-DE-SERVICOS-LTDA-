# Cadastro e acesso — REALIZA

## Acessos na mesma plataforma
- Cliente: cadastro público na rota /cadastro; confirmação por e-mail; área própria no /painel; só pode consultar seus pedidos, cobranças e solicitações (RLS).
- Operacional: usuário criado/autorizado pelo administrador; acesso a frota e ordens conforme cargo. Motorista acessa exclusivamente ordens atribuídas.
- Administrativo: usuário criado/autorizado pelo administrador; acesso às funções conforme seu papel (financeiro, comercial, gestor, admin).

O cadastro público NÃO oferece seleção de perfis internos, pois seriam privilégios indevidos.

## Supabase Auth (configuração obrigatória)
1. Supabase Dashboard → Authentication → Providers → Email: habilite o cadastro com e-mail e confirmação de e-mail obrigatória.
2. Authentication → URL Configuration: configure **Site URL** com a URL HTTPS da Vercel e permita o endereço https://SEU-DOMINIO/auth/confirm e https://SEU-DOMINIO/painel.
3. Authentication → Email Templates → Confirm signup: adapte o link para o PKCE do Next.js, mantendo o token original:
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
4. Configure SMTP confiável para envio das confirmações e recuperação de senha; envio padrão pode ter limites.
5. O usuário é criado inicialmente com papel \`pendente\`/inativo e, após confirmação, a função \`activate_customer_account\` ativa exclusivamente o papel \`cliente\`.
6. Para equipe interna, crie usuários por convite ou gestão do Auth e atribua roles apenas após confirmar identidade. O novo usuário deve permanecer inativo até autorização.

## Variáveis na Vercel
Obrigatórias (Settings → Environment Variables → Production):
NEXT_PUBLIC_SUPABASE_URL = https://xogsqotomyvxgtippuzc.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = [chave pública do projeto REALIZA]
SUPABASE_SECRET_KEY = [chave secreta, apenas servidor]
NEXT_PUBLIC_SITE_URL = https://SEU-DOMINIO

O aviso "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" indica variáveis ausentes no **deployment** atual. Cadastre, selecione Production e faça **redeploy**. Nunca poste chave secreta ou captura com tokens.

## Testes antes de habilitar produção
- Criar um cliente → confirmar e-mail → autenticar → visualizar apenas suas solicitações.
- Criar solicitação → gerar lead vinculado, sem permitir acesso a dados de outros clientes.
- Um cliente não consegue consultar tabelas de finanças internas, lista de outros clientes, perfis de equipe ou programação de frota.
- Funcionário sem autorização permanece inativo.
- Admin vê seus módulos, motorista apenas ordens atribuídas, financeiro somente funções permitidas.
- Nenhum lançamento de pagamento ou confirmação fiscal é feito automaticamente por cadastro de cliente.
