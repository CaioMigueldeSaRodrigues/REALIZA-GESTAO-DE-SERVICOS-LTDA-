-- Temporary ADM is for testing. It must never be able to persist its own
-- permission or elevate another account through the profiles Data API.
begin;
create or replace function private.prevent_temporary_admin_profile_updates()
returns trigger language plpgsql set search_path=''
as $$
begin
  if auth.uid() is not null and exists (
    select 1
    from private.temporary_admin_grants g
    join public.profiles actor on actor.id=g.user_id
    where g.user_id=auth.uid() and g.expires_at>now()
      and actor.role<>'admin'
  ) then
    raise exception 'Perfil ADM temporário não pode editar cadastros de acesso';
  end if;
  return new;
end;$$;

drop trigger if exists profiles_temporary_admin_guard on public.profiles;
create trigger profiles_temporary_admin_guard
before update on public.profiles
for each row execute function private.prevent_temporary_admin_profile_updates();
commit;