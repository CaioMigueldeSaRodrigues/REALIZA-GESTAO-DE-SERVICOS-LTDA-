import {serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
export async function POST(){
 try{
  const db=await serverDb();
  const {data:{user}}=await db.auth.getUser();
  if(!user)return Response.json({error:'Sessão obrigatória.'},{status:401});
  const {data:p}=await db.from('profiles').select('role,active').eq('id',user.id).single();
  if(!p?.active||!['admin','gestor'].includes(p.role))return Response.json({error:'Sem autorização.'},{status:403});
  const base=process.env.AI_BASE_URL,model=process.env.AI_EMBED_MODEL;
  if(!base||!model)return Response.json({error:'Defina AI_BASE_URL e AI_EMBED_MODEL (1536 dimensões).'}, {status:422});
  const {data:docs,error}=await db.from('documents').select('id,title,content').is('embedding',null).limit(10);
  if(error)throw error;
  let indexed=0,failed=0;
  for(const doc of docs||[]){
   try{
    const r=await fetch(base.replace(/\/$/,'')+'/embeddings',{
     method:'POST',headers:{'Content-Type':'application/json',...(process.env.AI_API_KEY?{Authorization:'Bearer '+process.env.AI_API_KEY}:{})},
     body:JSON.stringify({model,input:doc.title+'\n'+doc.content.slice(0,6500)}),
     cache:'no-store',signal:AbortSignal.timeout(16000)
    });
    if(!r.ok){failed++;continue}
    const v=(await r.json())?.data?.[0]?.embedding;
    if(!Array.isArray(v)||v.length!==1536){failed++;continue}
    const update=await db.from('documents').update({embedding:JSON.stringify(v)}).eq('id',doc.id);
    if(update.error){failed++;continue}
    indexed++;
   }catch{failed++}
  }
  return Response.json({indexed,failed,checked:(docs||[]).length});
 }catch(e){console.error('Indexing failed:',e instanceof Error?e.name:'unknown');return Response.json({error:'Falha ao indexar documentos.'},{status:503})}
}
