'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {browserDb} from '@/lib/supabase-browser';
import {modules,canAccess} from '@/lib/modules';
import {ModuleTable} from '@/components/ModuleTable';
import {Overview} from '@/components/Overview';
import {Assistant} from '@/components/Assistant';
import {RoutePlanner} from '@/components/RoutePlanner';
type Profile={id:string;name:string;role:string;active:boolean};
export function Workspace(){
 const [profile,setProfile]=useState<Profile|null>(null),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[tab,setTab]=useState('overview'),[sidebar,setSidebar]=useState(false);
 useEffect(()=>{
  let cancelled=false;
  async function init(){
   try{
    const db=browserDb();const {data:{user},error:authError}=await db.auth.getUser();
    if(authError||!user){window.location.replace('/login');return}
    const {data,error:profileError}=await db.from('profiles').select('id,name,role,active').eq('id',user.id).single();
    if(profileError)throw profileError;
    if(!data?.active)throw new Error('Sua conta aguarda ativação por um administrador.');
    if(!cancelled)setProfile(data);
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
 const available=modules.filter(m=>canAccess(profile.role,m.readRoles));
 return <div className="workspace">
  <aside className={'sidebar '+(sidebar?'sidebar-open':'')}>
   <div className="sidebar-top"><Link className="brand sidebar-brand" href="/"><span className="brand-mark">◉</span><span>REALIZA<small>GESTÃO INTELIGENTE</small></span></Link><button className="icon-btn mobile-only" aria-label="Fechar menu" onClick={()=>setSidebar(false)}>×</button></div>
   <div className="sidebar-caption">ESPAÇO DE TRABALHO</div>
   <nav className="nav-group">
    <button className={'nav-item '+(tab==='overview'?'selected':'')} onClick={()=>change('overview')}><span>▦</span> Visão geral</button>
    {available.map(m=><button key={m.key} className={'nav-item '+(tab===m.key?'selected':'')} onClick={()=>change(m.key)}><span>{m.icon}</span>{m.title}</button>)}
    <button className={'nav-item '+(tab==='route'?'selected':'')} onClick={()=>change('route')}><span>⌁</span> Programação logística</button>
    <button className={'nav-item '+(tab==='ai'?'selected':'')} onClick={()=>change('ai')}><span>✦</span> Agente de IA</button>
   </nav>
   <div className="sidebar-footer"><div className="user-chip"><span className="avatar">{profile.name.slice(0,1).toUpperCase()}</span><div><strong>{profile.name}</strong><small>{profile.role}</small></div></div><button className="nav-item signout" onClick={signOut}>↪ Sair da conta</button></div>
  </aside>
  {sidebar&&<button className="backdrop mobile-only" aria-label="Fechar navegação" onClick={()=>setSidebar(false)}/>}
  <div className="workspace-main">
   <header className="topbar"><button className="icon-btn mobile-only" onClick={()=>setSidebar(true)} aria-label="Abrir menu">☰</button>
    <div><span className="tiny-overline">REALIZA / SISTEMA</span><div className="breadcrumb">Painel <span> / </span> {tab==='overview'?'Visão geral':tab==='route'?'Programação logística':tab==='ai'?'Agente de IA':modules.find(m=>m.key===tab)?.title}</div></div>
    <div className="topbar-right"><span className="status-dot"/> Ambiente privado <span className="top-avatar">{profile.name[0]?.toUpperCase()}</span></div>
   </header>
   <main className="workspace-content">
    {tab==='overview'?<Overview role={profile.role}/>:tab==='route'?<RoutePlanner/>:tab==='ai'?<Assistant/>:<ModuleTable key={tab} moduleKey={tab} role={profile.role}/>}
   </main>
   <footer className="workspace-footer">REALIZA Gestão de Serviços • Plataforma própria • Dados protegidos por permissões</footer>
  </div>
 </div>;
}
