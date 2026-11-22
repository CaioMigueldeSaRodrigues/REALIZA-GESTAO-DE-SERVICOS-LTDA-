-- REALIZA · Cadastro público exclusivamente de clientes, sem autoelevação de privilégios.
-- Funcionários são provisionados por administração; somente clientes podem ativar
-- uma conta após confirmação de e-mail pelo Supabase Auth.
begin;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
 check(role in ('pendente','cliente','admin','gestor','comercial','operacoes','financeiro','analista','motorista'));
alter table public.profiles add column if not exists phone text;

alter table public.clients add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
create index if not exists clients_auth_user_id_idx on public.clients(auth_user_id);

create table public.customer_requests(
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid not null references auth.users(id),
 client_id uuid not null references public.clients(id),
 lead_id uuid unique references public.leads(id),
 city text not null check (char_length(city) between 2 and 100),
 address text not null check (char_length(address) between 5 and 500),
 quantity_m3 numeric(12,2) not null check(quantity_m3 > 0 and quantity_m3 <= 50000),
 water_use text not null check(char_length(water_use) between 3 and 120),
 notes text,
 status text not null default 'recebida'
  check(status in ('recebida','em_analise','proposta_enviada','concluida','cancelada')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index customer_requests_user_idx on public.customer_requests(auth_user_id,created_at desc);
create trigger customer_requests_touch before update on public.customer_requests
 for each row execute function private.set_updated_at();
create trigger customer_requests_audit after insert or update on public.customer_requests
 for each row execute function private.audit_change();

alter table public.customer_requests enable row level security;
grant select on public.customer_requests to authenticated;
create policy customer_requests_read on public.customer_requests for select to authenticated
 using(auth_user_id=(select auth.uid())
  or (select private.has_any_role(array['admin','gestor','comercial','operacoes','analista'])));
-- Uma conta de cliente nunca recebe privilégios de INSERT ou UPDATE direto.
-- Requisições são abertas através da função controlada abaixo.

create policy clients_customer_read on public.clients for select to authenticated
 using(auth_user_id=(select auth.uid()) and
   (select private.has_any_role(array['cliente'])));
create policy orders_customer_read on public.orders for select to authenticated
 using((select private.has_any_role(array['cliente'])) and exists(
   select 1 from public.clients c where c.id=client_id and c.auth_user_id=(select auth.uid())
 ));
create policy customer_payment_read on public.payment_transactions for select to authenticated
 using((select private.has_any_role(array['cliente'])) and exists(
   select 1 from public.orders o join public.clients c on c.id=o.client_id
   where o.id=order_id and c.auth_user_id=(select auth.uid())
 ));

create function public.activate_customer_account(
 p_name text, p_phone text, p_person_type text default 'fisica'
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare u auth.users; p public.profiles; existing_client uuid; customer_id uuid;
begin
 if auth.uid() is null then raise exception 'Faça login antes de ativar o cadastro';end if;
 select * into u from auth.users where id=auth.uid();
 if not found or u.email_confirmed_at is null then
   raise exception 'Confirme o endereço de e-mail antes de continuar';
 end if;
 if coalesce(u.raw_user_meta_data->>'account_kind','') <> 'customer' then
   raise exception 'Esta conta não foi cadastrada como cliente';
 end if;
 if char_length(trim(coalesce(p_name,''))) not between 2 and 140
    or char_length(trim(coalesce(p_phone,''))) not between 8 and 30
    or p_person_type not in ('fisica','juridica') then
   raise exception 'Cadastro incompleto ou inválido';
 end if;
 select * into p from public.profiles where id=u.id for update;
 if not found then raise exception 'Perfil de autenticação inexistente';end if;
 if p.role='cliente' and p.active then
   select c.id into existing_client from public.clients c where c.auth_user_id=u.id;
   if existing_client is not null then return existing_client;end if;
   raise exception 'Conta de cliente sem vínculo de cadastro: solicite suporte';
 end if;
 if p.role<>'pendente' or p.active then
   raise exception 'Esta conta tem perfil restrito: procure a administração';
 end if;
 insert into public.clients(name,person_type,phone,email,auth_user_id,status)
 values(trim(p_name),p_person_type,trim(p_phone),u.email,u.id,'ativo')
 returning id into customer_id;
 update public.profiles
 set name=trim(p_name),phone=trim(p_phone),role='cliente',active=true
 where id=u.id and role='pendente' and active=false;
 if not found then raise exception 'Não foi possível ativar cadastro';end if;
 return customer_id;
end;$$;
revoke all on function public.activate_customer_account(text,text,text) from public,anon;
grant execute on function public.activate_customer_account(text,text,text) to authenticated;

create function public.create_customer_request(
 p_city text,p_address text,p_quantity_m3 numeric,
 p_water_use text,p_notes text default ''
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare c public.clients; rid uuid; lid uuid;
begin
 if auth.uid() is null or not private.has_any_role(array['cliente']) then
   raise exception 'Acesso permitido somente a clientes ativos';
 end if;
 if char_length(trim(coalesce(p_city,''))) not between 2 and 100
  or char_length(trim(coalesce(p_address,''))) not between 5 and 500
  or p_quantity_m3 is null or p_quantity_m3<=0 or p_quantity_m3>50000
  or char_length(trim(coalesce(p_water_use,''))) not between 3 and 120
  or char_length(coalesce(p_notes,''))>2000 then
   raise exception 'Confira os dados da solicitação';
 end if;
 select * into c from public.clients where auth_user_id=auth.uid() and status='ativo' for update;
 if not found then raise exception 'Cadastro de cliente inativo ou não encontrado';end if;
 insert into public.customer_requests(auth_user_id,client_id,city,address,quantity_m3,water_use,notes)
 values(auth.uid(),c.id,trim(p_city),trim(p_address),p_quantity_m3,trim(p_water_use),left(p_notes,2000))
 returning id into rid;
 insert into public.leads(name,phone,email,city,address,quantity_m3,water_use,source,status,notes)
 values(c.name,coalesce(c.phone,''),c.email,trim(p_city),trim(p_address),
  p_quantity_m3,trim(p_water_use),'portal_cliente','novo',
  'Solicitação autenticada: '||rid::text||' '||left(coalesce(p_notes,''),1000))
 returning id into lid;
 update public.customer_requests set lead_id=lid where id=rid;
 return rid;
end;$$;
revoke all on function public.create_customer_request(text,text,numeric,text,text) from public,anon;
grant execute on function public.create_customer_request(text,text,numeric,text,text) to authenticated;

commit;
