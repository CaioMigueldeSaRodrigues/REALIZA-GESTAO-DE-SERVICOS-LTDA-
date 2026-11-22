/** Somente dados públicos do Supabase. Uso exclusivo no servidor. */
export function publicSupabaseConfig(){
 const urlName='NEXT_PUBLIC_SUPABASE_URL';
 const keyName='NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
 return {
  url:(process.env[urlName]||'').trim(),
  key:(process.env[keyName]||'').trim()
 };
}
