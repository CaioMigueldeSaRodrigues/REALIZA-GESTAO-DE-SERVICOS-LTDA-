import {NextResponse} from 'next/server';
import {serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
export async function GET(request:Request){
 const url=new URL(request.url);
 const hash=url.searchParams.get('token_hash');
 const type=url.searchParams.get('type');
 const destination=new URL('/login',url.origin);
 if(!hash||type!=='email'){
  destination.searchParams.set('erro','confirmacao');
  return NextResponse.redirect(destination);
 }
 try{
  const db=await serverDb();
  const {error}=await db.auth.verifyOtp({token_hash:hash,type:'email'});
  if(error)throw error;
  return NextResponse.redirect(new URL('/painel',url.origin));
 }catch{
  destination.searchParams.set('erro','confirmacao');
  return NextResponse.redirect(destination);
 }
}
