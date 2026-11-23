-- REALIZA | visualização operacional + financeira sem privilégios de escrita
-- O usuário precisa existir primeiro no Supabase Auth por convite individual.
begin;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check(
 role in ('pendente','cliente','admin','gestor','comercial','operacoes',
          'financeiro','analista','motorista','viewer_ops_finance')
);

-- Políticas SOMENTE SELECT; nenhuma política INSERT/UPDATE/DELETE recebe este papel.
create policy viewer_ops_finance_orders on public.orders
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));
create policy viewer_ops_finance_customer_requests on public.customer_requests
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));
create policy viewer_ops_finance_clients on public.clients
 for select to authenticated using (
  (select private.has_any_role(array['viewer_ops_finance']))
  and (
   exists (select 1 from public.orders o where o.client_id=clients.id)
   or exists (select 1 from public.customer_requests r where r.client_id=clients.id)
  )
 );
create policy viewer_ops_finance_vehicles on public.vehicles
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));
create policy viewer_ops_finance_water_sources on public.water_sources
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));
create policy viewer_ops_finance_payment_transactions on public.payment_transactions
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));
create policy viewer_ops_finance_fiscal_documents on public.fiscal_documents
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));
create policy viewer_ops_finance_delivery_events on public.delivery_events
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));
create policy viewer_ops_finance_receivables on public.receivables
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));
create policy viewer_ops_finance_payables on public.payables
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));
create policy viewer_ops_finance_expenses on public.expenses
 for select to authenticated using ((select private.has_any_role(array['viewer_ops_finance'])));

-- Bloqueio adicional contra alteração de senha pela conta de visualização
-- NÃO aplicamos: cada usuário pode proteger sua própria senha no Supabase Auth.
comment on constraint profiles_role_check on public.profiles is
 'viewer_ops_finance: consulta somente operacional e financeira; sem permissão de gravação em políticas RLS';
commit;