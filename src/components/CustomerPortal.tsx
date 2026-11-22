'use client';
import {useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {brl,dateTimeBr,numberBr} from '@/lib/format';
type Row=Record<string,unknown>;
const t=(v:unknown)=>String(v??'');
export function CustomerPortal({name}:{name:string}){
 const db=useMemo(()=>browserDb(),[]);
 const [requests,setRequests]=useState<Row[]>([]),[orders,setOrders]=useState<Row[]>([]);
 const [payments,setPayments]=useState<Row[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [city,setCity]=useState(''),[address,setAddress]=useState(''),[volume,setVolume]=useState(''),[waterUse,setWaterUse]=useState(''),[notes,setNotes]=useState('');
 async function load(){
  const r=await Promise.all([
   db.from('customer_requests').select('id,city,address,quantity_m3,water_use,status,created_at').order('created_at',{ascending:false}).limit(100),
   db.from('orders').select('id,status,address,city,quantity_m3,total,scheduled_at,delivered_at,created_at').order('created_at',{ascending:false}).limit(100),
   db.from('payment_transactions').select('order_id,status,checkout_url').limit(100)
  ]);
  const failure=r.find(v=>v.error);if(failure?.error){setError(failure.error.message);return}
  setRequests((r[0].data||[]) as Row[]);setOrders((r[1].data||[]) as Row[]);
  setPayments((r[2].data||[]) as Row[]);
 }
 useEffect(()=>{void load()},[]);
 async function create(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError('');
  try{
   const qty=Number(volume);
   if(!Number.isFinite(qty)||qty<=0||qty>50000)throw new Error('Informe um volume válido.');
   const {error}=await db.rpc('create_customer_request',{
    p_city:city.trim(),p_address:address.trim(),p_quantity_m3:qty,p_water_use:waterUse,p_notes:notes.trim()
   });
   if(error)throw error;
   setCity('');setAddress('');setVolume('');setWaterUse('');setNotes('');await load();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar o pedido.')}
  finally{setBusy(false)}
 }
 return <main className="customer-portal">
  <div className="page-heading"><div><span className="eyebrow">ACESSO CLIENTE</span><h1>Olá, {name}</h1><p>Solicite o fornecimento de água e acompanhe seu atendimento.</p></div><button className="btn soft-button" onClick={()=>void load()}>Atualizar</button></div>
  {error&&<div className="notice error" role="alert">{error}</div>}
  <div className="customer-grid">
   <section className="panel"><h2>Nova solicitação</h2><p>Informe a necessidade. A equipe preparará uma proposta conforme disponibilidade.</p>
    <form onSubmit={create} className="customer-form">
     <label>Cidade<input required minLength={2} maxLength={100} value={city} onChange={e=>setCity(e.target.value)}/></label>
     <label>Local de entrega<textarea required minLength={5} maxLength={500} value={address} onChange={e=>setAddress(e.target.value)} rows={3}/></label>
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
     <small>{t(r.water_use)} · {dateTimeBr(t(r.created_at))}</small>
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
     {payment?.checkout_url&&payment.status!=='aprovado'&&<a href={t(payment.checkout_url)} className="btn light" target="_blank" rel="noopener noreferrer" style={{alignSelf:'flex-start',marginTop:8}}>Abrir pagamento no provedor ↗</a>}
    </div>
   })}
  </section>
 </main>;
}
