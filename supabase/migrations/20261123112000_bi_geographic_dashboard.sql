-- REALIZA | BI v2: métricas por dia e município, sem duplicar lead vinculado ao pedido.
-- View security_invoker=true respeita RLS das tabelas de origem.
begin;
create or replace view public.bi_commercial_city_daily with (security_invoker=true) as
with events as (
 -- Solicitacoes de portal. Lead gerado automaticamente e excluido da contagem de leads avulsos.
 select r.created_at::date as day,
   coalesce(nullif(trim(r.city),''),'Não informado') as city,
   coalesce(nullif(trim(r.state),''),'') as state,
   1::bigint as demands,
   coalesce(r.quantity_m3,0)::numeric as demand_m3,
   case when r.status in ('recebida','em_analise','proposta_enviada') then 1 else 0 end::bigint as open_demands,
   0::bigint as proposals,0::numeric as quoted_value,
   0::bigint as orders,0::numeric as orders_value,0::numeric as ordered_m3,
   0::numeric as delivered_m3
 from public.customer_requests r
 union all
 -- Leads que nao vieram da solicitacao de portal.
 select l.created_at::date,coalesce(nullif(trim(l.city),''),'Não informado'),
   '',1::bigint,coalesce(l.quantity_m3,0)::numeric,
   case when l.status not in ('convertido','perdido') then 1 else 0 end::bigint,
   0::bigint,0::numeric,0::bigint,0::numeric,0::numeric,0::numeric
 from public.leads l
 where not exists(select 1 from public.customer_requests r where r.lead_id=l.id)
 union all
 -- Propostas: valor comercial, nao receita recebida.
 select q.created_at::date,
   coalesce(nullif(trim(coalesce(r.city,c.city)),''),'Não informado'),
   coalesce(nullif(trim(coalesce(r.state,c.state)),''),''),
   0::bigint,0::numeric,0::bigint,1::bigint,coalesce(q.total,0)::numeric,
   0::bigint,0::numeric,0::numeric,0::numeric
 from public.quotes q
 left join public.customer_requests r on r.id=q.customer_request_id
 left join public.clients c on c.id=q.client_id
 union all
 -- Ordens: valor previsto, nao caixa realizado.
 select o.created_at::date,coalesce(nullif(trim(o.city),''),'Não informado'),
   coalesce(nullif(trim(c.state),''),''),
   0::bigint,0::numeric,0::bigint,0::bigint,0::numeric,
   1::bigint,coalesce(o.total,0)::numeric,coalesce(o.quantity_m3,0)::numeric,0::numeric
 from public.orders o
 left join public.clients c on c.id=o.client_id
 union all
 -- Entregas: evento por entrega fisica, sem supor que toda a OS foi concluida.
 select d.created_at::date,coalesce(nullif(trim(o.city),''),'Não informado'),
   coalesce(nullif(trim(c.state),''),''),
   0::bigint,0::numeric,0::bigint,0::bigint,0::numeric,
   0::bigint,0::numeric,0::numeric,coalesce(d.volume_m3,0)::numeric
 from public.delivery_events d
 join public.orders o on o.id=d.order_id
 left join public.clients c on c.id=o.client_id
)
select day,city,state,
 sum(demands)::bigint as demands,
 sum(demand_m3)::numeric(16,2) as demand_m3,
 sum(open_demands)::bigint as open_demands,
 sum(proposals)::bigint as proposals,
 sum(quoted_value)::numeric(16,2) as quoted_value,
 sum(orders)::bigint as orders,
 sum(orders_value)::numeric(16,2) as orders_value,
 sum(ordered_m3)::numeric(16,2) as ordered_m3,
 sum(delivered_m3)::numeric(16,2) as delivered_m3
from events group by day,city,state;

create or replace view public.bi_payments_daily with (security_invoker=true) as
select coalesce(confirmed_at::date,created_at::date) as day,
 count(*) filter (where status in ('aprovado','approved') and confirmed_at is not null)::bigint as confirmed_transactions,
 coalesce(sum(amount) filter (where status in ('aprovado','approved') and confirmed_at is not null),0)::numeric(16,2) as confirmed_amount,
 count(*) filter (where status not in ('aprovado','approved','cancelado','rejeitado'))::bigint as unconfirmed_transactions
from public.payment_transactions
group by 1;

grant select on public.bi_commercial_city_daily to authenticated;
grant select on public.bi_payments_daily to authenticated;

comment on view public.bi_commercial_city_daily is
'Consolidado comercial diario por cidade. Demanda conta solicitacao ou lead avulso, nunca os dois. Ordens sao valor previsto.';
comment on view public.bi_payments_daily is
'Confirmacao do gateway, nao comprovacao de deposito bancario ou nota fiscal.';
commit;