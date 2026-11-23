'use client';
import {useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {brl} from '@/lib/format';

type Found={
 cnpj:string;name:string;trade_name:string;cnae:string;city:string;state:string;
 opened_on:string;registration_status:string;snapshot_on:string;
 street_type:string;street:string;street_number:string;address_extra:string;
 neighborhood:string;postal_code:string;phone:string;secondary_phone:string;
 contact_email:string;capital_social:number|null;latitude:number|null;longitude:number|null;
};
type Prospect=Found&{id:string;status:string;notes:string;created_at:string};
type ProspectRecord=Found|Prospect;
const fmtCnpj=(s:string)=>s?.length===14?
 s.slice(0,2)+'.'+s.slice(2,5)+'.'+s.slice(5,8)+'/'+s.slice(8,12)+'-'+s.slice(12):s;
const date=(s:string)=>/^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):'—';
const available=(s:unknown)=>String(s??'').trim()||'Não informado';
const formatAddress=(r:ProspectRecord)=>{
 const street=[r.street_type,r.street].filter(Boolean).join(' ').trim();
 const row1=[street,r.street_number].filter(Boolean).join(', ');
 const row2=[r.address_extra,r.neighborhood].filter(Boolean).join(' · ');
 const city=[r.city,r.state].filter(Boolean).join(' / ');
 const cep=r.postal_code?.replace(/\D/g,'')||'';
 return [row1,row2,city,cep.length===8?cep.slice(0,5)+'-'+cep.slice(5):cep].filter(Boolean).join(' — ');
};
function mapLink(r:ProspectRecord){
 if(r.latitude!=null&&r.longitude!=null&&Number.isFinite(Number(r.latitude))&&Number.isFinite(Number(r.longitude)))
  return 'https://www.google.com/maps/search/?api=1&query='+
   encodeURIComponent(String(r.latitude)+','+String(r.longitude));
 const query=[r.street_type,r.street,r.street_number,r.neighborhood,r.city,r.state].filter(Boolean).join(' ');
 return r.street&&r.city?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query+', Brasil'):null;
}
function CompanyDetails({company:r}:{company:ProspectRecord}){
 const link=mapLink(r);
 const phone=String(r.phone||'').replace(/\D/g,'');
 const secondary=String(r.secondary_phone||'').replace(/\D/g,'');
 const email=r.contact_email||'';
 return <div className="prospect-details">
  <div><small>Endereço cadastrado</small><strong>{available(formatAddress(r))}</strong></div>
  <div><small>Contato telefônico público</small>
   <strong>{phone?<a href={'tel:+55'+phone}>{phone}</a>:'Não informado'}</strong>
   {secondary&&<span>Alternativo: <a href={'tel:+55'+secondary}>{secondary}</a></span>}
  </div>
  <div><small>E-mail público</small>
   <strong>{email?<a href={'mailto:'+email}>{email}</a>:'Não informado'}</strong>
  </div>
  <div><small>Capital social registrado</small>
   <strong>{r.capital_social!=null?brl(r.capital_social):'Não informado'}</strong>
   <span>Capital social da empresa, não receita ou capacidade de compra</span>
  </div>
  <div><small>Localização</small>
   <strong>{r.latitude!=null&&r.longitude!=null?'Coordenadas fornecidas pela fonte':r.street&&r.city?'Consulta pelo endereço':'Sem localização precisa'}</strong>
   {link&&<a href={link} target="_blank" rel="noopener noreferrer">Consultar no Google Maps ↗</a>}
  </div>
  <div><small>Cadastro / origem</small>
   <strong>{available(r.registration_status)}</strong>
   <span>Abertura: {date(r.opened_on)} · Fonte atualizada: {date(r.snapshot_on)}</span>
  </div>
 </div>;
}
export function ActiveProspecting(){
 const db=useMemo(()=>browserDb(),[]);
 const [cnae,setCnae]=useState('');
 const [results,setResults]=useState<Found[]>([]);
 const [saved,setSaved]=useState<Prospect[]>([]);
 const [searched,setSearched]=useState(false);
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState('');
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 const [expanded,setExpanded]=useState('');
 const [sourceDate,setSourceDate]=useState<string|null>(null);
 async function load(){
  const r=await db.from('commercial_prospects').select('*')
   .order('created_at',{ascending:false}).limit(100);
  if(r.error)setError(r.error.message);
  else setSaved((r.data||[]) as Prospect[]);
 }
 useEffect(()=>{void load()},[]);
 async function run(e:React.FormEvent){
  e.preventDefault();setLoading(true);setError('');setMessage('');setResults([]);
  setSearched(false);setSourceDate(null);
  try{
   const res=await fetch('/api/comercial/prospeccao/cnae',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({cnae}),cache:'no-store'
   });
   const body=await res.json() as {
    rows?:Found[];message?:string;error?:string;source_updated_on?:string|null
   };
   if(!res.ok)throw Error(body.error||'Pesquisa indisponível');
   setResults(body.rows||[]);setMessage(body.message||'Consulta concluída.');
   setSourceDate(body.source_updated_on||null);setSearched(true);
  }catch(err){setError(err instanceof Error?err.message:'Pesquisa indisponível')}
  finally{setLoading(false)}
 }
 async function save(row:Found){
  setSaving(row.cnpj);setError('');setMessage('');
  try{
   const {data:{user}}=await db.auth.getUser();
   if(!user)throw Error('Sessão expirada. Faça login novamente.');
   const {error:insertError}=await db.from('commercial_prospects').upsert({
    cnpj:row.cnpj,name:row.name,trade_name:row.trade_name||null,
    cnae:row.cnae,city:row.city||null,state:'MG',
    opened_on:row.opened_on.slice(0,10),
    snapshot_on:row.snapshot_on?.slice(0,10)||null,
    registration_status:row.registration_status||null,
    street_type:row.street_type||null,street:row.street||null,
    street_number:row.street_number||null,address_extra:row.address_extra||null,
    neighborhood:row.neighborhood||null,postal_code:row.postal_code||null,
    phone:row.phone||null,secondary_phone:row.secondary_phone||null,
    contact_email:row.contact_email||null,
    capital_social:row.capital_social,latitude:row.latitude,longitude:row.longitude,
    created_by:user.id
   },{onConflict:'cnpj',ignoreDuplicates:true});
   if(insertError)throw insertError;
   setMessage('Empresa salva. Qualificação e contato permanecem sob responsabilidade do comercial.');
   await load();
  }catch(err){setError(err instanceof Error?err.message:'Erro ao salvar empresa')}
  finally{setSaving('')}
 }
 async function setStatus(id:string,status:string){
  setError('');
  const r=await db.from('commercial_prospects').update({status}).eq('id',id);
  if(r.error)setError(r.error.message);else await load();
 }
 const savedCnpj=new Set(saved.map(v=>v.cnpj));
 return <div>
  <div className="page-heading"><div><span className="eyebrow">COMERCIAL · PROSPECÇÃO</span>
   <h1>Prospecção ativa</h1>
   <p>Empresas abertas nos últimos sete dias em Minas Gerais, filtradas por CNAE e enriquecidas com dados cadastrais públicos.</p></div></div>
  <div className="dashboard-banner">
   Enriquecimento cadastral, sem abordagem automatizada. Telefone, e-mail, endereço, localização e capital social podem estar indisponíveis na fonte. O CNPJ público pode ter atualização mensal.
  </div>
  <section className="panel">
   <div className="dashboard-panel-head"><div><span className="eyebrow">BIGQUERY / CNAE</span><h2>Buscar empresas recentes</h2></div></div>
   <form onSubmit={run} className="dashboard-filters">
    <label htmlFor="cnae-input">CNAE</label>
    <input id="cnae-input" inputMode="numeric" value={cnae} required pattern="[0-9]{2,7}"
     onChange={e=>setCnae(e.target.value.replace(/\D/g,'').slice(0,7))}
     placeholder="Ex.: 4120400" style={{border:'1px solid #d8e6ea',borderRadius:9,padding:'10px 12px'}}/>
    <button className="btn primary" type="submit" disabled={loading}>
     {loading?'Consultando…':'Buscar última semana'}</button>
   </form>
   <p className="dashboard-hint">Máximo de 50 empresas por pesquisa e 5 buscas/hora por usuário. A consulta exige credenciais BigQuery autorizadas no servidor.</p>
   {error&&<div className="notice error" role="alert">{error}</div>}
   {message&&<div className="notice" role="status">{message}</div>}
   {sourceDate&&<p className="dashboard-hint">Data mais recente informada pela fonte nesta busca: {date(sourceDate)}.</p>}
   {searched&&!results.length&&<div className="dashboard-empty">Nenhuma empresa localizada no período disponível. Isso não comprova ausência de novas empresas.</div>}
   <div className="prospect-list">
    {results.map(r=><article className="prospect-row" key={r.cnpj}>
     <div className="prospect-row-header">
      <div><strong>{r.name}</strong><small>{fmtCnpj(r.cnpj)} · CNAE {r.cnae} · {r.city}/MG</small></div>
      <div className="prospect-row-actions">
       <button className="btn light" type="button" onClick={()=>setExpanded(v=>v===r.cnpj?'':r.cnpj)}>Dados da empresa</button>
       <button className="btn primary" type="button" disabled={!!saving||savedCnpj.has(r.cnpj)}
        onClick={()=>void save(r)}>{savedCnpj.has(r.cnpj)?'Salva':'Salvar no CRM'}</button>
      </div>
     </div>
     {expanded===r.cnpj&&<CompanyDetails company={r}/>}
    </article>)}
   </div>
  </section>
  <section className="panel" style={{marginTop:18}}>
   <div className="dashboard-panel-head"><div><span className="eyebrow">LISTA COMERCIAL</span><h2>Empresas identificadas</h2></div>
    <button className="btn light" onClick={()=>void load()}>Atualizar</button></div>
   {saved.length===0?<div className="dashboard-empty">Nenhuma empresa salva para qualificação manual.</div>:
    <div className="prospect-list">
     {saved.map(r=><article className="prospect-row" key={r.id}>
      <div className="prospect-row-header">
       <div><strong>{r.name}</strong><small>{fmtCnpj(r.cnpj)} · {r.city}/MG · capital: {r.capital_social!=null?brl(r.capital_social):'não informado'}</small></div>
       <div className="prospect-row-actions">
        <select aria-label={'Qualificação de '+r.name} value={r.status} onChange={e=>void setStatus(r.id,e.target.value)}>
         {['novo','em_qualificacao','contatado','convertido','descartado'].map(status=>
          <option key={status} value={status}>{status.replaceAll('_',' ')}</option>)}
        </select>
        <button className="btn light" type="button" onClick={()=>setExpanded(v=>v===r.id?'':r.id)}>
         Ver cadastro</button>
       </div>
      </div>
      {expanded===r.id&&<CompanyDetails company={r}/>}
     </article>)}
    </div>}
  </section>
  <p className="dashboard-hint">Dados públicos não garantem interesse comercial. Confirme necessidade de abastecimento e área de atendimento antes da abordagem. Nenhuma mensagem ou contato é realizado automaticamente.</p>
 </div>;
}
