'use client';
import {useState} from 'react';
type Message={role:'user'|'assistant';text:string;sources?:{title:string;id:string}[]};
export function Assistant(){
 const [messages,setMessages]=useState<Message[]>([{role:'assistant',text:'Olá. Consulte procedimentos, documentos internos e indicadores. Minhas respostas consideram somente dados aos quais seu perfil tem acesso.'}]);
 const [prompt,setPrompt]=useState(''),[sending,setSending]=useState(false);
 async function send(e:React.FormEvent){
  e.preventDefault();const text=prompt.trim();if(!text||sending)return;
  setMessages(m=>[...m,{role:'user',text}]);setPrompt('');setSending(true);
  try{
   const r=await fetch('/api/ia',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:text})});
   const payload=await r.json();if(!r.ok)throw new Error(payload.error||'Falha ao consultar o agente.');
   setMessages(m=>[...m,{role:'assistant',text:payload.answer,sources:payload.sources}]);
  }catch(e){setMessages(m=>[...m,{role:'assistant',text:e instanceof Error?e.message:'Falha de conexão'}])}
  finally{setSending(false)}
 }
 return <div><div className="page-heading"><div><span className="eyebrow">INTELIGÊNCIA CONTEXTUAL</span><h1>Assistente REALIZA <span className="sparkle">✦</span></h1><p>Agente de consulta com recuperação de conhecimento (RAG), sem acesso de escrita.</p></div></div>
 <div className="chat-panel"><div className="chat-head"><div className="agent-avatar">✦</div><div><strong>REALIZA Intelligence</strong><small>Respostas com base nos documentos autorizados</small></div><span className="pill">Leitura segura</span></div>
  <div className="chat-messages" aria-live="polite">{messages.map((m,i)=><div className={'chat-message '+m.role} key={i}><div className="chat-bubble">{m.text}{m.sources?.length? <div className="sources"><strong>Fontes recuperadas:</strong>{m.sources.map((s,j)=><span key={s.id}>[{j+1}] {s.title}</span>)}</div>:null}</div></div>)}{sending&&<div className="typing">Buscando documentos e indicadores...</div>}</div>
  <form onSubmit={send} className="chat-compose"><input maxLength={1500} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Ex.: Quais são os POPs para entrega de água?" aria-label="Sua pergunta"/><button className="btn primary" type="submit" disabled={sending||!prompt.trim()}>Enviar ↗</button></form>
 </div><p className="route-disclaimer">A IA pode cometer erros. Não emite laudos, não aprova água potável, não realiza pagamentos nem altera registros. Decisões e orientações de segurança exigem conferência humana.</p></div>
}
