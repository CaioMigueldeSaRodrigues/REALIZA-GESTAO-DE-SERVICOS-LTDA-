import {ownerContext,noAccess} from '@/lib/rag-auth';
export const dynamic='force-dynamic';
export async function GET(){
 const {db,authorized}=await ownerContext();
 if(!authorized)return noAccess();
 const {data:sources,error}=await db.from('rag_sources').select(
  'id,title,category,original_name,status,issued_on,review_due_on,expires_on,verified_on,created_at,chunk_count,file_size'
 ).order('created_at',{ascending:false}).limit(150);
 if(error)return Response.json({error:error.message},{status:500});
 const items=await Promise.all((sources||[]).map(async s=>{
  const {count:done}=await db.from('rag_chunks').select('id',{count:'exact',head:true})
   .eq('source_id',s.id).not('embedding','is',null);
  const {count:failed}=await db.from('rag_chunks').select('id',{count:'exact',head:true})
   .eq('source_id',s.id).not('index_error','is',null);
  return {...s,indexed:done||0,failed:failed||0};
 }));
 return Response.json({items,embeddingConfigured:Boolean(process.env.AI_BASE_URL&&process.env.AI_EMBED_MODEL)},
  {headers:{'Cache-Control':'no-store'}});
}
