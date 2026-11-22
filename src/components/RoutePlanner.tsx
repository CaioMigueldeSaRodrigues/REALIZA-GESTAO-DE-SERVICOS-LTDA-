'use client';
import {useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {suggestSequence,type RouteStop,distanceKm} from '@/lib/route-plan';
import {dateTimeBr,numberBr} from '@/lib/format';
export function RoutePlanner(){
 const db=useMemo(()=>browserDb(),[]);
 const [orders,setOrders]=useState<RouteStop[]>([]),[labels,setLabels]=useState<Record<string,string>>({}),[loading,setLoading]=useState(true),[selected,setSelected]=useState('');
 useEffect(()=>{let alive=true;async function load(){
  const [o,v]=await Promise.all([db.from('orders').select('id,city,scheduled_at,latitude,longitude,quantity_m3,vehicle_id,status,address').in('status',['pendente','programada','em_rota']).order('scheduled_at',{ascending:true}).limit(200),
   db.from('vehicles').select('id,label,plate,capacity_m3').limit(100)]);
  if(alive){setOrders((o.data||[]) as RouteStop[]);setLabels(Object.fromEntries((v.data||[]).map((x:{id:string;label:string;plate:string})=>[x.id,x.label+' • '+x.plate])));setLoading(false)}
 }load();return()=>{alive=false}},[db]);
 const available=Object.keys(labels);
 const planned=suggestSequence(orders.filter(o=>!selected||o.vehicle_id===selected));
 const total=planned.reduce((s,o)=>s+Number(o.quantity_m3||0),0);
 const withGeo=planned.filter(o=>o.latitude!=null&&o.longitude!=null);
 const straightLine=withGeo.slice(1).reduce((sum,o,i)=>sum+distanceKm(withGeo[i] as {latitude:number;longitude:number},o as {latitude:number;longitude:number}),0);
 return <div><div className="page-heading"><div><span className="eyebrow">DISTRIBUIÇÃO / LOGÍSTICA</span><h1>Programação de entregas</h1><p>Sequenciamento interno sem dependência de APIs externas de mapas.</p></div></div>
 <section className="route-filter panel"><label>Caminhão<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Todas as ordens programáveis</option>{available.map(v=><option key={v} value={v}>{labels[v]}</option>)}</select></label>
 <div><strong>{planned.length}</strong><span> paradas</span></div><div><strong>{numberBr(total)} m³</strong><span> programados</span></div></section>
 <p className="route-disclaimer">A ordem é uma sugestão por prazo e proximidade geográfica. Não considera trânsito, restrições de caminhões, rede viária, capacidade por viagem ou segurança. Valide manualmente antes de despachar.</p>
 {loading?<div className="table-placeholder">Carregando rotas...</div>:planned.length===0?<div className="empty-state"><h3>Sem ordens pendentes</h3><p>Cadastre e programe ordens de serviço para visualizar a sequência.</p></div>:
 <div className="route-steps">{planned.map((o,i)=><div className="route-step" key={o.id}><div className="step-index">{i+1}</div><div><h3>{o.city||'Destino não informado'}</h3><p>{o.address||'Sem endereço detalhado'}</p><small>{dateTimeBr(o.scheduled_at)} • {numberBr(o.quantity_m3)} m³ • {o.vehicle_id?labels[o.vehicle_id]||'Veículo não identificado':'Veículo pendente'}</small></div><span className="pill">{o.status}</span></div>)}</div>}
 {withGeo.length>1&&<p className="minor">Distância em linha reta entre paradas georreferenciadas: {numberBr(straightLine)} km — não representa quilometragem rodoviária.</p>}
 </div>
}
