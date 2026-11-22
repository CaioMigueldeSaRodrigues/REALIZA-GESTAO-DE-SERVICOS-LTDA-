begin;
alter table public.profiles add column if not exists demo_expires_at timestamptz;

create or replace function private.has_any_role(p_roles text[])
returns boolean language sql stable security definer set search_path=''
as $$
 select coalesce((
  select p.role=any(p_roles)
  from public.profiles p
  where p.id=(select auth.uid())
   and p.active=true
   and (p.demo_expires_at is null or p.demo_expires_at>now())
 ),false)
$$;
revoke all on function private.has_any_role(text[]) from public;
grant execute on function private.has_any_role(text[]) to authenticated;

create index if not exists profiles_demo_expires_idx
 on public.profiles(demo_expires_at) where demo_expires_at is not null;
commit;