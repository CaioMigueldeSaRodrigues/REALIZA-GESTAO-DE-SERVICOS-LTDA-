'use client';
import {useState} from 'react';
type Status='idle'|'loading'|'done'|'error';
export function SiteForm(){
 const [status,setStatus]=useState<Status>('idle'),[message,setMessage]=useState('');
 async function send(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setStatus('loading');setMessage('');
  const form=e.currentTarget;
  const data=Object.fromEntries(new FormData(form).entries());
  const body={...data,quantity_m3:Number(data.quantity_m3)||null};
  try{
   const result=await fetch('/api/orcamento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const reply=await result.json();
   if(!result.ok)throw new Error(reply.error||'Falha ao solicitar orçamento.');
   setStatus('done');setMessage('Recebemos sua solicitação. Nossa equipe fará a análise do atendimento.');form.reset();
  }catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Ocorreu um erro.')}
 }
 return <form className="lead-form" onSubmit={send}>
  <div className="form-grid">
   <label>Seu nome / empresa<input name="name" required minLength={2} maxLength={140} placeholder="Nome ou razão social"/></label>
   <label>Telefone / WhatsApp<input name="phone" required minLength={8} maxLength={30} inputMode="tel" placeholder="(35) 99999-9999"/></label>
   <label>E-mail<input name="email" type="email" maxLength={180} placeholder="contato@empresa.com"/></label>
   <label>Cidade<input name="city" required maxLength={90} placeholder="Pouso Alegre"/></label>
   <label>Volume estimado (m³)<input name="quantity_m3" type="number" min="0.1" max="50000" step="0.1" placeholder="Ex.: 10"/></label>
   <label>Finalidade<select name="water_use" required defaultValue=""><option value="" disabled>Selecione</option><option>Obras e construção</option><option>Uso industrial</option><option>Reservatório / abastecimento</option><option>Outro</option></select></label>
  </div>
  <label>Local e detalhes<textarea name="address" maxLength={350} rows={3} placeholder="Bairro, endereço e quando precisa do atendimento"/></label>
  <input name="website" tabIndex={-1} autoComplete="off" className="honeypot" aria-hidden="true"/>
  <label className="checkline"><input required type="checkbox"/> Concordo com o contato sobre esta solicitação, conforme a política de privacidade.</label>
  <button className="btn primary" type="submit" disabled={status==='loading'}>{status==='loading'?'Enviando...':'Solicitar orçamento'} <span>↗</span></button>
  {message&&<p className={status==='error'?'form-error':'form-success'} role="status">{message}</p>}
 </form>
}
