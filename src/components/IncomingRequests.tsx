'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {brl,dateTimeBr,numberBr} from '@/lib/format';

type RecordRow=Record<string,unknown>;
const value=(v:unknown)=>v==null?'':String(v);
const canQuote=(role:string)=>['admin','gestor','comercial'].includes(role);
const canReview=(role:string)=>['admin','gestor','comercial','operacoes'].includes(role);
const labels:Record<string,string>={
 recebida:'Recebida',em_analise:'Em análise',proposta_enviada:'Proposta enviada',
 pedido_gerado:'Pedido gerado',concluida:'Concluída',cancelada:'Cancelada'
};

export function IncomingRequests({role}:{role:string}){
 const db=useMemo(()=>browserDb(),[]);
 const [requests,setRequests]=useState<RecordRow[]>([]);
 const [clients,setClients]=useState<RecordRow[]>([]);
 const [profiles,setProfiles]=useState<RecordRow[]>([]);
 const [selectedId,setSelectedId]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[info,setInfo]=useState('');
 const [unitPrice,setUnitPrice]=useState(''),[freight,setFreight]=useState('0'),[validUntil,setValidUntil]=useState(''),[note,setNote]=useState('');
 const selected=requests.find(r=>r.id===selectedId)||null;
 const load=useCallback(async()=>{
  setLoading(true);
  const [a,b,c]=await Promise.all([
   db.from('customer_requests').select('id,client_id,lead_id,assigned_to,reviewed_at,city,address,address_origin,quantity_m3,water_use,notes,status,created_at').order('created_at',{ascending:false}).limit(150),
   db.from('clients').select('id,name,phone,email').limit(500),
   db.from('profiles').select('id,name').limit(500)
  ]);
  if(a.error)setError(a.error.message);
  else{const data=(a.data||[]) as RecordRow[];setRequests(data);setSelectedId(old=>old&&data.some(r=>r.id===old)?old:'');}
  if(!b.error)setClients((b.data||[]) as RecordRow[]);
  if(!c.error)setProfiles((c.data||[]) as RecordRow[]);
  setLoading(false);
 },[db]);
 useEffect(()=>{void load()},[load]);
 async function operation(fn:()=>Promise<void>){
  setBusy(true);setError('');setInfo('');
  try{await fn();await load();setInfo('Atualização registrada no fluxo operacional.')}
  catch(e){setError(e instanceof Error?e.message:'Não foi possível concluir a operação')}
  finally{setBusy(false)}
 }
 function clientName(id:unknown){return value(clients.find(c=>c.id===id)?.name)||'Cliente cadastrado'}
 function ownerName(id:unknown){return value(profiles.find(p=>p.id===id)?.name)||'Não atribuído'}
 async function claim(){
  const {error}=await db.rpc('claim_customer_request',{p_request_id:selected?.id});
  if(error)throw error;
 }
 async function quote(){
  if(!selected)return;
  const unit=Number(unitPrice),extra=Number(freight);
  if(!Number.isFinite(unit)||unit<=0||!Number.isFinite(extra)||extra<0||!validUntil)
   throw new Error('Preencha preço unitário, frete e validade corretamente.');
  const {error}=await db.rpc('issue_customer_quote',{
   p_request_id:selected.id,p_unit_price:unit,p_freight_fee:extra,
   p_valid_until:validUntil,p_notes:note.trim()
  });
  if(error)throw error;
 }
 if(!canReview(role))return null;
 const waiting=requests.filter(r=>r.status==='recebida').length;
 const reviewing=requests.filter(r=>r.status==='em_analise').length;
 const sent=requests.filter(r=>r.status==='proposta_enviada').length;
 return <section className="request-section">
  <div className="page-heading"><div><span className="eyebrow">ENTRADA DO PORTAL DO CLIENTE</span><h2>Solicitações para análise</h2><p>Fila sincronizada com pedidos enviados pelos clientes autenticados.</p></div>
   <button className="btn light" disabled={loading||busy} onClick={()=>void load()}>↻ Atualizar fila</button></div>
  <div className="request-summary">
   <span><strong>{waiting}</strong> recebidas</span>
   <span><strong>{reviewing}</strong> em análise</span>
   <span><strong>{sent}</strong> aguardando aceite</span>
  </div>
  {error&&<div role="alert" className="notice error">{error}</div>}
  {info&&<div role="status" className="notice">{info}</div>}
  <div className="request-grid">
   <div className="panel request-list">
    <h3>Fila de solicitações</h3>
    {loading?<p>Carregando solicitações...</p>:!requests.length?<p>Nenhuma solicitação recebida até o momento.</p>:
     requests.map(r=><button type="button" key={value(r.id)} className={'request-list-item '+(selectedId===r.id?'active':'')}
       onClick={()=>{setSelectedId(value(r.id));setError('');setInfo('');setUnitPrice('');setFreight('0');setNote('');setValidUntil('')}}>
      <span className="request-list-top"><strong>{clientName(r.client_id)}</strong><span className="pill">{labels[value(r.status)]||value(r.status)}</span></span>
      <span>{value(r.city)} · {numberBr(r.quantity_m3 as number)} m³</span>
      <small>{dateTimeBr(value(r.created_at))} · {value(r.water_use)}</small>
     </button>)
    }
   </div>
   <div className="panel request-detail">
    {!selected?<div className="empty-small">Selecione uma solicitação da fila para analisar.</div>:<>
     <span className="eyebrow">SOLICITAÇÃO {value(selected.id).slice(0,8).toUpperCase()}</span>
     <h3>{clientName(selected.client_id)}</h3>
     <p className="request-muted">Situação: <strong>{labels[value(selected.status)]||value(selected.status)}</strong> · Responsável: <strong>{ownerName(selected.assigned_to)}</strong></p>
     <div className="request-facts">
      <div><small>Volume solicitado</small><strong>{numberBr(selected.quantity_m3 as number)} m³</strong></div>
      <div><small>Finalidade</small><strong>{value(selected.water_use)}</strong></div>
      <div><small>Tipo de endereço</small><strong>{selected.address_origin==='cadastro'?'Endereço cadastrado':'Endereço alternativo'}</strong></div>
      <div><small>Cidade</small><strong>{value(selected.city)}</strong></div>
     </div>
     <p className="request-muted"><strong>Entrega:</strong> {value(selected.address)}</p>
     {selected.notes&&<p className="request-muted"><strong>Observações:</strong> {value(selected.notes)}</p>}
     {Number(selected.quantity_m3)>50&&<div className="notice">
      <strong>Atenção à capacidade logística.</strong> O pedido solicita {numberBr(selected.quantity_m3 as number)} m³.
      O volume pode exigir múltiplas viagens. Não atribua toda a quantidade a um caminhão sem planejamento de cargas.
     </div>}
     {selected.status==='recebida'&&<div className="request-actions">
      <h3>Etapa 1 · Triagem</h3><p>Ao iniciar a análise, a solicitação permanece vinculada ao cliente e recebe um responsável.</p>
      <button className="btn primary" disabled={busy} onClick={()=>void operation(claim)}>Assumir solicitação</button>
     </div>}
     {selected.status==='em_analise'&&<div className="request-actions">
      <h3>Etapa 2 · Análise e proposta</h3>
      {!canQuote(role)?
       <p>A solicitação está em análise. A equipe comercial ou gestão definirá os valores antes de disponibilizar uma proposta ao cliente.</p>:
       <div className="request-quote-form">
        <label>Preço por m³ (R$)<input required type="number" min="0.01" step="0.01" value={unitPrice} onChange={e=>setUnitPrice(e.target.value)} placeholder="0,00"/></label>
        <label>Frete / custo adicional (R$)<input required type="number" min="0" step="0.01" value={freight} onChange={e=>setFreight(e.target.value)}/></label>
        <label>Validade da proposta<input required type="date" min={new Date().toISOString().slice(0,10)} value={validUntil} onChange={e=>setValidUntil(e.target.value)}/></label>
        <label className="request-wide">Condições comerciais<textarea rows={3} maxLength={3000} value={note} onChange={e=>setNote(e.target.value)} placeholder="Prazo, execução por etapas, condições e observações"/></label>
        {Number(unitPrice)>0&&<div className="request-wide request-total">Valor proposto: <strong>{brl(Number(selected.quantity_m3)*Number(unitPrice)+Number(freight||0))}</strong></div>}
        <button className="btn primary request-wide" disabled={busy||!(Number(unitPrice)>0)||!validUntil}
         onClick={()=>void operation(quote)}>Disponibilizar proposta ao cliente</button>
       </div>}
     </div>}
     {selected.status==='proposta_enviada'&&<div className="notice">A proposta está disponível para o cliente visualizar e aprovar no próprio painel. Nenhuma ordem de serviço é criada antes do aceite.</div>}
     {selected.status==='pedido_gerado'&&<div className="notice">Cliente aprovou a proposta. A ordem de serviço já foi criada e está disponível na central operacional abaixo.</div>}
    </>}
   </div>
  </div>
 </section>;
}
