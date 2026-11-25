import {ownerContext,noAccess} from '@/lib/rag-auth';
import {embedText,embeddingConfig} from '@/lib/rag-embeddings';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request:Request){
 const {db,authorized}=await ownerContext();
 if(!authorized)return noAccess();
 const {base,model}=embeddingConfig();
 if(!base||!model)return Response.json({
  error:'Indexação semântica ainda não configurada: defina AI_BASE_URL e AI_EMBED_MODEL (1.536 dimensões). Pesquisa textual já disponível.'
 },{status:422});
 const payload=await request.json().catch(()=>({}));
 const sourceId=String((payload as {source_id?:unknown}).source_id||'');
 if(sourceId&&!/^[0-9a-f-]{36}$/i.test(sourceId))
  return Response.json({error:'ID do documento inválido.'},{status:400});
 const {data:sources,error:sourceErr}=await db.from('rag_sources').select('id,status');
 if(sourceErr)return Response.json({error:sourceErr.message},{status:500});
 const selected=(sources||[]).filter(s=>s.status==='active'&&(!sourceId||s.id===sourceId));
 if(sourceId&&!selected.length)return Response.json({error:'Documento indisponível.'},{status:404});
 if(!selected.length)return Response.json({indexed:0,failed:0,pending:0,completed:true});
 const ids=selected.map(s=>s.id);
 const result=await db.from('rag_chunks')
  .select('id,source_id,content,chunk_index')
  .in('source_id',ids).is('embedding',null)
  .order('chunk_index',{ascending:true}).limit(8);
 if(result.error)return Response.json({error:result.error.message},{status:500});
 let indexed=0,failed=0;
 for(const ch of result.data||[]){
  try{
   const vector=await embedText(ch.content);
   const update=await db.from('rag_chunks').update({
    embedding:JSON.stringify(vector),index_error:null
   }).eq('id',ch.id);
   if(update.error)throw Error(update.error.message);
   indexed++;
  }catch(e){
   failed++;
   await db.from('rag_chunks').update({
    index_error:String(e instanceof Error?e.message:'Falha de indexação').slice(0,300)
   }).eq('id',ch.id);
  }
 }
 const {count}=await db.from('rag_chunks').select('id',{count:'exact',head:true})
  .in('source_id',ids).is('embedding',null);
 return Response.json({
  indexed,failed,pending:count||0,completed:(count||0)===0,
  message:failed?'Alguns trechos falharam. Verifique o provedor e tente novamente.':'Indexação incremental concluída para este lote.',
  checked:(result.data||[]).length
 },{headers:{'Cache-Control':'no-store'}});
}
