'use client';
import {useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {brl,dateBr,numberBr} from '@/lib/format';
type Month={month:string;orders:number;volume_m3:number;gross_revenue:number};
export function Overview({role}:{role:string}){
 const db=useMemo(()=>browserDb(),[]);
 const [stats,setStats]=useState({leads:0,clients:0,orders:0,open:0}),[months,setMonths]=useState<Month[]>([]),[alerts,setAlerts]=useState<string[]>([]),[busy,setBusy]=useState(true);
 useEffect(()=>{let mounted=true;async function load(){
  const count=async(table:string,filter?:string)=>{
   let query=db.from(table).select('id',{head:true,count:'exact'});
   if(filter)query=query.eq('status',filter);
   const r=await query;return r.count||0;
  };
  const safe=async(p:Promise<number>)=>{try{return await p}catch{return 0}};
  const [leads,clients,orders,open]=await Promise.all([safe(count('leads')),safe(count('clients')),safe(count('orders')),safe(count('orders','pendente'))]);
  const m=await db.from('bi_monthly').select('*').order('month',{ascending:false}).limit(7);
  const a=await db.from('operational_alerts').select('message').order('created_at',{ascending:false}).limit(5);
  if(mounted){setStats({leads,clients,orders,open});setMonths((m.data||[]) as Month[]);setAlerts((a.data||[]).map((it:{message:string})=>it.message));setBusy(false)}
 }load();return()=>{mounted=false}},[db]);
 const max=Math.max(1,...months.map(x=>Number(x.gross_revenue)));
 const revenue=months[0]?.gross_revenue||0;
 return <div>
  <div className="page-heading"><div><span className="eyebrow">INTELIGÊNCIA OPERACIONAL</span><h1>Visão geral</h1><p>Informações da REALIZA em um único lugar. Dados reais do Supabase.</p></div><span className="date-chip">{dateBr(new Date().toISOString())}</span></div>
  {busy?<div className="table-placeholder"><div className="spinner"/> Atualizando indicadores...</div>:<>
   <div className="kpi-grid">
    <article className="kpi"><span>Faturamento em ordens • último mês com dados</span><strong>{brl(revenue)}</strong><small>Valor previsto das ordens; não equivale a recebimentos.</small></article>
    <article className="kpi"><span>Ordens cadastradas</span><strong>{numberBr(stats.orders)}</strong><small>{stats.open} pendentes</small></article>
    <article className="kpi"><span>Leads registrados</span><strong>{numberBr(stats.leads)}</strong><small>Entrada do site e canais comerciais</small></article>
    <article className="kpi"><span>Base de clientes</span><strong>{numberBr(stats.clients)}</strong><small>Cadastros integrados ao CRM</small></article>
   </div>
   <div className="insights-grid">
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">BI / FATURAMENTO PREVISTO</span><h2>Ordens por mês</h2></div><span className="minor">Últimos 7 meses com registros</span></div>
     {months.length?<div className="bar-chart">{months.slice().reverse().map(m=><div className="bar-row" key={m.month}><span>{m.month.slice(0,7)}</span><div className="bar-track"><div style={{width:(Number(m.gross_revenue)/max*100)+'%'}}/></div><strong>{brl(m.gross_revenue)}</strong></div>)}</div>:<div className="empty-small">Sem lançamentos ainda. Os indicadores aparecerão com os dados reais.</div>}
    </section>
    <section className="panel"><div className="panel-heading"><div><span className="eyebrow">OPERAÇÃO EM FOCO</span><h2>Alertas da equipe</h2></div></div>
     {alerts.length?<ul className="alert-list">{alerts.map((v,i)=><li key={i}><span>!</span>{v}</li>)}</ul>:<div className="empty-small">Nenhum alerta operacional pendente.</div>}
     <div className="panel-note">Perfil atual: <strong>{role}</strong>. Visões respeitam as permissões do usuário.</div>
    </section>
   </div>
  </>}
 </div>
}
