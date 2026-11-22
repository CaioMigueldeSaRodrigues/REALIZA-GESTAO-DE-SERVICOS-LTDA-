'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {getModule,REFS,canAccess,type Field} from '@/lib/modules';
import {brl,dateBr,dateTimeBr,numberBr} from '@/lib/format';
type Row=Record<string,unknown>;
const str=(v:unknown)=>v==null?'':String(v);
export function ModuleTable({moduleKey,role}:{moduleKey:string;role:string}){
 const def=getModule(moduleKey);
 const db=useMemo(()=>browserDb(),[]);
 const [rows,setRows]=useState<Row[]>([]),[refs,setRefs]=useState<Record<string,{id:string;label:string}[]>>({});
 const [busy,setBusy]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[search,setSearch]=useState('');
 const [editing,setEditing]=useState<Row|null>(null),[draft,setDraft]=useState<Row>({}),[showForm,setShowForm]=useState(false);
 const [importText,setImportText]=useState('');
 const load=useCallback(async()=>{
  if(!def)return;
  setBusy(true);setError('');
  try{
   const {data,error:readErr}=await db.from(def.table).select('*').order('created_at',{ascending:false}).limit(250);
   if(readErr)throw readErr;
   setRows((data||[]) as Row[]);
   const sources=[...new Set(def.fields.filter(x=>x.ref).map(x=>x.ref!))];
   const lookups=await Promise.all(sources.map(async k=>{
    const m=REFS[k];const result=await db.from(m.table).select('id,'+m.label).limit(500);
    if(result.error)return [k,[]] as const;
    return [k,(result.data||[]).map((it:Row)=>({id:str(it.id),label:str(it[m.label])||str(it.id).slice(0,8)}))] as const;
   }));
   setRefs(Object.fromEntries(lookups));
  }catch(e){setError(e instanceof Error?e.message:'Erro ao carregar registros.')}
  finally{setBusy(false)}
 },[def,db]);
 useEffect(()=>{load()},[load]);
 if(!def)return <div>Módulo indisponível.</div>;
 const mayWrite=canAccess(role,def.writeRoles);
 const filtered=rows.filter(row=>Object.values(row).some(v=>str(v).toLowerCase().includes(search.toLowerCase())));
 function open(row?:Row){setEditing(row||null);setDraft(row?{...row}:{status:def.fields.find(x=>x.key==='status')?.options?.[0]||undefined});setShowForm(true);setError('')}
 function renderValue(field:Field,row:Row){
  const v=row[field.key];if(v==null||v==='')return '—';
  if(field.type==='ref')return refs[field.ref||'']?.find(o=>o.id===v)?.label||str(v).slice(0,8);
  if(field.type==='checkbox')return v?'Sim':'Não';
  if(field.type==='datetime')return dateTimeBr(str(v));
  if(field.type==='date')return dateBr(str(v));
  if(field.type==='number'&&/(price|fee|amount|budget)/.test(field.key))return brl(v as number);
  if(field.type==='number')return numberBr(v as number);
  const value=str(v);return value.length>90?value.slice(0,87)+'…':value;
 }
 async function save(e:React.FormEvent){
  e.preventDefault();setSaving(true);setError('');
  const payload:Row={};
  for(const field of def!.fields){
   const value=draft[field.key];
   if(field.type==='checkbox')payload[field.key]=Boolean(value);
   else if(value===null||value===undefined||value==='')payload[field.key]=null;
   else if(field.type==='number')payload[field.key]=Number(value);
   else if(field.type==='datetime')payload[field.key]=new Date(str(value)).toISOString();
   else payload[field.key]=value;
  }
  try{
   const query=editing?db.from(def!.table).update(payload).eq('id',str(editing.id)):db.from(def!.table).insert(payload);
   const result=await query;
   if(result.error)throw result.error;
   setShowForm(false);setEditing(null);await load();
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar.')}
  finally{setSaving(false)}
 }
 async function action(action:'lead'|'quote'|'delivery',row:Row){
  try{
   if(!window.confirm('Confirmar esta ação operacional?'))return;
   let result;
   if(action==='lead')result=await db.rpc('convert_lead',{p_lead_id:row.id});
   else if(action==='quote')result=await db.rpc('convert_quote_to_order',{p_quote_id:row.id});
   else{
    const entered=window.prompt('Volume efetivamente entregue em m³:',str(row.quantity_m3));
    if(entered===null)return;
    const volume=Number(entered);
    if(!Number.isFinite(volume)||volume<=0){setError('Volume inválido.');return}
    const note=window.prompt('Nome de quem recebeu / observação de entrega:','')||'';
    result=await db.rpc('confirm_delivery',{p_order_id:row.id,p_delivered_m3:volume,p_note:note});
   }
   if(result.error)throw result.error;await load();
  }catch(e){setError(e instanceof Error?e.message:'Ação não concluída.')}
 }
 async function importFile(file:File|undefined){
  if(!file)return;
  if(file.size>150000){setError('Importe arquivos de texto de até 150 KB.');return}
  setImportText(await file.text());
 }
 const compact=def.fields.filter(f=>f.type!=='textarea').slice(0,5);
 return <div className="module">
  <div className="page-heading"><div><span className="eyebrow">GESTÃO INTEGRADA</span><h1>{def.title}</h1><p>{def.description}</p></div>{mayWrite&&<button className="btn primary" onClick={()=>open()}>+ Novo registro</button>}</div>
  <div className="toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar neste módulo..."/></label><div className="toolbar-meta">{filtered.length} registros <button onClick={load} className="btn soft-button" disabled={busy}>↻ Atualizar</button></div></div>
  {error&&<p className="notice error" role="alert">{error}</p>}
  <div className="table-card">
   {busy?<div className="table-placeholder"><div className="spinner"/> Consultando dados...</div>:
   !filtered.length?<div className="empty-state"><div>◌</div><h3>Nenhum registro encontrado</h3><p>{search?'Tente outro termo de pesquisa.':'Os registros deste módulo aparecerão aqui.'}</p></div>:
   <div className="table-scroll"><table><thead><tr>{compact.map(f=><th key={f.key}>{f.label}</th>)}<th>Criado em</th><th></th></tr></thead><tbody>
    {filtered.map((row,i)=><tr key={str(row.id)||i}>
     {compact.map(f=><td key={f.key} title={str(row[f.key])}>{f.key==='status'?<span className="pill">{renderValue(f,row)}</span>:renderValue(f,row)}</td>)}
     <td>{dateBr(str(row.created_at))}</td><td><div className="inline-actions">
      {mayWrite&&<button className="tiny-btn" onClick={()=>open(row)}>Editar</button>}
      {moduleKey==='leads'&&mayWrite&&row.status!=='convertido'&&<button className="tiny-btn accent" onClick={()=>action('lead',row)}>Converter</button>}
      {moduleKey==='quotes'&&['admin','gestor','operacoes'].includes(role)&&row.status==='aprovada'&&<button className="tiny-btn accent" onClick={()=>action('quote',row)}>Gerar O.S.</button>}
      {moduleKey==='orders'&&row.status!=='entregue'&&row.status!=='cancelada'&&['admin','gestor','operacoes','motorista'].includes(role)&&<button className="tiny-btn accent" onClick={()=>action('delivery',row)}>Concluir entrega</button>}
     </div></td></tr>)}
   </tbody></table></div>}
  </div>
  {showForm&&mayWrite&&<div className="modal-overlay" role="presentation" onClick={()=>setShowForm(false)}><div className="modal" role="dialog" aria-modal="true" aria-label={'Editar '+def.singular} onClick={e=>e.stopPropagation()}>
   <div className="modal-title"><div><span className="eyebrow">{editing?'EDITAR':'NOVO REGISTRO'}</span><h2>{def.singular}</h2></div><button className="icon-btn" onClick={()=>setShowForm(false)}>×</button></div>
   <form onSubmit={save}><div className="modal-fields">{def.fields.map(f=><label key={f.key} className={f.type==='textarea'?'wide':''}>{f.type==='checkbox'?<span className="checkline"><input type="checkbox" checked={Boolean(draft[f.key])} onChange={e=>setDraft(o=>({...o,[f.key]:e.target.checked}))}/>{f.label}</span>:<>{f.label}{f.type==='select'||f.type==='ref'?
    <select value={str(draft[f.key])} required={f.required} onChange={e=>setDraft(o=>({...o,[f.key]:e.target.value}))}><option value="">Selecione</option>{f.type==='ref'?refs[f.ref||'']?.map(o=><option key={o.id} value={o.id}>{o.label}</option>):f.options?.map(o=><option key={o} value={o}>{o.replaceAll('_',' ')}</option>)}</select>:
    f.type==='textarea'?<textarea value={str(draft[f.key])} rows={f.key==='content'?10:4} required={f.required} onChange={e=>setDraft(o=>({...o,[f.key]:e.target.value}))}/>:
    <input type={f.type==='datetime'?'datetime-local':f.type||'text'} required={f.required} value={f.type==='datetime'?str(draft[f.key]).slice(0,16):str(draft[f.key])} step={f.step} onChange={e=>setDraft(o=>({...o,[f.key]:e.target.value}))}/>}</>}</label>)}
    {moduleKey==='documents'&&<div className="wide"><label>Importar arquivo Markdown ou texto (.md/.txt)<input type="file" accept=".md,.txt,text/plain,text/markdown" onChange={e=>importFile(e.target.files?.[0])}/></label>{importText&&<button type="button" className="btn soft-button" onClick={()=>{setDraft(d=>({...d,content:importText}));setImportText('')}}>Aplicar texto importado</button>}</div>}
   </div>
   {error&&<p role="alert" className="notice error">{error}</p>}
   <div className="modal-actions"><button type="button" className="btn light" onClick={()=>setShowForm(false)}>Cancelar</button><button className="btn primary" disabled={saving} type="submit">{saving?'Salvando...':'Salvar registro'}</button></div></form>
  </div></div>}
 </div>
}
