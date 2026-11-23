-- REALIZA | Nov/2026 | Modo de apresentação: somente titular tem acesso corporativo real.
-- Cadastros públicos continuam podendo criar sua identidade e dados próprios,
-- mas não recebem leitura nem escrita do ERP interno.
begin;
create table if not exists private.platform_owner (
 company_key text primary key check (company_key='realiza'),
 user_id uuid not null unique references auth.users(id) on delete restrict,
 created_at timestamptz not null default now()
);
revoke all on private.platform_owner from public,anon,authenticated;
insert into private.platform_owner (company_key,user_id)
select 'realiza',u.id
from auth.users u
join public.profiles p on p.id=u.id
where u.id='77c928cb-9299-45ad-8d36-cd2a8a0d2891'::uuid
  and lower(u.email)='migueel.rodryguez@gmail.com'
  and u.email_confirmed_at is not null and u.deleted_at is null
  and p.active=true
on conflict (company_key) do update set user_id=excluded.user_id;
do $$
begin
 if not exists(select 1 from private.platform_owner where company_key='realiza') then
  raise exception 'Titular REALIZA não foi validado; a autorização não será aplicada';
 end if;
end;$$;

create or replace function private.is_platform_owner()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(
  select 1 from private.platform_owner o
  join auth.users u on u.id=o.user_id
  join public.profiles p on p.id=u.id
  where o.company_key='realiza'
   and o.user_id=(select auth.uid())
   and p.active=true
   and (p.demo_expires_at is null or p.demo_expires_at>now())
   and u.email_confirmed_at is not null and u.deleted_at is null
   and lower(u.email)='migueel.rodryguez@gmail.com'
 )
$$;
revoke all on function private.is_platform_owner() from public,anon,authenticated;

-- Centraliza permissão: somente o titular recebe papéis do ERP.
-- Qualquer outra conta mantém exclusivamente seu próprio papel cliente
-- para consultar suas informações e enviar solicitações individuais.
create or replace function private.has_any_role(p_roles text[])
returns boolean language sql stable security definer set search_path=''
as $$
 select case
  when private.is_platform_owner() then coalesce(array_length(p_roles,1)>0,false)
  else exists(
   select 1 from public.profiles p
   where p.id=(select auth.uid())
     and p.active=true and p.role='cliente'
     and (p.demo_expires_at is null or p.demo_expires_at>now())
     and 'cliente'=any(p_roles)
  )
 end
$$;
revoke all on function private.has_any_role(text[]) from public,anon;
grant execute on function private.has_any_role(text[]) to authenticated;

create or replace function public.my_workspace_scope()
returns text language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null then return 'no-access';end if;
 if not exists(select 1 from public.profiles p
  join auth.users u on u.id=p.id
  where p.id=auth.uid() and p.active and u.email_confirmed_at is not null
    and (p.demo_expires_at is null or p.demo_expires_at>now())) then
  return 'no-access';
 end if;
 if private.is_platform_owner() then return 'owner';end if;
 return 'demo';
end;$$;
revoke all on function public.my_workspace_scope() from public,anon;
grant execute on function public.my_workspace_scope() to authenticated;

-- Remover quaisquer convites de admin temporário: acesso integral é exclusivo do titular.
delete from private.temporary_admin_grants;
update public.profiles
 set admin_invitation_pending=false
 where admin_invitation_pending=true;
comment on function public.my_workspace_scope() is
 'owner: acesso integral somente para titular validado; demo: mostra cenários sintéticos sem banco do ERP';
commit;