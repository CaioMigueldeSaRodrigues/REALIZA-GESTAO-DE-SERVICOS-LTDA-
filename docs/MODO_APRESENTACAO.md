# REALIZA — apresentação restrita, proprietário e dados fictícios

**Acesso completo exclusivo do titular autenticado**
- Identidade aprovada: vinculada ao UUID do Supabase Auth e ao e-mail confirmado.
- Verificação: função SQL \`my_workspace_scope()\`, com decisão no banco, não pela interface.
- O titular pode alternar entre área de cliente e painel administrativo completo.

**Demais contas cadastradas**
- O cadastro público permite criar conta normal e confirmar o e-mail.
- Após entrar, as únicas três abas exibidas são:
  1. **Fluxo operacional**
  2. **Financeiro**
  3. **DRE gerencial**
- Todos os valores e pedidos dessa apresentação são **fictícios, locais no aplicativo**.
- Nenhuma destas abas consulta ou grava dados reais de ERP no Supabase.
- O backend restringe as tabelas operacionais/financeiras e as APIs internas ao titular.
- Não há pagamentos, despachos, geração fiscal ou comunicação automatizada nesse modo.
- O fluxo público de solicitação e aceite permanece no código para liberação futura, não exposto aos visitantes.

**Identidade/cancelamento**
- Não há login Edmilson criado no Auth, e o antigo script de provisionamento
  foi removido do fluxo do produto. Todos os convites temporários anteriores foram revogados.
- Esse modo demonstração não substitui uma futura política de permissões por funcionário.

**Validação**
- Verificar o commit em produção na Vercel; entrar com conta titular e uma conta
  não proprietária para testar menus e negação de acesso via API.
- Nunca interpretar valores fictícios como faturamento, contas a pagar reais ou DRE oficial.
