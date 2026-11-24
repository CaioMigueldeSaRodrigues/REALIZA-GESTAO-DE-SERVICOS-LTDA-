-- REALIZA RAG: biblioteca privada, chunks com origem rastreável e recuperação RLS.
-- Não altera a tabela legada documents nem expõe o acervo às contas demo.
begin;
create table if not exists public.rag_sources (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 title text not null check (char_length(trim(title)) between 3 and 200),
 category text not null check (category in ('manual','contrato','procedimento','norma','outro')),
 original_name text not null,
 storage_path text not null unique,
 mime_type text not null check (mime_type in ('application/pdf',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
   'text/plain','text/markdown')),
 file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
 file_size integer not null check (file_size > 0 and file_size <= 8388608),
 status text not null default 'active' check (status in ('active','archived')),
 issued_on date,
 review_due_on date,
 expires_on date,
 verified_on date,
 chunk_count integer not null default 0 check (chunk_count between 0 and 250),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.rag_chunks (
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null references public.rag_sources(id) on delete cascade,
 chunk_index integer not null check (chunk_index between 0 and 249),
 page_number integer check (page_number > 0),
 content text not null check (length(trim(content)) >= 30 and length(content) <= 2200),
 fts tsvector generated always as (to_tsvector('portuguese'::regconfig, content)) stored,
 embedding extensions.vector(1536),
 index_error text,
 created_at timestamptz not null default now(),
 unique(source_id, chunk_index)
);
create index if not exists rag_sources_owner_idx on public.rag_sources(owner_id,created_at desc);
create index if not exists rag_chunks_source_idx on public.rag_chunks(source_id,chunk_index);
create index if not exists rag_chunks_fts_idx on public.rag_chunks using gin(fts);
-- HNSW é opcional; evitar custo de índice vetorial enquanto o acervo é pequeno.

alter table public.rag_sources enable row level security;
alter table public.rag_chunks enable row level security;
grant select,insert,update,delete on public.rag_sources to authenticated;
grant select,insert,update,delete on public.rag_chunks to authenticated;

create policy rag_sources_owner_select on public.rag_sources for select to authenticated
 using (owner_id=(select auth.uid()) and (select private.is_platform_owner()));
create policy rag_sources_owner_insert on public.rag_sources for insert to authenticated
 with check (owner_id=(select auth.uid()) and (select private.is_platform_owner()));
create policy rag_sources_owner_update on public.rag_sources for update to authenticated
 using (owner_id=(select auth.uid()) and (select private.is_platform_owner()))
 with check (owner_id=(select auth.uid()) and (select private.is_platform_owner()));
create policy rag_sources_owner_delete on public.rag_sources for delete to authenticated
 using (owner_id=(select auth.uid()) and (select private.is_platform_owner()));
create policy rag_chunks_owner_select on public.rag_chunks for select to authenticated
 using ((select private.is_platform_owner()) and exists(
  select 1 from public.rag_sources s where s.id=source_id and s.owner_id=(select auth.uid())));
create policy rag_chunks_owner_insert on public.rag_chunks for insert to authenticated
 with check ((select private.is_platform_owner()) and exists(
  select 1 from public.rag_sources s where s.id=source_id and s.owner_id=(select auth.uid())));
create policy rag_chunks_owner_update on public.rag_chunks for update to authenticated
 using ((select private.is_platform_owner()) and exists(
  select 1 from public.rag_sources s where s.id=source_id and s.owner_id=(select auth.uid())))
 with check ((select private.is_platform_owner()) and exists(
  select 1 from public.rag_sources s where s.id=source_id and s.owner_id=(select auth.uid())));
create policy rag_chunks_owner_delete on public.rag_chunks for delete to authenticated
 using ((select private.is_platform_owner()) and exists(
  select 1 from public.rag_sources s where s.id=source_id and s.owner_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('realiza-rag','realiza-rag',false,8388608,array[
 'application/pdf',
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'text/plain','text/markdown'
])
on conflict(id) do update set
 public=false,file_size_limit=8388608,
 allowed_mime_types=excluded.allowed_mime_types;

create policy rag_storage_owner_select on storage.objects for select to authenticated
 using (bucket_id='realiza-rag' and (select private.is_platform_owner())
   and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy rag_storage_owner_insert on storage.objects for insert to authenticated
 with check (bucket_id='realiza-rag' and (select private.is_platform_owner())
   and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy rag_storage_owner_delete on storage.objects for delete to authenticated
 using (bucket_id='realiza-rag' and (select private.is_platform_owner())
   and (storage.foldername(name))[1]=(select auth.uid())::text);

create function public.match_rag_chunks(
 query_embedding extensions.vector(1536),
 match_count integer default 8,
 min_similarity double precision default 0.25
)
returns table(
 id uuid,source_id uuid, title text, category text,
 page_number integer,chunk_index integer,content text,similarity double precision,
 issued_on date,review_due_on date,expires_on date,original_name text
)
language sql stable security invoker set search_path=''
as $$
 select ch.id,s.id,s.title,s.category,ch.page_number,ch.chunk_index,ch.content,
  (1-(ch.embedding operator(extensions.<=>) query_embedding))::double precision,
  s.issued_on,s.review_due_on,s.expires_on,s.original_name
 from public.rag_chunks ch
 join public.rag_sources s on s.id=ch.source_id
 where ch.embedding is not null
  and s.status='active'
  and (s.review_due_on is null or s.review_due_on>=current_date)
  and (s.expires_on is null or s.expires_on>=current_date)
  and (1-(ch.embedding operator(extensions.<=>) query_embedding))>=min_similarity
 order by ch.embedding operator(extensions.<=>) query_embedding
 limit least(greatest(coalesce(match_count,8),1),12)
$$;
revoke all on function public.match_rag_chunks(extensions.vector,integer,double precision) from public,anon;
grant execute on function public.match_rag_chunks(extensions.vector,integer,double precision) to authenticated;
commit;