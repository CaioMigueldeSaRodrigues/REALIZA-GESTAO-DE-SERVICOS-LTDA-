import {ownerContext,noAccess} from '@/lib/rag-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function DELETE(req:Request){
 const {db,authorized}=await ownerContext();
 if(!authorized)return noAccess();
 const body=await req.json().catch(()=>({}));
 const id=String((body as {id?:unknown}).id||'');
 if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'Identificador inválido'},{status:400});
 const {data:source,error}=await db.from('rag_sources').select('id,storage_path').eq('id',id).single();
 if(error||!source)return Response.json({error:'Documento não encontrado.'},{status:404});
 const result=await db.from('rag_sources').delete().eq('id',id);
 if(result.error)return Response.json({error:result.error.message},{status:500});
 const gone=await db.storage.from('realiza-rag').remove([source.storage_path]);
 return Response.json({ok:true,storageCleanup:gone.error?gone.error.message:null});
}
