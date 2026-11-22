begin;
create function private.invalidate_document_embedding() returns trigger language plpgsql
set search_path='' as $$
begin
 if new.content is distinct from old.content or new.title is distinct from old.title then new.embedding=null;end if;
 return new;
end;$$;
create trigger documents_invalidate_embedding before update on public.documents
for each row execute function private.invalidate_document_embedding();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values('delivery-proofs','delivery-proofs',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
alter table public.orders add column proof_path text;
alter table public.delivery_events add column proof_path text;
create policy "delivery_proofs_insert" on storage.objects for insert to authenticated
with check(bucket_id='delivery-proofs'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and (select private.has_any_role(array['admin','gestor','operacoes','motorista'])));
create policy "delivery_proofs_read" on storage.objects for select to authenticated
using(bucket_id='delivery-proofs'
 and ((storage.foldername(name))[1]=(select auth.uid())::text
  or (select private.has_any_role(array['admin','gestor','operacoes']))));

drop function public.confirm_delivery(uuid,numeric,text);
create function public.confirm_delivery(
 p_order_id uuid,p_delivered_m3 numeric,p_note text default '',p_proof_path text default null
) returns uuid language plpgsql security definer set search_path=''
as $$
declare o public.orders;actor uuid:=auth.uid();
begin
 if actor is null or not private.has_any_role(array['admin','gestor','operacoes','motorista']) then
  raise exception 'Sem permissão';
 end if;
 select * into o from public.orders where id=p_order_id for update;
 if not found then raise exception 'OS não encontrada';end if;
 if private.has_any_role(array['motorista']) and o.driver_profile_id is distinct from actor then
  raise exception 'OS não atribuída ao motorista';
 end if;
 if o.status<>'em_rota' then raise exception 'A OS deve estar em rota antes da confirmação';end if;
 if p_delivered_m3 is null or p_delivered_m3<=0 or p_delivered_m3>o.quantity_m3 then
  raise exception 'Volume incompatível com o pedido';
 end if;
 if p_proof_path is not null and p_proof_path not like actor::text||'/%' then
  raise exception 'O comprovante deve pertencer à pasta do usuário';
 end if;
 update public.orders
 set status='entregue',delivered_m3=p_delivered_m3,delivered_at=now(),
     proof_note=left(coalesce(p_note,''),1500),proof_path=p_proof_path
 where id=p_order_id;
 insert into public.delivery_events(order_id,driver_profile_id,volume_m3,proof_note,proof_path)
 values(p_order_id,actor,p_delivered_m3,left(coalesce(p_note,''),1500),p_proof_path);
 return p_order_id;
end;$$;
revoke all on function public.confirm_delivery(uuid,numeric,text,text) from public,anon;
grant execute on function public.confirm_delivery(uuid,numeric,text,text) to authenticated;
commit;
