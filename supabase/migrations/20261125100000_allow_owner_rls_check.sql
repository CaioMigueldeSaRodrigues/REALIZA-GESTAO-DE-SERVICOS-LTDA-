-- RAG RLS: permitir que a policy execute a função de verificação de identidade.
-- A função devolve apenas boolean sobre auth.uid(), não aceita IDs como argumento.
-- O schema private já possui USAGE para authenticated e permanece indisponível ao anon.
begin;
revoke all on function private.is_platform_owner() from public,anon;
grant execute on function private.is_platform_owner() to authenticated;
commit;
