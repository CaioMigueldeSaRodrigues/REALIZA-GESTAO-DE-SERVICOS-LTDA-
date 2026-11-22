'use client';
import {createBrowserClient} from '@supabase/ssr';

type BrowserConfig = {url?:string;key?:string};
type RuntimeWindow = Window & {__REALIZA_PUBLIC_SUPABASE__?:BrowserConfig};

/** O runtime do servidor prevalece; NEXT_PUBLIC do bundle é fallback. */
export function browserDb(){
 const runtime=typeof window==='undefined'?undefined:
  (window as RuntimeWindow).__REALIZA_PUBLIC_SUPABASE__;
 const url=runtime?.url||process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=runtime?.key||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key){
  throw new Error('Supabase não configurado nesta implantação. Abra /api/health para verificar o ambiente ativo.');
 }
 return createBrowserClient(url,key);
}
