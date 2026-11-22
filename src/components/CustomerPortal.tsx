'use client';
import {useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {brl,dateTimeBr,numberBr} from '@/lib/format';
import {AddressFields,describeAddress,emptyAddress,validAddress,type Address} from '@/components/AddressFields';
type Row=Record<string,unknown>;
const t=(v:unknown)=>String(v??'');
export function CustomerPortal({name}:{name:string}){
 const db=useMemo(()=>browserDb(),[]);
 const [requests,setRequests]=useState<Row[]>([]),[orders,setOrders]=useState<Row[]>([]);
 const [payments,setPayments]=useState<Row[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [primaryAddress,setPrimaryAddress]=useState<Address|null>(null),[deliveryMode,setDeliveryMode]=useState<'cadastro'|'outro'>('cadastro'),[otherAddress,setOtherAddress]=useState<Address>(emptyAddress);
 const [volume,setVolume]=useState(''),[waterUse,setWaterUse]=useState(''),[notes,setNotes]=useState('');
 async function load(){
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user){setError('Faça login novamente para consultar seu endereço.');return}
  const r=await Promise.all([
   db.from('customer_requests').select('id,city,address,address_origin,quantity_m3,water_use,status,created_at').order('created_at',{ascending:false}).limit(100),
   db.from('orders').select('id,status,address,city,quantity_m3,total,scheduled_at,delivered_at,created_at').order('created_at',{ascending:false}).limit(100),
   db.from('payment_transactions').select('order_id,status,checkout_url').limit(100),
   db.from('clients').select('postal_code,street,street_number,complement,neighborhood,city,state').eq('auth_user_id',user.id).maybeSingle()
  ]);
  const failure=r.find(v=>v.error);if(failure?.error){setError(failure.error.message);return}
  setRequests((r[0].data||[]) as Row[]);setOrders((r[1].data||[]) as Row[]);
  setPayments((r[2].data||[]) as Row[]);
  const dbAddress=(r[3].data||{}) as Record<string,unknown>;
  const candidate:Address={...emptyAddress(),...Object.fromEntries(['postal_code','street','street_number','complement','neighborhood','city','state'].map(key=>[key,String(dbAddress[key]||'')]))};
  if(validAddress(candidate))setPrimaryAddress(candidate);
  else{setPrimaryAddress(null);setDeliveryMode('outro')}
 }
 useEffect(()=>{void load()},[]);
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');
  try{
   const qty=Number(volume);
   if(!Number.isFinite(qty)||qty<=0||qty>50000)throw new Error('Informe um volume válido.');
   if(deliveryMode==='cadastro'&&!primaryAddress)throw new Error('Endereço cadastrado não encontrado. Informe outro endereço de entrega.');
   if(deliveryMode==='outro'&&!validAddress(otherAddress))throw new Error('Preencha o endereço alternativo completo.');
   const {error}=await db.rpc('create_customer_request',{
    p_use_registered_address:deliveryMode==='cadastro',
    p_delivery:deliveryMode==='outro'?otherAddress:{},
    p_quantity_m3:qty,p_water_use:waterUse,p_notes:notes.trim()
   });
   if(error)throw error;
   setVolume('');setWaterUse('');setNotes('');
   if(deliveryMode==='outro')setOtherAddress(emptyAddress());
   await load();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar o pedido.')}
  finally{setBusy(false)}
 }
 return <main className="customer-portal">
  <div className="page-heading"><div><span className="eyebrow">ACESSO CLIENTE</span><h1>Olá, {name}</h1><p>Solicite o fornecimento de água e acompanhe seu atendimento.</p></div><button className="btn soft-button" onClick={()=>void load()}>Atualizar</button></div>
  {error&&<div className="notice error" role="alert">{error}</div>}
  <div className="customer-grid">
   <section className="panel"><h2>Nova solicitação</h2><p>Informe a necessidade. A equipe preparará uma proposta conforme disponibilidade.</p>
    <form onSubmit={create} className="customer-form">
     <div><strong>Endereço da entrega</strong>
      <div className="address-choice">
       <label className={!primaryAddress?'disabled':''}><input type="radio" name="delivery_mode" value="cadastro" checked={deliveryMode==='cadastro'} disabled={!primaryAddress} onChange={()=>setDeliveryMode('cadastro')}/> Usar meu endereço cadastrado</label>
       <label><input type="radio" name="delivery_mode" value="outro" checked={deliveryMode==='outro'} onChange={()=>setDeliveryMode('outro')}/> Solicitar entrega em outro endereço</label>
      </div>
      {deliveryMode==='cadastro'&&primaryAddress?
       <div className="address-display">{describeAddress(primaryAddress)}</div>:
       <AddressFields value={otherAddress} onChange={setOtherAddress} withReference/>}
     </div>
     <label>Volume desejado (m³)<input required type="number" step="0.01" min="0.01" max="50000" value={volume} onChange={e=>setVolume(e.target.value)}/></label>
     <label>Finalidade<select required value={waterUse} onChange={e=>setWaterUse(e.target.value)}><option value="">Selecione</option><option value="Obras e construção">Obras e construção</option><option value="Uso industrial">Uso industrial</option><option value="Abastecimento de reservatório">Abastecimento de reservatório</option><option value="Outro">Outro</option></select></label>
     <label>Observações<textarea value={notes} maxLength={2000} rows={3} onChange={e=>setNotes(e.target.value)}/></label>
     <button className="btn primary" type="submit" disabled={busy}>{busy?'Enviando...':'Enviar solicitação'}</button>
    </form>
   </section>
   <section className="panel"><h2>Minhas solicitações</h2>
    {!requests.length?<p>Nenhuma solicitação cadastrada.</p>:requests.map(r=><div className="customer-entry" key={t(r.id)}>
     <strong>{t(r.city)} · {numberBr(r.quantity_m3 as number)} m³</strong>
     <span className="pill">{t(r.status).replaceAll('_',' ')}</span>
     <small>{t(r.water_use)} · {t(r.address_origin)==='cadastro'?'Endereço cadastrado':'Outro endereço'} · {dateTimeBr(t(r.created_at))}</small>
     <small>Entrega: {t(r.address)}, {t(r.city)}</small>
    </div>)}
   </section>
  </div>
  <section className="panel" style={{marginTop:18}}><h2>Minhas ordens e pagamentos</h2>
   {!orders.length?<p>As ordens aprovadas aparecerão aqui.</p>:orders.map(o=>{
    const payment=payments.find(p=>p.order_id===o.id);
    return <div className="customer-entry" key={t(o.id)}>
     <strong>OS {t(o.id).slice(0,8).toUpperCase()} · {brl(o.total as number)}</strong>
     <span className="pill">{t(o.status)}</span>
     <small>{t(o.city)} · {numberBr(o.quantity_m3 as number)} m³ · pagamento: {t(payment?.status||'a confirmar')} · {o.scheduled_at?'Previsão: '+dateTimeBr(t(o.scheduled_at)):'Aguardando programação'}</small>
     {Boolean(payment?.checkout_url)&&payment?.status!=='aprovado'&&<a href={t(payment?.checkout_url)} className="btn light" target="_blank" rel="noopener noreferrer" style={{alignSelf:'flex-start',marginTop:8}}>Abrir pagamento no provedor ↗</a>}
    </div>
   })}
  </section>
 </main>;
}
