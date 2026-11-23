-- REALIZA: enriquecer a prospeccao somente com dados cadastrais verificáveis.
-- Capital social pertence à empresa/raiz CNPJ, não a um estabelecimento isolado.
begin;
alter table public.commercial_prospects
 add column if not exists street_type text,
 add column if not exists street text,
 add column if not exists street_number text,
 add column if not exists address_extra text,
 add column if not exists neighborhood text,
 add column if not exists postal_code text,
 add column if not exists phone text,
 add column if not exists secondary_phone text,
 add column if not exists contact_email text,
 add column if not exists capital_social numeric(18,2) check(capital_social>=0),
 add column if not exists latitude numeric(9,6) check(latitude between -90 and 90),
 add column if not exists longitude numeric(9,6) check(longitude between -180 and 180);
create index if not exists commercial_prospects_cnae_city_idx
 on public.commercial_prospects(cnae,city);

-- Impede que atualizações comerciais adulterem dados provenientes da fonte CNPJ.
create function private.protect_prospect_registry_fields()
returns trigger language plpgsql set search_path='' as $$
begin
 if (
  new.cnpj,new.name,new.trade_name,new.cnae,new.city,new.state,
  new.opened_on,new.snapshot_on,new.registration_status,new.source,new.created_by,
  new.street_type,new.street,new.street_number,new.address_extra,new.neighborhood,
  new.postal_code,new.phone,new.secondary_phone,new.contact_email,new.capital_social,
  new.latitude,new.longitude
 ) is distinct from (
  old.cnpj,old.name,old.trade_name,old.cnae,old.city,old.state,
  old.opened_on,old.snapshot_on,old.registration_status,old.source,old.created_by,
  old.street_type,old.street,old.street_number,old.address_extra,old.neighborhood,
  old.postal_code,old.phone,old.secondary_phone,old.contact_email,old.capital_social,
  old.latitude,old.longitude
 ) then
   raise exception 'Dados cadastrais importados não podem ser alterados manualmente.';
 end if;
 new.updated_at=now();
 return new;
end;$$;
create trigger prospect_registry_guard before update
 on public.commercial_prospects for each row
 execute function private.protect_prospect_registry_fields();
commit;