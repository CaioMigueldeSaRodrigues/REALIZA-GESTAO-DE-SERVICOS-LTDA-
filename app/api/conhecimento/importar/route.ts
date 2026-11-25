import {createHash,randomUUID} from 'node:crypto';
import {ownerContext,noAccess,parseDate} from '@/lib/rag-auth';
import {readDocument,MAX_UPLOAD_BYTES} from '@/lib/rag-extract';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const {db,user,authorized}=await ownerContext();
 if(!authorized||!user)return noAccess();
 const contentLength=Number(request.headers.get('content-length')||'0');
 if(contentLength>MAX_UPLOAD_BYTES+12000)return Response.json({error:'Arquivo superior a 8 MB.'},{status:413});
 let uploadedPath='';
 try{
  const form=await request.formData();
  const file=form.get('file');
  if(!(file instanceof File))return Response.json({error:'Selecione um documento.'},{status:400});
  if(file.size>MAX_UPLOAD_BYTES)return Response.json({error:'Limite de 8 MB por arquivo.'},{status:413});
  const title=String(form.get('title')||'').trim();
  const category=String(form.get('category')||'').trim();
  if(title.length<3||title.length>200)throw Error('Informe um título de 3 a 200 caracteres.');
  if(!['manual','contrato','procedimento','norma','outro'].includes(category))throw Error('Categoria inválida.');
  const issued=parseDate(form.get('issued_on'));
  const review=parseDate(form.get('review_due_on'));
  const expires=parseDate(form.get('expires_on'));
  if((issued&&review&&review<issued)||(issued&&expires&&expires<issued))
   throw Error('A data de vencimento/revisão não pode ser anterior à emissão.');
  const buffer=Buffer.from(await file.arrayBuffer());
  const processed=await readDocument({buffer,fileName:file.name,mime:file.type});
  const hash=createHash('sha256').update(buffer).digest('hex');
  const {data:duplicate,error:dupError}=await db.from('rag_sources')
   .select('id,title').eq('owner_id',user.id).eq('file_sha256',hash).limit(1);
  if(dupError)throw Error(dupError.message);
  if(duplicate?.length)return Response.json({error:'Arquivo já importado: '+duplicate[0].title},{status:409});
  const path=user.id+'/'+randomUUID()+'/'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-110);
  const storage=await db.storage.from('realiza-rag').upload(path,buffer,{
   contentType:file.type,upsert:false,cacheControl:'0'
  });
  if(storage.error)throw Error('Falha no armazenamento privado: '+storage.error.message);
  uploadedPath=path;
  const {data:source,error:sourceError}=await db.from('rag_sources').insert({
   owner_id:user.id,title,category,original_name:file.name.slice(0,200),
   storage_path:path,mime_type:file.type,file_size:buffer.length,
   file_sha256:hash,issued_on:issued,review_due_on:review,expires_on:expires,
   chunk_count:processed.chunks.length
  }).select('id,title').single();
  if(sourceError||!source)throw Error('Falha ao registrar fonte: '+sourceError?.message);
  const rows=processed.chunks.map(ch=>({...ch,source_id:source.id}));
  const inserted=await db.from('rag_chunks').insert(rows);
  if(inserted.error){
   // Rollback lógico do banco em caso de falha parcial no carregamento de trechos.
   await db.from('rag_sources').delete().eq('id',source.id);
   throw Error('Falha ao criar os trechos: '+inserted.error.message);
  }
  return Response.json({ok:true,source_id:source.id,title,
   pages:processed.pages,chunks:processed.chunks.length,indexed:0,
   message:'Importação concluída. A pesquisa textual está ativa; clique em Indexar para gerar os vetores.'},
   {status:201,headers:{'Cache-Control':'no-store'}});
 }catch(e){
  if(uploadedPath)await db.storage.from('realiza-rag').remove([uploadedPath]).catch(()=>{});
  return Response.json({error:e instanceof Error?e.message:'Falha ao importar o arquivo.'},
   {status:422});
 }
}
