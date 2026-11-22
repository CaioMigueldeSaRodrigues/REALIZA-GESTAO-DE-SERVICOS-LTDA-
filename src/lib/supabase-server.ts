import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
export async function serverDb(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key) throw new Error('Supabase não configurado.');
 const store=await cookies();
 return createServerClient(url,key,{cookies:{
  getAll(){return store.getAll()},
  setAll(values){try{values.forEach(({name,value,options})=>store.set(name,value,options))}catch{/* Server Component: proxy cuida da rotação */}}
 }});
}
export function adminDb(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, secret=process.env.SUPABASE_SECRET_KEY;
 if(!url||!secret) throw new Error('Configurar chave secreta do Supabase no servidor.');
 return createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
}
