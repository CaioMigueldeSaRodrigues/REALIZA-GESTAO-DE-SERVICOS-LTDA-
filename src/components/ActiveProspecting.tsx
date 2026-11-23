'use client';
import {useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {dateBr} from '@/lib/format';
type Found={cnpj:string;name:string;trade_name:string;cnae:string;city:string;state:string;opened_on:string;registration_status:string;snapshot_on:string};
type Prospect=Found&{id:string;status:string};
const fmt=(s:string)=>s?.length===14?s.slice(0,2)+'.'+s.slice(2,5)+'.'+s.slice(5,8)+'/'+s.slice(8,12)+'-'+s.slice(12):s;
export function ActiveProspecting(){
 const db=useMemo(()=>browserDb(),[]);
 const [cnae,setCnae]=useState('');
 const [results,setResults]=useState<Found[]>([]);
 const [saved,setSaved]=useState<Prospect[]>([]);
 const [searched,setSearched]=useState(false);
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState('');
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 async function load(){
  const r=await db.from('commercial_prospects').select('*').order('created_at',{ascending:false}).limit(100);
  if(r.error)setError(r.error.message);
  else setSaved((r.data||[]) as Prospect[]);
 }
 useEffect(()=>{void load()},[]);
 async function run(e:React.FormEvent){
  e.preventDefault();setLoading(true);setError('');setMessage('');setResults([]);setSearched(false);
  try{
   const res=await fetch('/api/comercial/prospeccao/cnae',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cnae})});
   const body=await res.json() as {rows?:Found[];message?:string;error?:string};
   if(!res.ok)throw Error(body.error||'Consulta indisponível');
   setResults(body.rows||[]);setMessage(body.message||'Consulta concluída.');setSearched(true);
  }catch(err){setError(err instanceof Error?err.message:'Pesquisa indisponível')}
  finally{setLoading(false)}
 }
 async function save(row:Found){
  setSaving(row.cnpj);setError('');setMessage('');
  try{
   const {data:{user}}=await db.auth.getUser();
   if(!user)throw Error('Sessão expirada');
   const res=await db.from('commercial_prospects').upsert({
    cnpj:row.cnpj,name:row.name,trade_name:row.trade_name||null,
    cnae:row.cnae,city:row.city||null,state:'MG',
    opened_on:row.opened_on.slice(0,10),
    snapshot_on:row.snapshot_on?.slice(0,10)||null,
    registration_status:row.registration_status||null,created_by:user.id
   },{onConflict:'cnpj',ignoreDuplicates:true});
   if(res.error)throw res.error;
   setMessage('Empresa adicionada à lista de prospecção.');await load();
  }catch(e){setError(e instanceof Error?e.message:'Erro ao salvar empresa')}
  finally{setSaving('')}
 }
 async function setStatus(id:string,status:string){
  const r=await db.from('commercial_prospects').update({status}).eq('id',id);
  if(r.error)setError(r.error.message);else await load();
 }
 const savedCnpj=new Set(saved.map(v=>v.cnpj));
 return <div>
  <div className="page-heading"><div><span className="eyebrow">COMERCIAL · MERCADO</span><h1>Prospecção ativa</h1><p>Empresas abertas na última semana, filtradas por CNAE e restritas a Minas Gerais.</p></div></div>
  <div className="dashboard-banner">Consulta BigQuery baseada em CNPJ cadastral · requer conexão autorizada com a fonte. A base pública pode apresentar atualização mensal, portanto ausência de resultados não comprova ausência de novas empresas.</div>
  <section className="panel">
   <div className="dashboard-panel-head"><div><span className="eyebrow">PESQUISA DE MERCADO</span><h2>Novos CNPJs por CNAE</h2></div></div>
   <form onSubmit={run} className="dashboard-filters">
    <label htmlFor="cnae-input">CNAE</label>
    <input id="cnae-input" inputMode="numeric" value={cnae} required pattern="[0-9]{2,7}"
     onChange={e=>setCnae(e.target.value.replace(/\D/g,'').slice(0,7))}
     placeholder="Ex.: 4120400" style={{border:'1px solid #d8e6ea',borderRadius:9,padding:'10px 12px'}}/>
    <button className="btn primary" type="submit" disabled={loading}>{loading?'Consultando...':'Buscar última semana'}</button>
   </form>
   <p className="dashboard-hint">Até 50 resultados por consulta; máximo 5 pesquisas por hora. O serviço exige configuração de credenciais no servidor e um orçamento BigQuery.</p>
   {error&&<div className="notice error" role="alert">{error}</div>}
   {message&&<div className="notice" role="status">{message}</div>}
   {searched&&results.length===0&&<div className="dashboard-empty">Nenhuma empresa encontrada no recorte disponível.</div>}
   {results.length>0&&<div className="table-scroll"><table><thead><tr><th>CNPJ</th><th>Empresa</th><th>CNAE</th><th>Município</th><th>Abertura</th><th>Snapshot</th><th></th></tr></thead>
    <tbody>{results.map(r=><tr key={r.cnpj}><td>{fmt(r.cnpj)}</td><td>{r.name}</td><td>{r.cnae}</td><td>{r.city} / MG</td><td>{dateBr(r.opened_on)}</td><td>{r.snapshot_on?dateBr(r.snapshot_on):'Não informado'}</td>
      <td><button className="tiny-btn" disabled={!!saving||savedCnpj.has(r.cnpj)} onClick={()=>void save(r)}>{savedCnpj.has(r.cnpj)?'Salva':'Salvar'}</button></td></tr>)}</tbody></table></div>}
  </section>
  <section className="panel" style={{marginTop:18}}>
   <div className="dashboard-panel-head"><div><span className="eyebrow">PROSPECÇÃO / CRM</span><h2>Empresas identificadas</h2></div><button className="btn light" onClick={()=>void load()}>Atualizar</button></div>
   {saved.length===0?<div className="dashboard-empty">Nenhuma empresa qualificada até o momento.</div>:
    <div className="table-scroll"><table><thead><tr><th>Empresa / CNPJ</th><th>Município</th><th>CNAE</th><th>Abertura</th><th>Etapa</th></tr></thead>
     <tbody>{saved.map(r=><tr key={r.id}><td>{r.name}<small style={{display:'block'}}>{fmt(r.cnpj)}</small></td><td>{r.city} / MG</td><td>{r.cnae}</td><td>{dateBr(r.opened_on)}</td>
      <td><select value={r.status} onChange={e=>void setStatus(r.id,e.target.value)} aria-label={'Status de '+r.name}>
       {['novo','em_qualificacao','contatado','convertido','descartado'].map(status=><option value={status} key={status}>{status.replaceAll('_',' ')}</option>)}
      </select></td></tr>)}</tbody></table></div>}
  </section>
 </div>;
}
