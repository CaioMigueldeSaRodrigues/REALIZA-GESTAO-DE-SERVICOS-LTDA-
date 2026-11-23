/**
 * Motor LOCAL da demonstração REALIZA.
 * Não importa Supabase nem executa chamadas de rede: nenhuma ação cria dados reais.
 */
export type DemoStep='recebida'|'analise'|'proposta'|'aprovada'|'programada'|'entregue';
export type DemoCategory='direto'|'operacional';
export type DemoOrder={
 id:string;company:string;city:string;use:string;volume:number;unitPrice:number;
 contactPhone?:string;contactEmail?:string;deliveryAddress?:string;notes?:string;origin?:'cliente_apresentacao'|'cenario_inicial';
 status:DemoStep;truckId:string|null;deliveredM3:number;paid:boolean;
 createdMonth:string;deliveredMonth:string|null;
};
export type DemoExpense={
 id:string;label:string;category:DemoCategory;amount:number;paid:boolean;month:string
};
export type DemoState={orders:DemoOrder[];expenses:DemoExpense[];events:string[];nextId:number};
export const trucks=[
 {id:'C01',label:'Caminhão 01 · 20 m³',capacity:20,driver:'Motorista A'},
 {id:'C02',label:'Caminhão 02 · 15 m³',capacity:15,driver:'Motorista B'}
] as const;
export const steps:DemoStep[]=['recebida','analise','proposta','aprovada','programada','entregue'];
export const stepLabels:Record<DemoStep,string>={
 recebida:'Solicitação recebida',analise:'Análise operacional',proposta:'Proposta emitida',
 aprovada:'Pedido aprovado',programada:'Programação da entrega',entregue:'Entrega concluída'
};
export function monthCode(date:Date){return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')}
export function monthLabel(key:string){
 return new Date(key+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
}
export function monthsToShow(now:Date){
 const out:string[]=[];
 for(let i=2;i>=0;i--){out.push(monthCode(new Date(now.getFullYear(),now.getMonth()-i,1)))}
 return out;
}
export function createDemoState(now:Date=new Date()):DemoState{
 const month=monthCode(now);
 return {
  orders:[
   {id:'DEMO-001',company:'Construtora Exemplo',city:'Pouso Alegre / MG',use:'Abastecimento de obra',volume:20,unitPrice:140,status:'programada',truckId:'C01',deliveredM3:0,paid:false,createdMonth:month,deliveredMonth:null},
   {id:'DEMO-002',company:'Indústria Modelo',city:'Extrema / MG',use:'Uso industrial',volume:40,unitPrice:140,status:'analise',truckId:null,deliveredM3:0,paid:false,createdMonth:month,deliveredMonth:null},
   {id:'DEMO-003',company:'Sítio Demonstração',city:'Itajubá / MG',use:'Reservatório',volume:15,unitPrice:130,status:'entregue',truckId:'C02',deliveredM3:15,paid:true,createdMonth:month,deliveredMonth:month},
   {id:'DEMO-004',company:'Comércio Ilustrativo',city:'Pouso Alegre / MG',use:'Abastecimento predial',volume:10,unitPrice:140,status:'proposta',truckId:null,deliveredM3:0,paid:false,createdMonth:month,deliveredMonth:null}
  ],
  expenses:[
   {id:'PAG-001',label:'Combustível (exemplo)',category:'direto',amount:1870,paid:false,month},
   {id:'PAG-002',label:'Manutenção preventiva',category:'direto',amount:1250,paid:false,month},
   {id:'PAG-003',label:'Despesa administrativa',category:'operacional',amount:980,paid:true,month}
  ],
  events:['Cenário demonstrativo iniciado: nenhuma operação foi gravada.'],nextId:5
 };
}
function event(state:DemoState,description:string):DemoState{
 return {...state,events:[description,...state.events].slice(0,15)};
}
export function addOrder(state:DemoState,params:{
 company:string;city:string;use:string;volume:number;
 contactPhone?:string;contactEmail?:string;deliveryAddress?:string;notes?:string
},now:Date=new Date()):DemoState{
 const company=params.company.trim(),city=params.city.trim(),use=params.use.trim();
 const volume=Number(params.volume);
 if(company.length<3||city.length<2||!use||!Number.isFinite(volume)||volume<=0||volume>10000)
  throw new Error('Informe empresa fictícia, cidade de MG, finalidade e volume válido (até 10.000 m³).');
 const id='DEMO-'+String(state.nextId).padStart(3,'0');
 const order:DemoOrder={id,company,city,use,volume,unitPrice:0,status:'recebida',
  truckId:null,deliveredM3:0,paid:false,createdMonth:monthCode(now),deliveredMonth:null,
  origin:'cliente_apresentacao',contactPhone:params.contactPhone?.trim(),
  contactEmail:params.contactEmail?.trim(),deliveryAddress:params.deliveryAddress?.trim(),
  notes:params.notes?.trim()};
 return event({...state,orders:[order,...state.orders],nextId:state.nextId+1},
  'Solicitação '+id+' criada para '+company+'.');
}
export function advanceOrder(state:DemoState,id:string,options?:{unitPrice?:number;truckId?:string},now:Date=new Date()):DemoState{
 const existing=state.orders.find(o=>o.id===id);
 if(!existing)throw new Error('Solicitação não localizada.');
 if(existing.status==='entregue')throw new Error('Esta entrega já foi concluída.');
 const next={...existing};
 let description='';
 switch(existing.status){
  case 'recebida':
   next.status='analise';description='Triagem iniciada';break;
  case 'analise':{
   const unit=Number(options?.unitPrice);
   if(!Number.isFinite(unit)||unit<=0||unit>100000)throw new Error('Informe o valor fictício por m³.');
   next.unitPrice=Math.round(unit*100)/100;next.status='proposta';description='Proposta fictícia emitida';break;
  }
  case 'proposta':
   next.status='aprovada';description='Proposta fictícia aprovada pelo cliente (simulação)';break;
  case 'aprovada':{
   const truck=trucks.find(t=>t.id===options?.truckId);
   if(!truck)throw new Error('Selecione um caminhão disponível.');
   next.truckId=truck.id;next.status='programada';description='Entrega programada em '+truck.label;break;
  }
  case 'programada':{
   const truck=trucks.find(t=>t.id===existing.truckId);
   if(!truck)throw new Error('Caminhão não encontrado.');
   const qty=Math.min(truck.capacity,Math.max(0,existing.volume-existing.deliveredM3));
   if(qty<=0)throw new Error('O volume já foi entregue.');
   next.deliveredM3=Math.round((existing.deliveredM3+qty)*100)/100;
   if(next.deliveredM3>=next.volume){
    next.status='entregue';next.deliveredMonth=monthCode(now);
   }
   description='Viagem fictícia concluída: '+qty+' m³'+(next.status==='entregue'?' · entrega encerrada':' · próxima viagem pendente');
   break;
  }
 }
 return event({...state,orders:state.orders.map(o=>o.id===id?next:o)},id+': '+description);
}
export function payOrder(state:DemoState,id:string):DemoState{
 const order=state.orders.find(o=>o.id===id);
 if(!order||!['aprovada','programada','entregue'].includes(order.status))
  throw new Error('Só é possível registrar recebimento após aprovação fictícia.');
 if(order.paid)throw new Error('Este recebimento já está marcado como realizado.');
 return event({...state,orders:state.orders.map(o=>o.id===id?{...o,paid:true}:o)},
  id+': recebimento simulado de R$ '+(oValue(order)).toFixed(2));
}
export function addExpense(state:DemoState,input:{label:string;amount:number;category:DemoCategory},now:Date=new Date()):DemoState{
 const amount=Number(input.amount),label=input.label.trim();
 if(label.length<3||!Number.isFinite(amount)||amount<=0||amount>1000000
  ||!['direto','operacional'].includes(input.category))throw new Error('Descrição, categoria e valor da despesa inválidos.');
 const id='PAG-DEMO-'+String(state.nextId).padStart(3,'0');
 const e:DemoExpense={id,label,amount:Math.round(amount*100)/100,category:input.category,paid:false,month:monthCode(now)};
 return event({...state,expenses:[e,...state.expenses],nextId:state.nextId+1},id+': despesa fictícia incluída');
}
export function payExpense(state:DemoState,id:string):DemoState{
 const expense=state.expenses.find(e=>e.id===id);
 if(!expense)throw new Error('Despesa não localizada.');
 if(expense.paid)throw new Error('Despesa já paga nesta simulação.');
 return event({...state,expenses:state.expenses.map(e=>e.id===id?{...e,paid:true}:e)},
  id+': despesa simulada baixada');
}
export const oValue=(o:DemoOrder)=>Math.round(o.volume*o.unitPrice*100)/100;
export function financeSummary(state:DemoState){
 const approved=state.orders.filter(o=>['aprovada','programada','entregue'].includes(o.status));
 const billed=approved.reduce((s,o)=>s+oValue(o),0);
 const received=approved.filter(o=>o.paid).reduce((s,o)=>s+oValue(o),0);
 const outstanding=billed-received;
 const payables=state.expenses.filter(e=>!e.paid).reduce((s,e)=>s+e.amount,0);
 return {billed,received,outstanding,payables,projection:outstanding-payables};
}
export function incomeStatement(state:DemoState,month:string){
 const revenue=state.orders.filter(o=>o.status==='entregue'&&o.deliveredMonth===month)
  .reduce((s,o)=>s+oValue(o),0);
 const direct=state.expenses.filter(e=>e.month===month&&e.category==='direto').reduce((s,e)=>s+e.amount,0);
 const operating=state.expenses.filter(e=>e.month===month&&e.category==='operacional').reduce((s,e)=>s+e.amount,0);
 const taxes=Math.round(revenue*0.06*100)/100;
 return {revenue,direct,operating,taxes,margin:revenue-direct,
  operatingResult:revenue-direct-operating,result:revenue-direct-operating-taxes};
}
