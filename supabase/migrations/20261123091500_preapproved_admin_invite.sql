-- REALIZA: convite de administrador para homologação.
-- Não contém e-mail, senha ou ID de usuário.
begin;
alter table public.profiles
 add column if not exists admin_invitation_pending boolean not null default false;

create or replace function public.activate_preapproved_admin()
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  verified boolean;
  invitation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória';
  end if;
  select (u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false))
  into verified from auth.users u where u.id=auth.uid();
  if not coalesce(verified,false) then
    raise exception 'Confirme o e-mail antes de ativar o perfil administrativo';
  end if;

  update public.profiles p
     set active=true,
         admin_invitation_pending=false,
         demo_expires_at=now()+interval '48 hours'
   where p.id=auth.uid()
     and p.role='admin'
     and p.active=false
     and p.admin_invitation_pending=true
     and p.demo_expires_at is null
  returning p.id into invitation_id;

  if invitation_id is null then
    raise exception 'Nenhum convite administrativo válido para esta conta';
  end if;
  return true;
end; $$;
revoke all on function public.activate_preapproved_admin() from public, anon;
grant execute on function public.activate_preapproved_admin() to authenticated;
commit;
