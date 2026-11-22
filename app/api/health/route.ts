import {publicSupabaseConfig} from '@/lib/public-supabase-config';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(){
 const config=publicSupabaseConfig();
 const result={
  status:'ok',
  service:'realiza-operacional',
  diagnosticVersion:'2026-11-env-02',
  environment:process.env.VERCEL_ENV||'local',
  commit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,7)||null,
  supabase:{
   urlConfigured:Boolean(config.url),
   publishableKeyConfigured:Boolean(config.key)
  }
 };
 // NUNCA retornamos segredo ou valor de chave pelo endpoint.
 return Response.json(result,{headers:{'Cache-Control':'no-store, max-age=0'}});
}
