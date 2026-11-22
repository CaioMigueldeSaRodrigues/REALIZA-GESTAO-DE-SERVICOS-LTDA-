-- REALIZA | 2026-11-22 | Do portal do cliente à triagem, proposta e OS.
-- Uma solicitação gera UMA proposta e, após aceite do cliente, UMA OS.
-- Fluxo de viagens por capacidade de caminhão pertence à próxima etapa logística.
begin;

alter table public.customer_requests
  add column if not exists assigned_to uuid references public.profiles(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;
alter table public.customer_requests drop constraint if exists customer_requests_status_check;
alter table public.customer_requests add constraint customer_requests_status_check
 check(status in ('recebida','em_analise','proposta_enviada','pedido_gerado','concluida','cancelada'));
create index if not exists customer_requests_status_queue_idx
  on public.customer_requests(status,created_at desc);

alter table public.quotes
  add column if not exists customer_request_id uuid unique references public.customer_requests(id);
create index if not exists quotes_request_idx on public.quotes(customer_request_id);

alter table public.orders
  add column if not exists customer_request_id uuid unique references public.customer_requests(id);

-- Cliente somente lê sua própria proposta ligada a uma solicitação autenticada.
create policy quotes_customer_read on public.quotes for select to authenticated
 using(
  (select private.has_any_role(array['cliente'])) and
  exists(
   select 1 from public.customer_requests r
   where r.id=customer_request_id and r.auth_user_id=(select auth.uid())
   and r.client_id=client_id
  )
 );

create function public.claim_customer_request(p_request_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare r public.customer_requests;
begin
 if auth.uid() is null or
    not private.has_any_role(array['admin','gestor','comercial','operacoes']) then
   raise exception 'Sem autorização para analisar solicitações';
 end if;
 select * into r from public.customer_requests where id=p_request_id for update;
 if not found then raise exception 'Solicitação não encontrada';end if;
 if r.status='em_analise' and r.assigned_to=auth.uid() then return r.id;end if;
 if r.status not in ('recebida','em_analise') then
   raise exception 'Solicitação já processada: %',r.status;
 end if;
 if r.status='em_analise' and r.assigned_to is distinct from auth.uid()
   and not private.has_any_role(array['admin','gestor']) then
   raise exception 'Solicitação em análise por outro responsável';
 end if;
 update public.customer_requests set status='em_analise',
   assigned_to=auth.uid(),reviewed_at=now() where id=r.id;
 update public.leads set status='contato' where id=r.lead_id and status='novo';
 return r.id;
end;$$;
revoke all on function public.claim_customer_request(uuid) from public,anon;
grant execute on function public.claim_customer_request(uuid) to authenticated;

create function public.issue_customer_quote(
 p_request_id uuid,p_unit_price numeric,p_freight_fee numeric default 0,
 p_valid_until date default null,p_notes text default ''
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare r public.customer_requests;qid uuid;
begin
 if auth.uid() is null or not private.has_any_role(array['admin','gestor','comercial']) then
   raise exception 'Somente comercial ou gestão podem apresentar propostas';
 end if;
 if p_unit_price is null or p_unit_price<=0 or p_unit_price>100000000
    or p_freight_fee is null or p_freight_fee<0 or p_freight_fee>100000000
    or p_valid_until is null or p_valid_until<current_date or
       p_valid_until>current_date+365
    or char_length(coalesce(p_notes,''))>3000 then
   raise exception 'Confira valor, frete, validade e observações';
 end if;
 select * into r from public.customer_requests where id=p_request_id for update;
 if not found then raise exception 'Solicitação não encontrada';end if;
 if r.status<>'em_analise' then raise exception 'Marque primeiro como Em análise';end if;
 if exists(select 1 from public.quotes where customer_request_id=p_request_id) then
   raise exception 'Já existe uma proposta vinculada a esta solicitação';
 end if;
 if not exists(select 1 from public.clients where id=r.client_id and status='ativo') then
   raise exception 'Cadastro do cliente não está ativo';
 end if;
 insert into public.quotes(
   client_id,customer_request_id,quantity_m3,unit_price,freight_fee,
   water_use,valid_until,status,notes
 ) values(
   r.client_id,r.id,r.quantity_m3,p_unit_price,p_freight_fee,
   r.water_use,p_valid_until,'enviada',left(p_notes,3000)
 ) returning id into qid;
 update public.customer_requests set status='proposta_enviada' where id=r.id;
 update public.leads set status='proposta' where id=r.lead_id and status in ('novo','contato','qualificado');
 insert into public.automation_queue(event_type,entity_id,payload)
 values('proposta_disponivel',r.id,jsonb_build_object('quote_id',qid));
 return qid;
end;$$;
revoke all on function public.issue_customer_quote(uuid,numeric,numeric,date,text) from public,anon;
grant execute on function public.issue_customer_quote(uuid,numeric,numeric,date,text) to authenticated;

create function public.accept_customer_quote(p_quote_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare q public.quotes;r public.customer_requests;oid uuid;
begin
 if auth.uid() is null or not private.has_any_role(array['cliente']) then
   raise exception 'Aceite disponível somente ao cliente titular';
 end if;
 select * into q from public.quotes where id=p_quote_id;
 if not found or q.customer_request_id is null then raise exception 'Proposta não encontrada';end if;
 select * into r from public.customer_requests where id=q.customer_request_id for update;
 if not found or r.auth_user_id is distinct from auth.uid()
    or r.client_id is distinct from q.client_id then
   raise exception 'Proposta não pertence a esta conta';
 end if;
 select * into q from public.quotes where id=p_quote_id for update;
 if q.status='aprovada' then
   select o.id into oid from public.orders o where o.customer_request_id=r.id;
   if oid is not null then return oid;end if;
   raise exception 'Aceite já registrado; solicite revisão do pedido';
 end if;
 if q.status<>'enviada' or r.status<>'proposta_enviada' then
   raise exception 'Proposta não disponível para aceite';
 end if;
 if q.valid_until is null or q.valid_until<current_date then
   raise exception 'A proposta venceu. Solicite uma nova análise comercial';
 end if;
 update public.quotes set status='aprovada' where id=q.id;
 insert into public.orders(
  client_id,customer_request_id,quote_id,address,city,water_use,
  quantity_m3,unit_price,freight_fee,status
 ) values(
  r.client_id,r.id,q.id,r.address,r.city,r.water_use,
  r.quantity_m3,q.unit_price,q.freight_fee,'pendente'
 ) returning id into oid;
 update public.customer_requests set status='pedido_gerado' where id=r.id;
 update public.leads set status='convertido' where id=r.lead_id
  and status in ('novo','contato','qualificado','proposta');
 insert into public.automation_queue(event_type,entity_id,payload)
 values('pedido_criado',oid,
  jsonb_build_object('customer_request_id',r.id,'quote_id',q.id));
 return oid;
end;$$;
revoke all on function public.accept_customer_quote(uuid) from public,anon;
grant execute on function public.accept_customer_quote(uuid) to authenticated;

-- Propostas do portal NÃO podem ser convertidas por funcionários sem aceite do titular.
create or replace function public.convert_quote_to_order(p_quote_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare q public.quotes;c public.clients;new_id uuid;
begin
 if auth.uid() is null or not private.has_any_role(array['admin','gestor','operacoes']) then
  raise exception 'Sem permissão';
 end if;
 select * into q from public.quotes where id=p_quote_id for update;
 if not found or q.status<>'aprovada' then raise exception 'Proposta precisa estar aprovada';end if;
 if q.customer_request_id is not null then
  raise exception 'Proposta de portal: a ordem deve ser gerada no aceite do cliente';
 end if;
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

commit;