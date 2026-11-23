'use client';
import Link from 'next/link';
import {useState} from 'react';
import {browserDb} from '@/lib/supabase-browser';
import {authRedirectTo,REALIZA_SITE_URL} from '@/lib/auth-redirect';
import {AddressFields,emptyAddress,validAddress} from '@/components/AddressFields';
export function CustomerSignUp(){
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[email,setEmail]=useState('');
 const [password,setPassword]=useState(''),[repeat,setRepeat]=useState('');
 const [kind,setKind]=useState('fisica'),[accepted,setAccepted]=useState(false);
 const [address,setAddress]=useState(emptyAddress);
 const [busy,setBusy]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage('');
  if(password.length<10||password!==repeat){setMessage('Use uma senha de pelo menos 10 caracteres e confirme corretamente.');return}
  if(name.trim().length<2||phone.replace(/\D/g,'').length<10){setMessage('Confira seu nome e telefone.');return}
  if(!validAddress(address)){setMessage('Preencha o endereço completo, incluindo CEP e UF.');return}
  if(!accepted){setMessage('Confirme a leitura das informações de privacidade.');return}
  setBusy(true);
  try{
   const {error}=await browserDb().auth.signUp({
    email:email.trim().toLowerCase(),password,
    options:{emailRedirectTo:authRedirectTo('/painel'),
     data:{account_kind:'customer',name:name.trim(),phone:phone.trim(),person_type:kind,...address}}
   });
   if(error)throw error;
   setDone(true);setMessage('Se o cadastro puder ser realizado, enviaremos instruções para confirmar seu e-mail. Depois, entre pelo mesmo login.');
  }catch(err){setMessage(err instanceof Error?err.message:'Não foi possível criar a conta.')}
  finally{setBusy(false)}
 }
 return <main className="auth-page">
  <Link className="brand small" href="/login"><span className="brand-mark">◉</span> REALIZA <small>PLATAFORMA INTEGRADA</small></Link>
  <div className="auth-card">
   <span className="eyebrow">ACESSO DE APRESENTAÇÃO</span><h1>Crie seu cadastro</h1>
   <p>Neste período de apresentação, o cadastro libera apenas o fluxo operacional, Financeiro e DRE com dados fictícios. Nenhuma cobrança ou solicitação real será efetuada.</p>
   {!done&&<form onSubmit={submit}>
    <label>Nome completo / Razão social<input required maxLength={140} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>
    <label>Tipo de cadastro<select value={kind} onChange={e=>setKind(e.target.value)}><option value="fisica">Pessoa física</option><option value="juridica">Pessoa jurídica</option></select></label>
    <label>Telefone<input required minLength={10} maxLength={30} type="tel" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label>
    <div className="signup-address"><h2>Endereço principal</h2><p>Este endereço será sugerido automaticamente nas solicitações. Você poderá escolher outro destino em cada pedido.</p><AddressFields value={address} onChange={setAddress}/></div>
    <label>E-mail<input required type="email" maxLength={180} value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
    <label>Senha<input required type="password" minLength={10} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo 10 caracteres"/></label>
    <label>Confirme sua senha<input required type="password" minLength={10} value={repeat} onChange={e=>setRepeat(e.target.value)} autoComplete="new-password"/></label>
    <label className="checkline"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> Concordo com o uso dos dados para cadastro e atendimento pela REALIZA.</label>
    <button className="btn primary" type="submit" disabled={busy}>{busy?'Criando conta...':'Criar conta de cliente'}</button>
   </form>}
   {message&&<p className="notice" role="status">{message}</p>}
   {done&&<p>Se a confirmação não abrir a plataforma automaticamente, <a href={REALIZA_SITE_URL+'/login'}>acesse a REALIZA por este link</a> e entre com seu e-mail e senha.</p>}
   <div className="auth-links"><Link href="/login">Já tenho cadastro · Entrar</Link></div>
  </div>
 </main>;
}
