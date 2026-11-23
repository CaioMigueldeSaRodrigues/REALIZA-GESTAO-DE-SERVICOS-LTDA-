'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {browserDb} from '@/lib/supabase-browser';
import {modules,canAccess} from '@/lib/modules';
import {ModuleTable} from '@/components/ModuleTable';
import {Overview} from '@/components/Overview';
import {DRE} from '@/components/DRE';
import {ActiveProspecting} from '@/components/ActiveProspecting';
import {Assistant} from '@/components/Assistant';
import {RoutePlanner} from '@/components/RoutePlanner';
import {OperationalPipeline} from '@/components/OperationalPipeline';
import {CustomerPortal} from '@/components/CustomerPortal';
type Profile={id:string;name:string;role:string;active:boolean;demo_expires_at?:string|null;admin_invitation_pending?:boolean};
export function Workspace(){
 const [profile,setProfile]=useState<Profile|null>(null),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[tab,setTab]=useState('pipeline'),[sidebar,setSidebar]=useState(false);
 const [adminAccess,setAdminAccess]=useState<{expires_at:string}|null>(null);
 const [adminMode,setAdminMode]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  async function init(){
   try{
    const db=browserDb();const {data:{user},error:authError}=await db.auth.getUser();
    if(authError||!user){window.location.replace('/login');return}
    let {data,error:profileError}=await db.from('profiles').select('id,name,role,active,demo_expires_at,admin_invitation_pending').eq('id',user.id).single();
    if(profileError)throw profileError;
    if(data?.role==='pendente'&&!data.active&&user.email_confirmed_at&&user.user_metadata?.account_kind==='customer'){
     const meta=user.user_metadata;
     const {error:activationError}=await db.rpc('activate_customer_account',{
      p_name:String(meta.name||''),p_phone:String(meta.phone||''),p_person_type:String(meta.person_type||'fisica')
     });
     if(activationError)throw activationError;
     const refreshed=await db.from('profiles').select('id,name,role,active,demo_expires_at,admin_invitation_pending').eq('id',user.id).single();
     if(refreshed.error)throw refreshed.error;
     data=refreshed.data;
    }
    if(data?.role==='admin'&&!data.active&&data.admin_invitation_pending&&user.email_confirmed_at){
     const {error:activationError}=await db.rpc('activate_preapproved_admin');
     if(activationError)throw activationError;
     const refreshed=await db.from('profiles').select('id,name,role,active,demo_expires_at,admin_invitation_pending').eq('id',user.id).single();
     if(refreshed.error)throw refreshed.error;
     data=refreshed.data;
    }
    if(!data?.active)throw new Error(data?.role==='admin'?'Confirme seu e-mail para liberar o acesso administrativo temporário.':'Sua conta aguarda ativação ou confirmação de e-mail. Funcionários devem solicitar acesso à administração.');
    if(data.demo_expires_at&&new Date(data.demo_expires_at).getTime()<=Date.now()){
     throw new Error('A conta de homologação expirou. Gere uma nova conta temporária para testar.');
    }
    const {data:grants,error:grantError}=await db.rpc('my_temporary_admin_access');
    if(grantError)throw grantError;
    const grant=Array.isArray(grants)&&grants.length>0?grants[0]:null;
    if(!cancelled){
     setProfile(data);
     if(grant?.granted_role==='admin'&&grant.expires_at){
      setAdminAccess({expires_at:String(grant.expires_at)});
      setAdminMode(true);
     }
    }
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Não foi possível carregar sua conta.')}
   finally{if(!cancelled)setLoading(false)}
  }init();
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  return()=>{cancelled=true};
 },[]);
 async function signOut(){await browserDb().auth.signOut();window.location.href='/login'}
 const change=(name:string)=>{setTab(name);setSidebar(false);window.scrollTo(0,0)};
 if(loading)return <main className="screen-center"><div className="spinner"/> <p>Carregando ambiente seguro...</p></main>;
 if(error)return <main className="screen-center"><div className="error-panel"><h2>Verificação de acesso</h2><p>{error}</p><Link className="btn primary" href="/login">Voltar ao acesso</Link></div></main>;
 if(!profile)return null;
 const isDual=profile.role==='cliente'&&!!adminAccess&&new Date(adminAccess.expires_at).getTime()>Date.now();
 const effectiveRole=isDual&&adminMode?'admin':profile.role;
 if(effectiveRole==='cliente'){
  return <div className="workspace-main" style={{minHeight:'100vh'}}>
   <header className="topbar"><strong>REALIZA · Área do Cliente</strong><div style={{display:'flex',gap:8,alignItems:'center'}}>
    {isDual&&<button className="btn primary" onClick={()=>{setAdminMode(true);setTab('pipeline')}}>Ir para administração</button>}
    <button className="btn light" onClick={signOut}>Sair</button></div></header>
   <div className="workspace-content"><CustomerPortal name={profile.name}/></div>
  </div>;
 }
 const readOnly=effectiveRole==='viewer_ops_finance';
 const available=modules.filter(m=>canAccess(effectiveRole,m.readRoles));
 return <div className="workspace">
  <aside className={'sidebar '+(sidebar?'sidebar-open':'')}>
   <div className="sidebar-top"><Link className="brand sidebar-brand" href="/"><span className="brand-mark">◉</span><span>REALIZA<small>GESTÃO INTELIGENTE</small></span></Link><button className="icon-btn mobile-only" aria-label="Fechar menu" onClick={()=>setSidebar(false)}>×</button></div>
   <div className="sidebar-caption">ESPAÇO DE TRABALHO</div>
   {isDual&&<button className="nav-item" onClick={()=>{setAdminMode(false);setSidebar(false)}}><span>↩</span> Voltar ao portal do cliente</button>}
   <nav className="nav-group">
    {!readOnly&&effectiveRole!=='motorista'&&<button className={'nav-item '+(tab==='overview'?'selected':'')} onClick={()=>change('overview')}><span>▦</span> Visão geral</button>}
    <button className={'nav-item '+(tab==='pipeline'?'selected':'')} onClick={()=>change('pipeline')}><span>⇄</span> Fluxo operacional</button>
    {['admin','gestor','comercial'].includes(effectiveRole)&&<button className={'nav-item '+(tab==='prospecting'?'selected':'')} onClick={()=>change('prospecting')}><span>◎</span> Prospecção ativa</button>}
    {available.map(m=><button key={m.key} className={'nav-item '+(tab===m.key?'selected':'')} onClick={()=>change(m.key)}><span>{m.icon}</span>{m.title}</button>)}
    {!readOnly&&effectiveRole!=='motorista'&&<button className={'nav-item '+(tab==='route'?'selected':'')} onClick={()=>change('route')}><span>⌁</span> Programação logística</button>}
    {!readOnly&&effectiveRole!=='motorista'&&<button className={'nav-item '+(tab==='ai'?'selected':'')} onClick={()=>change('ai')}><span>✦</span> Agente de IA</button>}
   </nav>
   <div className="sidebar-footer"><div className="user-chip"><span className="avatar">{profile.name.slice(0,1).toUpperCase()}</span><div><strong>{profile.name}</strong><small>{effectiveRole}{isDual?' · homologação':''}</small></div></div><button className="nav-item signout" onClick={signOut}>↪ Sair da conta</button></div>
  </aside>
  {sidebar&&<button className="backdrop mobile-only" aria-label="Fechar navegação" onClick={()=>setSidebar(false)}/>}
  <div className="workspace-main">
   <header className="topbar"><button className="icon-btn mobile-only" onClick={()=>setSidebar(true)} aria-label="Abrir menu">☰</button>
    <div><span className="tiny-overline">REALIZA / SISTEMA</span><div className="breadcrumb">Painel <span> / </span> {tab==='overview'?'Visão geral':tab==='pipeline'?'Fluxo operacional':tab==='route'?'Programação logística':tab==='prospecting'?'Prospecção ativa':tab==='ai'?'Agente de IA':modules.find(m=>m.key===tab)?.title}</div></div>
    <div className="topbar-right"><span className="status-dot"/> Ambiente privado <span className="top-avatar">{profile.name[0]?.toUpperCase()}</span></div>
   </header>
   <main className="workspace-content">
    {readOnly&&<div role="status" className="notice" style={{marginBottom:18}}>
     Acesso temporário para apresentação · Somente leitura operacional e financeira.
     Nenhuma alteração, cobrança ou despacho está autorizado.
    </div>}
    {isDual&&<div role="status" className="notice" style={{marginBottom:18}}>
      Acesso ADM de homologação · Conta de cliente preservada · Validade até {new Date(adminAccess!.expires_at).toLocaleString('pt-BR')}.
    </div>}
    {profile.demo_expires_at&&<div role="status" className="notice" style={{marginBottom:18}}>
     Perfil temporário de homologação · Expiração: {new Date(profile.demo_expires_at).toLocaleString('pt-BR')}
    </div>}
    {readOnly&&!['pipeline','orders','vehicles','water_sources','receivables','payables','expenses','dre'].includes(tab)?<OperationalPipeline role={effectiveRole}/>:tab==='overview'?<Overview role={effectiveRole}/>:tab==='pipeline'?<OperationalPipeline role={effectiveRole}/>:tab==='route'?<RoutePlanner/>:tab==='ai'?<Assistant/>:tab==='dre'?<DRE role={effectiveRole}/>:tab==='prospecting'?<ActiveProspecting/>:<ModuleTable key={tab} moduleKey={tab} role={effectiveRole}/>}
   </main>
   <footer className="workspace-footer">REALIZA Gestão de Serviços • Plataforma própria • Dados protegidos por permissões</footer>
  </div>
 </div>;
}
