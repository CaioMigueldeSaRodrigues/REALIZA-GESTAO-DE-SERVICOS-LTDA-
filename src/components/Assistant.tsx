'use client';
import {useState} from 'react';
type Source={
 id:string;source_id:string;title:string;page_number:number|null;chunk_index:number;
 excerpt:string;category:string;review_due_on:string|null;expires_on:string|null;
 issued_on:string|null;similarity:number|null
};
type Message={role:'user'|'assistant';text:string;sources?:Source[];outdated?:number;mode?:string};
export function Assistant(){
 const [messages,setMessages]=useState<Message[]>([{role:'assistant',text:
  'Olá. Pergunte sobre os procedimentos, documentos e contratos importados na Biblioteca RAG. Minhas respostas usam somente fontes autorizadas e vigentes.'}]);
 const [prompt,setPrompt]=useState(''),[sending,setSending]=useState(false);
 async function send(e:React.FormEvent){
  e.preventDefault();const question=prompt.trim();if(!question||sending)return;
  setMessages(m=>[...m,{role:'user',text:question}]);setPrompt('');setSending(true);
  try{
   const res=await fetch('/api/ia',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({question})});
   const value=await res.json() as {answer?:string;error?:string;sources?:Source[];excludedOutdated?:number;mode?:string};
   if(!res.ok)throw Error(value.error||'Consulta indisponível');
   setMessages(m=>[...m,{role:'assistant',text:value.answer||'Sem resposta',
    sources:value.sources||[],outdated:value.excludedOutdated,mode:value.mode}]);
  }catch(e){setMessages(m=>[...m,{role:'assistant',text:e instanceof Error?e.message:'Falha ao consultar.'}])}
  finally{setSending(false)}
 }
 return <div>
  <div className="page-heading"><div><span className="eyebrow">INTELIGÊNCIA CONTEXTUAL</span>
   <h1>Assistente REALIZA <span className="sparkle">✦</span></h1>
   <p>Respostas com base nos trechos da Biblioteca RAG. Sem ações de escrita.</p>
  </div></div>
  <div className="chat-panel"><div className="chat-head"><div className="agent-avatar">✦</div><div>
   <strong>REALIZA Intelligence</strong><small>Fontes recuperadas e citações verificáveis</small></div>
   <span className="pill">Leitura segura</span></div>
   <div className="chat-messages" aria-live="polite">{messages.map((m,i)=>
    <div className={'chat-message '+m.role} key={i}><div className="chat-bubble">
     <p style={{whiteSpace:'pre-wrap'}}>{m.text}</p>
     {m.outdated? <p className="rag-warning">{m.outdated} documento(s) com revisão ou validade ultrapassada foram excluídos desta consulta.</p>:null}
     {m.sources?.length?<div className="sources"><strong>Fontes recuperadas:</strong>
      {m.sources.map((source,n)=><details key={source.id} className="rag-citation">
       <summary>[{n+1}] {source.title} · {source.page_number?'pág. '+source.page_number:'trecho '+(source.chunk_index+1)}</summary>
       <blockquote>{source.excerpt}</blockquote>
       <a target="_blank" rel="noopener noreferrer"
        href={'/api/conhecimento/arquivo?id='+encodeURIComponent(source.source_id)}>Conferir documento original</a>
      </details>)}</div>:null}
    </div></div>)}
    {sending&&<div className="typing">Consultando os documentos e verificando as fontes…</div>}
   </div>
   <form className="chat-compose" onSubmit={send}>
    <input maxLength={1500} value={prompt} onChange={e=>setPrompt(e.target.value)}
     placeholder="Ex.: Qual é o procedimento de entrega de água?" aria-label="Sua pergunta"/>
    <button className="btn primary" disabled={sending||!prompt.trim()} type="submit">Enviar ↗</button>
   </form>
  </div>
  <p className="route-disclaimer">A IA pode cometer erros. Confirme as citações nos arquivos originais. Fontes sem data são tratadas com cautela; documentos vencidos não são utilizados.</p>
 </div>;
}
