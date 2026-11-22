-- Evita cadastrar duas vezes cliente já autenticado pelo portal.
begin;
create or replace function public.convert_lead(p_lead_id uuid)
returns uuid language plpgsql security definer set search_path=''
as $$
declare l public.leads;linked public.customer_requests;new_id uuid;
begin
 if auth.uid() is null or not private.has_any_role(array['admin','gestor','comercial']) then
  raise exception 'Sem permissão';
 end if;
 select * into l from public.leads where id=p_lead_id for update;
 if not found then raise exception 'Lead não encontrado';end if;
 select * into linked from public.customer_requests where lead_id=p_lead_id;
 if found then
  if linked.status='pedido_gerado' then return linked.client_id;end if;
  raise exception 'Cliente do portal já cadastrado. Conclua a triagem na central operacional, sem converter o lead';
 end if;
 if l.status='convertido' then raise exception 'Lead já convertido';end if;
 insert into public.clients(name,phone,email,address,city,notes)
 values(l.name,l.phone,l.email,l.address,l.city,l.notes) returning id into new_id;
 update public.leads set status='convertido' where id=p_lead_id;
 return new_id;
end;$$;
revoke all on function public.convert_lead(uuid) from public,anon;
grant execute on function public.convert_lead(uuid) to authenticated;
commit;