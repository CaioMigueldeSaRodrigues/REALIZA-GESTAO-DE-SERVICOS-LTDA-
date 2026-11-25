import {serverDb} from '@/lib/supabase-server';
export async function ownerContext(){
 const db=await serverDb();
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)return {db,user:null,authorized:false};
 const {data:scope,error}=await db.rpc('my_workspace_scope');
 return {db,user,authorized:!error&&scope==='owner'};
}
export const noAccess=()=>Response.json({error:'Recurso exclusivo do titular da REALIZA.'},{status:403});
export function parseDate(input:FormDataEntryValue|null):string|null{
 const value=typeof input==='string'?input.trim():'';
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(Date.parse(value+'T12:00:00Z')))
  throw Error('Data inválida; utilize AAAA-MM-DD.');
 return value;
}
