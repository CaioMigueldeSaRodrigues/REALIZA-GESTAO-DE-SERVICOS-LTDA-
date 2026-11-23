'use client';

import {useState} from 'react';
import {brl,numberBr} from '@/lib/format';
import {browserDb} from '@/lib/supabase-browser';
import {describeAddress} from '@/components/AddressFields';
import {DemoCustomerRequestForm,type CustomerDemoRequest} from '@/components/DemoCustomerRequestForm';
import {
 addOrder,advanceOrder,createDemoState,financeSummary,incomeStatement,
 monthCode,monthLabel,monthsToShow,oValue,payExpense,payOrder,stepLabels,steps,trucks,
 type DemoOrder,type DemoState,type DemoStep
} from '@/lib/demo-simulation';

type Tab='operacional'|'financeiro'|'dre';
const samplePrevious=[
 {revenue:34600,direct:14700,operating:8100,taxes:2450},
 {revenue:41200,direct:18350,operating:9200,taxes:3010}
];
const tabs:{id:Tab;label:string;symbol:string}[]=[
 {id:'operacional',label:'Fluxo operacional',symbol:'⇄'},
 {id:'financeiro',label:'Financeiro',symbol:'↗'},
 {id:'dre',label:'DRE gerencial',symbol:'▥'}
];
function Stat({label,value,help}:{label:string;value:string;help:string}){
 return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{help}</small></article>;
}
function SimulatedStage({value}:{value:string}){return <span className="pill">{value}</span>}
function currentFinancial(state:DemoState,period:string){
 const months=monthsToShow(new Date());
 const index=months.indexOf(period);
 const source=index>=0&&index<2?samplePrevious[index]:incomeStatement(state,period);
 const margin=source.revenue-source.direct;
 const operatingResult=margin-source.operating;
 return {...source,margin,operatingResult,result:operatingResult-source.taxes};
}

