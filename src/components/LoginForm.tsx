'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { browserDb } from '@/lib/supabase-browser';
export function LoginForm({recovery=false}:{recovery?:boolean}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[newPassword,setNewPassword]=useState('');
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[hasSession,setHasSession]=useState(false);
 useEffect(()=>{if(!recovery)return;try{browserDb().auth.getSession().then(({data})=>setHasSession(!!data.session))}catch{}},[recovery]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMessage('');
  try{
   const db=browserDb();
   if(recovery){
    if(hasSession){const {error}=await db.auth.updateUser({password:newPassword});if(error)throw error;setMessage('Senha atualizada. Agora acesse o painel.');}
    else{const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/recuperar'});if(error)throw error;setMessage('Se o e-mail estiver cadastrado, enviaremos as instruções.');}
   }else{
    const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
    window.location.assign('/painel');
   }
  }catch(err){setMessage(err instanceof Error?err.message:'Não foi possível concluir a solicitação.')}
  finally{setBusy(false)}
 }
 return <main className="auth-page"><Link className="brand small" href="/"><span className="brand-mark">◉</span> REALIZA <small>ÁGUASERV</small></Link>
 <form className="auth-card" onSubmit={submit}>
  <span className="eyebrow">PLATAFORMA PRIVADA</span>
  <h1>{recovery?'Recuperar acesso':'Bem-vindo à REALIZA'}</h1>
  <p className="muted">{recovery?'Sua conta é gerenciada pela administração.':'Gestão inteligente de serviços, frota e resultados.'}</p>
  {!hasSession&&<label>E-mail profissional<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@empresa.com.br"/></label>}
  {!recovery&&<label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></label>}
  {recovery&&hasSession&&<label>Nova senha<input type="password" minLength={10} required value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/></label>}
  <button className="btn primary" disabled={busy} type="submit">{busy?'Processando...':recovery?(hasSession?'Atualizar senha':'Enviar recuperação'):'Entrar no painel'}</button>
  {message&&<div role="status" className="notice">{message}</div>}
  <div className="auth-links">{recovery?<Link href="/login">Voltar ao login</Link>:<Link href="/recuperar">Esqueci minha senha</Link>}</div>
 </form></main>
}
