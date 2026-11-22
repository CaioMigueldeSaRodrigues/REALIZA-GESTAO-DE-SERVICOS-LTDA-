-- Proteção adicional: propostas originadas no portal são imutáveis após emissão.
-- Aprovação somente pelo titular autenticado via RPC, não pelo CRUD genérico.
begin;
create function private.guard_portal_quote() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.customer_request_id is not null then
  if (new.client_id,new.customer_request_id,new.quantity_m3,
      new.unit_price,new.freight_fee,new.water_use,new.valid_until,new.notes)
     is distinct from
     (old.client_id,old.customer_request_id,old.quantity_m3,
      old.unit_price,old.freight_fee,old.water_use,old.valid_until,old.notes) then
    raise exception 'Proposta do portal emitida não pode ser alterada; reabertura requer nova negociação';
  end if;
  if new.status is distinct from old.status then
   if old.status<>'enviada' or new.status<>'aprovada' then
    raise exception 'Transição de proposta de cliente não permitida';
   end if;
   if auth.uid() is null or
      not private.has_any_role(array['cliente']) or
      not exists (
       select 1 from public.customer_requests r
       where r.id=old.customer_request_id
        and r.auth_user_id=auth.uid()
        and r.client_id=old.client_id
      ) then
    raise exception 'Apenas o cliente titular pode aprovar a proposta';
   end if;
  end if;
 end if;
 return new;
end;$$;
create trigger portal_quote_guard before update on public.quotes
 for each row execute function private.guard_portal_quote();

create function private.guard_portal_order_link() returns trigger
language plpgsql set search_path='' as $$
declare r public.customer_requests;q public.quotes;
begin
 if TG_OP='UPDATE' and
  new.customer_request_id is distinct from old.customer_request_id then
  raise exception 'Não é permitido alterar o vínculo da ordem com a solicitação';
 end if;
 if TG_OP='INSERT' and new.customer_request_id is not null then
  select * into r from public.customer_requests where id=new.customer_request_id;
  select * into q from public.quotes where id=new.quote_id;
  if r.id is null or q.id is null or q.customer_request_id is distinct from r.id
     or r.client_id is distinct from new.client_id or q.client_id is distinct from new.client_id
     or r.status<>'proposta_enviada' or q.status<>'aprovada'
     or r.auth_user_id is distinct from auth.uid()
     or not private.has_any_role(array['cliente'])
     or new.address is distinct from r.address
     or new.city is distinct from r.city
     or new.quantity_m3 is distinct from q.quantity_m3
     or new.unit_price is distinct from q.unit_price
     or new.freight_fee is distinct from q.freight_fee then
   raise exception 'Pedido de portal exige aceite do titular e fidelidade à proposta';
  end if;
 end if;
 return new;
end;$$;
create trigger portal_order_link_guard before insert or update on public.orders
 for each row execute function private.guard_portal_order_link();

create view public.bi_request_pipeline with (security_invoker=true) as
select date_trunc('month',r.created_at)::date as month,r.status,
 count(*)::integer as requests,
 coalesce(sum(r.quantity_m3),0)::numeric(15,2) as requested_m3
from public.customer_requests r group by 1,2;
grant select on public.bi_request_pipeline to authenticated;
commit;