'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {brl,dateBr,numberBr} from '@/lib/format';
import {CityHeatMap,type HeatCity} from '@/components/CityHeatMap';

type CityDay={day:string;city:string;state:string;demands:number;demand_m3:number;open_demands:number;proposals:number;quoted_value:number;orders:number;orders_value:number;ordered_m3:number;delivered_m3:number};
type PayDay={day:string;confirmed_transactions:number;confirmed_amount:number;unconfirmed_transactions:number};
type Row={id?:string;status?:string;created_at?:string;source?:string;capacity_m3?:number};
type Span='7'|'30'|'90'|'365';
const num=(v:unknown)=>Number(v)||0;
const dateOf=(iso:string)=>iso?.slice(0,10)||'';
const monthKey=(iso:string)=>iso.slice(0,7);
const normalize=(x:string)=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
const periodOptions:Record<Span,string>={'7':'7 dias','30':'30 dias','90':'90 dias','365':'12 meses'};
const statuses:Record<string,string>={
 recebida:'Recebida',em_analise:'Em análise',proposta_enviada:'Proposta enviada',
 pedido_gerado:'Pedido gerado',concluida:'Concluída',cancelada:'Cancelada',
 pendente:'Pendente',programada:'Programada',em_rota:'Em rota',
 entregue:'Entregue',aprovada:'Aprovada',novo:'Novo',contato:'Em contato',
 qualificado:'Qualificado',proposta:'Em proposta',convertido:'Convertido',perdido:'Perdido'
};
function startOfSpan(span:Span){
 const d=new Date();
 d.setHours(0,0,0,0);d.setDate(d.getDate()-Number(span)+1);
 return d.toISOString().slice(0,10);
}
function statusName(v:string){return statuses[v]||v.replaceAll('_',' ')}
function toCityRows(rows:CityDay[]){
 const byCity=new Map<string,HeatCity>();
 for(const r of rows){
  const city=r.city?.trim()||'Não informado';
  const code=normalize(city)+'|'+normalize(r.state||'');
  const prev=byCity.get(code)||{city,state:r.state||'',demands:0,volume:0,orders:0,value:0};
  prev.demands+=num(r.demands);
  prev.volume+=num(r.demand_m3);
  prev.orders+=num(r.orders);
  prev.value+=num(r.orders_value);
  if(!prev.state&&r.state)prev.state=r.state;
  byCity.set(code,prev);
 }
 return [...byCity.values()].filter(c=>c.demands>0||c.orders>0).sort((a,b)=>b.demands-a.demands);
}
function getMonths(rows:CityDay[],months=6){
 const now=new Date();const series:{name:string;demands:number;orders:number;forecast:number;volume:number}[]=[];
 for(let offset=months-1;offset>=0;offset--){
  const m=new Date(now.getFullYear(),now.getMonth()-offset,1);
  const key=m.toISOString().slice(0,7);
  const group=rows.filter(r=>monthKey(r.day)===key);
  series.push({name:key,demands:group.reduce((s,r)=>s+num(r.demands),0),
   orders:group.reduce((s,r)=>s+num(r.orders),0),
   forecast:group.reduce((s,r)=>s+num(r.orders_value),0),
   volume:group.reduce((s,r)=>s+num(r.demand_m3),0)});
 }
 return series;
}
function sum<T>(rows:T[],key:keyof T){return rows.reduce((acc,v)=>acc+num(v[key]),0)}
function Info({children}:{children:React.ReactNode}){return <p className="dashboard-hint">{children}</p>}
function PanelTitle({eyebrow,title,subtitle}:{eyebrow:string;title:string;subtitle?:string}){
 return <div className="dashboard-panel-head"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{subtitle&&<small>{subtitle}</small>}</div></div>;
}
export function Overview({role}:{role:string}){
 const db=useMemo(()=>browserDb(),[]);
 const [span,setSpan]=useState<Span>('30');
 const [tick,setTick]=useState(0);
 const [cityRows,setCityRows]=useState<CityDay[]>([]);
 const [payments,setPayments]=useState<PayDay[]>([]);
 const [requests,setRequests]=useState<Row[]>([]);
 const [orders,setOrders]=useState<Row[]>([]);
 const [leads,setLeads]=useState<Row[]>([]);
 const [fleet,setFleet]=useState<Row[]>([]);
 const [clientCount,setClientCount]=useState(0);
 const [warnings,setWarnings]=useState<string[]>([]);
 const [busy,setBusy]=useState(true);
 const [metric,setMetric]=useState<'demands'|'volume'>('demands');
 const [cityFocus,setCityFocus]=useState('');
 const load=useCallback(async()=>{
  setBusy(true);
  const from=startOfSpan(span);
  // RLS é aplicada pelo Supabase em cada tabela e nas views security_invoker.
  // Nunca usamos a secret key no navegador.
  const results=await Promise.allSettled([
   db.from('bi_commercial_city_daily').select('*').gte('day',from).order('day',{ascending:false}).limit(1000),
   db.from('bi_payments_daily').select('*').gte('day',from).order('day',{ascending:false}).limit(1000),
   db.from('customer_requests').select('id,status,created_at').gte('created_at',from+'T00:00:00').limit(1000),
   db.from('orders').select('id,status,created_at').gte('created_at',from+'T00:00:00').limit(1000),
   db.from('leads').select('id,source,status,created_at').gte('created_at',from+'T00:00:00').limit(1000),
   db.from('vehicles').select('id,status,capacity_m3').limit(1000),
   db.from('clients').select('id',{head:true,count:'exact'})
  ]);
  const names=['BI geográfico','Pagamentos','Solicitações','Ordens','Canais comerciais','Frota','Clientes'];
  const problems:string[]=[];
  const data=results.map((r,i)=>{
   if(r.status==='rejected'){problems.push(names[i]+': falha de conexão');return null}
   if(r.value.error){problems.push(names[i]+': '+r.value.error.message);return null}
   const value=r.value;
   if(Array.isArray(value.data)&&value.data.length===1000)problems.push(names[i]+': 1.000 registros atingidos; refine o período para evitar totais incompletos.');
   return value;
  });
  setCityRows((data[0]?.data||[]) as CityDay[]);
  setPayments((data[1]?.data||[]) as PayDay[]);
  setRequests((data[2]?.data||[]) as Row[]);
  setOrders((data[3]?.data||[]) as Row[]);
  setLeads((data[4]?.data||[]) as Row[]);
  setFleet((data[5]?.data||[]) as Row[]);
  setClientCount(data[6]?.count||0);
  setWarnings(problems);
  setBusy(false);
 },[db,span]);
 useEffect(()=>{void load()},[load,tick]);
 // Dados do restante do Brasil permanecem nos indicadores gerais.
 // O recorte geográfico é exclusivamente MG, até definição formal do raio de atendimento.
 const cities=toCityRows(cityRows).filter(c=>['mg','minas gerais'].includes(normalize(c.state)));
 const demands=sum(cityRows,'demands');
 const demandVolume=sum(cityRows,'demand_m3');
 const proposals=sum(cityRows,'proposals');
 const proposedValue=sum(cityRows,'quoted_value');
 const osCount=sum(cityRows,'orders');
 const forecast=sum(cityRows,'orders_value');
 const delivered=sum(cityRows,'delivered_m3');
 const paid=sum(payments,'confirmed_amount');
 const pendingRequests=requests.filter(r=>['recebida','em_analise'].includes(r.status||'')).length;
 const pendingQuotes=requests.filter(r=>r.status==='proposta_enviada').length;
 const inFlight=orders.filter(o=>['pendente','programada','em_rota'].includes(o.status||'')).length;
 const fleetAvail=fleet.filter(v=>v.status==='disponivel').length;
 const fleetCapacity=fleet.filter(v=>v.status==='disponivel').reduce((s,v)=>s+num(v.capacity_m3),0);
 const monthly=getMonths(cityRows,6);
 const maxMonth=Math.max(1,...monthly.map(m=>Math.max(m.demands,m.orders)));
 const funnel=[{label:'Demandas recebidas',value:demands},{label:'Propostas emitidas',value:proposals},{label:'OS registradas',value:osCount}];
 const maxFunnel=Math.max(1,...funnel.map(f=>f.value));
 const sourceCounts=Object.entries(leads.reduce<Record<string,number>>((acc,l)=>{
   const k=l.source||'outro';acc[k]=(acc[k]||0)+1;return acc;
 },{})).sort((a,b)=>b[1]-a[1]);
 const requestStatus=Object.entries(requests.reduce<Record<string,number>>((acc,r)=>{
  const k=r.status||'indefinido';acc[k]=(acc[k]||0)+1;return acc;
 },{})).sort((a,b)=>b[1]-a[1]);
 const mainCities=cities.slice(0,8);
 const focusedCity=cities.find(c=>normalize(c.city)===normalize(cityFocus));
 return <div>
  <div className="page-heading"><div><span className="eyebrow">BUSINESS INTELLIGENCE · REALIZA</span><h1>Visão geral</h1>
   <p>Indicadores comerciais, financeiros e operacionais extraídos do Supabase.</p></div>
   <div className="dashboard-filters">
    <select aria-label="Período do dashboard" value={span} onChange={e=>setSpan(e.target.value as Span)}>
     {(Object.keys(periodOptions) as Span[]).map(v=><option key={v} value={v}>{periodOptions[v]}</option>)}
    </select>
    <button className="btn light" type="button" disabled={busy} onClick={()=>setTick(x=>x+1)}>↻ Atualizar</button>
   </div>
  </div>
  <div className="dashboard-banner">Dados reais · indicadores gerais sem restrição de UF · mapa comercial somente MG · período: últimos {periodOptions[span]} · atualizado em {dateBr(new Date().toISOString())} · perfil {role}.
   Os valores de propostas e OS não representam dinheiro recebido.</div>
  {warnings.length>0&&<div className="notice error" role="alert">Falhas ou limites na consulta: {warnings.join(' · ')}. Indicadores afetados podem estar incompletos.</div>}
  {busy?<div className="table-placeholder"><div className="spinner"/> Consultando indicadores...</div>:<>
   <section className="dashboard-kpis" aria-label="Indicadores principais">
    <article className="kpi"><span>Demandas comerciais</span><strong>{numberBr(demands)}</strong><small>Solicitações + leads avulsos, sem duplicar leads do portal</small></article>
    <article className="kpi"><span>Volume solicitado</span><strong>{numberBr(demandVolume)} m³</strong><small>Demanda comercial, não volume entregue</small></article>
    <article className="kpi"><span>Valor de OS registradas</span><strong>{brl(forecast)}</strong><small>Faturamento potencial, não recebido</small></article>
    <article className="kpi"><span>Pagamentos confirmados</span><strong>{brl(paid)}</strong><small>Confirmação pelo provedor; sujeito a conciliação</small></article>
    <article className="kpi"><span>Propostas apresentadas</span><strong>{numberBr(proposals)}</strong><small>{brl(proposedValue)} em propostas no período</small></article>
    <article className="kpi"><span>Ordens de serviço</span><strong>{numberBr(osCount)}</strong><small>{numberBr(inFlight)} aguardando conclusão (OS criadas no período)</small></article>
    <article className="kpi"><span>Clientes cadastrados</span><strong>{numberBr(clientCount)}</strong><small>Base total registrada, independente do período</small></article>
    <article className="kpi"><span>Frota disponível</span><strong>{fleetAvail}/{fleet.length}</strong><small>{numberBr(fleetCapacity)} m³ de capacidade simultânea conhecida</small></article>
   </section>
   <div className="dashboard-two">
    <section className="panel">
     <PanelTitle eyebrow="INTELIGÊNCIA COMERCIAL" title="Evolução de demanda e vendas" subtitle="Eventos por mês · últimos seis meses"/>
     <div className="dashboard-legend"><span>Demandas</span><span>Ordens</span></div>
     <div className="dashboard-chart" role="img" aria-label="Barras mensais: demandas e ordens de serviço">
      {monthly.map(m=><div className="dashboard-chart-item" key={m.name} title={m.name+': '+m.demands+' demandas; '+m.orders+' OS'}>
       <div className="dashboard-chart-bars"><div className="dashboard-chart-bar" style={{height:(m.demands/maxMonth*100)+'%'}}/><div className="dashboard-chart-bar alt" style={{height:(m.orders/maxMonth*100)+'%'}}/></div>
       <span className="dashboard-chart-label">{m.name.slice(5)}/{m.name.slice(2,4)}</span>
      </div>)}
     </div>
     <Info>As barras representam quantidades de registros, não valores monetários.</Info>
    </section>
    <section className="panel">
     <PanelTitle eyebrow="FUNIL DE VENDAS" title="Movimentação comercial" subtitle="Eventos registrados no período"/>
     <div className="dashboard-funnel">
      {funnel.map(x=><div key={x.label}><div className="dashboard-funnel-row"><span>{x.label}</span><strong>{numberBr(x.value)}</strong></div>
       <div className="dashboard-funnel-track"><div style={{width:(x.value/maxFunnel*100)+'%'}}/></div>
      </div>)}
     </div>
     <Info>Etapas contabilizadas por data de cada evento. Não representa conversão de uma mesma coorte.</Info>
     <div className="dashboard-status-list" style={{marginTop:18}}>
      <div className="dashboard-status-item"><span>Solicitações aguardando análise</span><strong>{pendingRequests}</strong></div>
      <div className="dashboard-status-item"><span>Propostas aguardando aceite</span><strong>{pendingQuotes}</strong></div>
      <div className="dashboard-status-item"><span>Volume efetivamente entregue</span><strong>{numberBr(delivered)} m³</strong></div>
     </div>
    </section>
   </div>
   <div className="dashboard-two">
    <section className="panel">
     <div className="dashboard-panel-head"><div><span className="eyebrow">INTELIGÊNCIA GEOGRÁFICA</span><h2>Mapa de calor comercial · MG</h2>
      <small>Minas Gerais · visualização provisória até confirmação do raio de atendimento</small></div>
      <div className="dashboard-filters"><select aria-label="Métrica do mapa" value={metric} onChange={e=>setMetric(e.target.value as 'demands'|'volume')}>
       <option value="demands">Demandas</option><option value="volume">Volume (m³)</option>
      </select></div>
     </div>
     <CityHeatMap cities={cities} metric={metric} onSelect={setCityFocus}/>
     {focusedCity&&<div className="dashboard-banner" style={{marginTop:12}}>Município: <strong>{focusedCity.city}</strong> · {numberBr(focusedCity.demands)} demandas · {numberBr(focusedCity.volume)} m³</div>}
    </section>
    <section className="panel">
     <PanelTitle eyebrow="RANKING REGIONAL · MG" title="Municípios mineiros" subtitle="Somente registros com UF MG confirmada · sem clientes individuais"/>
     {mainCities.length? <div className="dashboard-region-list">
      {mainCities.map((c,i)=><button className="dashboard-region-row" type="button" key={c.city+'|'+c.state} onClick={()=>setCityFocus(c.city)}>
       <span><strong>{i+1}.</strong> {c.city}{c.state?' / '+c.state:''}<small style={{display:'block'}}> {numberBr(c.volume)} m³ solicitados</small></span>
       <strong>{numberBr(c.demands)} demandas</strong>
      </button>)}
     </div>:<div className="dashboard-empty">Nenhuma demanda registrada em Minas Gerais com UF confirmada no período.</div>}
     <Info>Um lead gerado automaticamente pelo portal não conta novamente como oportunidade. Municípios mineiros sem coordenadas continuam no ranking; registros de outras UFs não são exibidos nesta seção. O mapa não representa a área de atendimento.</Info>
    </section>
   </div>
   <div className="dashboard-two">
    <section className="panel">
     <PanelTitle eyebrow="ATENDIMENTO / COMERCIAL" title="Situação das solicitações"/>
     {requestStatus.length?<div className="dashboard-status-list">
      {requestStatus.map(([st,count])=><div key={st} className="dashboard-status-item"><span>{statusName(st)}</span><strong>{numberBr(count)}</strong></div>)}
     </div>:<div className="dashboard-empty">Nenhuma solicitação neste período.</div>}
     <Info>Solicitações diretas do portal. Não confundir com ordens de serviço.</Info>
    </section>
    <section className="panel">
     <PanelTitle eyebrow="AQUISIÇÃO DE CLIENTES" title="Canais de entrada"/>
     {sourceCounts.length?<div className="dashboard-status-list">
      {sourceCounts.map(([channel,count])=><div key={channel} className="dashboard-status-item"><span>{channel.replaceAll('_',' ')}</span><strong>{numberBr(count)}</strong></div>)}
     </div>:<div className="dashboard-empty">Nenhum canal comercial registrado no período.</div>}
     <Info>Origem informada no CRM; inclui leads vinculados a solicitações do portal.</Info>
    </section>
   </div>
  </>}
 </div>;
}
