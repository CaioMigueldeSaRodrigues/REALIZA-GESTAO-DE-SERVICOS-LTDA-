'use client';
import {useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {brl} from '@/lib/format';

type Item={amount:number;date:string;status?:string;category?:string;paid_amount?:number;total?:number};
const n=(x:unknown)=>Number(x)||0;
const key=(d:string)=>String(d||'').slice(0,7);
const direct=new Set(['combustivel','manutencao','pedagio','agua']);
const monthLabel=(k:string)=>new Date(k+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
function monthKeys(count:number){
 const now=new Date();const months:string[]=[];
 for(let i=count-1;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'))}
 return months;
}
export function DRE({role}:{role:string}){
 const db=useMemo(()=>browserDb(),[]);
 const months=monthKeys(12);
 const [period,setPeriod]=useState(months[months.length-1]);
 const [orders,setOrders]=useState<Item[]>([]),[expenses,setExpenses]=useState<Item[]>([]);
 const [receivables,setReceivables]=useState<Item[]>([]),[payables,setPayables]=useState<Item[]>([]);
 const [busy,setBusy]=useState(true),[message,setMessage]=useState(''),[refresh,setRefresh]=useState(0);
 useEffect(()=>{
  let active=true;
  (async()=>{
   setBusy(true);setMessage('');
   const cutoff=months[0]+'-01';
   const [a,b,c,d]=await Promise.all([
    db.from('orders').select('total,delivered_at,status').eq('status','entregue').gte('delivered_at',cutoff).limit(1000),
    db.from('expenses').select('amount,category,incurred_on,created_at').gte('created_at',cutoff).limit(1000),
    db.from('receivables').select('amount,paid_amount,status,due_on').limit(1000),
    db.from('payables').select('amount,paid_amount,status,due_on').limit(1000)
   ]);
   const errors=[a,b,c,d].filter(x=>x.error).map(x=>x.error!.message);
   if(active){
    setMessage(errors.length?'Falha nas consultas: '+errors.join(' · '):[a,b,c,d].some(x=>x.data?.length===1000)?'Limite de 1.000 lançamentos em alguma consulta. Resultados podem estar incompletos.':'');
    setOrders((a.data||[]).map(x=>({amount:n(x.total),date:String(x.delivered_at||'')})));
    setExpenses((b.data||[]).map(x=>({amount:n(x.amount),date:String(x.incurred_on||x.created_at||''),category:String(x.category||'outro')})));
    setReceivables((c.data||[]).map(x=>({amount:n(x.amount),paid_amount:n(x.paid_amount),status:String(x.status||''),date:String(x.due_on||'')})));
    setPayables((d.data||[]).map(x=>({amount:n(x.amount),paid_amount:n(x.paid_amount),status:String(x.status||''),date:String(x.due_on||'')})));
    setBusy(false);
   }
  })();
  return()=>{active=false};
 // Month keys are derived from render date and don't require a request on each render.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[db,refresh]);
 const compute=(month:string)=>{
  const m=orders.filter(o=>key(o.date)===month).reduce((sum,o)=>sum+o.amount,0);
  const costs=expenses.filter(x=>key(x.date)===month&&direct.has(x.category||'')).reduce((sum,x)=>sum+x.amount,0);
  const opex=expenses.filter(x=>key(x.date)===month&&!direct.has(x.category||'')).reduce((sum,x)=>sum+x.amount,0);
  return {revenue:m,costs,opex,margin:m-costs,result:m-costs-opex};
 };
 const selected=compute(period);
 const history=months.slice(-6).map(m=>({month:m,...compute(m)}));
 const pending=(rows:Item[])=>rows.filter(x=>x.status!=='cancelado').reduce((s,x)=>s+Math.max(0,x.amount-n(x.paid_amount)),0);
 const cashToCollect=pending(receivables),cashToPay=pending(payables);
 const lines=[
  {label:'(+) Receita bruta de serviços entregues',value:selected.revenue,level:'strong'},
  {label:'(–) Custos diretos lançados',value:-selected.costs,level:''},
  {label:'(=) Margem bruta gerencial',value:selected.margin,level:'strong'},
  {label:'(–) Despesas operacionais lançadas',value:-selected.opex,level:''},
  {label:'(=) Resultado operacional preliminar',value:selected.result,level:'strong'},
 ];
 return <section>
  <div className="page-heading"><div><span className="eyebrow">FINANCEIRO · INDICADORES</span><h1>DRE gerencial</h1>
   <p>Demonstrativo preliminar por competência operacional: ordens entregues e custos/despesas lançados.</p></div>
   <div className="dashboard-filters"><select aria-label="Competência do DRE" value={period} onChange={e=>setPeriod(e.target.value)}>
    {months.slice().reverse().map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}
   </select><button className="btn light" disabled={busy} onClick={()=>setRefresh(x=>x+1)}>↻ Atualizar</button></div>
  </div>
  <div className="dashboard-banner">DRE **gerencial e não contábil**. Não foram parametrizados impostos, depreciação, provisões ou regras completas de competência. Não utilizar como lucro líquido oficial.</div>
  {message&&<p className="notice error" role="alert">{message}</p>}
  {busy?<div className="table-placeholder"><div className="spinner"/> Consultando demonstrativo...</div>:<>
   <div className="dashboard-kpis">
    <article className="kpi"><span>Receita de entregas no mês</span><strong>{brl(selected.revenue)}</strong><small>OS com entrega confirmada</small></article>
    <article className="kpi"><span>Custos diretos</span><strong>{brl(selected.costs)}</strong><small>Água, combustível, pedágio e manutenção</small></article>
    <article className="kpi"><span>Despesas operacionais</span><strong>{brl(selected.opex)}</strong><small>Demais lançamentos do módulo Custos operacionais</small></article>
    <article className="kpi"><span>Resultado preliminar</span><strong>{brl(selected.result)}</strong><small>Antes de tributos, provisões e ajustes</small></article>
   </div>
   <div className="dashboard-two">
    <section className="panel"><span className="eyebrow">DEMONSTRATIVO</span><h2>{monthLabel(period)}</h2>
     <div className="dashboard-status-list">
      {lines.map((item,i)=><div className="dashboard-status-item" key={i}><span>{item.label}</span><strong>{brl(item.value)}</strong></div>)}
     </div>
     <p className="dashboard-hint">A receita não utiliza propostas, OS pendentes ou cobranças apenas emitidas. Pagamentos do gateway e recebíveis não são somados novamente.</p>
    </section>
    <section className="panel"><span className="eyebrow">CAPITAL DE GIRO</span><h2>Compromissos registrados</h2>
     <div className="dashboard-status-list">
      <div className="dashboard-status-item"><span>Contas a receber em aberto</span><strong>{brl(cashToCollect)}</strong></div>
      <div className="dashboard-status-item"><span>Contas a pagar em aberto</span><strong>{brl(cashToPay)}</strong></div>
      <div className="dashboard-status-item"><span>Saldo líquido de compromissos</span><strong>{brl(cashToCollect-cashToPay)}</strong></div>
     </div>
     <p className="dashboard-hint">Posição total dos títulos cadastrados; não compõe a DRE e não equivale a saldo bancário.</p>
    </section>
   </div>
   <section className="panel">
    <div className="dashboard-panel-head"><div><span className="eyebrow">COMPARATIVO</span><h2>Últimas seis competências</h2></div></div>
    <div className="table-scroll"><table><thead><tr><th>Competência</th><th>Receita entregue</th><th>Custos diretos</th><th>Despesas</th><th>Resultado preliminar</th></tr></thead>
     <tbody>{history.map(h=><tr key={h.month}><td>{monthLabel(h.month)}</td><td>{brl(h.revenue)}</td><td>{brl(h.costs)}</td><td>{brl(h.opex)}</td><td><strong>{brl(h.result)}</strong></td></tr>)}</tbody></table></div>
   </section>
   <p className="dashboard-hint">Acesso: {role}. Para DRE contábil oficial, o responsável financeiro deverá confirmar classificações, reconhecimento de receita, tributos e integração com a contabilidade.</p>
  </>}
 </section>;
}
