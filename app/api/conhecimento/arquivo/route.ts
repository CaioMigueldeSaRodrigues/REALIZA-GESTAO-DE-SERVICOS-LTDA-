import {ownerContext,noAccess} from '@/lib/rag-auth';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const {db,authorized}=await ownerContext();
 if(!authorized)return noAccess();
 const id=new URL(req.url).searchParams.get('id')||'';
 if(!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:'Documento inválido'},{status:400});
 const {data,error}=await db.from('rag_sources')
  .select('storage_path').eq('id',id).single();
 if(error||!data)return Response.json({error:'Documento indisponível.'},{status:404});
 const {data:link,error:signError}=await db.storage.from('realiza-rag')
  .createSignedUrl(data.storage_path,60);
 if(signError||!link)return Response.json({error:'Não foi possível abrir o arquivo.'},{status:500});
 return Response.redirect(link.signedUrl,302);
}
