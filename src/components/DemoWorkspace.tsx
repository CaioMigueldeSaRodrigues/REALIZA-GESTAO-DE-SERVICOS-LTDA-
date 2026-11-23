'use client';

import {useState} from 'react';
import {brl,numberBr} from '@/lib/format';
import {browserDb} from '@/lib/supabase-browser';

type Tab='operacional'|'financeiro'|'dre';
type Step='recebida'|'analise'|'proposta'|'aprovada'|'programada'|'entregue';
type DemoOrder={
 id:string;company:string;city:string;type:string;volume:number;
 amount:number;status:Step;driver:string;vehicle:string;date:string
};
const orders:DemoOrder[]=[
 {id:'DEMO-001',company:'Construtora Exemplo',city:'Pouso Alegre / MG',type:'Abastecimento de obra',volume:20,amount:2800,status:'programada',driver:'Motorista A',vehicle:'Caminhão 01 · 20 m³',date:'24/11/2026'},
 {id:'DEMO-002',company:'Indústria Modelo',city:'Extrema / MG',type:'Uso industrial',volume:40,amount:5600,status:'analise',driver:'A definir',vehicle:'A definir',date:'A programar'},
 {id:'DEMO-003',company:'Sítio Demonstração',city:'Itajubá / MG',type:'Reservatório',volume:15,amount:1950,status:'entregue',driver:'Motorista B',vehicle:'Caminhão 02 · 15 m³',date:'21/11/2026'},
 {id:'DEMO-004',company:'Comércio Ilustrativo',city:'Pouso Alegre / MG',type:'Abastecimento predial',volume:10,amount:1400,status:'proposta',driver:'A definir',vehicle:'A definir',date:'A programar'}
];
const stageOrder:Step[]=['recebida','analise','proposta','aprovada','programada','entregue'];
const stageNames:Record<Step,string>={
 recebida:'Solicitação recebida',analise:'Análise operacional',proposta:'Proposta emitida',
 aprovada:'Pedido aprovado',programada:'Programação da entrega',entregue:'Entrega concluída'
};
const months=[
 {key:'2026-09',label:'Setembro/2026',revenue:34600,costs:14700,expenses:8100,taxes:2450},
 {key:'2026-10',label:'Outubro/2026',revenue:41200,costs:18350,expenses:9200,taxes:3010},
 {key:'2026-11',label:'Novembro/2026',revenue:48750,costs:21200,expenses:10800,taxes:3650}
];
const receivables=[
 {client:'Construtora Exemplo',invoice:'REC-001',due:'29/11/2026',amount:2800,status:'Em aberto'},
 {client:'Indústria Modelo',invoice:'REC-002',due:'04/12/2026',amount:5600,status:'Em aberto'},
 {client:'Sítio Demonstração',invoice:'REC-003',due:'20/11/2026',amount:1950,status:'Recebido'}
];
const payables=[
 {client:'Combustível (ilustrativo)',invoice:'PAG-001',due:'26/11/2026',amount:1870,status:'Em aberto'},
 {client:'Manutenção preventiva',invoice:'PAG-002',due:'29/11/2026',amount:1250,status:'Em aberto'},
 {client:'Fornecedor de água',invoice:'PAG-003',due:'22/11/2026',amount:3250,status:'Pago'}
];
function Stat({label,value,help}:{label:string;value:string;help:string}){
 return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{help}</small></article>;
}
function Table({title,rows}:{title:string;rows:typeof receivables}){
 return <section className="panel"><div className="dashboard-panel-head">
  <div><span className="eyebrow">EXEMPLO FICTÍCIO</span><h2>{title}</h2></div></div>
  <div className="table-scroll"><table><thead><tr>
   <th>Descrição</th><th>Documento</th><th>Vencimento</th><th>Valor</th><th>Situação</th>
  </tr></thead><tbody>{rows.map(r=><tr key={r.invoice}>
   <td>{r.client}</td><td>{r.invoice}</td><td>{r.due}</td><td>{brl(r.amount)}</td><td><span className="pill">{r.status}</span></td>
  </tr>)}</tbody></table></div>
 </section>;
}
export function DemoWorkspace({name}:{name:string}){
 const [tab,setTab]=useState<Tab>('operacional');
 const [selected,setSelected]=useState(orders[0].id);
 const [month,setMonth]=useState(months[2].key);
 const [sidebar,setSidebar]=useState(false);
 const [stage,setStage]=useState<Step>('programada');
 const current=orders.find(o=>o.id===selected)||orders[0];
 const financial=months.find(m=>m.key===month)||months[2];
 const operatingResult=financial.revenue-financial.costs-financial.expenses;
 const result=operatingResult-financial.taxes;
 const sampleRevenue=orders.reduce((a,b)=>a+b.amount,0);
 function setPage(value:Tab){setTab(value);setSidebar(false);if(typeof window!=='undefined')window.scrollTo(0,0)}
 async function signOut(){await browserDb().auth.signOut();window.location.assign('/login')}
 function choose(o:DemoOrder){setSelected(o.id);setStage(o.status)}
 const tabs:{id:Tab;label:string;symbol:string}[]=[
  {id:'operacional',label:'Fluxo operacional',symbol:'⇄'},
  {id:'financeiro',label:'Financeiro',symbol:'↗'},
  {id:'dre',label:'DRE gerencial',symbol:'▥'}
 ];
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
     <strong>DEMONSTRAÇÃO — DADOS FICTÍCIOS</strong>
     <span>Este painel não consulta informações empresariais reais. Ações e resultados exibidos são ilustrativos e não geram cobranças, ordens ou registros.</span>
    </div>
    {tab==='operacional'&&<>
     <div className="page-heading"><div>
      <span className="eyebrow">APRESENTAÇÃO OPERACIONAL</span><h1>Fluxo operacional</h1>
      <p>Do recebimento do pedido até o comprovante de entrega, em seis etapas.</p>
     </div></div>
     <div className="dashboard-kpis">
      <Stat label="Solicitações demonstrativas" value={numberBr(orders.length)} help="Casos fictícios no exemplo"/>
      <Stat label="Volume demonstrativo" value={numberBr(orders.reduce((s,o)=>s+o.volume,0))+' m³'} help="Somatório dos pedidos ilustrativos"/>
      <Stat label="Em programação" value={String(orders.filter(o=>o.status==='programada').length)} help="Ordens simuladas"/>
      <Stat label="Entregas ilustrativas" value={String(orders.filter(o=>o.status==='entregue').length)} help="Não representa entrega real"/>
     </div>
     <div className="demo-workflow">
      {stageOrder.map((step,i)=><div key={step} className={'demo-flow-step '+(step===stage?'selected':'')}>
       <small>ETAPA {i+1}</small><strong>{stageNames[step]}</strong>
      </div>)}
     </div>
     <div className="dashboard-two">
      <section className="panel">
       <div className="dashboard-panel-head"><div><span className="eyebrow">FILAS E ORDENS</span><h2>Atendimentos simulados</h2></div></div>
       <div className="demo-orders">
        {orders.map(o=><button key={o.id} type="button" className={'request-list-item '+(selected===o.id?'active':'')}
          onClick={()=>choose(o)}>
         <span className="request-list-top"><strong>{o.company}</strong><span className="pill">{o.id}</span></span>
         <span>{o.city} · {numberBr(o.volume)} m³ · {brl(o.amount)}</span>
         <small>{stageNames[o.status]}</small>
        </button>)}
       </div>
      </section>
      <section className="panel">
       <span className="eyebrow">FICHA DO PEDIDO · FICTÍCIA</span>
       <h2>{current.company}</h2>
       <div className="demo-detail">
        <div><small>Solicitação</small><strong>{current.id}</strong></div>
        <div><small>Local de entrega</small><strong>{current.city}</strong></div>
        <div><small>Serviço</small><strong>{current.type}</strong></div>
        <div><small>Volume / valor</small><strong>{numberBr(current.volume)} m³ · {brl(current.amount)}</strong></div>
        <div><small>Veículo / motorista</small><strong>{current.vehicle} · {current.driver}</strong></div>
        <div><small>Data prevista</small><strong>{current.date}</strong></div>
       </div>
       <label className="demo-step-label">Explorar visualmente a etapa
        <select value={stage} onChange={e=>setStage(e.target.value as Step)}>
         {stageOrder.map(st=><option value={st} key={st}>{stageNames[st]}</option>)}
        </select>
       </label>
       <div className="notice">Prévia: <strong>{stageNames[stage]}</strong>. A alteração desta etapa afeta apenas a apresentação nesta tela, sem salvar nada.</div>
      </section>
     </div>
    </>}
    {tab==='financeiro'&&<>
     <div className="page-heading"><div><span className="eyebrow">APRESENTAÇÃO FINANCEIRA</span>
      <h1>Financeiro</h1><p>Exemplo visual de contas a pagar, receber e situação dos títulos.</p></div></div>
     <div className="dashboard-kpis">
      <Stat label="Ordens ilustrativas" value={brl(sampleRevenue)} help="Volume financeiro de OS simuladas"/>
      <Stat label="Contas a receber abertas" value={brl(8400)} help="Exemplo de duas cobranças"/>
      <Stat label="Contas a pagar abertas" value={brl(3120)} help="Exemplo de dois compromissos"/>
      <Stat label="Saldo previsto" value={brl(5280)} help="Projeção fictícia; não é saldo bancário"/>
     </div>
     <div className="demo-finance-tables">
      <Table title="Contas a receber" rows={receivables}/>
      <Table title="Contas a pagar" rows={payables}/>
     </div>
     <div className="notice">Cobrança, emissão fiscal e baixa bancária ficam desabilitadas na demonstração. Nenhum pagamento é processado.</div>
    </>}
    {tab==='dre'&&<>
     <div className="page-heading"><div><span className="eyebrow">APRESENTAÇÃO FINANCEIRA</span>
      <h1>DRE gerencial</h1><p>Demonstrativo ilustrativo para validar indicadores e apresentação.</p></div>
      <div className="dashboard-filters">
       <select aria-label="Competência do demonstrativo" value={month} onChange={e=>setMonth(e.target.value)}>
        {months.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
       </select>
      </div></div>
     <div className="dashboard-kpis">
      <Stat label="Receita bruta ilustrativa" value={brl(financial.revenue)} help="Valores não provenientes de transações"/>
      <Stat label="Custos diretos ilustrativos" value={brl(financial.costs)} help="Exemplo de custos de distribuição"/>
      <Stat label="Despesas ilustrativas" value={brl(financial.expenses)} help="Exemplo operacional"/>
      <Stat label="Resultado ilustrativo" value={brl(result)} help="Após tributos simulados, sem validade contábil"/>
     </div>
     <section className="panel">
      <div className="dashboard-panel-head"><div><span className="eyebrow">DEMONSTRATIVO SIMULADO</span>
       <h2>{financial.label}</h2><small>Valores totalmente fictícios</small></div></div>
      <div className="dashboard-status-list">
       {[
        {name:'(+) Receita bruta de serviços',amount:financial.revenue},
        {name:'(–) Custos diretos',amount:-financial.costs},
        {name:'(=) Resultado bruto',amount:financial.revenue-financial.costs},
        {name:'(–) Despesas operacionais',amount:-financial.expenses},
        {name:'(=) Resultado operacional',amount:operatingResult},
        {name:'(–) Tributos simulados',amount:-financial.taxes},
        {name:'(=) Resultado gerencial ilustrativo',amount:result}
       ].map((line,i)=><div className="dashboard-status-item" key={line.name}>
        <span>{line.name}</span><strong>{brl(line.amount)}</strong>
       </div>)}
      </div>
     </section>
     <div className="notice" style={{marginTop:16}}>Este DRE é uma amostra visual. Não corresponde à contabilidade da REALIZA e não deve ser utilizado para decisões financeiras.</div>
    </>}
   </main>
   <footer className="workspace-footer">REALIZA · Ambiente de apresentação · Dados simulados · Somente leitura</footer>
  </div>
 </div>;
}
