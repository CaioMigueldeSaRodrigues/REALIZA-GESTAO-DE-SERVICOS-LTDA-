'use client';

import {useState} from 'react';
import {brl,numberBr} from '@/lib/format';
import {browserDb} from '@/lib/supabase-browser';
import {
 addExpense,addOrder,advanceOrder,createDemoState,financeSummary,incomeStatement,
 monthCode,monthLabel,monthsToShow,oValue,payExpense,payOrder,stepLabels,steps,trucks,
 type DemoOrder,type DemoState,type DemoStep,type DemoCategory
} from '@/lib/demo-simulation';

type Tab='operacional'|'financeiro'|'dre';
type Draft={company:string;city:string;use:string;volume:string};
const emptyDraft:Draft={company:'Cliente Demonstração',city:'Pouso Alegre / MG',use:'Abastecimento de obra',volume:'20'};
const nav:{id:Tab;label:string;symbol:string}[]=[
 {id:'operacional',label:'Fluxo operacional',symbol:'⇄'},
 {id:'financeiro',label:'Financeiro',symbol:'↗'},
 {id:'dre',label:'DRE gerencial',symbol:'▥'}
];
const prevSample=[
 {revenue:34600,direct:14700,operating:8100,taxes:2450},
 {revenue:41200,direct:18350,operating:9200,taxes:3010}
];
const formatPercent=(qty:number,max:number)=>Math.min(100,Math.round(qty/Math.max(max,1)*100));
const fmtDate=(date:Date)=>date.toLocaleDateString('pt-BR');
const stat=(label:string,value:string,help:string)=>({label,value,help});
function Stat({label,value,help}:{label:string;value:string;help:string}){
 return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{help}</small></article>;
}
function OwnerBadge({text}:{text:string}){return <span className="pill">{text}</span>}

