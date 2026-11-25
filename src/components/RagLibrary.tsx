'use client';
import {useCallback,useEffect,useState} from 'react';

type Source={
 id:string;title:string;category:string;original_name:string;
 status:string;issued_on:string|null;review_due_on:string|null;
 expires_on:string|null;verified_on:string|null;created_at:string;
 chunk_count:number;indexed:number;failed:number;file_size:number
};
type Listing={items:Source[];embeddingConfigured:boolean};
const date=(s:string|null)=>s?new Date(s+'T12:00:00').toLocaleDateString('pt-BR'):'Não informada';
function sourceState(s:Source){
 const now=new Date().toISOString().slice(0,10);
 if(s.expires_on&&s.expires_on<now)return 'Vencido — fora da pesquisa';
 if(s.review_due_on&&s.review_due_on<now)return 'Revisão atrasada — fora da pesquisa';
 if(s.status==='archived')return 'Arquivado';
 if(!s.issued_on&&!s.expires_on&&!s.review_due_on)return 'Validade não informada';
 return 'Vigente';
}
export function RagLibrary(){
 const [items,setItems]=useState<Source[]>([]);
 const [enabled,setEnabled]=useState(false);
 const [busy,setBusy]=useState(false);
 const [indexing,setIndexing]=useState(false);
 const [error,setError]=useState('');
 const [note,setNote]=useState('');
 const [refresh,setRefresh]=useState(0);
 const [category,setCategory]=useState('procedimento');
 const [title,setTitle]=useState('');
 const [file,setFile]=useState<File|null>(null);
 const [issued,setIssued]=useState('');
 const [review,setReview]=useState('');
 const [expires,setExpires]=useState('');
 const load=useCallback(async()=>{
  try{
   const res=await fetch('/api/conhecimento/fontes',{cache:'no-store'});
   const payload=await res.json() as Listing&{error?:string};
   if(!res.ok)throw Error(payload.error||'Não foi possível consultar documentos');
   setItems(payload.items||[]);setEnabled(Boolean(payload.embeddingConfigured));
  }catch(e){setError(e instanceof Error?e.message:'Falha ao consultar documentos');}
 },[]);
 useEffect(()=>{void load()},[load,refresh]);
 async function upload(e:React.FormEvent){
  e.preventDefault();setError('');setNote('');
  if(!file){setError('Selecione um documento.');return}
  if(file.size>8*1024*1024){setError('Limite de 8 MB por arquivo.');return}
  setBusy(true);
  try{
   const body=new FormData();
   body.append('file',file);body.append('title',title);
   body.append('category',category);body.append('issued_on',issued);
   body.append('review_due_on',review);body.append('expires_on',expires);
   const res=await fetch('/api/conhecimento/importar',{method:'POST',body});
   const payload=await res.json() as {error?:string;chunks?:number;pages?:number;message?:string};
   if(!res.ok)throw Error(payload.error||'Falha ao importar arquivo');
   setNote('Arquivo importado: '+payload.chunks+' trechos. '+(payload.message||''));
   setFile(null);setTitle('');setIssued('');setReview('');setExpires('');
   const field=document.getElementById('rag-file') as HTMLInputElement|null;
   if(field)field.value='';
   setRefresh(n=>n+1);
  }catch(e){setError(e instanceof Error?e.message:'Falha de importação')}
  finally{setBusy(false)}
 }
 async function indexSource(id:string){
  setIndexing(true);setError('');setNote('');
  try{
   let total=0,pending=0,failed=0;
   // Máximo de cinco lotes em cada clique; evita bloquear o servidor por muito tempo.
   for(let i=0;i<5;i++){
    const res=await fetch('/api/conhecimento/indexar',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({source_id:id})
    });
    const p=await res.json() as {error?:string;indexed?:number;failed?:number;pending?:number;completed?:boolean};
    if(!res.ok)throw Error(p.error||'Indexação indisponível');
    total+=p.indexed||0;failed+=p.failed||0;pending=p.pending||0;
    if(p.completed||!p.indexed)break;
   }
   setNote('Trechos indexados nesta operação: '+total+'. Pendentes: '+pending+'. Falhas: '+failed+'.');
   setRefresh(n=>n+1);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível indexar')}
  finally{setIndexing(false)}
 }
 async function remove(id:string,title:string){
  if(!window.confirm('Excluir permanentemente "'+title+'" e seus trechos?'))return;
  setBusy(true);setError('');setNote('');
  try{
   const res=await fetch('/api/conhecimento/excluir',{
    method:'DELETE',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id})
   });
   const p=await res.json() as {error?:string;storageCleanup?:string|null};
   if(!res.ok)throw Error(p.error||'Falha ao excluir');
   setNote(p.storageCleanup?'Documento excluído do índice, mas houve erro na limpeza do arquivo: '+p.storageCleanup:'Documento e trechos excluídos.');
   setRefresh(n=>n+1);
  }catch(e){setError(e instanceof Error?e.message:'Falha ao excluir')}
  finally{setBusy(false)}
 }
 return <div>
  <div className="page-heading"><div><span className="eyebrow">INTELIGÊNCIA CONTEXTUAL</span>
   <h1>Biblioteca RAG</h1>
   <p>Documentos, manuais, contratos e procedimentos da REALIZA, com indexação e fontes por página.</p></div></div>
  <div className="dashboard-banner">Acesso exclusivo do titular. PDFs digitalizados sem texto exigem OCR prévio.
   A pesquisa textual funciona imediatamente após a importação; a indexação vetorial precisa de provedor de embeddings.</div>
  {error&&<div className="notice error" role="alert">{error}</div>}
  {note&&<div className="notice" role="status">{note}</div>}
  <section className="panel">
   <div className="dashboard-panel-head"><div><span className="eyebrow">INGESTÃO DOCUMENTAL</span>
    <h2>Adicionar documento</h2><small>PDF, DOCX, TXT ou Markdown · até 8 MB</small></div></div>
   <form onSubmit={upload} className="rag-upload-form">
    <label>Título do documento<input required minLength={3} maxLength={200}
     value={title} onChange={e=>setTitle(e.target.value)} placeholder="Ex.: POP — Recebimento de pedido"/></label>
    <label>Tipo<select value={category} onChange={e=>setCategory(e.target.value)}>
     <option value="procedimento">Procedimento</option><option value="manual">Manual</option>
     <option value="contrato">Contrato</option><option value="norma">Norma</option>
     <option value="outro">Outro</option>
    </select></label>
    <label>Arquivo<input id="rag-file" type="file" required accept=".pdf,.docx,.txt,.md"
     onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
    <label>Data de emissão<input type="date" value={issued} onChange={e=>setIssued(e.target.value)}/></label>
    <label>Revisar até<input type="date" value={review} onChange={e=>setReview(e.target.value)}/></label>
    <label>Validade até<input type="date" value={expires} onChange={e=>setExpires(e.target.value)}/></label>
    <div className="rag-upload-actions"><button className="btn primary" type="submit" disabled={busy||indexing}>
     {busy?'Importando…':'Importar e dividir em trechos'}</button></div>
   </form>
  </section>
  <section className="panel" style={{marginTop:18}}>
   <div className="dashboard-panel-head"><div><span className="eyebrow">FONTES AUTORIZADAS</span><h2>Acervo documental</h2>
    <small>{enabled?'Embeddings configurados':'Embeddings ainda não configurados — somente busca textual'}</small></div>
    <button className="btn light" onClick={()=>setRefresh(x=>x+1)}>Atualizar</button></div>
   {items.length===0?<p>Nenhum documento importado. Cadastre uma fonte acima para começar.</p>:
    <div className="rag-source-list">{items.map(item=><article className="rag-source" key={item.id}>
     <div><strong>{item.title}</strong>
      <small>{item.original_name} · {item.category} · {(item.file_size/1024).toFixed(1)} KB</small>
      <small>{item.chunk_count} trechos · {item.indexed} vetorizados · {item.failed} com erro</small>
      <small>Emissão: {date(item.issued_on)} · Revisão: {date(item.review_due_on)} · Validade: {date(item.expires_on)}</small>
      <span className="pill">{sourceState(item)}</span>
     </div>
     <div className="rag-source-actions">
      <a className="btn light" target="_blank" rel="noopener noreferrer"
       href={'/api/conhecimento/arquivo?id='+encodeURIComponent(item.id)}>Abrir fonte</a>
      {item.status==='active'&&item.indexed<item.chunk_count&&<button className="btn primary"
       disabled={busy||indexing||!enabled} onClick={()=>void indexSource(item.id)}>
       {indexing?'Indexando…':'Indexar trechos'}</button>}
      <button className="btn light" disabled={busy||indexing}
       onClick={()=>void remove(item.id,item.title)}>Excluir</button>
     </div>
    </article>)}</div>}
  </section>
 </div>;
}
