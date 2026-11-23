-- Modo apresentação: contas externas não podem gerar pedidos/OS reais via RPC.
-- Ativação da conta de cliente permanece possível para login demonstrativo.
begin;
create function private.guard_demo_transaction()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not private.is_platform_owner() then
  raise exception 'Modo demonstração: operações reais indisponíveis para esta conta';
 end if;
 return new;
end;$$;
revoke all on function private.guard_demo_transaction() from public,anon,authenticated;

create trigger demo_customer_request_insert_guard
 before insert on public.customer_requests
 for each row execute function private.guard_demo_transaction();

create trigger demo_order_insert_guard
 before insert on public.orders
 for each row execute function private.guard_demo_transaction();

comment on function private.guard_demo_transaction() is
 'Recusa pedidos reais de contas de apresentação, inclusive via chamada direta de RPC';
commit;