export function DemoWorkspace({name}:{name:string}){
 const [data,setData]=useState<DemoState>(()=>createDemoState());
 const [tab,setTab]=useState<Tab>('operacional');
 const [selected,setSelected]=useState('DEMO-001');
 const [month,setMonth]=useState<string>(()=>monthCode(new Date()));
 const [sidebar,setSidebar]=useState(false);
 const [message,setMessage]=useState('');
 const [unitPrice,setUnitPrice]=useState('140');
 const [truckId,setTruckId]=useState('C01');
 const current=data.orders.find(o=>o.id===selected)||data.orders[0];
 const completed=data.orders.filter(o=>o.status==='entregue').length;
 const selectedTruck=trucks.find(t=>t.id===current.truckId);
 const remaining=Math.max(0,current.volume-current.deliveredM3);
 const progress=Math.round(100*current.deliveredM3/Math.max(1,current.volume));
 const finances=financeSummary(data);
 const financial=currentFinancial(data,month);
 const months=monthsToShow(new Date());
 const createdRequests=data.orders.filter(o=>o.origin==='cliente_apresentacao');
 const receivables=data.orders.filter(o=>['aprovada','programada','entregue'].includes(o.status));

 function setPage(value:Tab){
  setTab(value);setSidebar(false);setMessage('');
  if(typeof window!=='undefined')window.scrollTo(0,0);
 }
 async function signOut(){await browserDb().auth.signOut();window.location.assign('/login')}
 function choose(order:DemoOrder){setSelected(order.id);setMessage('')}
 function submitRequest(request:CustomerDemoRequest){
  const next=addOrder(data,{
   company:request.name,
   city:request.delivery.city+' / '+request.delivery.state,
   use:request.waterUse,volume:request.quantityM3,
   contactPhone:request.phone,contactEmail:request.email,
   deliveryAddress:describeAddress(request.delivery),notes:request.notes
  });
  setData(next);setSelected(next.orders[0].id);
  setMessage('Solicitação '+next.orders[0].id+' recebida. Ela já está na fila operacional abaixo para iniciar a análise.');
 }
 function advance(){
  try{
   const previous=current.status;
   const next=advanceOrder(data,current.id,{unitPrice:Number(unitPrice),truckId});
   setData(next);
   const updated=next.orders.find(o=>o.id===current.id)!;
   const rest=updated.volume-updated.deliveredM3;
   setMessage(previous==='programada'?
    (rest>0?'Viagem fictícia concluída. Restam '+numberBr(rest)+' m³ para entregar.':
     'Entrega fictícia concluída! A receita já aparece no DRE; a cobrança pode ser baixada no Financeiro.'):
    'Pedido '+current.id+' avançou para '+stepLabels[updated.status]+'.');
  }catch(e){setMessage(e instanceof Error?e.message:'Não foi possível avançar o pedido.')}
 }
 function apply(update:()=>DemoState,notice:string){
  try{setData(update());setMessage(notice)}
  catch(e){setMessage(e instanceof Error?e.message:'Não foi possível simular a ação.')}
 }
 function restart(){
  if(!window.confirm('Reiniciar a apresentação? Os pedidos fictícios feitos nesta sessão serão descartados.'))return;
  setData(createDemoState());setSelected('DEMO-001');setMonth(monthCode(new Date()));
  setMessage('Demonstração reiniciada. Nenhum registro real foi modificado.');
 }
 function nextButtonLabel(status:DemoStep){
  if(status==='recebida')return 'Iniciar análise operacional';
  if(status==='analise')return 'Emitir proposta fictícia';
  if(status==='proposta')return 'Simular aprovação do cliente';
  if(status==='aprovada')return 'Programar caminhão';
  if(status==='programada')return 'Registrar uma viagem';
  return '';
 }
 const resultCards=(
  <div className="dashboard-kpis">
   <Stat label="Receita de entregas" value={brl(financial.revenue)} help="Somente entregas concluídas na simulação"/>
   <Stat label="Custos diretos" value={brl(financial.direct)} help="Custos fictícios, por competência"/>
   <Stat label="Despesas operacionais" value={brl(financial.operating)} help="Despesas ilustrativas"/>
   <Stat label="Resultado preliminar" value={brl(financial.result)} help="Não é DRE contábil oficial"/>
  </div>
 );

 return <div className="workspace">
  <aside className={'sidebar '+(sidebar?'sidebar-open':'')}>
   <div className="sidebar-top">
    <div className="brand sidebar-brand"><span className="brand-mark">◉</span><span>REALIZA<small>GESTÃO INTELIGENTE</small></span></div>
    <button className="icon-btn mobile-only" aria-label="Fechar menu" onClick={()=>setSidebar(false)}>×</button>
   </div>
   <div className="sidebar-caption">APRESENTAÇÃO · ACESSO RESTRITO</div>
   <nav className="nav-group" aria-label="Módulos da demonstração">
    {tabs.map(t=><button key={t.id} type="button"
     className={'nav-item '+(tab===t.id?'selected':'')} onClick={()=>setPage(t.id)}>
      <span>{t.symbol}</span>{t.label}
    </button>)}
   </nav>
   <div className="sidebar-footer">
    <div className="user-chip"><span className="avatar">{name.slice(0,1).toUpperCase()}</span><div>
     <strong>{name}</strong><small>Visitante · demonstração</small>
    </div></div>
    <button className="nav-item signout" onClick={()=>void signOut()}>↪ Sair da conta</button>
   </div>
  </aside>
  {sidebar&&<button className="backdrop mobile-only" aria-label="Fechar menu" onClick={()=>setSidebar(false)}/>}
  <div className="workspace-main">
   <header className="topbar">
    <button className="icon-btn mobile-only" aria-label="Abrir navegação" onClick={()=>setSidebar(true)}>☰</button>
    <div><span className="tiny-overline">REALIZA / APRESENTAÇÃO</span>
     <div className="breadcrumb">Visão demonstrativa <span> / </span> {tabs.find(t=>t.id===tab)?.label}</div>
    </div>
    <div className="topbar-right"><span className="status-dot"/> Ambiente fictício</div>
   </header>
   <main className="workspace-content">
    <div className="demo-notice" role="status">
     <strong>DEMONSTRAÇÃO INTERATIVA — DADOS FICTÍCIOS</strong>
     <span>Este painel não consulta informações empresariais reais. O formulário e as etapas funcionam nesta sessão, sem registrar pedidos, enviar mensagens ou realizar pagamentos.</span>
    </div>
    {message&&<div className="notice" role="status" style={{marginBottom:18}}>{message}</div>}
    {tab==='operacional'&&<>
     <div className="page-heading"><div>
      <span className="eyebrow">APRESENTAÇÃO OPERACIONAL</span><h1>Fluxo operacional</h1>
      <p>Inicie pela solicitação do cliente e siga o atendimento até a entrega.</p>
     </div><button type="button" className="btn light" onClick={restart}>Reiniciar demonstração</button></div>
     <div className="dashboard-kpis">
      <Stat label="Solicitações demonstrativas" value={numberBr(data.orders.length)} help="Inclui pedidos criados durante a apresentação"/>
      <Stat label="Volume demonstrativo" value={numberBr(data.orders.reduce((s,o)=>s+o.volume,0))+' m³'} help="Volume de todos os pedidos fictícios"/>
      <Stat label="Em programação" value={String(data.orders.filter(o=>o.status==='programada').length)} help="Ordens simuladas"/>
      <Stat label="Entregas ilustrativas" value={String(completed)} help="Não representa entrega real"/>
     </div>
     <div className="customer-grid" style={{marginBottom:20}}>
      <DemoCustomerRequestForm onSend={submitRequest}/>
      <section className="panel">
       <h2>Minhas solicitações</h2>
       <p>As solicitações feitas no formulário aparecem aqui e na fila operacional.</p>
       {createdRequests.length===0?
        <p>Nenhuma solicitação enviada nesta apresentação.</p>:
        createdRequests.map(o=><div className="customer-entry" key={o.id}>
         <strong>{o.city} · {numberBr(o.volume)} m³</strong>
         <SimulatedStage value={stepLabels[o.status]}/>
         <small>{o.use} · {o.id}</small>
         <small>Entrega: {o.deliveryAddress||o.city}</small>
         <button className="btn light" type="button" onClick={()=>choose(o)}>Acompanhar na operação</button>
        </div>)}
      </section>
     </div>
     <div className="demo-workflow" aria-label="Etapas do pedido selecionado">
      {steps.map((step,i)=>{
       const pos=steps.indexOf(current.status);
       return <div key={step} className={'demo-flow-step '+(i===pos?'selected':'')}>
        <small>{i<pos?'✓ ETAPA CONCLUÍDA':i===pos?'● ETAPA ATUAL':'ETAPA '+(i+1)}</small>
        <strong>{stepLabels[step]}</strong>
       </div>;
      })}
     </div>
     <div className="dashboard-two" id="demo-operational-list">
      <section className="panel">
       <div className="dashboard-panel-head"><div><span className="eyebrow">FILAS E ORDENS</span><h2>Atendimentos simulados</h2></div></div>
       <div className="demo-orders">
        {data.orders.map(o=><button key={o.id} type="button"
         className={'request-list-item '+(selected===o.id?'active':'')} onClick={()=>choose(o)}>
         <span className="request-list-top"><strong>{o.company}</strong><span className="pill">{o.id}</span></span>
         <span>{o.city} · {numberBr(o.volume)} m³ · {o.unitPrice?brl(oValue(o)):'Em cotação'}</span>
         <small>{stepLabels[o.status]}{o.deliveredM3>0?' · '+numberBr(o.deliveredM3)+' m³ entregues':''}</small>
        </button>)}
       </div>
      </section>
      <section className="panel">
       <span className="eyebrow">FICHA DO PEDIDO · FICTÍCIA</span>
       <h2>{current.company}</h2>
       <div className="demo-detail">
        <div><small>Solicitação</small><strong>{current.id}</strong></div>
        <div><small>Local de entrega</small><strong>{current.deliveryAddress||current.city}</strong></div>
        <div><small>Serviço</small><strong>{current.use}</strong></div>
        <div><small>Volume / valor</small>
         <strong>{numberBr(current.volume)} m³ · {current.unitPrice?brl(oValue(current)):'Em cotação'}</strong></div>
        <div><small>Veículo / motorista</small><strong>{selectedTruck?selectedTruck.label+' · '+selectedTruck.driver:'A definir'}</strong></div>
        <div><small>Etapa atual</small><strong>{stepLabels[current.status]}</strong></div>
        {current.contactPhone&&<div><small>Contato do cliente fictício</small><strong>{current.contactPhone}</strong></div>}
        {current.contactEmail&&<div><small>E-mail informado</small><strong>{current.contactEmail}</strong></div>}
        {current.notes&&<div><small>Observações do pedido</small><strong>{current.notes}</strong></div>}
       </div>
       {current.status==='analise'&&<label className="demo-step-label">Preço fictício por m³ (R$)
        <input type="number" min="0.01" step="0.01" max="100000"
         value={unitPrice} onChange={e=>setUnitPrice(e.target.value)}/>
       </label>}
       {current.status==='aprovada'&&<label className="demo-step-label">Selecionar caminhão
        <select value={truckId} onChange={e=>setTruckId(e.target.value)}>
         {trucks.map(t=><option key={t.id} value={t.id}>{t.label} · {t.driver}</option>)}
        </select>
       </label>}
       {['programada','entregue'].includes(current.status)&&<div className="demo-delivery">
        <div><strong>Volume entregue:</strong> {numberBr(current.deliveredM3)} / {numberBr(current.volume)} m³</div>
        <progress max={current.volume} value={current.deliveredM3} style={{width:'100%',marginTop:8}}/>
        {current.status==='programada'&&<p>
         Restam <strong>{numberBr(remaining)} m³</strong> · {selectedTruck?
          Math.ceil(remaining/selectedTruck.capacity):0} viagem(ns) a realizar com o caminhão selecionado.
        </p>}
       </div>}
       {current.status!=='entregue'?<button className="btn primary" type="button"
        onClick={advance} style={{marginTop:15}}>
         {nextButtonLabel(current.status)}
       </button>:<div className="notice" style={{marginTop:15}}>
        Entrega fictícia concluída. Confira a receita reconhecida no DRE e o título no Financeiro.
       </div>}
       {['aprovada','programada','entregue'].includes(current.status)&&
        <button className="btn light" type="button" style={{marginTop:12,marginLeft:8}}
         onClick={()=>setPage('financeiro')}>Ver financeiro</button>}
       <p className="dashboard-hint">Cada ação é uma simulação local e atualiza os valores das outras duas abas.</p>
      </section>
     </div>
    </>}
    {tab==='financeiro'&&<>
     <div className="page-heading"><div><span className="eyebrow">APRESENTAÇÃO FINANCEIRA</span>
      <h1>Financeiro</h1><p>Contas a pagar, receber e baixas simuladas, vinculadas às ordens fictícias.</p></div></div>
     <div className="dashboard-kpis">
      <Stat label="Ordens aprovadas" value={brl(finances.billed)} help="Volume financeiro de OS simuladas"/>
      <Stat label="Contas a receber abertas" value={brl(finances.outstanding)} help="Desconta recebimentos fictícios"/>
      <Stat label="Contas a pagar abertas" value={brl(finances.payables)} help="Despesas ilustrativas pendentes"/>
      <Stat label="Saldo previsto" value={brl(finances.projection)} help="Projeção fictícia; não é saldo bancário"/>
     </div>
     <div className="demo-finance-tables">
      <section className="panel">
       <div className="dashboard-panel-head"><div><span className="eyebrow">EXEMPLO FICTÍCIO</span>
        <h2>Contas a receber</h2></div></div>
       <div className="table-scroll"><table><thead><tr>
        <th>Descrição</th><th>Documento</th><th>Valor</th><th>Situação</th>
       </tr></thead><tbody>
        {receivables.map(o=><tr key={o.id}>
         <td>{o.company}</td><td>{o.id}</td><td>{brl(oValue(o))}</td>
         <td>{o.paid?<SimulatedStage value="Recebido (simulado)"/>:
          <button type="button" className="btn light" onClick={()=>
           apply(()=>payOrder(data,o.id),'Recebimento fictício registrado. Nenhuma transação bancária foi realizada.')}>
           Simular recebimento</button>}</td>
        </tr>)}
       </tbody></table></div>
       {!receivables.length&&<p>Ao aprovar uma proposta fictícia, o título aparecerá aqui.</p>}
      </section>
      <section className="panel">
       <div className="dashboard-panel-head"><div><span className="eyebrow">EXEMPLO FICTÍCIO</span>
        <h2>Contas a pagar</h2></div></div>
       <div className="table-scroll"><table><thead><tr>
        <th>Descrição</th><th>Documento</th><th>Valor</th><th>Situação</th>
       </tr></thead><tbody>
        {data.expenses.map(e=><tr key={e.id}>
         <td>{e.label}</td><td>{e.id}</td><td>{brl(e.amount)}</td>
         <td>{e.paid?<SimulatedStage value="Pago (simulado)"/>:
          <button type="button" className="btn light" onClick={()=>
           apply(()=>payExpense(data,e.id),'Baixa de despesa fictícia registrada. O DRE por competência não muda com o pagamento.')}>
           Simular pagamento</button>}</td>
        </tr>)}
       </tbody></table></div>
      </section>
     </div>
     <div className="notice" style={{marginTop:16}}>
      Nenhuma cobrança, emissão fiscal ou baixa bancária real é executada.
     </div>
    </>}
    {tab==='dre'&&<>
     <div className="page-heading"><div><span className="eyebrow">APRESENTAÇÃO FINANCEIRA</span>
      <h1>DRE gerencial</h1><p>Demonstrativo ilustrativo atualizado pelas entregas da apresentação.</p></div>
      <div className="dashboard-filters">
       <select aria-label="Competência do demonstrativo" value={month} onChange={e=>setMonth(e.target.value)}>
        {months.map(m=><option key={m} value={m}>{monthLabel(m)}</option>)}
       </select>
      </div></div>
     {resultCards}
     <section className="panel">
      <div className="dashboard-panel-head"><div><span className="eyebrow">DEMONSTRATIVO SIMULADO</span>
       <h2>{monthLabel(month)}</h2><small>Valores totalmente fictícios</small></div></div>
      <div className="dashboard-status-list">
       {[
        {name:'(+) Receita de serviços entregues',amount:financial.revenue},
        {name:'(–) Custos diretos',amount:-financial.direct},
        {name:'(=) Resultado bruto',amount:financial.margin},
        {name:'(–) Despesas operacionais',amount:-financial.operating},
        {name:'(=) Resultado operacional',amount:financial.operatingResult},
        {name:'(–) Tributos hipotéticos',amount:-financial.taxes},
        {name:'(=) Resultado gerencial ilustrativo',amount:financial.result}
       ].map(line=><div className="dashboard-status-item" key={line.name}>
        <span>{line.name}</span><strong>{brl(line.amount)}</strong></div>)}
      </div>
     </section>
     <div className="notice" style={{marginTop:16}}>
      Este DRE é uma amostra visual, sem validade contábil. O valor de impostos é apenas hipotético.
      Recebimentos não geram receita novamente; as entregas concluídas alimentam o resultado.
     </div>
    </>}
    <section className="panel" style={{marginTop:18}}>
     <div className="dashboard-panel-head"><div><span className="eyebrow">HISTÓRICO DA SIMULAÇÃO</span>
      <h2>Últimas ações</h2></div></div>
     <ol style={{fontSize:12,paddingLeft:20}}>{data.events.slice(0,5).map((e,i)=><li key={i} style={{marginBottom:5}}>{e}</li>)}</ol>
    </section>
   </main>
   <footer className="workspace-footer">REALIZA · Ambiente de apresentação · Dados simulados · Sem operações reais</footer>
  </div>
 </div>;
}
