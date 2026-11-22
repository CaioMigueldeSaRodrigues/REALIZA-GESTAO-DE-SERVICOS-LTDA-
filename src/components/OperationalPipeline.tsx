'use client';
import {useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {brl,dateTimeBr} from '@/lib/format';
type Row=Record<string,unknown>;
const s=(x:unknown)=>String(x??'');
export function OperationalPipeline({role}:{role:string}){
 const db=useMemo(()=>browserDb(),[]);
 const [orders,setOrders]=useState<Row[]>([]),[pay,setPay]=useState<Row[]>([]),[fiscal,setFiscal]=useState<Row[]>([]);
 const [refs,setRefs]=useState<Record<string,Row[]>>({}),[chosen,setChosen]=useState<Row|null>(null);
 const [message,setMessage]=useState(''),[loading,setLoading]=useState(false);
 const [vehicle,setVehicle]=useState(''),[driver,setDriver]=useState(''),[source,setSource]=useState(''),[date,setDate]=useState('');
 const [fType,setFType]=useState('nfe'),[fKey,setFKey]=useState(''),[protocol,setProtocol]=useState(''),[note,setNote]=useState('');
 const [volume,setVolume]=useState(''),[proof,setProof]=useState<File|null>(null);
 async function load(){
  const names=['orders','payment_transactions','fiscal_documents','profiles','vehicles','water_sources','clients'];
  const queries=await Promise.all(names.map(n=>db.from(n).select('*').limit(200)));
  const errors=queries.filter(x=>x.error).map(x=>x.error?.message);
  if(errors.length)setMessage(errors.join('; '));
  setOrders((queries[0].data||[]) as Row[]);
  setPay((queries[1].data||[]) as Row[]);setFiscal((queries[2].data||[]) as Row[]);
  setRefs(Object.fromEntries(names.slice(3).map((n,i)=>[n,(queries[i+3].data||[]) as Row[]])));
 }
 useEffect(()=>{void load()},[]);
 const canFinance=['admin','gestor','financeiro'].includes(role);
 const canOps=['admin','gestor','operacoes'].includes(role);
 const canDriver=role==='motorista';
 const get=(table:string,id:unknown,label='name')=>s(refs[table]?.find(r=>r.id===id)?.[label]||s(id).slice(0,8));
 const selectedPayment=pay.find(x=>x.order_id===chosen?.id);
 const selectedFiscal=fiscal.find(x=>x.order_id===chosen?.id);
 function choose(o:Row){setChosen(o);setVehicle(s(o.vehicle_id));setDriver(s(o.driver_profile_id));setSource(s(o.water_source_id));setVolume(s(o.quantity_m3));setDate(o.scheduled_at?s(o.scheduled_at).slice(0,16):'');setMessage('')}
 async function run(fn:()=>Promise<void>){
  setLoading(true);setMessage('');
  try{await fn();await load();setMessage('Operação registrada. Atualize a seleção para consultar os dados mais recentes.')}
  catch(e){setMessage(e instanceof Error?e.message:'Operação falhou')}
  finally{setLoading(false)}
 }
 async function call(name:string,args:Record<string,unknown>){
  const {error}=await db.rpc(name,args);
  if(error)throw error;
 }
 async function startPayment(){
  const r=await fetch('/api/operacional/pagamentos/iniciar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:chosen?.id})});
  const data=await r.json();if(!r.ok)throw new Error(data.error||'Gateway indisponível');
  if(data.checkoutUrl)window.open(data.checkoutUrl,'_blank','noopener,noreferrer');
 }
 async function deliver(){
  if(!chosen)return;
  let path:null|string=null;
  if(proof){
   if(proof.size>5242880||!['image/jpeg','image/png','image/webp'].includes(proof.type))throw new Error('Foto deve ser JPG, PNG ou WEBP até 5 MB');
   const {data:{user}}=await db.auth.getUser();if(!user)throw new Error('Sessão expirada');
   path=user.id+'/'+chosen.id+'/'+crypto.randomUUID()+'.'+proof.name.split('.').pop();
   const {error}=await db.storage.from('delivery-proofs').upload(path,proof,{upsert:false});if(error)throw error;
  }
  await call('confirm_delivery',{p_order_id:chosen.id,p_delivered_m3:Number(volume),p_note:note,p_proof_path:path});
 }
 const section=(title:string,children:React.ReactNode)=><article className="ops-stage"><h3>{title}</h3>{children}</article>;
 return <div>
  <div className="page-heading"><div><span className="eyebrow">OPERAÇÃO INTEGRADA</span><h1>Central de operações</h1><p>Pedidos, cobrança, conferência fiscal, frota e entrega em uma só tela.</p></div><button className="btn light" onClick={()=>void load()}>Atualizar</button></div>
  {message&&<p role="status" className="notice">{message}</p>}
  <div className="ops-grid">
   <div className="panel">
    <h2>Ordens de serviço</h2>
    {orders.length===0?<p>Não há ordens cadastradas. Converta uma proposta aprovada para iniciar.</p>:orders.map(o=>
     <button key={s(o.id)} className={'ops-item '+(chosen?.id===o.id?'active':'')} onClick={()=>choose(o)}>
      <strong>OS {s(o.id).slice(0,8)}</strong><span>{get('clients',o.client_id)} • {s(o.city)}</span>
      <small>{s(o.status)} · {brl(o.total as number)}</small>
     </button>)}
   </div>
   <div className="panel">
    {!chosen?<div className="empty-small">Selecione uma ordem de serviço.</div>:<>
     <span className="eyebrow">ORDEM {s(chosen.id).slice(0,8)}</span>
     <h2>{get('clients',chosen.client_id)}</h2>
     <p>{s(chosen.address)} · {s(chosen.quantity_m3)} m³ · {brl(chosen.total as number)}</p>
     {section('1 · Pagamento ou crédito aprovado',<>
      <p>Status do provedor: <strong>{s(selectedPayment?.status||'não iniciado')}</strong>. O retorno da página de pagamento não representa quitação.</p>
      {chosen.status==='pendente'&&<>
       {['admin','gestor','comercial','financeiro'].includes(role)&&<button className="btn primary" disabled={loading} onClick={()=>void run(startPayment)}>Gerar cobrança</button>}
       {canFinance&&<button className="btn light" disabled={loading} onClick={()=>void run(()=>call('approve_postpaid',{p_order_id:chosen.id}))}>Aprovar faturamento a prazo</button>}
      </>}
     </>)}
     {section('2 · Conferência fiscal',<>
      <p>Situação: <strong>{s(selectedFiscal?.status||'pendente')}</strong>. Conferência manual nos órgãos competentes: NF-e estadual na SEF/MG; NFS-e municipal ou nacional conforme regime. O lançamento não realiza validação automática.</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}}>
       <a className="tiny-btn" href="https://portalnfe.fazenda.mg.gov.br/portalnfe/" target="_blank" rel="noopener noreferrer">SEF/MG — consultar NF-e ↗</a>
       <a className="tiny-btn" href="https://pousoalegre.atende.net/autoatendimento/servicos/consulta-de-autenticidade-de-nota-fiscal-eletronica-nfse/detalhar/1" target="_blank" rel="noopener noreferrer">Pouso Alegre — consultar NFS-e ↗</a>
       <a className="tiny-btn" href="https://www.nfse.gov.br/EmissorNacional" target="_blank" rel="noopener noreferrer">Emissor Nacional NFS-e ↗</a>
      </div>
      {chosen.status==='pendente'&&canFinance&&<div className="ops-form">
       <label>Documento<select value={fType} onChange={e=>setFType(e.target.value)}><option value="nfe">NF-e</option><option value="nfse">NFS-e</option><option value="cte">CT-e</option><option value="dispensa">Dispensa justificada</option></select></label>
       {fType!=='dispensa'&&<>
        <label>Chave ou identificação<input value={fKey} onChange={e=>setFKey(e.target.value)}/></label>
        <label>Protocolo ou código de verificação<input value={protocol} onChange={e=>setProtocol(e.target.value)}/></label>
       </>}
       <label>Observação / justificativa<textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}/></label>
       <button className="btn primary" disabled={loading} onClick={()=>void run(()=>call('register_fiscal_check',{p_order_id:chosen.id,p_document_type:fType,p_access_key:fKey||null,p_protocol:protocol||null,p_note:note||null}))}>Registrar conferência</button>
      </div>}
     </>)}
     {section('3 · Enviar para frota',<>
      <p>O banco bloqueará despacho sem pagamento confirmado ou crédito aprovado e conferência fiscal.</p>
      {chosen.status==='pendente'&&canOps&&<div className="ops-form">
       <label>Caminhão<select value={vehicle} onChange={e=>setVehicle(e.target.value)}><option value="">Selecionar</option>{(refs.vehicles||[]).filter(v=>v.status==='disponivel').map(v=><option key={s(v.id)} value={s(v.id)}>{s(v.label)} – {s(v.plate)}</option>)}</select></label>
       <label>Motorista<select value={driver} onChange={e=>setDriver(e.target.value)}><option value="">Selecionar</option>{(refs.profiles||[]).filter(v=>v.role==='motorista'&&v.active===true).map(v=><option key={s(v.id)} value={s(v.id)}>{s(v.name)}</option>)}</select></label>
       <label>Origem da água<select value={source} onChange={e=>setSource(e.target.value)}><option value="">Selecionar</option>{(refs.water_sources||[]).filter(v=>v.status==='aprovada').map(v=><option key={s(v.id)} value={s(v.id)}>{s(v.name)}</option>)}</select></label>
       <label>Programação<input type="datetime-local" value={date} onChange={e=>setDate(e.target.value)}/></label>
       <button className="btn primary" disabled={loading||!vehicle||!driver||!source||!date} onClick={()=>void run(()=>call('dispatch_order',{p_order_id:chosen.id,p_vehicle_id:vehicle,p_driver_id:driver,p_source_id:source,p_scheduled_at:new Date(date).toISOString()}))}>Despachar para frota</button>
      </div>}
      {chosen.status==='programada'&&<><p>Programada: {dateTimeBr(s(chosen.scheduled_at))}</p>
       {(canOps||canDriver)&&<button className="btn primary" disabled={loading} onClick={()=>void run(()=>call('start_route',{p_order_id:chosen.id}))}>Iniciar rota</button>}</>}
     </>)}
     {section('4 · Confirmar entrega',<>
      {chosen.status==='em_rota'&&(canDriver||canOps)?<div className="ops-form">
       <label>Volume entregue (m³)<input type="number" min="0.01" max={Number(chosen.quantity_m3)} step=".01" value={volume} onChange={e=>setVolume(e.target.value)}/></label>
       <label>Nome de quem recebeu e observações<textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}/></label>
       <label>Comprovante (foto, opcional)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setProof(e.target.files?.[0]||null)}/></label>
       <button className="btn primary" disabled={loading||!Number.isFinite(Number(volume))||Number(volume)<=0} onClick={()=>void run(deliver)}>Registrar entrega</button>
      </div>:<p>{chosen.status==='entregue'?'Entrega registrada.':'Disponível após início de rota.'}</p>}
     </>)}
    </>}
   </div>
  </div>
 </div>;
}
