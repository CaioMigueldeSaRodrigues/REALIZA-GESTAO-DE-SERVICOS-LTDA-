-- REALIZA: pagamentos verificados, documento fiscal e envio à frota.
-- Adicionar após 20261122183000_delivery_storage_and_embeddings.sql.
begin;

alter table public.orders
 add column payment_mode text not null default 'antecipado'
   check(payment_mode in ('antecipado','faturado')),
 add column credit_approved_by uuid references public.profiles(id),
 add column credit_approved_at timestamptz,
 add column dispatched_at timestamptz;

create table public.payment_transactions (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.orders(id),
 provider text not null default 'mercado_pago' check(provider='mercado_pago'),
 amount numeric(15,2) not null check(amount>0),
 currency text not null default 'BRL' check(currency='BRL'),
 status text not null default 'criado'
  check(status in ('criado','pendente','aprovado','recusado','estornado','erro')),
 preference_id text,
 checkout_url text,
 provider_payment_id text unique,
 confirmed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index payment_transactions_status_idx on public.payment_transactions(status);

create table public.fiscal_documents (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null unique references public.orders(id),
 document_type text not null check(document_type in ('nfe','nfse','cte','dispensa')),
 access_key text,
 protocol text,
 note text,
 status text not null default 'pendente'
  check(status in ('pendente','conferido_manualmente','dispensado_justificado','verificado_via_api','rejeitado')),
 checked_by uuid references public.profiles(id),
 checked_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint fiscal_nfe_key check (
  document_type not in ('nfe','cte') or access_key ~ '^[0-9]{44}$'
 )
);
create index fiscal_documents_status_idx on public.fiscal_documents(status);

alter table public.payment_transactions enable row level security;
alter table public.fiscal_documents enable row level security;
create policy "payment_read" on public.payment_transactions for select to authenticated
 using ((select private.has_any_role(array['admin','gestor','financeiro','comercial','operacoes','analista'])));
create policy "fiscal_read" on public.fiscal_documents for select to authenticated
 using ((select private.has_any_role(array['admin','gestor','financeiro','comercial','operacoes','analista'])));
-- Alterações sensíveis: nenhum INSERT/UPDATE autorizado a usuários pelo Data API.
-- Backend com secret_key e RPC com verificação de papel são caminhos controlados.
grant select on public.payment_transactions,public.fiscal_documents to authenticated;
grant usage on schema private to service_role;

create trigger payment_transactions_touch before update on public.payment_transactions
 for each row execute function private.set_updated_at();
create trigger fiscal_documents_touch before update on public.fiscal_documents
 for each row execute function private.set_updated_at();
create trigger payment_transactions_audit after insert or update on public.payment_transactions
 for each row execute function private.audit_change();
create trigger fiscal_documents_audit after insert or update on public.fiscal_documents
 for each row execute function private.audit_change();

create function private.guard_postpaid_and_dispatch()
returns trigger language plpgsql set search_path='' as $$
declare v public.vehicles;s public.water_sources;d public.profiles;
 payment_ok boolean;fiscal_ok boolean;
begin
 if TG_OP='UPDATE' then
   if old.status in ('programada','em_rota','entregue') and
      (new.client_id,new.quantity_m3,new.unit_price,new.freight_fee,new.payment_mode)
      is distinct from
      (old.client_id,old.quantity_m3,old.unit_price,old.freight_fee,old.payment_mode) then
      raise exception 'Não é permitido alterar valor, cliente ou forma de cobrança após programação';
   end if;
   if new.payment_mode='faturado' and old.payment_mode<>'faturado' then
      new.credit_approved_by=null;
      new.credit_approved_at=null;
   end if;
 end if;
 if new.status='programada' and (TG_OP='INSERT' or old.status is distinct from new.status) then
   select * into v from public.vehicles where id=new.vehicle_id;
   if v.id is null or v.status<>'disponivel' or v.capacity_m3<new.quantity_m3 then
     raise exception 'Caminhão indisponível ou capacidade insuficiente';
   end if;
   select * into d from public.profiles where id=new.driver_profile_id;
   if d.id is null or d.role<>'motorista' or d.active is distinct from true then
     raise exception 'Motorista ativo e autorizado obrigatório';
   end if;
   select * into s from public.water_sources where id=new.water_source_id;
   if s.id is null or s.status<>'aprovada'
      or (s.authorization_expires is not null and s.authorization_expires<current_date) then
     raise exception 'Origem da água não aprovada ou com documentação vencida';
   end if;
   select exists(
      select 1 from public.payment_transactions p
      where p.order_id=new.id and p.status='aprovado'
       and p.amount=new.total
   ) into payment_ok;
   if not (payment_ok or (new.payment_mode='faturado'
     and new.credit_approved_at is not null
     and new.credit_approved_by is not null)) then
      raise exception 'É necessário pagamento confirmado pelo provedor ou aprovação de crédito';
   end if;
   select exists(
      select 1 from public.fiscal_documents f
      where f.order_id=new.id and f.status in
       ('conferido_manualmente','dispensado_justificado','verificado_via_api')
   ) into fiscal_ok;
   if not fiscal_ok then raise exception 'Conferência fiscal pendente';end if;
   new.dispatched_at=now();
 end if;
 return new;
end;$$;
create trigger orders_dispatch_guard before insert or update on public.orders
 for each row execute function private.guard_postpaid_and_dispatch();

create function public.approve_postpaid(p_order_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
 if auth.uid() is null or not private.has_any_role(array['admin','gestor','financeiro']) then
  raise exception 'Somente financeiro pode liberar faturamento a prazo';
 end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.status<>'pendente' then
  raise exception 'Ordem inexistente ou já programada';
 end if;
 update public.orders set payment_mode='faturado',credit_approved_by=auth.uid(),
  credit_approved_at=now() where id=p_order_id;
 return p_order_id;
end;$$;
revoke all on function public.approve_postpaid(uuid) from public,anon;
grant execute on function public.approve_postpaid(uuid) to authenticated;

create function public.register_fiscal_check(
 p_order_id uuid,p_document_type text,p_access_key text default null,
 p_protocol text default null,p_note text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.orders; out_id uuid;normalized_key text;
begin
 if auth.uid() is null or not private.has_any_role(array['admin','gestor','financeiro']) then
  raise exception 'Somente financeiro pode conferir documentos fiscais';
 end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.status not in ('pendente','programada') then
  raise exception 'Ordem inexistente ou fora do estágio fiscal';
 end if;
 if p_document_type not in ('nfe','nfse','cte','dispensa') then
  raise exception 'Tipo fiscal inválido';
 end if;
 normalized_key=nullif(regexp_replace(coalesce(p_access_key,''),'\s','','g'),'');
 if p_document_type in ('nfe','cte') then
  if normalized_key is null or normalized_key !~ '^[0-9]{44}$'
      or length(trim(coalesce(p_protocol,'')))<4 then
   raise exception 'Exige chave de 44 dígitos e protocolo conferido no portal oficial';
  end if;
 elsif p_document_type='nfse' then
  if length(coalesce(normalized_key,''))<4 or length(trim(coalesce(p_protocol,'')))<4 then
   raise exception 'NFS-e exige identificação e protocolo ou código de verificação';
  end if;
 elsif p_document_type='dispensa' then
  if length(trim(coalesce(p_note,'')))<20 then
    raise exception 'Registre justificativa fiscal revisada pelo responsável (mínimo 20 caracteres)';
  end if;
 end if;
 insert into public.fiscal_documents(order_id,document_type,access_key,protocol,note,
   status,checked_by,checked_at)
 values(p_order_id,p_document_type,normalized_key,left(p_protocol,200),left(p_note,1000),
   case when p_document_type='dispensa' then 'dispensado_justificado'
    else 'conferido_manualmente' end,auth.uid(),now())
 on conflict(order_id) do update set document_type=excluded.document_type,
    access_key=excluded.access_key,protocol=excluded.protocol,note=excluded.note,
    status=excluded.status,checked_by=excluded.checked_by,checked_at=excluded.checked_at
 returning id into out_id;
 return out_id;
end;$$;
revoke all on function public.register_fiscal_check(uuid,text,text,text,text) from public,anon;
grant execute on function public.register_fiscal_check(uuid,text,text,text,text) to authenticated;

create function public.dispatch_order(
 p_order_id uuid,p_vehicle_id uuid,p_driver_id uuid,p_source_id uuid,p_scheduled_at timestamptz
) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
 if auth.uid() is null or not private.has_any_role(array['admin','gestor','operacoes']) then
  raise exception 'Somente logística pode despachar';
 end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.status<>'pendente' then
  raise exception 'Ordem não está pendente';
 end if;
 if p_scheduled_at is null then raise exception 'Data de despacho obrigatória';end if;
 update public.orders
 set vehicle_id=p_vehicle_id,driver_profile_id=p_driver_id,
  water_source_id=p_source_id,scheduled_at=p_scheduled_at,status='programada'
 where id=p_order_id;
 insert into public.automation_queue(event_type,entity_id,payload)
 values('despacho_programado',p_order_id,
   jsonb_build_object('vehicle_id',p_vehicle_id,'driver_profile_id',p_driver_id,
    'scheduled_at',p_scheduled_at));
 return p_order_id;
end;$$;
revoke all on function public.dispatch_order(uuid,uuid,uuid,uuid,timestamptz) from public,anon;
grant execute on function public.dispatch_order(uuid,uuid,uuid,uuid,timestamptz) to authenticated;

create function public.start_route(p_order_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
 if auth.uid() is null or not private.has_any_role(array['admin','gestor','operacoes','motorista']) then
  raise exception 'Sem permissão para iniciar rota';
 end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found or o.status<>'programada' then raise exception 'OS precisa estar programada';end if;
 if private.has_any_role(array['motorista']) and o.driver_profile_id is distinct from auth.uid() then
  raise exception 'Motorista não atribuído à ordem';
 end if;
 update public.orders set status='em_rota' where id=p_order_id;
 insert into public.automation_queue(event_type,entity_id,payload)
 values('rota_iniciada',p_order_id,jsonb_build_object('driver_profile_id',o.driver_profile_id));
 return p_order_id;
end;$$;
revoke all on function public.start_route(uuid) from public,anon;
grant execute on function public.start_route(uuid) to authenticated;

create or replace function private.auto_receivable() returns trigger
language plpgsql security definer set search_path=''
as $$
declare settled boolean;
begin
 if new.status='entregue' and old.status<>'entregue' and new.total>0 then
  select exists(select 1 from public.payment_transactions p
    where p.order_id=new.id and p.status='aprovado'
    and p.amount=new.total) into settled;
  insert into public.receivables
    (client_id,order_id,description,due_on,amount,paid_amount,status)
  values(new.client_id,new.id,'Serviço de distribuição de água - OS '||left(new.id::text,8),
   (new.delivered_at at time zone 'America/Sao_Paulo')::date+7,new.total,
   case when settled then new.total else 0 end,
   case when settled then 'pago' else 'aberto' end)
  on conflict(order_id) do nothing;
 end if;
 return new;
end;$$;

create view public.bi_operational_funnel with (security_invoker=true) as
 select o.id as order_id,o.status as order_status,o.created_at,o.scheduled_at,
  o.total,o.quantity_m3,o.payment_mode,o.driver_profile_id,o.vehicle_id,
  coalesce(p.status,'nao_iniciado') as payment_status,
  coalesce(f.status,'nao_iniciado') as fiscal_status
 from public.orders o
 left join public.payment_transactions p on p.order_id=o.id
 left join public.fiscal_documents f on f.order_id=o.id;
grant select on public.bi_operational_funnel to authenticated;

create trigger payment_approved_outbox after update on public.payment_transactions
 for each row when (new.status='aprovado' and old.status is distinct from new.status)
 execute function private.enqueue_event();
-- payment update gets a dedicated event because generic enqueue_event processes only other tables.
create function private.enqueue_payment_approved() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.automation_queue(event_type,entity_id,payload)
 values('pagamento_confirmado',new.order_id,
   jsonb_build_object('transaction_id',new.id,'amount',new.amount));
 return new;
end;$$;
revoke all on function private.enqueue_payment_approved() from public;
drop trigger payment_approved_outbox on public.payment_transactions;
create trigger payment_approved_outbox after update on public.payment_transactions
 for each row when (new.status='aprovado' and old.status is distinct from new.status)
 execute function private.enqueue_payment_approved();
commit;
