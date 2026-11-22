-- Endereço de cadastro e opção de entrega em outro destino.
-- Preserva o endereço principal; cada solicitação registra uma cópia do destino.
begin;

alter table public.clients
 add column if not exists postal_code text,
 add column if not exists street text,
 add column if not exists street_number text,
 add column if not exists complement text,
 add column if not exists neighborhood text,
 add column if not exists state text;

alter table public.customer_requests
 add column if not exists address_origin text not null default 'outro'
   check(address_origin in ('cadastro','outro')),
 add column if not exists postal_code text,
 add column if not exists street text,
 add column if not exists street_number text,
 add column if not exists complement text,
 add column if not exists neighborhood text,
 add column if not exists state text,
 add column if not exists delivery_reference text;

-- Apenas perfil pendente, sessão autenticada e e-mail confirmado podem virar CLIENTE.
-- Os metadados são dados cadastrais, NUNCA utilizados para dar papel privilegiado.
create or replace function public.activate_customer_account(
 p_name text,p_phone text,p_person_type text default 'fisica'
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 u auth.users; p public.profiles; existing_client uuid; customer_id uuid;
 postal text; street text; num text; comp text; hood text; municipality text; uf text; full_address text;
begin
 if auth.uid() is null then raise exception 'Faça login antes de ativar o cadastro';end if;
 select * into u from auth.users where id=auth.uid();
 if not found or u.email_confirmed_at is null then
   raise exception 'Confirme o endereço de e-mail antes de continuar';
 end if;
 if coalesce(u.raw_user_meta_data->>'account_kind','')<>'customer' then
   raise exception 'Esta conta não foi cadastrada como cliente';
 end if;
 select * into p from public.profiles where id=u.id for update;
 if not found then raise exception 'Perfil de autenticação inexistente';end if;
 if p.role='cliente' and p.active then
   select c.id into existing_client from public.clients c where c.auth_user_id=u.id;
   if existing_client is not null then return existing_client;end if;
   raise exception 'Conta de cliente sem vínculo: solicite suporte';
 end if;
 if p.role<>'pendente' or p.active then
   raise exception 'Esta conta tem perfil restrito: procure a administração';
 end if;
 postal:=regexp_replace(coalesce(u.raw_user_meta_data->>'postal_code',''),'\D','','g');
 street:=trim(coalesce(u.raw_user_meta_data->>'street',''));
 num:=trim(coalesce(u.raw_user_meta_data->>'street_number',''));
 comp:=trim(coalesce(u.raw_user_meta_data->>'complement',''));
 hood:=trim(coalesce(u.raw_user_meta_data->>'neighborhood',''));
 municipality:=trim(coalesce(u.raw_user_meta_data->>'city',''));
 uf:=upper(trim(coalesce(u.raw_user_meta_data->>'state','')));

 if char_length(trim(coalesce(p_name,''))) not between 2 and 140
    or char_length(trim(coalesce(p_phone,''))) not between 8 and 30
    or p_person_type not in ('fisica','juridica')
    or postal !~ '^[0-9]{8}$'
    or char_length(street) not between 3 and 180
    or char_length(num) not between 1 and 25
    or char_length(comp)>100
    or char_length(hood) not between 2 and 120
    or char_length(municipality) not between 2 and 100
    or uf not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') then
   raise exception 'Complete o cadastro incluindo CEP e endereço válido';
 end if;
 full_address:=street||', '||num||', '||hood||
  case when comp<>'' then ' - '||comp else '' end||' - CEP '||postal;
 insert into public.clients(
  name,person_type,phone,email,auth_user_id,status,postal_code,street,street_number,
  complement,neighborhood,city,state,address
 )
 values(trim(p_name),p_person_type,trim(p_phone),u.email,u.id,'ativo',postal,
  street,num,nullif(comp,''),hood,municipality,uf,full_address)
 returning id into customer_id;
 update public.profiles set name=trim(p_name),phone=trim(p_phone),role='cliente',active=true
 where id=u.id and role='pendente' and active=false;
 if not found then raise exception 'Não foi possível ativar cadastro';end if;
 return customer_id;
end;$$;
revoke all on function public.activate_customer_account(text,text,text) from public,anon;
grant execute on function public.activate_customer_account(text,text,text) to authenticated;

-- A API antiga recebia endereço livre; substituímos por destino estruturado.
drop function if exists public.create_customer_request(text,text,numeric,text,text);
create function public.create_customer_request(
 p_use_registered_address boolean,
 p_delivery jsonb,
 p_quantity_m3 numeric,
 p_water_use text,
 p_notes text default ''
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 c public.clients; rid uuid; lid uuid;
 postal text; street text; num text; comp text; hood text;
 municipality text; uf text; ref text; full_address text; origin text;
begin
 if auth.uid() is null or not private.has_any_role(array['cliente']) then
   raise exception 'Acesso permitido somente a clientes ativos';
 end if;
 if p_quantity_m3 is null or p_quantity_m3<=0 or p_quantity_m3>50000
    or char_length(trim(coalesce(p_water_use,''))) not between 3 and 120
    or char_length(coalesce(p_notes,''))>2000 then
   raise exception 'Confira o volume e a finalidade da solicitação';
 end if;
 select * into c from public.clients
  where auth_user_id=auth.uid() and status='ativo' for update;
 if not found then raise exception 'Cliente ativo não encontrado';end if;
 if p_use_registered_address is true then
   origin:='cadastro';
   postal:=coalesce(c.postal_code,'');
   street:=coalesce(c.street,'');
   num:=coalesce(c.street_number,'');
   comp:=coalesce(c.complement,'');
   hood:=coalesce(c.neighborhood,'');
   municipality:=coalesce(c.city,'');
   uf:=coalesce(c.state,'');
   ref:='';
 else
   origin:='outro';
   postal:=regexp_replace(coalesce(p_delivery->>'postal_code',''),'\D','','g');
   street:=trim(coalesce(p_delivery->>'street',''));
   num:=trim(coalesce(p_delivery->>'street_number',''));
   comp:=trim(coalesce(p_delivery->>'complement',''));
   hood:=trim(coalesce(p_delivery->>'neighborhood',''));
   municipality:=trim(coalesce(p_delivery->>'city',''));
   uf:=upper(trim(coalesce(p_delivery->>'state','')));
   ref:=trim(coalesce(p_delivery->>'reference',''));
 end if;
 if postal !~ '^[0-9]{8}$'
    or char_length(street) not between 3 and 180
    or char_length(num) not between 1 and 25
    or char_length(comp)>100
    or char_length(hood) not between 2 and 120
    or char_length(municipality) not between 2 and 100
    or uf not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
                  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')
    or char_length(ref)>300 then
   raise exception 'Preencha o CEP e o endereço de entrega completo';
 end if;
 full_address:=street||', '||num||', '||hood||
  case when comp<>'' then ' - '||comp else '' end||' - CEP '||postal||
  case when ref<>'' then ' - Referência: '||ref else '' end;
 if char_length(full_address)>500 then
   raise exception 'Endereço de entrega muito extenso';
 end if;
 insert into public.customer_requests(
  auth_user_id,client_id,city,address,quantity_m3,water_use,notes,address_origin,
  postal_code,street,street_number,complement,neighborhood,state,delivery_reference
 )
 values(auth.uid(),c.id,municipality,full_address,p_quantity_m3,trim(p_water_use),
  left(coalesce(p_notes,''),2000),origin,postal,street,num,nullif(comp,''),hood,uf,nullif(ref,''))
 returning id into rid;
 insert into public.leads(name,phone,email,city,address,quantity_m3,water_use,source,status,notes)
 values(c.name,coalesce(c.phone,''),c.email,municipality,full_address,
  p_quantity_m3,trim(p_water_use),'portal_cliente','novo',
  'Solicitação autenticada: '||rid::text||' · entrega: '||origin||' · '||
   left(coalesce(p_notes,''),1000))
 returning id into lid;
 update public.customer_requests set lead_id=lid where id=rid;
 return rid;
end;$$;
revoke all on function public.create_customer_request(boolean,jsonb,numeric,text,text) from public,anon;
grant execute on function public.create_customer_request(boolean,jsonb,numeric,text,text) to authenticated;

commit;
