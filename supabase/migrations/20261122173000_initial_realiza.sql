-- REALIZA / Águaserv — instalação inicial em projeto Supabase EXCLUSIVO.
-- Executar apenas em banco novo. Não executar em outros projetos do grupo.
begin;
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default 'Usuário',
 email text,
 role text not null default 'pendente' check(role in ('pendente','admin','gestor','comercial','operacoes','financeiro','analista','motorista')),
 active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.leads(
 id uuid primary key default gen_random_uuid(),
 name text not null,phone text not null,email text,city text,address text,
 quantity_m3 numeric(12,2) check(quantity_m3>0),water_use text,
 source text not null default 'outro',status text not null default 'novo'
 check(status in ('novo','contato','qualificado','proposta','convertido','perdido')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index leads_phone_created_idx on public.leads(phone,created_at desc);
create index leads_status_idx on public.leads(status);
create table public.clients(
 id uuid primary key default gen_random_uuid(),
 name text not null,person_type text not null default 'juridica' check(person_type in ('juridica','fisica')),
 tax_id text,phone text,email text,address text,city text,segment text,
 status text not null default 'ativo' check(status in ('ativo','inativo')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.quotes(
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id),
 quantity_m3 numeric(12,2) not null check(quantity_m3>0),
 unit_price numeric(12,2) not null check(unit_price>=0),
 freight_fee numeric(12,2) not null default 0 check(freight_fee>=0),
 total numeric(15,2) generated always as (quantity_m3*unit_price+freight_fee) stored,
 water_use text,valid_until date,
 status text not null default 'rascunho' check(status in ('rascunho','enviada','aprovada','rejeitada')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.vehicles(
 id uuid primary key default gen_random_uuid(),
 label text not null,plate text not null unique,capacity_m3 numeric(12,2) not null check(capacity_m3>0),
 odometer_km numeric(12,2) not null default 0 check(odometer_km>=0),
 next_maintenance_at date,status text not null default 'disponivel'
 check(status in ('disponivel','em_rota','manutencao','inativo')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.water_sources(
 id uuid primary key default gen_random_uuid(),
 name text not null,address text,authorization_ref text,authorization_expires date,
 approved_for_potable boolean not null default false,status text not null default 'pendente'
 check(status in ('pendente','aprovada','suspensa')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.orders(
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id),
 quote_id uuid references public.quotes(id),
 vehicle_id uuid references public.vehicles(id),
 driver_profile_id uuid references public.profiles(id),
 water_source_id uuid references public.water_sources(id),
 scheduled_at timestamptz,address text not null,city text not null,
 latitude numeric(10,6) check(latitude between -90 and 90),
 longitude numeric(10,6) check(longitude between -180 and 180),
 water_use text,water_category text not null default 'nao_potavel'
 check(water_category in ('nao_potavel','potavel_autorizada')),
 quantity_m3 numeric(12,2) not null check(quantity_m3>0),
 unit_price numeric(12,2) not null default 0 check(unit_price>=0),
 freight_fee numeric(12,2) not null default 0 check(freight_fee>=0),
 total numeric(15,2) generated always as (quantity_m3*unit_price+freight_fee) stored,
 status text not null default 'pendente'
 check(status in ('pendente','programada','em_rota','entregue','cancelada')),
 delivered_m3 numeric(12,2) check(delivered_m3>0),
 delivered_at timestamptz,proof_note text,notes text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index orders_schedule_idx on public.orders(scheduled_at);
create index orders_driver_idx on public.orders(driver_profile_id,status);
create table public.delivery_events(
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
 driver_profile_id uuid references public.profiles(id),volume_m3 numeric(12,2) not null check(volume_m3>0),
 proof_note text,created_at timestamptz not null default now()
);
create table public.receivables(
 id uuid primary key default gen_random_uuid(),
 client_id uuid references public.clients(id),order_id uuid unique references public.orders(id),
 description text not null,due_on date not null,amount numeric(15,2) not null check(amount>=0),
 paid_amount numeric(15,2) not null default 0 check(paid_amount>=0 and paid_amount<=amount),
 status text not null default 'aberto' check(status in ('aberto','parcial','pago','cancelado')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index receivables_due_idx on public.receivables(due_on,status);
create table public.payables(
 id uuid primary key default gen_random_uuid(),vendor text not null,category text,
 due_on date not null,amount numeric(15,2) not null check(amount>=0),
 paid_amount numeric(15,2) not null default 0 check(paid_amount>=0 and paid_amount<=amount),
 status text not null default 'aberto' check(status in ('aberto','parcial','pago','cancelado')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.expenses(
 id uuid primary key default gen_random_uuid(),description text not null,category text,
 vehicle_id uuid references public.vehicles(id),
 incurred_on date not null default current_date,amount numeric(15,2) not null check(amount>=0),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.tasks(
 id uuid primary key default gen_random_uuid(),title text not null,
 client_id uuid references public.clients(id),lead_id uuid references public.leads(id),
 assigned_to uuid references public.profiles(id),due_on date,
 status text not null default 'aberta' check(status in ('aberta','em_andamento','concluida','cancelada')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.campaigns(
 id uuid primary key default gen_random_uuid(),name text not null,channel text,
 budget numeric(12,2) default 0 check(budget>=0),starts_on date,ends_on date,
 status text not null default 'planejada' check(status in ('planejada','ativa','pausada','encerrada')),
 notes text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.documents(
 id uuid primary key default gen_random_uuid(),title text not null,
 category text not null default 'outros',
 visibility text not null default 'equipe' check(visibility in ('equipe','gestao')),
 content text not null,
 fts tsvector generated always as (to_tsvector('portuguese',coalesce(title,'')||' '||coalesce(content,''))) stored,
 embedding extensions.vector(1536),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index documents_fts_idx on public.documents using gin(fts);
create table public.ai_queries(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 question text not null,answer text not null,source_ids uuid[] not null default '{}',
 created_at timestamptz not null default now()
);
create table public.audit_log(
 id bigint generated always as identity primary key,
 table_name text not null,row_id uuid,operation text not null,user_id uuid,
 old_data jsonb,new_data jsonb,created_at timestamptz not null default now()
);
create table public.automation_queue(
 id bigint generated always as identity primary key,
 event_type text not null,entity_id uuid,payload jsonb not null default '{}',
 status text not null default 'pendente' check(status in ('pendente','processando','enviado','erro')),
 attempts smallint not null default 0,created_at timestamptz not null default now(),
 processed_at timestamptz
);

create function private.has_any_role(p_roles text[]) returns boolean
language sql stable security definer set search_path=''
as $$ select coalesce((
 select p.role = any(p_roles) from public.profiles p
 where p.id=(select auth.uid()) and p.active=true
),false) $$;
revoke all on function private.has_any_role(text[]) from public;
grant execute on function private.has_any_role(text[]) to authenticated;

create function private.register_auth_user() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
 insert into public.profiles(id,name,email,role,active)
 values(new.id,coalesce(nullif(split_part(new.email,'@',1),''),'Usuário'),new.email,'pendente',false)
 on conflict(id) do nothing;
 return new;
end;$$;
revoke all on function private.register_auth_user() from public;
create trigger auth_user_realiza after insert on auth.users
for each row execute function private.register_auth_user();

create function private.set_updated_at() returns trigger
language plpgsql set search_path=''
as $$ begin new.updated_at=now();return new;end;$$;

create function private.audit_change() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
 insert into public.audit_log(table_name,row_id,operation,user_id,old_data,new_data)
 values(TG_TABLE_NAME,coalesce(new.id,old.id),TG_OP,auth.uid(),
  case when TG_OP='INSERT' then null else to_jsonb(old) end,
  case when TG_OP='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old);
end;$$;
revoke all on function private.audit_change() from public;

create function private.enqueue_event() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
 if TG_TABLE_NAME='leads' and TG_OP='INSERT' then
  insert into public.automation_queue(event_type,entity_id,payload)
  values('lead_criado',new.id,jsonb_build_object('source',new.source));
 elsif TG_TABLE_NAME='orders' and TG_OP='UPDATE' and new.status='entregue' and old.status<>'entregue' then
  insert into public.automation_queue(event_type,entity_id,payload)
  values('entrega_concluida',new.id,jsonb_build_object('client_id',new.client_id,'volume_m3',new.delivered_m3));
 elsif TG_TABLE_NAME='receivables' and TG_OP='INSERT' then
  insert into public.automation_queue(event_type,entity_id,payload)
  values('recebivel_criado',new.id,jsonb_build_object('due_on',new.due_on));
 end if;
 return new;
end;$$;
revoke all on function private.enqueue_event() from public;

create function private.guard_order() returns trigger
language plpgsql set search_path=''
as $$
declare approved boolean;ref text;expiry date;source_status text;
begin
 if new.water_category='potavel_autorizada' then
  if new.water_source_id is null then
   raise exception 'Água potável: informe origem com autorização verificada.';
  end if;
  select s.approved_for_potable,s.authorization_ref,s.authorization_expires,s.status
  into approved,ref,expiry,source_status from public.water_sources s where s.id=new.water_source_id;
  if approved is distinct from true or coalesce(ref,'')='' or source_status<>'aprovada'
     or (expiry is not null and expiry<current_date) then
   raise exception 'Origem sem autorização ativa registrada para a modalidade potável.';
  end if;
 end if;
 if TG_OP='UPDATE' and new.status<>old.status then
  if not (
    (old.status='pendente' and new.status in ('programada','cancelada')) or
    (old.status='programada' and new.status in ('em_rota','cancelada')) or
    (old.status='em_rota' and new.status in ('entregue','cancelada'))
   ) then raise exception 'Transição de status não permitida (% -> %).',old.status,new.status;
  end if;
 end if;
 if new.status='entregue' and (new.delivered_m3 is null or new.delivered_at is null) then
  raise exception 'Entrega exige confirmação de volume e data.';
 end if;
 return new;
end;$$;
create trigger orders_guard before insert or update on public.orders
for each row execute function private.guard_order();

create function private.auto_receivable() returns trigger
language plpgsql security definer set search_path=''
as $$
begin
 if new.status='entregue' and old.status<>'entregue' and new.total>0 then
  insert into public.receivables(client_id,order_id,description,due_on,amount)
  values(new.client_id,new.id,'Serviço de distribuição de água - OS '||left(new.id::text,8),
    (new.delivered_at at time zone 'America/Sao_Paulo')::date + 7,new.total)
  on conflict(order_id) do nothing;
 end if;
 return new;
end;$$;
revoke all on function private.auto_receivable() from public;
create trigger orders_receivable after update on public.orders
for each row execute function private.auto_receivable();

create function public.convert_lead(p_lead_id uuid) returns uuid
language plpgsql security definer set search_path=''
as $$
declare l public.leads;new_id uuid;
begin
 if auth.uid() is null or not private.has_any_role(array['admin','gestor','comercial']) then raise exception 'Sem permissão';end if;
 select * into l from public.leads where id=p_lead_id for update;
 if not found then raise exception 'Lead não encontrado';end if;
 if l.status='convertido' then raise exception 'Lead já convertido';end if;
 insert into public.clients(name,phone,email,address,city,notes)
 values(l.name,l.phone,l.email,l.address,l.city,l.notes) returning id into new_id;
 update public.leads set status='convertido' where id=p_lead_id;
 return new_id;
end;$$;
revoke all on function public.convert_lead(uuid) from public,anon;
grant execute on function public.convert_lead(uuid) to authenticated;

create function public.convert_quote_to_order(p_quote_id uuid) returns uuid
language plpgsql security definer set search_path=''
as $$
declare q public.quotes;c public.clients;new_id uuid;
begin
 if auth.uid() is null or not private.has_any_role(array['admin','gestor','operacoes']) then raise exception 'Sem permissão';end if;
 select * into q from public.quotes where id=p_quote_id for update;
 if not found or q.status<>'aprovada' then raise exception 'Proposta precisa estar aprovada';end if;
 if exists(select 1 from public.orders where quote_id=q.id and status<>'cancelada') then
  raise exception 'Já existe OS para esta proposta';
 end if;
 select * into c from public.clients where id=q.client_id;
 insert into public.orders(client_id,quote_id,address,city,water_use,quantity_m3,unit_price,freight_fee)
 values(q.client_id,q.id,coalesce(nullif(c.address,''),'A confirmar'),
  coalesce(nullif(c.city,''),'A confirmar'),q.water_use,q.quantity_m3,q.unit_price,q.freight_fee)
 returning id into new_id;
 return new_id;
end;$$;
revoke all on function public.convert_quote_to_order(uuid) from public,anon;
grant execute on function public.convert_quote_to_order(uuid) to authenticated;

create function public.confirm_delivery(p_order_id uuid,p_delivered_m3 numeric,p_note text default '')
returns uuid language plpgsql security definer set search_path=''
as $$
declare o public.orders;actor uuid:=auth.uid();
begin
 if actor is null or not (
   private.has_any_role(array['admin','gestor','operacoes']) or
   private.has_any_role(array['motorista'])
 ) then raise exception 'Sem permissão';end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'OS não encontrada';end if;
 if private.has_any_role(array['motorista']) and o.driver_profile_id is distinct from actor then
  raise exception 'OS não atribuída ao motorista';
 end if;
 if o.status<>'em_rota' then raise exception 'A OS deve estar em rota antes da confirmação';end if;
 if p_delivered_m3 is null or p_delivered_m3<=0 or p_delivered_m3>o.quantity_m3 then
  raise exception 'Volume incompatível com o pedido';
 end if;
 update public.orders
 set status='entregue',delivered_m3=p_delivered_m3,delivered_at=now(),proof_note=left(coalesce(p_note,''),1500)
 where id=p_order_id;
 insert into public.delivery_events(order_id,driver_profile_id,volume_m3,proof_note)
 values(p_order_id,actor,p_delivered_m3,left(coalesce(p_note,''),1500));
 return p_order_id;
end;$$;
revoke all on function public.confirm_delivery(uuid,numeric,text) from public,anon;
grant execute on function public.confirm_delivery(uuid,numeric,text) to authenticated;

create function public.match_documents(query_embedding extensions.vector(1536),match_count integer default 5)
returns table(id uuid,title text,content text,similarity double precision)
language sql stable security invoker set search_path=''
as $$
 select d.id,d.title,left(d.content,2200),(1-(d.embedding operator(extensions.<=>) query_embedding))::double precision as similarity
 from public.documents d where d.embedding is not null
 order by d.embedding operator(extensions.<=>) query_embedding
 limit least(greatest(match_count,1),8);
$$;
revoke all on function public.match_documents(extensions.vector(1536),integer) from public,anon;
grant execute on function public.match_documents(extensions.vector(1536),integer) to authenticated;

create view public.bi_monthly with (security_invoker=true) as
select date_trunc('month',coalesce(delivered_at,created_at))::date as month,
 count(*)::integer as orders,
 coalesce(sum(quantity_m3),0)::numeric(15,2) as volume_m3,
 coalesce(sum(total) filter(where status<>'cancelada'),0)::numeric(15,2) as gross_revenue
from public.orders group by 1;
create view public.bi_funnel with (security_invoker=true) as
select source,status,count(*)::integer as leads from public.leads group by 1,2;
create view public.bi_fleet with (security_invoker=true) as
select v.id,v.label,v.plate,v.capacity_m3,
 count(o.id) filter(where o.status='entregue')::integer as deliveries,
 coalesce(sum(o.delivered_m3) filter(where o.status='entregue'),0)::numeric(15,2) as delivered_m3
from public.vehicles v left join public.orders o on o.vehicle_id=v.id group by v.id,v.label,v.plate,v.capacity_m3;
create view public.operational_alerts with (security_invoker=true) as
 select v.id,v.created_at,('Revisão do veículo '||v.label||' prevista para '||v.next_maintenance_at::text) as message
 from public.vehicles v where v.next_maintenance_at<=current_date+14 and v.status<>'inativo'
 union all
 select s.id,s.created_at,('Revisar autorização da origem '||s.name||' até '||s.authorization_expires::text)
 from public.water_sources s where s.authorization_expires<=current_date+30
 union all
 select r.id,r.created_at,('Recebível vencido: '||r.description)
 from public.receivables r where r.due_on<current_date and r.status in ('aberto','parcial');

-- RLS: em nenhum caso TO authenticated sozinho equivale a autorização.
alter table public.leads enable row level security;
create policy "leads_read" on public.leads for select to authenticated using ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista'])));
create policy "leads_insert" on public.leads for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','comercial'])));
create policy "leads_update" on public.leads for update to authenticated using ((select private.has_any_role(array['admin','gestor','comercial']))) with check ((select private.has_any_role(array['admin','gestor','comercial'])));
alter table public.clients enable row level security;
create policy "clients_read" on public.clients for select to authenticated using ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista'])));
create policy "clients_insert" on public.clients for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','comercial'])));
create policy "clients_update" on public.clients for update to authenticated using ((select private.has_any_role(array['admin','gestor','comercial']))) with check ((select private.has_any_role(array['admin','gestor','comercial'])));
alter table public.quotes enable row level security;
create policy "quotes_read" on public.quotes for select to authenticated using ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista'])));
create policy "quotes_insert" on public.quotes for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','comercial'])));
create policy "quotes_update" on public.quotes for update to authenticated using ((select private.has_any_role(array['admin','gestor','comercial']))) with check ((select private.has_any_role(array['admin','gestor','comercial'])));
alter table public.vehicles enable row level security;
create policy "vehicles_read" on public.vehicles for select to authenticated using ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista','motorista'])));
create policy "vehicles_insert" on public.vehicles for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','operacoes'])));
create policy "vehicles_update" on public.vehicles for update to authenticated using ((select private.has_any_role(array['admin','gestor','operacoes']))) with check ((select private.has_any_role(array['admin','gestor','operacoes'])));
alter table public.water_sources enable row level security;
create policy "water_sources_read" on public.water_sources for select to authenticated using ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista','motorista'])));
create policy "water_sources_insert" on public.water_sources for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','operacoes'])));
create policy "water_sources_update" on public.water_sources for update to authenticated using ((select private.has_any_role(array['admin','gestor','operacoes']))) with check ((select private.has_any_role(array['admin','gestor','operacoes'])));
alter table public.receivables enable row level security;
create policy "receivables_read" on public.receivables for select to authenticated using ((select private.has_any_role(array['admin','gestor','financeiro'])));
create policy "receivables_insert" on public.receivables for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','financeiro'])));
create policy "receivables_update" on public.receivables for update to authenticated using ((select private.has_any_role(array['admin','gestor','financeiro']))) with check ((select private.has_any_role(array['admin','gestor','financeiro'])));
alter table public.payables enable row level security;
create policy "payables_read" on public.payables for select to authenticated using ((select private.has_any_role(array['admin','gestor','financeiro'])));
create policy "payables_insert" on public.payables for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','financeiro'])));
create policy "payables_update" on public.payables for update to authenticated using ((select private.has_any_role(array['admin','gestor','financeiro']))) with check ((select private.has_any_role(array['admin','gestor','financeiro'])));
alter table public.expenses enable row level security;
create policy "expenses_read" on public.expenses for select to authenticated using ((select private.has_any_role(array['admin','gestor','financeiro'])));
create policy "expenses_insert" on public.expenses for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','financeiro'])));
create policy "expenses_update" on public.expenses for update to authenticated using ((select private.has_any_role(array['admin','gestor','financeiro']))) with check ((select private.has_any_role(array['admin','gestor','financeiro'])));
alter table public.tasks enable row level security;
create policy "tasks_read" on public.tasks for select to authenticated using ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista'])));
create policy "tasks_insert" on public.tasks for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista'])));
create policy "tasks_update" on public.tasks for update to authenticated using ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista']))) with check ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista'])));
alter table public.campaigns enable row level security;
create policy "campaigns_read" on public.campaigns for select to authenticated using ((select private.has_any_role(array['admin','gestor','comercial'])));
create policy "campaigns_insert" on public.campaigns for insert to authenticated with check ((select private.has_any_role(array['admin','gestor','comercial'])));
create policy "campaigns_update" on public.campaigns for update to authenticated using ((select private.has_any_role(array['admin','gestor','comercial']))) with check ((select private.has_any_role(array['admin','gestor','comercial'])));
alter table public.documents enable row level security;
create policy "documents_read" on public.documents for select to authenticated using ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista'])) and (visibility='equipe' or (select private.has_any_role(array['admin','gestor']))));
create policy "documents_insert" on public.documents for insert to authenticated with check ((select private.has_any_role(array['admin','gestor'])));
create policy "documents_update" on public.documents for update to authenticated using ((select private.has_any_role(array['admin','gestor']))) with check ((select private.has_any_role(array['admin','gestor'])));

alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated
 using (id=(select auth.uid()) or (select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista'])));
create policy profiles_update on public.profiles for update to authenticated
 using ((select private.has_any_role(array['admin'])))
 with check ((select private.has_any_role(array['admin'])));

alter table public.orders enable row level security;
create policy orders_read on public.orders for select to authenticated
 using ((select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista']))
  or (driver_profile_id=(select auth.uid()) and (select private.has_any_role(array['motorista']))));
create policy orders_insert on public.orders for insert to authenticated
 with check ((select private.has_any_role(array['admin','gestor','operacoes'])));
create policy orders_update on public.orders for update to authenticated
 using ((select private.has_any_role(array['admin','gestor','operacoes'])))
 with check ((select private.has_any_role(array['admin','gestor','operacoes'])));

alter table public.delivery_events enable row level security;
create policy delivery_events_read on public.delivery_events for select to authenticated
 using ((select private.has_any_role(array['admin','gestor','operacoes','financeiro']))
 or (driver_profile_id=(select auth.uid()) and (select private.has_any_role(array['motorista']))));

alter table public.ai_queries enable row level security;
create policy ai_queries_read on public.ai_queries for select to authenticated
 using (user_id=(select auth.uid()) or (select private.has_any_role(array['admin','gestor'])));
create policy ai_queries_insert on public.ai_queries for insert to authenticated
 with check (user_id=(select auth.uid()) and (select private.has_any_role(array['admin','gestor','comercial','operacoes','financeiro','analista','motorista'])));

alter table public.audit_log enable row level security;
create policy audit_log_read on public.audit_log for select to authenticated
 using ((select private.has_any_role(array['admin','gestor'])));
alter table public.automation_queue enable row level security;
create policy automation_queue_read on public.automation_queue for select to authenticated
 using ((select private.has_any_role(array['admin','gestor'])));

grant select on public.profiles,public.leads,public.clients,public.quotes,public.vehicles,public.water_sources,public.orders,
 public.delivery_events,public.receivables,public.payables,public.expenses,public.tasks,public.campaigns,
 public.documents,public.ai_queries,public.audit_log,public.automation_queue to authenticated;
grant insert,update on public.leads,public.clients,public.quotes,public.vehicles,public.water_sources,
 public.orders,public.receivables,public.payables,public.expenses,public.tasks,public.campaigns,
 public.documents,public.ai_queries to authenticated;
grant update on public.profiles to authenticated;
grant select on public.bi_monthly,public.bi_funnel,public.bi_fleet,public.operational_alerts to authenticated;
grant usage on all sequences in schema public to authenticated;

-- A regra de fonte potável controla cadastro, não substitui autorização ou laudo.
-- Perfis nascem INATIVOS; aprovar apenas após verificação humana pelo admin.

do $$
declare tbl text;
begin
 foreach tbl in array array['profiles','leads','clients','quotes','vehicles','water_sources','orders','receivables','payables','expenses','tasks','campaigns','documents']
 loop
  execute format('create trigger %I before update on public.%I for each row execute function private.set_updated_at()',tbl||'_touch',tbl);
  execute format('create trigger %I after insert or update on public.%I for each row execute function private.audit_change()',tbl||'_audit',tbl);
 end loop;
end $$;
create trigger leads_outbox after insert on public.leads for each row execute function private.enqueue_event();
create trigger orders_outbox after update on public.orders for each row execute function private.enqueue_event();
create trigger receivables_outbox after insert on public.receivables for each row execute function private.enqueue_event();
commit;
