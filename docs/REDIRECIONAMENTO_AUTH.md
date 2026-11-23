# Configuração de confirmação e recuperação por e-mail — REALIZA

## Problema corrigido no frontend
O link de confirmação estava abrindo `localhost:3000`. Esse endereço funciona só em desenvolvimento local.
O cadastro (signUp), reenvio (resend) e recuperação de senha agora solicitam explicitamente o domínio oficial:
`https://realiza-gestao-de-servicos-ltda.vercel.app`.

**Atenção:** isso não substitui a configuração do Supabase Auth. O servidor Auth pode usar sua
Site URL padrão se o caminho solicitado não estiver permitido em Redirect URLs.
O projeto Supabase ainda precisa ser ajustado no Dashboard por um operador autorizado.

## Configuração obrigatória no Supabase
Abra:
https://supabase.com/dashboard/project/xogsqotomyvxgtippuzc/auth/url-configuration

1. **Site URL**: `https://realiza-gestao-de-servicos-ltda.vercel.app`
2. **Redirect URLs**: adicione exatamente:
   - `https://realiza-gestao-de-servicos-ltda.vercel.app/painel`
   - `https://realiza-gestao-de-servicos-ltda.vercel.app/recuperar`
   - `https://realiza-gestao-de-servicos-ltda.vercel.app/login` (útil caso seja exigido retorno ao login)
3. **Save**.

Não deixar `http://localhost:3000` como Site URL de produção.
Em **Authentication → Email Templates → Confirm signup**, confirme que a confirmação usa
`{{ .ConfirmationURL }}`. Se o template usa `{{ .SiteURL }}`, ela poderá ignorar o
redirecionamento escolhido: restaurar o link padrão de confirmação ou ajustar apropriadamente.

Na Vercel, `NEXT_PUBLIC_SITE_URL` também deve ser `https://realiza-gestao-de-servicos-ltda.vercel.app`. Redeploy da versão corrigida
e confira o domínio apontando para o projeto correto.

## Conta já confirmada
Se o Supabase já marcou `email_confirmed_at`, o link expirado/errado não impede que a pessoa
abra `https://realiza-gestao-de-servicos-ltda.vercel.app/login` manualmente e entre com suas credenciais existentes.
Não recriar a conta e não inserir confirmação manual por SQL.

## Testes de homologação
- Conta nova criada no cadastro: receber e-mail, clicar, chegar à REALIZA e abrir apenas as três abas de demonstração.
- Reenvio no login: usar o redirect correto e não `localhost`.
- Recuperação de senha: voltar à página `/recuperar` no domínio oficial.
- Não expor segredos, tokens nem dados reais nos registros de teste.