export function DemoWorkspace({name}:{name:string}){
 const [data,setData]=useState<DemoState>(()=>createDemoState());
 const [tab,setTab]=useState<Tab>('operacional');
 const [selected,setSelected]=useState('DEMO-001');
 const [sidebar,setSidebar]=useState(false);
 const [feedback,setFeedback]=useState('');
 const [showNew,setShowNew]=useState(false);
 const [draft,setDraft]=useState<Draft>(emptyDraft);
 const [price,setPrice]=useState('140');
 const [truck,setTruck]=useState('C01');
 const [description,setDescription]=useState('Despesa ilustrativa adicional');
 const [amount,setAmount]=useState('250');
 const [category,setCategory]=useState<DemoCategory>('operacional');
 const months=monthsToShow(new Date());
 const [month,setMonth]=useState<string>(()=>monthCode(new Date()));
 const current=data.orders.find(o=>o.id===selected)||data.orders[0];
 const financial=financeSummary(data);
 const statement=incomeStatement(data,month);
 const chosenTruck=trucks.find(t=>t.id===current.truckId);
 const rest=Math.max(0,current.volume-current.deliveredM3);
 const tripsRemaining=chosenTruck?Math.ceil(rest/chosenTruck.capacity):0;
 const paidInvoices=data.orders.filter(o=>['aprovada','programada','entregue'].includes(o.status));
 const totalVolume=data.orders.reduce((sum,o)=>sum+o.volume,0);
 const deliveredVolume=data.orders.reduce((sum,o)=>sum+o.deliveredM3,0);
 const stageIndex=steps.indexOf(current.status);

 function page(value:Tab){
  setTab(value);setSidebar(false);setFeedback('');
  if(typeof window!=='undefined')window.scrollTo({top:0,behavior:'smooth'});
 }
 function apply(action:()=>DemoState,message:string){
  try{setData(action());setFeedback(message)}
  catch(err){setFeedback(err instanceof Error?err.message:'Não foi possível simular esta ação.')}
 }
 function createRequest(e:React.FormEvent){
  e.preventDefault();
  try{
   const next=addOrder(data,{...draft,volume:Number(draft.volume)});
   setData(next);setSelected(next.orders[0].id);setShowNew(false);
   setDraft(emptyDraft);
   setFeedback('Nova solicitação fictícia incluída. Selecione o pedido e avance pelas etapas.');
  }catch(err){setFeedback(err instanceof Error?err.message:'Confira os campos do formulário.')}
 }
 function advance(){
  const before=current.status;
  const next=advanceOrder(data,current.id,{unitPrice:Number(price),truckId:truck});
  setData(next);
  const updated=next.orders.find(o=>o.id===current.id)!;
  setFeedback(updated.status==='entregue'?
   'Entrega simulada concluída! A receita foi atualizada no DRE. Confira a aba Financeiro.':
   before==='programada'?
   'Viagem simulada registrada! Faltam '+numberBr(updated.volume-updated.deliveredM3)+' m³.':
   'Etapa avançou para "'+stepLabels[updated.status]+'". Você pode continuar o fluxo.');
 }
 function progress(){
  try{advance()}catch(err){setFeedback(err instanceof Error?err.message:'Operação indisponível.')}
 }
 function newExpense(e:React.FormEvent){
  e.preventDefault();
  apply(()=>addExpense(data,{label:description,amount:Number(amount),category}),
   'Despesa simulada adicionada. O DRE foi recalculado; confira o demonstrativo.');
 }
 function reset(){
  if(!window.confirm('Reiniciar a demonstração? Todas as mudanças fictícias desta sessão serão descartadas.'))return;
  setData(createDemoState());setSelected('DEMO-001');setMonth(monthCode(new Date()));
  setFeedback('Cenário inicial restaurado. Nenhum dado real foi alterado.');
 }
 async function signOut(){await browserDb().auth.signOut();window.location.assign('/login')}
 const renderButtons=()=>nav.map(t=><button key={t.id} type="button"
  aria-current={tab===t.id?'page':undefined}
  className={'demo-tab '+(tab===t.id?'demo-tab-active':'')} onClick={()=>page(t.id)}>
   <span aria-hidden>{t.symbol}</span>{t.label}
  </button>);
 const kpis=tab==='operacional'?[
  stat('Solicitações',numberBr(data.orders.length),'Casos simulados'),
  stat('Volume solicitado',numberBr(totalVolume)+' m³','Todos os pedidos'),
  stat('Volume entregue',numberBr(deliveredVolume)+' m³','Viagens registradas'),
  stat('Entregas concluídas',String(data.orders.filter(o=>o.status==='entregue').length),'Ordens finalizadas')
 ]:tab==='financeiro'?[
  stat('Pedidos aprovados',brl(financial.billed),'Valor contratado fictício'),
  stat('Recebido',brl(financial.received),'Baixas fictícias'),
  stat('A receber',brl(financial.outstanding),'Títulos ainda em aberto'),
  stat('A pagar',brl(financial.payables),'Despesas em aberto')
 ]:[
  stat('Receita reconhecida',brl(statement.revenue),'Entregas concluídas no mês'),
  stat('Custos diretos',brl(statement.direct),'Despesas classificadas como diretas'),
  stat('Despesas operacionais',brl(statement.operating),'Competência ilustrativa'),
  stat('Resultado preliminar',brl(statement.result),'Tributos ilustrativos de 6%')
 ];
 return <div className="workspace">
  <aside className={'sidebar '+(sidebar?'sidebar-open':'')}>
   <div className="sidebar-top">
    <div className="brand sidebar-brand"><span className="brand-mark">◉</span><span>REALIZA<small>GESTÃO INTELIGENTE</small></span></div>
    <button className="icon-btn mobile-only" aria-label="Fechar menu" onClick={()=>setSidebar(false)}>×</button>
   </div>
   <div className="sidebar-caption">APRESENTAÇÃO INTERATIVA</div>
   <nav className="nav-group" aria-label="Navegação da demonstração">
    {nav.map(t=><button key={t.id} className={'nav-item '+(tab===t.id?'selected':'')}
     type="button" onClick={()=>page(t.id)}>
     <span>{t.symbol}</span> {t.label}</button>)}
   </nav>
   <div className="sidebar-footer">
    <div className="user-chip"><span className="avatar">{name.slice(0,1).toUpperCase()}</span><div>
     <strong>{name}</strong><small>Apresentação fictícia</small></div></div>
    <button className="nav-item signout" onClick={()=>void signOut()}>↪ Sair da conta</button>
   </div>
  </aside>
  {sidebar&&<button className="backdrop mobile-only" aria-label="Fechar menu" onClick={()=>setSidebar(false)}/>}
  <div className="workspace-main">
   <header className="topbar">
    <button className="icon-btn mobile-only" aria-label="Abrir navegação" onClick={()=>setSidebar(true)}>☰</button>
    <div><span className="tiny-overline">REALIZA / DEMONSTRAÇÃO</span>
     <div className="breadcrumb">Ambiente ilustrativo <span> / </span> {nav.find(t=>t.id===tab)?.label}</div></div>
    <div className="topbar-right"><span className="status-dot"/> Modo simulado</div>
   </header>
   <main className="workspace-content">
    <div className="demo-notice" role="status">
     <strong>DEMONSTRAÇÃO INTERATIVA · SEM DADOS REAIS</strong>
     <span>Ações alteram os exemplos das três abas nesta sessão. Nenhum pedido, pagamento ou lançamento é enviado ao Supabase. Recarregar a página reinicia a simulação.</span>
    </div>
    <div className="demo-tab-bar" aria-label="Abas disponíveis">{renderButtons()}</div>
    {feedback&&<div className="notice demo-feedback" role="status">{feedback}</div>}
    <div className="demo-toolbar">
     <span>Explore o fluxo e veja os indicadores se atualizarem nas outras abas.</span>
     <button className="btn light" type="button" onClick={reset}>↻ Reiniciar demonstração</button>
    </div>
    <div className="page-heading"><div><span className="eyebrow">APRESENTAÇÃO DA REALIZA</span>
     <h1>{tab==='operacional'?'Fluxo operacional':tab==='financeiro'?'Financeiro':'DRE gerencial'}</h1>
     <p>{tab==='operacional'?'Crie uma solicitação e acompanhe, etapa por etapa, o atendimento e a entrega.':
      tab==='financeiro'?'Aprove e baixe recebimentos e despesas fictícios. O resultado muda em tempo real.':
      'Receita reconhecida somente após entrega. Custos e despesas aparecem por competência.'}</p></div>
    {tab==='operacional'&&<button className="btn primary" onClick={()=>setShowNew(v=>!v)} type="button">
     {showNew?'Fechar cadastro':'+ Nova solicitação fictícia'}</button>}
    </div>
    <section className="dashboard-kpis" aria-label="Indicadores simulados">
     {kpis.map(k=><Stat key={k.label} {...k}/>)}
    </section>
    {tab==='operacional'&&<>
     {showNew&&<form className="panel demo-new-form" onSubmit={createRequest}>
      <div className="dashboard-panel-head"><div><span className="eyebrow">CADASTRO ILUSTRATIVO</span><h2>Nova solicitação</h2>
       <small>Use nomes fictícios. Esta ação não registra solicitações reais.</small></div></div>
      <div className="demo-form-grid">
       <label>Empresa / cliente fictício<input required maxLength={80} value={draft.company} onChange={e=>setDraft(d=>({...d,company:e.target.value}))}/></label>
       <label>Local de atendimento em MG<input required maxLength={90} value={draft.city} onChange={e=>setDraft(d=>({...d,city:e.target.value}))}/></label>
       <label>Finalidade<select value={draft.use} onChange={e=>setDraft(d=>({...d,use:e.target.value}))}>
        <option>Abastecimento de obra</option><option>Uso industrial</option><option>Reservatório</option><option>Abastecimento predial</option>
       </select></label>
       <label>Volume (m³)<input type="number" min="1" max="10000" step="1" required value={draft.volume} onChange={e=>setDraft(d=>({...d,volume:e.target.value}))}/></label>
      </div>
      <button className="btn primary" type="submit">Criar solicitação simulada</button>
     </form>}
     <div className="demo-workflow" aria-label="Etapas do pedido escolhido">
      {steps.map((step,i)=><div key={step} className={'demo-flow-step '+(i===stageIndex?'selected':i<stageIndex?'completed':'')}>
       <small>{i<stageIndex?'✓ CONCLUÍDA':i===stageIndex?'● ATUAL':'ETAPA '+(i+1)}</small>
       <strong>{stepLabels[step]}</strong>
      </div>)}
     </div>
     <div className="dashboard-two">
      <section className="panel">
       <div className="dashboard-panel-head"><div><span className="eyebrow">FILA OPERACIONAL</span><h2>Pedidos fictícios</h2>
        <small>Selecione para continuar o atendimento</small></div></div>
       <div className="demo-orders">
        {data.orders.map(o=><button className={'request-list-item '+(current.id===o.id?'active':'')}
         key={o.id} type="button" onClick={()=>{setSelected(o.id);setFeedback('')}}>
         <span className="request-list-top"><strong>{o.company}</strong><OwnerBadge text={o.id}/></span>
         <span>{o.city} · {numberBr(o.volume)} m³ · {o.unitPrice?brl(oValue(o)):'Em cotação'}</span>
         <small>{stepLabels[o.status]}{o.deliveredM3?' · '+numberBr(o.deliveredM3)+' m³ entregues':''}</small>
        </button>)}
       </div>
      </section>
      <section className="panel">
       <span className="eyebrow">ORDEM / SOLICITAÇÃO FICTÍCIA</span>
       <h2>{current.company}</h2>
       <div className="demo-detail">
        <div><small>Número</small><strong>{current.id}</strong></div>
        <div><small>Local de entrega</small><strong>{current.city}</strong></div>
        <div><small>Tipo de serviço</small><strong>{current.use}</strong></div>
        <div><small>Quantidade total</small><strong>{numberBr(current.volume)} m³</strong></div>
        <div><small>Valor proposto</small><strong>{current.status==='recebida'||current.status==='analise'?'Em elaboração':brl(oValue(current))}</strong></div>
        <div><small>Status atual</small><strong>{stepLabels[current.status]}</strong></div>
       </div>
       {current.status==='analise'&&<label className="demo-step-label">
        Valor unitário fictício (R$/m³)
        <input type="number" min="1" step="0.01" max="100000" value={price} onChange={e=>setPrice(e.target.value)}/>
       </label>}
       {current.status==='aprovada'&&<label className="demo-step-label">Caminhão / capacidade
        <select value={truck} onChange={e=>setTruck(e.target.value)}>
         {trucks.map(t=><option key={t.id} value={t.id}>{t.label} · {t.driver}</option>)}
        </select>
       </label>}
       {['programada','entregue'].includes(current.status)&&<div className="demo-delivery">
        <div className="demo-progress-label"><span>Volume entregue</span><strong>{numberBr(current.deliveredM3)} / {numberBr(current.volume)} m³</strong></div>
        <div className="demo-progress-track"><div style={{width:formatPercent(current.deliveredM3,current.volume)+'%'}}/></div>
        <p>{chosenTruck?.label||'Caminhão demonstrativo'} · {chosenTruck?.driver||'Motorista'}.
         {current.status==='programada'&&<> Restam <strong>{numberBr(rest)} m³</strong>, em {tripsRemaining} viagem(ns) de até {chosenTruck?.capacity} m³.</>}</p>
       </div>}
       <div className="demo-action-area">
        {current.status==='recebida'&&<button className="btn primary" onClick={progress}>Iniciar análise simulada</button>}
        {current.status==='analise'&&<button className="btn primary" onClick={progress}>Emitir proposta fictícia</button>}
        {current.status==='proposta'&&<button className="btn primary" onClick={progress}>Simular aceite do cliente</button>}
        {current.status==='aprovada'&&<button className="btn primary" onClick={progress}>Programar entrega fictícia</button>}
        {current.status==='programada'&&<button className="btn primary" onClick={progress}>
         Registrar uma viagem de até {chosenTruck?.capacity||0} m³</button>}
        {current.status==='entregue'&&<div className="notice">Entrega concluída na simulação. A receita aparece no DRE; o recebimento pode ser baixado no Financeiro.</div>}
        {['aprovada','programada','entregue'].includes(current.status)&&<button className="btn light"
         type="button" onClick={()=>page('financeiro')}>Abrir financeiro →</button>}
       </div>
       <p className="dashboard-hint">Cada botão atualiza a etapa do pedido e os valores das outras abas, apenas no navegador. Não é uma operação real.</p>
      </section>
     </div>
    </>}
    {tab==='financeiro'&&<>
     <div className="dashboard-two">
      <section className="panel">
       <div className="dashboard-panel-head"><div><span className="eyebrow">CONTAS A RECEBER</span><h2>Pedidos aprovados</h2></div></div>
       <div className="demo-titles">
        {paidInvoices.length===0?<p>Simule o aceite de um pedido no fluxo operacional para gerar uma cobrança fictícia.</p>:
         paidInvoices.map(o=><div className="demo-title-row" key={o.id}>
          <div><strong>{o.company}</strong><small>{o.id} · {stepLabels[o.status]} · {numberBr(o.volume)} m³</small></div>
          <div className="demo-title-actions"><strong>{brl(oValue(o))}</strong>
           {o.paid?<OwnerBadge text="Recebido (simulado)"/>:
           <button type="button" className="btn primary" onClick={()=>
            apply(()=>payOrder(data,o.id),'Recebimento fictício registrado. Nenhuma transação bancária foi feita.')
           }>Simular recebimento</button>}
          </div>
         </div>)}
       </div>
      </section>
      <section className="panel">
       <div className="dashboard-panel-head"><div><span className="eyebrow">CONTAS A PAGAR</span><h2>Despesas fictícias</h2></div></div>
       <div className="demo-titles">
        {data.expenses.map(e=><div className="demo-title-row" key={e.id}>
         <div><strong>{e.label}</strong><small>{e.id} · {e.category==='direto'?'Custo direto':'Despesa operacional'}</small></div>
         <div className="demo-title-actions"><strong>{brl(e.amount)}</strong>
          {e.paid?<OwnerBadge text="Pago (simulado)"/>:
          <button className="btn light" type="button" onClick={()=>apply(()=>payExpense(data,e.id),
           'Pagamento fictício da despesa registrado; o DRE não muda com a baixa, pois é por competência.')}>
           Simular pagamento</button>}
         </div>
        </div>)}
       </div>
      </section>
     </div>
     <form className="panel demo-new-form" onSubmit={newExpense}>
      <div className="dashboard-panel-head"><div><span className="eyebrow">LANÇAMENTO FICTÍCIO</span>
       <h2>Incluir despesa de exemplo</h2></div></div>
      <div className="demo-form-grid">
       <label>Descrição<input required maxLength={100} value={description} onChange={e=>setDescription(e.target.value)}/></label>
       <label>Valor (R$)<input required type="number" min="0.01" step="0.01" max="1000000" value={amount}
        onChange={e=>setAmount(e.target.value)}/></label>
       <label>Classificação<select value={category} onChange={e=>setCategory(e.target.value as DemoCategory)}>
        <option value="direto">Custo direto</option><option value="operacional">Despesa operacional</option>
       </select></label>
       <div className="demo-form-explain">A despesa impacta o DRE do mês atual imediatamente, mesmo antes do pagamento fictício.</div>
      </div>
      <button className="btn primary" type="submit">Adicionar despesa fictícia</button>
     </form>
     <div className="notice">Caixa previsto: {brl(financial.projection)} (recebíveis em aberto menos pagamentos pendentes).
      Pagamentos e baixas são simulações locais, sem integração com banco ou gateway.</div>
    </>}
    {tab==='dre'&&<>
     <div className="dashboard-filters demo-month-select">
      <label htmlFor="demo-month">Competência demonstrativa</label>
      <select id="demo-month" value={month} onChange={e=>setMonth(e.target.value)}>
       {months.map(m=><option value={m} key={m}>{monthLabel(m)}</option>)}
      </select>
     </div>
     <div className="dashboard-two">
      <section className="panel">
       <div className="dashboard-panel-head"><div><span className="eyebrow">RESULTADO GERENCIAL</span>
        <h2>{monthLabel(month)}</h2>
        <small>{month===monthCode(new Date())?'Mês atual atualizado pelas ações simuladas':'Histórico fictício para comparação'}</small>
       </div></div>
       {(()=>{
        const prior=months.indexOf(month);
        const d=prior>=0&&prior<2?
         {...prevSample[prior],margin:prevSample[prior].revenue-prevSample[prior].direct,
         operatingResult:prevSample[prior].revenue-prevSample[prior].direct-prevSample[prior].operating,
         result:prevSample[prior].revenue-prevSample[prior].direct-prevSample[prior].operating-prevSample[prior].taxes}:
         statement;
        return <div className="dashboard-status-list">
         {[
          {name:'(+) Receita das entregas concluídas',amount:d.revenue},
          {name:'(–) Custos diretos incorridos',amount:-d.direct},
          {name:'(=) Margem bruta ilustrativa',amount:d.margin},
          {name:'(–) Despesas operacionais',amount:-d.operating},
          {name:'(=) Resultado operacional',amount:d.operatingResult},
          {name:'(–) Tributos hipotéticos (6% no mês atual)',amount:-d.taxes},
          {name:'(=) Resultado preliminar',amount:d.result}
         ].map(line=><div className="dashboard-status-item" key={line.name}>
          <span>{line.name}</span><strong>{brl(line.amount)}</strong>
         </div>)}
        </div>;
       })()}
      </section>
      <section className="panel">
       <div className="dashboard-panel-head"><div><span className="eyebrow">COMPARATIVO</span><h2>Evolução simulada</h2></div></div>
       <div className="dashboard-status-list">
        {months.map((m,i)=>{
         const x=i<2?prevSample[i]:statement;
         const value=x.revenue-x.direct-x.operating-x.taxes;
         return <button type="button" key={m} onClick={()=>setMonth(m)}
          className={'demo-month-row '+(month===m?'active':'')}>
          <span>{monthLabel(m)}</span>
          <strong>{brl(value)}</strong>
         </button>;
        })}
       </div>
       <div className="notice">Recebimentos não criam receita adicional no DRE. Somente entregas concluídas geram receita por competência nesta simulação.</div>
       <button className="btn primary" type="button" onClick={()=>page('operacional')}>
        Voltar ao fluxo para simular entrega</button>
      </section>
     </div>
     <p className="dashboard-hint">Valores anteriores, tributos e critérios são apenas exemplos. Não representam uma DRE contábil, uma alíquota real ou informações financeiras da REALIZA.</p>
    </>}
    <section className="panel demo-activity">
     <div className="dashboard-panel-head"><div><span className="eyebrow">RASTREAMENTO DE SIMULAÇÃO</span>
      <h2>Últimas ações demonstrativas</h2></div></div>
     <ol>{data.events.slice(0,6).map((item,i)=><li key={i}>{item}</li>)}</ol>
     <small>Registro temporário nesta sessão. Não é enviado ao servidor.</small>
    </section>
   </main>
   <footer className="workspace-footer">REALIZA · Demonstração interativa · Somente dados fictícios · Sem operações reais</footer>
  </div>
 </div>;
}
