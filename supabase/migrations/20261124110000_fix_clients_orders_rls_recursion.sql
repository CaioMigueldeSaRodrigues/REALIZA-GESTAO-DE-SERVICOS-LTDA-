-- REALIZA | Corrige RLS 42P17: clients -> orders -> clients.
-- A policy viewer_ops_finance_clients foi criada para um acesso temporário
-- já cancelado. Ela consultava orders, cuja orders_customer_read consultava
-- clients novamente, mesmo para administradores autenticados.
-- Remove apenas a policy obsoleta. Mantém RLS ativo e preserva as políticas
-- clients_customer_read (registro próprio) e clients_read (ERP autorizado).
begin;
drop policy if exists viewer_ops_finance_clients on public.clients;
comment on table public.clients is
 'RLS: cliente acessa apenas seu registro; ERP do titular usa clients_read. Acesso demo não consulta dados reais.';
commit;
