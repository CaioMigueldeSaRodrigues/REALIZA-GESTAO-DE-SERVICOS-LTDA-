import {adminDb} from '@/lib/supabase-server';
export const runtime='nodejs';
const clean=(x:unknown,max=200)=>typeof x==='string'?x.trim().slice(0,max):'';
const validEmail=(v:string)=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
export async function POST(request:Request){
 try{
  const raw=await request.text();
  if(raw.length>6000)return Response.json({error:'Solicitação muito extensa.'},{status:413});
  const v=JSON.parse(raw) as Record<string,unknown>;
  if(v.website)return Response.json({ok:true}); // honeypot antispam
  const name=clean(v.name,140),phone=clean(v.phone,30),email=clean(v.email,180),city=clean(v.city,90);
  const address=clean(v.address,350),water_use=clean(v.water_use,90);
  const quantity_m3=v.quantity_m3==null?null:Number(v.quantity_m3);
  if(name.length<2||phone.length<8||city.length<2||!validEmail(email)||!water_use||
   (quantity_m3!==null&&(!Number.isFinite(quantity_m3)||quantity_m3<=0||quantity_m3>50000)))
   return Response.json({error:'Confira os campos obrigatórios.'},{status:400});
  // Limite conservador: impedir repetição da mesma origem num período curto.
  const db=adminDb();
  const since=new Date(Date.now()-10*60*1000).toISOString();
  const {count,error:countError}=await db.from('leads').select('id',{count:'exact',head:true}).eq('phone',phone).gte('created_at',since);
  if(countError)throw countError;
  if((count||0)>=2)return Response.json({error:'Já recebemos uma solicitação recente deste telefone.'},{status:429});
  const {error}=await db.from('leads').insert({name,phone,email:email||null,city,address,water_use,quantity_m3,source:'site',status:'novo'});
  if(error)throw error;
  return Response.json({ok:true},{status:201});
 }catch(error){console.error('Public lead intake failed:',error instanceof Error?error.name:'unknown');return Response.json({error:'Atendimento temporariamente indisponível. Tente novamente.'},{status:503})}
}
