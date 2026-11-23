-- Dual persona: retain customer role and grant temporary ADM capability separately.
-- Only migration operator inserts the time-limited grant. No self-elevation by user metadata.
begin;
create table if not exists private.temporary_admin_grants (
 user_id uuid primary key references auth.users(id) on delete cascade,
 granted_role text not null default 'admin' check(granted_role='admin'),
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
revoke all on private.temporary_admin_grants from public,anon,authenticated;

-- Only expose *own* active admin grant via a narrowly scoped read RPC.
create or replace function public.my_temporary_admin_access()
returns table(granted_role text, expires_at timestamptz)
language sql stable security definer set search_path=''
as $$
  select t.granted_role,t.expires_at
  from private.temporary_admin_grants t
  join public.profiles p on p.id=t.user_id
  where t.user_id=(select auth.uid())
   and p.active=true
   and t.expires_at>now()
$$;
revoke all on function public.my_temporary_admin_access() from public,anon;
grant execute on function public.my_temporary_admin_access() to authenticated;

create or replace function private.has_any_role(p_roles text[])
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.active=true
      and (
         (p.role=any(p_roles) and (p.demo_expires_at is null or p.demo_expires_at>now()))
         or (
           'admin'=any(p_roles) and exists(
             select 1 from private.temporary_admin_grants t
             where t.user_id=p.id and t.granted_role='admin' and t.expires_at>now()
           )
         )
      )
  )
$$;
revoke all on function private.has_any_role(text[]) from public;
grant execute on function private.has_any_role(text[]) to authenticated;

-- A former incorrect invitation is revoked without touching the existing account.
update public.profiles set role='pendente',active=false,admin_invitation_pending=false,
 demo_expires_at=null
where lower(email)='caio.rodryguez@gmail.com'
 and role='admin' and active=false and admin_invitation_pending=true;

-- Grant applies exclusively to an existing, confirmed customer identity.
insert into private.temporary_admin_grants(user_id,granted_role,expires_at)
select u.id,'admin',now()+interval '48 hours'
from auth.users u
join public.profiles p on p.id=u.id
join public.clients c on c.auth_user_id=u.id
where lower(u.email)='migueel.rodryguez@gmail.com'
 and lower(p.email)=lower(u.email)
 and p.role='cliente' and p.active=true
 and u.email_confirmed_at is not null and u.deleted_at is null
on conflict(user_id) do update set
 expires_at=excluded.expires_at;

-- Correct the customer quote visibility predicate (quote foreign key qualification).
drop policy if exists quotes_customer_read on public.quotes;
create policy quotes_customer_read on public.quotes for select to authenticated
using (
  (select private.has_any_role(array['cliente']))
  and exists(
    select 1 from public.customer_requests r
    where r.id=customer_request_id and r.auth_user_id=(select auth.uid())
      and r.client_id=quotes.client_id
  )
);
commit;